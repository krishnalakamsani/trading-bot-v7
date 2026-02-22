import React, { useContext, useState } from "react";
import { AppContext } from "@/App";
import { Play, Square, XCircle, RefreshCw, ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const ControlsPanel = () => {
  const {
    botStatus, position, config, indices, timeframes,
    startBot, stopBot, squareOff, updateConfig,
    setMode, setSelectedIndex, setTimeframe
  } = useContext(AppContext);

  const [loading, setLoading] = useState({ start: false, stop: false, squareoff: false, tradingEnabled: false });

  const handleStart    = async () => { setLoading(p => ({...p, start: true}));    await startBot();                              setLoading(p => ({...p, start: false})); };
  const handleStop     = async () => { setLoading(p => ({...p, stop: true}));     await stopBot();                               setLoading(p => ({...p, stop: false})); };
  const handleSquareOff= async () => { setLoading(p => ({...p, squareoff: true}));await squareOff();                             setLoading(p => ({...p, squareoff: false})); };
  const handleMode     = async (v) => { await setMode(v ? "live" : "paper"); };
  const handleTradingEnabled = async (v) => {
    setLoading(p => ({...p, tradingEnabled: true}));
    await updateConfig({ trading_enabled: v });
    setLoading(p => ({...p, tradingEnabled: false}));
  };

  const canChangeMode     = !position?.has_position;
  const canChangeSettings = !botStatus.is_running && !position?.has_position;
  const selectedIndexInfo = indices.find(i => i.name === (config.selected_index || "NIFTY")) || {};

  const getExpiryLabel = (idx) => {
    if (!idx.expiry_type) return "";
    const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    return idx.expiry_type === "weekly" ? `Weekly · ${days[idx.expiry_day]}` : `Monthly · Last ${days[idx.expiry_day]}`;
  };

  return (
    <div className="terminal-card" data-testid="controls-panel">
      <div className="terminal-card-header">
        <h2 className="text-sm font-semibold" style={{ fontFamily: "Syne", color: "var(--text-primary)" }}>Controls</h2>
        {botStatus.is_running && (
          <span className="status-badge status-running">
            <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "var(--accent)" }} />
            Active
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Index */}
        <div>
          <p className="label-text mb-1.5">Index</p>
          <Select value={config.selected_index || "NIFTY"} onValueChange={setSelectedIndex} disabled={!canChangeSettings}>
            <SelectTrigger className="w-full rounded-md text-sm" style={{ background: "var(--bg-inset)", border: "1px solid var(--border)", color: "var(--text-primary)" }} data-testid="index-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              {indices.map(idx => (
                <SelectItem key={idx.name} value={idx.name} style={{ color: "var(--text-primary)" }}>
                  <span>{idx.name}</span>
                  <span className="ml-2 text-xs" style={{ color: "var(--text-secondary)" }}>Lot {idx.lot_size}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedIndexInfo.expiry_type && (
            <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>{getExpiryLabel(selectedIndexInfo)}</p>
          )}
        </div>

        {/* Timeframe */}
        <div>
          <p className="label-text mb-1.5">Timeframe</p>
          <Select value={String(config.candle_interval || 5)} onValueChange={(v) => setTimeframe(parseInt(v))} disabled={!canChangeSettings}>
            <SelectTrigger className="w-full rounded-md text-sm" style={{ background: "var(--bg-inset)", border: "1px solid var(--border)", color: "var(--text-primary)" }} data-testid="timeframe-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              {timeframes.map(tf => (
                <SelectItem key={tf.value} value={String(tf.value)} style={{ color: "var(--text-primary)" }}>{tf.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!canChangeSettings && (
            <p className="text-xs mt-1" style={{ color: "var(--warning)" }}>Stop bot to change</p>
          )}
        </div>

        {/* Start / Stop */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleStart}
            disabled={botStatus.is_running || loading.start}
            className="flex items-center justify-center gap-1.5 h-9 rounded-md text-sm font-semibold btn-active disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#000" }}
            data-testid="start-bot-btn"
          >
            {loading.start ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Start
          </button>
          <button
            onClick={handleStop}
            disabled={!botStatus.is_running || loading.stop}
            className="flex items-center justify-center gap-1.5 h-9 rounded-md text-sm font-semibold btn-active disabled:opacity-40"
            style={{ background: "var(--bg-inset)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            data-testid="stop-bot-btn"
          >
            {loading.stop ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
            Stop
          </button>
        </div>

        {/* Square Off */}
        <button
          onClick={handleSquareOff}
          disabled={!position?.has_position || loading.squareoff}
          className="w-full flex items-center justify-center gap-1.5 h-9 rounded-md text-sm font-semibold btn-active disabled:opacity-30"
          style={{ background: "var(--loss-dim)", color: "var(--loss)", border: "1px solid rgba(255,77,109,0.25)" }}
          data-testid="squareoff-btn"
        >
          {loading.squareoff ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
          Square Off
        </button>

        <hr className="divider" />

        {/* Mode toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Mode</p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-dim)" }}>
              {canChangeMode ? "Paper / Live" : "Close position first"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: botStatus.mode === "paper" ? "var(--blue)" : "var(--text-dim)" }}>Paper</span>
            <Switch checked={botStatus.mode === "live"} onCheckedChange={handleMode} disabled={!canChangeMode} data-testid="mode-toggle" />
            <span className="text-xs font-medium" style={{ color: botStatus.mode === "live" ? "var(--warning)" : "var(--text-dim)" }}>Live</span>
          </div>
        </div>

        {/* Entries toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>New Trades</p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-dim)" }}>
              {config?.trading_enabled === false ? "Paused — no new entries" : "Enabled"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--text-dim)" }}>Off</span>
            <Switch checked={config?.trading_enabled !== false} onCheckedChange={handleTradingEnabled} disabled={loading.tradingEnabled} data-testid="trading-enabled-toggle" />
            <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>On</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlsPanel;
