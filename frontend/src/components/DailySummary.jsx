import React, { useContext } from "react";
import { AppContext } from "@/App";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

const DailySummary = () => {
  const { summary, config } = useContext(AppContext);
  const isProfitable = summary.total_pnl >= 0;
  const lossRatio = Math.min(100, (Math.abs(summary.total_pnl || 0) / (config.daily_max_loss || 1)) * 100);

  return (
    <div className="terminal-card" data-testid="daily-summary">
      <div className="terminal-card-header">
        <h2 className="text-sm font-semibold" style={{ fontFamily: "Syne", color: "var(--text-primary)" }}>
          Daily Summary
        </h2>
        <span className="font-mono" style={{ fontSize: "0.65rem", color: "var(--text-dim)" }}>
          {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Total PnL */}
        <div className={isProfitable ? "inset-box-profit" : "inset-box-loss"}>
          <p className="label-text mb-1">Total P&L</p>
          <div className="flex items-center gap-2">
            {isProfitable
              ? <TrendingUp className="w-4 h-4" style={{ color: "var(--profit)" }} />
              : <TrendingDown className="w-4 h-4" style={{ color: "var(--loss)" }} />}
            <p className="font-mono font-bold text-2xl leading-none"
              style={{ color: isProfitable ? "var(--profit)" : "var(--loss)" }}
              data-testid="total-pnl">
              {isProfitable ? "+" : ""}₹{summary.total_pnl?.toFixed(2) || "0.00"}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="inset-box">
            <p className="label-text mb-0.5">Trades</p>
            <p className="font-mono font-semibold text-lg leading-none" style={{ color: "var(--text-primary)" }} data-testid="total-trades">
              {summary.total_trades || 0}
              <span className="text-xs font-normal ml-1" style={{ color: "var(--text-dim)" }}>/ {config.max_trades_per_day}</span>
            </p>
          </div>
          <div className="inset-box">
            <p className="label-text mb-0.5">Max DD</p>
            <p className="font-mono font-semibold text-lg leading-none" style={{ color: "var(--loss)" }} data-testid="max-drawdown">
              ₹{summary.max_drawdown?.toFixed(0) || "0"}
            </p>
          </div>
        </div>

        {/* Loss limit bar */}
        <div className="inset-box">
          <div className="flex items-center justify-between mb-2">
            <p className="label-text">Loss Limit Used</p>
            <p className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
              ₹{Math.abs(summary.total_pnl || 0).toFixed(0)} / ₹{config.daily_max_loss}
            </p>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${lossRatio}%`,
                background: summary.daily_stop_triggered ? "var(--loss)"
                  : lossRatio > 60 ? "var(--warning)"
                  : "var(--accent)",
              }}
            />
          </div>
          <p className="text-right mt-1 font-mono" style={{ fontSize: "0.6rem", color: "var(--text-dim)" }}>
            {lossRatio.toFixed(0)}%
          </p>
        </div>

        {/* Daily stop warning */}
        {summary.daily_stop_triggered && (
          <div className="inset-box-loss flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "var(--loss)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--loss)" }}>
              Daily loss limit hit — trading stopped
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailySummary;
