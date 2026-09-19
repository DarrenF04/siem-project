import { CheckCircle2, Cpu, ShieldCheck, Activity, Terminal } from "lucide-react";

export default function EngineStatus({ statistics }) {
  return (
    <section className="engine-status-banner">
      <div className="pipeline-status-left">
        <div className="engine-pulse-circle">
          <CheckCircle2 size={18} className="text-green" />
        </div>
        <div className="pipeline-text-group">
          <div className="pipeline-title-line">
            <span className="pipeline-title">SIEM Correlation Pipeline</span>
            <span className="pipeline-status-badge">Operational</span>
          </div>
          <span className="pipeline-subtitle">
            Continuous background log indexing & automated threat correlation active (2s polling)
          </span>
        </div>
      </div>

      <div className="pipeline-status-right">
        <div className="pipeline-stat-item">
          <span className="stat-item-label">Ingested Events</span>
          <span className="stat-item-num">
            {(statistics.total_events ?? 0).toLocaleString()}
          </span>
        </div>

        <div className="pipeline-stat-divider" />

        <div className="pipeline-stat-item">
          <span className="stat-item-label">Active Threat Rules</span>
          <span className="stat-item-num">4 Vectors</span>
        </div>

        <div className="pipeline-stat-divider" />

        <div className="pipeline-stat-item">
          <span className="stat-item-label">Open Threats</span>
          <span className="stat-item-num stat-alert">
            {statistics.open_incidents ?? 0}
          </span>
        </div>
      </div>
    </section>
  );
}
