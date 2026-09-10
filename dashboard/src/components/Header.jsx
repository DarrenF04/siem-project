import { RefreshCw, Shield, AlertOctagon } from "lucide-react";

export default function Header({
  lastUpdated,
  onRefresh,
  isRefreshing,
  statistics,
}) {
  // Compute threat condition level
  let threatLevel = {
    label: "NORMAL",
    colorClass: "threat-normal",
    description: "Low Threat Activity",
  };

  if (statistics.critical_incidents > 0) {
    threatLevel = {
      label: "CRITICAL",
      colorClass: "threat-critical",
      description: `${statistics.critical_incidents} Critical Incident${statistics.critical_incidents > 1 ? "s" : ""}`,
    };
  } else if (statistics.high_incidents > 0) {
    threatLevel = {
      label: "HIGH",
      colorClass: "threat-high",
      description: `${statistics.high_incidents} High Incident${statistics.high_incidents > 1 ? "s" : ""}`,
    };
  } else if (statistics.medium_incidents > 0) {
    threatLevel = {
      label: "ELEVATED",
      colorClass: "threat-elevated",
      description: `${statistics.medium_incidents} Medium Alert${statistics.medium_incidents > 1 ? "s" : ""}`,
    };
  }

  return (
    <header className="header">
      <div className="header-left">
        <div className="header-title-wrap">
          <div className="header-kicker">
            <span>THREAT TELEMETRY & INCIDENT RESPONSE</span>
          </div>
          <h1>Security Operations Center</h1>
          <p>Real-time security monitoring and incident analysis</p>
        </div>
      </div>

      <div className="header-right">
        {/* Threat Level Banner */}
        <div className={`threat-condition-card ${threatLevel.colorClass}`}>
          <div className="threat-condition-icon">
            {threatLevel.label === "CRITICAL" ? (
              <AlertOctagon size={18} />
            ) : (
              <Shield size={18} />
            )}
          </div>
          <div className="threat-condition-text">
            <span className="threat-condition-label">DEFCON POSTURE</span>
            <strong>{threatLevel.label}</strong>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="live-status">
          <span className="live-dot"></span>
          <div className="live-status-info">
            <strong>LIVE MONITORING</strong>
            <span>
              {lastUpdated
                ? `Updated ${lastUpdated.toLocaleTimeString()}`
                : "Connecting..."}
            </span>
          </div>
        </div>

        {/* Sync Now Button */}
        <button
          className={`refresh-button ${isRefreshing ? "refreshing" : ""}`}
          onClick={onRefresh}
          title="Force immediate telemetry synchronization"
          type="button"
        >
          <RefreshCw size={15} className={isRefreshing ? "spin-icon" : ""} />
          <span>Sync Now</span>
        </button>
      </div>
    </header>
  );
}
