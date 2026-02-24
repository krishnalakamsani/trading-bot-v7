"""OptionPriceEngine — fetches live option LTP from Dhan every second.

Responsibilities (this file only):
  - When a position is open: fetch option LTP from Dhan every ~1s
  - Write result into bot_state['current_option_ltp']
  - Nothing else — no broadcasting, no trading logic, no candles

Architecture:
  MDS  → TickEngine  → index_ltp  (index prices)
  Dhan → OptionPriceEngine → option_ltp  (option prices)
  TickEngine → broadcast state_update (both values, always in sync)
"""
from __future__ import annotations

import asyncio
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class OptionPriceEngine:
    """Polls Dhan for option LTP whenever a position is open."""

    def __init__(self) -> None:
        self._task: Optional[asyncio.Task] = None
        self._dhan = None

    def set_dhan(self, dhan) -> None:
        """Called by trading_bot once Dhan is initialised."""
        self._dhan = dhan

    async def start(self) -> None:
        if self._task and not self._task.done():
            return
        self._task = asyncio.create_task(self._run(), name="option_price_engine")
        logger.info("[OPT] OptionPriceEngine started")

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("[OPT] OptionPriceEngine stopped")

    async def _run(self) -> None:
        from config import config, bot_state

        _last_ltp: float = 0.0
        _same_count: int = 0

        while True:
            try:
                position = bot_state.get("current_position")

                if position and self._dhan:
                    security_id = str(position.get("security_id") or "")
                    index_name  = str(position.get("index_name") or config.get("selected_index") or "NIFTY")

                    if security_id:
                        try:
                            opt_id = int(security_id)
                            _idx_ltp, option_ltp = await asyncio.to_thread(
                                self._dhan.get_index_and_option_ltp,
                                index_name,
                                opt_id,
                            )
                            if option_ltp and float(option_ltp) > 0:
                                option_ltp = round(round(float(option_ltp) / 0.05) * 0.05, 2)

                                # Detect stale LTP from Dhan
                                if option_ltp == _last_ltp:
                                    _same_count += 1
                                    if _same_count >= 5:
                                        logger.warning(f"[OPT] ⚠ LTP stuck at {option_ltp} for {_same_count}s — Dhan may be returning stale data")
                                else:
                                    if _same_count >= 5:
                                        logger.info(f"[OPT] LTP unstuck: {_last_ltp} → {option_ltp}")
                                    _same_count = 0
                                    _last_ltp = option_ltp

                                bot_state["current_option_ltp"] = option_ltp
                        except Exception as e:
                            logger.debug(f"[OPT] Fetch error: {e}")
                else:
                    # No position — reset option LTP and stale counters
                    bot_state["current_option_ltp"] = 0.0
                    _last_ltp = 0.0
                    _same_count = 0

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(f"[OPT] Loop error: {e}")

            await asyncio.sleep(1.0)


# Global singleton
option_price_engine = OptionPriceEngine()