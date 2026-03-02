"""TickEngine — polls MDS for latest candle closes, builds OHLC, broadcasts over WebSocket.

Responsibilities (this file only):
  - Poll MDS REST /v1/latest-close every ~1 s
  - Detect new candle closes (timestamp change)
  - Broadcast {"type": "tick", "data": {index, ltp, ts}}   — every poll
  - Broadcast {"type": "candle", "data": {ohlc...}}        — on each new close
  - Expose last_closed_candle + candle_event for trading_bot.run_loop()

What this does NOT do:
  - Talk to Dhan directly (that's MDS's job for index data)
  - Store anything to DB
  - Run any trading logic
"""
from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class OHLC:
    open: float
    high: float
    low: float
    close: float
    ts: float           # unix epoch of the candle open (from MDS)


class TickEngine:
    """Polls MDS for new candle closes; notifies the trading loop via candle_event."""

    def __init__(self) -> None:
        self.last_closed_candle: Optional[OHLC] = None
        self.last_tick_ltp: float = 0.0
        self.candle_event: asyncio.Event = asyncio.Event()
        self._candle_seq: int = 0          # incremented each new candle
        self._last_seq_seen: int = 0       # run_loop tracks this to detect new candles

        self._task: Optional[asyncio.Task] = None
        self._last_candle_ts: Optional[str] = None
        self._last_candle_recv_time: Optional[float] = None  # time.time() of last new candle

    # ── stubs called by trading_bot.run_loop() ───────────────────────────────
    # TickEngine reads config on every poll — these are intentional no-ops.
    # index/interval changes are picked up automatically next cycle.

    def subscribe(self, index_name: str = "NIFTY", candle_interval: int = 5) -> None:
        """No-op: TickEngine reads selected_index/candle_interval from config directly."""
        pass

    def set_dhan(self, dhan) -> None:
        """No-op: TickEngine fetches from MDS, not Dhan directly."""
        pass

    # ── lifecycle ────────────────────────────────────────────────────────────

    async def start(self) -> None:
        if self._task and not self._task.done():
            return
        self._task = asyncio.create_task(self._run(), name="tick_engine")
        logger.info("[TICK] TickEngine started")

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("[TICK] TickEngine stopped")

    # ── main loop ────────────────────────────────────────────────────────────

    async def _run(self) -> None:
        from config import config, bot_state

        while True:
            try:
                index_name = config.get("selected_index", "NIFTY")
                interval   = int(config.get("candle_interval", 5) or 5)
                base_url   = str(config.get("mds_base_url", "") or "").strip()
                poll_s     = float(config.get("mds_poll_seconds", 1.0) or 1.0)

                if not base_url:
                    await asyncio.sleep(2)
                    continue

                candle = await self._fetch_latest(base_url, index_name, interval, poll_s)

                if candle:
                    close = candle.get("close") or candle.get("ltp") or 0.0
                    ts_str = str(candle.get("ts") or "")
                    high   = float(candle.get("high") or close)
                    low    = float(candle.get("low")  or close)

                    ltp = float(close)
                    if ltp > 0:
                        bot_state["index_ltp"] = ltp
                        self.last_tick_ltp = ltp
                        await self._broadcast_tick(index_name, ltp)

                    # New candle closed when MDS timestamp advances
                    if ts_str and ts_str != self._last_candle_ts and ltp > 0:
                        self._last_candle_ts = ts_str
                        self._last_candle_recv_time = time.time()
                        ohlc = OHLC(
                            open  = float(candle.get("open") or ltp),
                            high  = float(high),
                            low   = float(low),
                            close = ltp,
                            ts    = float(candle.get("ts_epoch") or time.time()),
                        )
                        self.last_closed_candle = ohlc
                        await self._broadcast_candle(index_name, interval, ohlc)
                        # Signal trading loop — use seq counter so run_loop never misses a candle
                        self._candle_seq += 1
                        self.candle_event.set()
                    elif ts_str and ts_str == self._last_candle_ts:
                        # Same candle — check for stall only if market is actually open
                        from utils import is_market_open
                        if is_market_open():
                            stale_s = time.time() - (self._last_candle_recv_time or time.time())
                            if stale_s > interval * 2:
                                logger.warning(
                                    f"[TICK] ⚠ MDS stall: no new candle for {stale_s:.0f}s "
                                    f"(expected every {interval}s) | last_ts={self._last_candle_ts}"
                                )
                else:
                    # MDS returned no data — log stall if market is open and position is open
                    from config import bot_state as _bs
                    from utils import is_market_open
                    if is_market_open() and _bs.get("current_position"):
                        stale_s = time.time() - (self._last_candle_recv_time or time.time())
                        if stale_s > interval * 2:
                            logger.warning(
                                f"[TICK] ⚠ MDS returned no data for {stale_s:.0f}s — "
                                f"candle events paused, position exits may be delayed"
                            )

                # Always broadcast state every tick — regardless of whether a new candle arrived
                await self._broadcast_state()

                await asyncio.sleep(max(0.5, poll_s))

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(f"[TICK] Loop error: {e}")
                await asyncio.sleep(2)

    async def _fetch_latest(self, base_url: str, symbol: str,
                            timeframe_seconds: int, min_poll_s: float) -> Optional[dict]:
        """Call MDS /v1/latest-close and return the candle dict, or None on error."""
        try:
            from mds_client import fetch_latest_candle
            return await fetch_latest_candle(
                base_url=base_url,
                symbol=symbol,
                timeframe_seconds=timeframe_seconds,
            )
        except Exception as e:
            logger.debug(f"[TICK] fetch_latest error: {e}")
            return None

    # ── broadcast helpers ─────────────────────────────────────────────────────

    async def _broadcast_state(self) -> None:
        """Broadcast complete bot state snapshot. Called every tick — single source of truth."""
        try:
            from server import manager
            from config import bot_state, config
            from bot_state_machine import state_machine
            from datetime import datetime, timezone
            from utils import is_market_open

            # Always recompute on every tick — never stale
            bot_state["market_status"] = "open" if is_market_open() else "closed"

            asyncio.create_task(manager.broadcast({
                "type": "state_update",
                "data": {
                    "index_ltp":              bot_state.get("index_ltp", 0.0),
                    "current_option_ltp":     bot_state.get("current_option_ltp", 0.0),
                    "position":               bot_state.get("current_position"),
                    "entry_price":            bot_state.get("entry_price", 0.0),
                    "trailing_sl":            bot_state.get("trailing_sl"),
                    "daily_pnl":              bot_state.get("daily_pnl", 0.0),
                    "daily_trades":           bot_state.get("daily_trades", 0),
                    "is_running":             bot_state.get("is_running", False),
                    "bot_phase":              state_machine.phase_name,
                    "mode":                   bot_state.get("mode", "paper"),
                    "market_status":          bot_state.get("market_status", "closed"),
                    "mds_score":              bot_state.get("mds_score", 0.0),
                    "mds_slope":              bot_state.get("mds_slope", 0.0),
                    "mds_acceleration":       bot_state.get("mds_acceleration", 0.0),
                    "mds_stability":          bot_state.get("mds_stability", 0.0),
                    "mds_confidence":         bot_state.get("mds_confidence", 0.0),
                    "mds_is_choppy":          bot_state.get("mds_is_choppy", False),
                    "mds_direction":          bot_state.get("mds_direction", "NONE"),
                    "mds_htf_score":          bot_state.get("mds_htf_score", 0.0),
                    "mds_htf_timeframe":      bot_state.get("mds_htf_timeframe", 0),
                    "supertrend_signal":      bot_state.get("last_supertrend_signal"),
                    "supertrend_value":       bot_state.get("supertrend_value"),
                    "htf_supertrend_signal":  bot_state.get("htf_supertrend_signal"),
                    "htf_supertrend_value":   bot_state.get("htf_supertrend_value", 0.0),
                    "trading_enabled":        bool(config.get("trading_enabled", True)),
                    "selected_index":         config.get("selected_index", "NIFTY"),
                    "candle_interval":        config.get("candle_interval", 5),
                    "daily_max_loss_triggered": bot_state.get("daily_max_loss_triggered", False),
                    "max_drawdown":           bot_state.get("max_drawdown", 0.0),
                    "timestamp":              datetime.now(timezone.utc).isoformat(),
                },
            }))
        except Exception as e:
            logger.debug(f"[TICK] broadcast_state error: {e}")

    async def _broadcast_tick(self, index: str, ltp: float) -> None:
        try:
            from server import manager
            asyncio.create_task(manager.broadcast({
                "type": "tick",
                "data": {"index": index, "ltp": ltp, "ts": time.time()},
            }))
        except Exception as e:
            logger.debug(f"[TICK] broadcast_tick error: {e}")

    async def _broadcast_candle(self, index: str, interval: int, c: OHLC) -> None:
        try:
            from server import manager
            asyncio.create_task(manager.broadcast({
                "type": "candle",
                "data": {
                    "index": index, "interval": interval,
                    "open": c.open, "high": c.high, "low": c.low, "close": c.close,
                    "ts": c.ts,
                },
            }))
        except Exception as e:
            logger.debug(f"[TICK] broadcast_candle error: {e}")


# Global singleton — imported by server.py and trading_bot.py
tick_engine = TickEngine()