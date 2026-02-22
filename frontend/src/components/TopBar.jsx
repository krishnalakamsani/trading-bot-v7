import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "@/App";
import { Settings, Wifi, WifiOff, BarChart3, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const TopBar = ({ onSettingsClick }) => {
  const { botStatus, wsConnected, config } = useContext(AppContext);
  const navigate = useNavigate();

  const formatTimeframe = (s) => {
    if (!s) return "5s";
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${s / 60}m`;
    return `${s / 3600}h`;
  };

  const marketOpen = botStatus.market_status === "open";

  return (
    <div
      className="flex items-center justify-between px-5 py-2.5 border-b"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      data-testid="top-bar"
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center"
          style={{ background: "var(--accent-dim)", border: "1px solid rgba(0,200,150,0.3)" }}
        >
          <TrendingUp className="w-4 h-4" style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight" style={{ fontFamily: "Syne", color: "var(--text-primary)" }}>
            NiftyAlgo
          </h1>
          <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
            {config.selected_index || "NIFTY"} · {formatTimeframe(botStatus.candle_interval || config.candle_interval)}
          </p>
        </div>
      </div>

      {/* Center status pills */}
      <div className="hidden md:flex items-center gap-2">
        {/* Market status */}
        <span className={`status-badge ${marketOpen ? "status-running" : "status-error"}`} data-testid="market-status-badge">
          <span className={`w-1.5 h-1.5 rounded-full ${marketOpen ? "pulse-dot" : ""}`}
            style={{ background: marketOpen ? "var(--accent)" : "var(--loss)" }} />
          {marketOpen ? "Market Open" : "Market Closed"}
          {botStatus.market_details && (
            <span style={{ opacity: 0.6 }}>{botStatus.market_details.current_time_ist}</span>
          )}
        </span>

        {/* Bot status */}
        <span className={`status-badge ${botStatus.is_running ? "status-running" : "status-stopped"}`} data-testid="bot-status-badge">
          <span className={`w-1.5 h-1.5 rounded-full`}
            style={{ background: botStatus.is_running ? "var(--accent)" : "var(--text-dim)" }} />
          {botStatus.is_running ? "Running" : "Stopped"}
        </span>

        {/* Mode */}
        <span className={`status-badge ${botStatus.mode === "live" ? "status-warning" : "status-info"}`} data-testid="mode-badge">
          {botStatus.mode === "live" ? "⚡ LIVE" : "◎ PAPER"}
        </span>

        {/* Paused */}
        {botStatus.is_running && botStatus.trading_enabled === false && (
          <span className="status-badge status-warning" data-testid="trading-paused-badge">⏸ PAUSED</span>
        )}

        {/* WS */}
        <span className={`status-badge ${wsConnected ? "status-running" : "status-error"}`} data-testid="ws-status-badge">
          {wsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {wsConnected ? "Live" : "Offline"}
        </span>
      </div>

      {/* Right buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/analysis")}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md btn-active"
          style={{ background: "var(--bg-inset)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          data-testid="analysis-btn"
        >
          <BarChart3 className="w-3.5 h-3.5" /> Analysis
        </button>
        <button
          onClick={onSettingsClick}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md btn-active"
          style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid rgba(0,200,150,0.25)" }}
          data-testid="settings-btn"
        >
          <Settings className="w-3.5 h-3.5" /> Settings
        </button>
      </div>
    </div>
  );
};

export default TopBar;
