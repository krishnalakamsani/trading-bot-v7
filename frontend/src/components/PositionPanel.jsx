import React, { useContext } from "react";
import { AppContext } from "@/App";
import { TrendingUp, TrendingDown, Clock, Crosshair } from "lucide-react";

const PositionPanel = () => {
  const { position, config, botStatus } = useContext(AppContext);

  if (!position?.has_position) {
    return (
      <div className="terminal-card" data-testid="position-panel">
        <div className="terminal-card-header">
          <h2 className="text-sm font-semibold" style={{ fontFamily: "Syne", color: "var(--text-primary)" }}>Position</h2>
        </div>
        <div className="p-6 flex flex-col items-center justify-center text-center" style={{ minHeight: 140 }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
            style={{ background: "var(--bg-inset)", border: "1px solid var(--border)" }}>
            <Crosshair className="w-5 h-5" style={{ color: "var(--text-dim)" }} />
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No open position</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
            {botStatus.is_running ? "Scanning for signal…" : "Start bot to begin"}
          </p>
        </div>
      </div>
    );
  }

  const isProfit = position.unrealized_pnl >= 0;
  const isCE = position.option_type === "CE";
  const indexName = position.index_name || config.selected_index || "NIFTY";

  return (
    <div className="terminal-card" data-testid="position-panel">
      {/* Header with option type badge */}
      <div className="terminal-card-header">
        <h2 className="text-sm font-semibold" style={{ fontFamily: "Syne", color: "var(--text-primary)" }}>Position</h2>
        <span className={`status-badge ${isCE ? "status-running" : "status-error"}`}>
          {isCE ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {indexName} {position.option_type}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Strike / Expiry */}
        <div className="flex justify-between">
          <div>
            <p className="label-text mb-0.5">Strike</p>
            <p className="font-mono font-bold text-xl" style={{ color: "var(--text-primary)" }}>
              {position.strike?.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="text-right">
            <p className="label-text mb-0.5">Expiry</p>
            <p className="font-mono text-sm" style={{ color: "var(--text-secondary)" }}>
              {position.expiry
                ? new Date(position.expiry).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
                : "—"}
            </p>
          </div>
        </div>

        {/* Entry / Current */}
        <div className="grid grid-cols-2 gap-2">
          <div className="inset-box">
            <p className="label-text mb-0.5">Entry</p>
            <p className="font-mono font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              ₹{position.entry_price?.toFixed(2) || "—"}
            </p>
          </div>
          <div className="inset-box">
            <p className="label-text mb-0.5">LTP</p>
            <p className="font-mono font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              ₹{position.current_ltp?.toFixed(2) || "—"}
            </p>
          </div>
        </div>

        {/* Unrealized PnL — big & bold */}
        <div className={isProfit ? "inset-box-profit" : "inset-box-loss"}>
          <div className="flex justify-between items-center">
            <p className="label-text">Unrealized P&L</p>
            <p className="font-mono font-bold text-xl"
              style={{ color: isProfit ? "var(--profit)" : "var(--loss)" }}
              data-testid="unrealized-pnl">
              {isProfit ? "+" : ""}₹{position.unrealized_pnl?.toFixed(2) || "0.00"}
            </p>
          </div>
        </div>

        {/* Trailing SL */}
        {position.trailing_sl && (
          <div className="inset-box-warn flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: "var(--warning)" }}>Trailing SL</span>
            <span className="font-mono font-semibold text-sm" style={{ color: "var(--warning)" }}>
              ₹{position.trailing_sl?.toFixed(2)}
            </span>
          </div>
        )}

        {/* Qty + time */}
        <div className="flex items-center justify-between" style={{ color: "var(--text-dim)", fontSize: "0.7rem" }}>
          <span className="font-mono">Qty: {position.qty || "—"}</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> Active
          </span>
        </div>
      </div>
    </div>
  );
};

export default PositionPanel;
