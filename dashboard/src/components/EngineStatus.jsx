import { ShieldAlert, Zap, Layers, CheckCircle2 } from "lucide-react";

export default function EngineStatus({ statistics }) {
  const totalIncidents = statistics.total_incidents || 0;

  const severityItems = [
    {
      label: "Critical",
      value: statistics.critical_incidents ?? 0,
      className: "critical",
      color: "#ef4444",
      pct:
        totalIncidents > 0
          ? Math.round(((statistics.critical_incidents ?? 0) / totalIncidents) * 100)
          : 0,
    },
    {
      label: "High",
      value: statistics.high_incidents ?? 0,
      className: "high",
      color: "#f97316",
      pct:
        totalIncidents > 0
          ? Math.round(((statistics.high_incidents ?? 0) / totalIncidents) * 100)
          : 0,
    },
    {
      label: "Medium",
      value: statistics.medium_incidents ?? 0,
      className: "medium",
      color: "#eab308",
      pct:
        totalIncidents > 0
          ? Math.round(((statistics.medium_incidents ?? 0) / totalIncidents) * 100)
          : 0,
    },
    {
      label: "Low",
      value: statistics.low_incidents ?? 0,
      className: "low",
      color: "#22c55e",
      pct:
        totalIncidents > 0
          ? Math.round(((statistics.low_incidents ?? 0) / totalIncidents) * 100)
          : 0,
    },
  ];

  return (
    <section className="content-grid">
      {/* SEVERITY BREAKDOWN */}
      <div className="panel severity-panel">
        <div className="panel-header">
          <div>
            <div className="panel-kicker">
              <Layers size={13} />
              <span>THREAT PROFILE</span>
            </div>
            <h2>Incident Severity</h2>
            <p>Current threat distribution across active alerts</p>
          </div>
        </div>

        <div className="severity-list">
          {severityItems.map((item) => (
            <div className="severity-row-group" key={item.label}>
              <div className="severity-row">
                <span className="severity-row-label">
                  <i className={`severity-dot ${item.className}`}></i>
                  {item.label}
                </span>
                <div className="severity-row-metrics">
                  <span className="severity-pct">{item.pct}%</span>
                  <strong className="severity-val">{item.value}</strong>
                </div>
              </div>
              <div className="severity-progress-track">
                <div
                  className={`severity-progress-fill ${item.className}`}
                  style={{ width: `${Math.max(item.pct, item.value > 0 ? 4 : 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DETECTION ENGINE STATUS */}
      <div className="panel engine-panel">
        <div className="panel-header">
          <div>
            <div className="panel-kicker">
              <Zap size={13} />
              <span>CORE PIPELINE</span>
            </div>
            <h2>Detection Engine</h2>
            <p>Current SIEM processing and rule correlation status</p>
          </div>
          <span className="engine-status-badge">
            <CheckCircle2 size={13} />
            <span>OPERATIONAL</span>
          </span>
        </div>

        <div className="engine-status">
          <div className="engine-icon-wrap">
            <div className="engine-icon">
              <ShieldAlert size={26} />
            </div>
          </div>

          <div className="engine-info">
            <strong>Correlation Engine Active</strong>
            <span>Continuous stream monitoring for intrusion patterns & IOCs</span>
          </div>
        </div>

        <div className="engine-stats">
          <div className="engine-stat-item">
            <div className="engine-stat-label">Events Processed</div>
            <strong className="engine-stat-value">
              {(statistics.total_events ?? 0).toLocaleString()}
            </strong>
            <span className="engine-stat-meta">In-memory telemetry buffer</span>
          </div>

          <div className="engine-stat-item threat-highlight">
            <div className="engine-stat-label">Open Threats</div>
            <strong className="engine-stat-value">
              {statistics.open_incidents ?? 0}
            </strong>
            <span className="engine-stat-meta">Unresolved incidents</span>
          </div>
        </div>
      </div>
    </section>
  );
}
