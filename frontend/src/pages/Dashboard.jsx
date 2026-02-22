import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "@/App";
import TopBar from "@/components/TopBar";
import PositionPanel from "@/components/PositionPanel";
import ControlsPanel from "@/components/ControlsPanel";
import NiftyTracker from "@/components/NiftyTracker";
import TradesTable from "@/components/TradesTable";
import DailySummary from "@/components/DailySummary";
import LogsViewer from "@/components/LogsViewer";

const Dashboard = () => {
  const navigate = useNavigate();
  const context = useContext(AppContext);

  if (!context) return (
    <div className="h-screen flex items-center justify-center" style={{ background: "var(--bg-base)", color: "var(--text-dim)", fontFamily: "JetBrains Mono", fontSize: 13 }}>
      Initialising…
    </div>
  );

  return (
    <div className="h-screen flex flex-col" style={{ background: "var(--bg-base)" }} data-testid="dashboard">
      <TopBar onSettingsClick={() => navigate("/settings")} />
      <div className="flex-1 overflow-auto p-4 lg:p-5">
        <div className="bento-grid h-full">
          {/* Left — Position + Controls */}
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-3.5">
            <PositionPanel />
            <ControlsPanel />
          </div>
          {/* Centre — Chart + Trades */}
          <div className="col-span-12 lg:col-span-6 flex flex-col gap-3.5">
            <NiftyTracker />
            <TradesTable />
          </div>
          {/* Right — Summary + Logs */}
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-3.5">
            <DailySummary />
            <LogsViewer />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
