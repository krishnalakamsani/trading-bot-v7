import React, { useContext, useState, useEffect, useRef } from "react";
import { AppContext } from "@/App";
import { Activity } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip
} from "recharts";

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 4, padding: "4px 8px" }}>
      <p style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: "var(--accent)" }}>
        {payload[0]?.value?.toFixed(2)}
      </p>
    </div>
  );
};

const NiftyTracker = () => {
  const { marketData, candleHistory, config, botStatus } = useContext(AppContext);
  const [flashClass, setFlashClass] = useState("");
  const [dir, setDir] = useState(""); // "up" | "dn"
  const prevLtpRef = useRef(marketData.ltp);

  useEffect(() => {
    if (marketData.ltp > 0 && marketData.ltp !== prevLtpRef.current) {
      const up = marketData.ltp > prevLtpRef.current;
      setFlashClass(up ? "flash-green" : "flash-red");
      setDir(up ? "up" : "dn");
      setTimeout(() => setFlashClass(""), 350);
      prevLtpRef.current = marketData.ltp;
    }
  }, [marketData.ltp]);

  const mdsDirection = String(botStatus?.mds_direction || "NONE");
  const isCE = mdsDirection === "CE";
  const selectedIndex = config.selected_index || "NIFTY";
  const candleInterval = botStatus.candle_interval || config.candle_interval || 5;
  const showMds = String(config?.indicator_type || "").toLowerCase() === "score_mds";
  const mdsScore = Number(botStatus?.mds_score ?? 0);
  const mdsConfidence = Number(botStatus?.mds_confidence ?? 0);
  const mdsIsChoppy = Boolean(botStatus?.mds_is_choppy);

  const formatTf = (s) => {
    if (s < 60) return `${s}s`;
    return `${s / 60}m`;
  };

  const scoreColor = mdsScore > 6 ? "var(--profit)" : mdsScore < -6 ? "var(--loss)" : "var(--text-secondary)";
  const chartColor = candleHistory.length > 1
    ? (candleHistory.at(-1).price >= candleHistory[0].price ? "#00e676" : "#ff4d6d")
    : "#3b8eea";

  return (
    <div className="terminal-card" data-testid="nifty-tracker">
      <div className="terminal-card-header">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
          <h2 className="text-sm font-semibold" style={{ fontFamily: "Syne", color: "var(--text-primary)" }}>
            {selectedIndex} Live Feed
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded"
            style={{ background: "var(--bg-inset)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
            {formatTf(candleInterval)} candle
          </span>
          <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>{candleHistory.length} bars</span>
        </div>
      </div>

      <div className="p-4">
        {/* Top row: LTP + signal cards */}
        <div className="flex items-stretch gap-3 mb-4">
          {/* LTP — big */}
          <div className={`flex-1 inset-box ${flashClass}`} style={{ paddingTop: "0.875rem", paddingBottom: "0.875rem" }}>
            <p className="label-text mb-1">{selectedIndex} LTP</p>
            <p
              className={`font-mono font-bold tracking-tight leading-none ${dir === "up" ? "num-up" : dir === "dn" ? "num-dn" : ""}`}
              style={{ fontSize: "2.2rem", color: dir === "up" ? "var(--profit)" : dir === "dn" ? "var(--loss)" : "var(--text-primary)" }}
              data-testid="nifty-ltp"
            >
              {marketData.ltp > 0
                ? marketData.ltp.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : "—"}
            </p>
          </div>

          {/* Signal */}
          <div className="inset-box flex flex-col justify-center items-center" style={{ minWidth: 80 }}>
            <p className="label-text mb-1.5">Signal</p>
            <p className="font-mono font-bold text-lg leading-none"
              style={{ color: isCE ? "var(--profit)" : mdsDirection === "PE" ? "var(--loss)" : "var(--text-dim)" }}
              data-testid="signal-direction">
              {mdsDirection}
            </p>
            <div className="mt-1.5 w-2 h-2 rounded-full"
              style={{ background: isCE ? "var(--profit)" : mdsDirection === "PE" ? "var(--loss)" : "var(--text-dim)", boxShadow: isCE ? "0 0 6px var(--profit)" : mdsDirection === "PE" ? "0 0 6px var(--loss)" : "none" }} />
          </div>

          {/* MDS Score */}
          {showMds && (
            <div className="inset-box flex flex-col justify-center" style={{ minWidth: 110 }}>
              <p className="label-text mb-1">MDS Score</p>
              <p className="font-mono font-bold text-xl leading-none" style={{ color: scoreColor }} data-testid="mds-score">
                {Number.isFinite(mdsScore) ? mdsScore.toFixed(1) : "—"}
              </p>
              <p className="font-mono mt-1.5" style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }} data-testid="mds-meta">
                {mdsIsChoppy ? "⚡ CHOP" : `Conf ${Number.isFinite(mdsConfidence) ? (mdsConfidence * 100).toFixed(0) : "—"}%`}
              </p>
            </div>
          )}
        </div>

        {/* Chart */}
        <div
          className="rounded-md overflow-hidden"
          style={{ height: 160, background: "var(--bg-inset)", border: "1px solid var(--border)" }}
        >
          {candleHistory.length > 2 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={candleHistory} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={chartColor} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: "var(--text-dim)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9, fill: "var(--text-dim)" }} axisLine={false} tickLine={false} width={55} tickFormatter={(v) => v.toFixed(0)} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="price" stroke={chartColor} strokeWidth={1.5} fill="url(#pg)" dot={false} animationDuration={0} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center" style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>
              Waiting for candles…
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NiftyTracker;
