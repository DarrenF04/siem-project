import {
  ShieldAlert,
  Activity,
  Users,
  ArrowUpRight,
  Infinity,
  Plus,
} from "lucide-react";

export default function StatCards({ statistics }) {
  const handleJump = (targetId) => {
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const openIncidents = statistics.open_incidents ?? 0;
  const totalEvents = statistics.total_events ?? 0;
  const criticalIncidents = statistics.critical_incidents ?? 0;
  const totalIncidents = statistics.total_incidents ?? 0;
  const highIncidents = statistics.high_incidents ?? 0;

  return (
    <section className="kpi-cards-row">
      {/* ====================================================================
          CARD 1: ACTIVE INCIDENTS (Matches "Active Projects" in Reference)
          ==================================================================== */}
      <div className="reference-kpi-card color-green">
        <div className="kpi-top-row">
          <div className="kpi-icon-title-group">
            <div className="kpi-icon-concentric" title="Active Threat Incidents">
              <ShieldAlert size={18} />
            </div>
            <div className="kpi-title-stack">
              <span className="kpi-title-text">Active Incidents</span>
              <span className="kpi-pct-badge pct-red">↓ 12%</span>
            </div>
          </div>
          <button
            className="kpi-arrow-circle-btn"
            onClick={() => handleJump("incidents-section")}
            title="Jump to Incidents queue"
            type="button"
            aria-label="Jump to Incidents queue"
          >
            <ArrowUpRight size={15} />
          </button>
        </div>

        <div className="kpi-metric-row">
          <span className="kpi-big-number">{openIncidents}</span>
        </div>

        <div className="kpi-sub-line">
          <span>{totalIncidents} total logged</span>
          <span className="kpi-bullet-dot">•</span>
          <span>{highIncidents} high priority</span>
        </div>

        <div className="kpi-bottom-row">
          <div className="kpi-dynamic-wrap">
            <Infinity size={13} className="dynamic-icon" />
            <span className="kpi-dynamic-text">Dynamic of changes</span>
          </div>
          <span className="kpi-status-pill">Monthly</span>
        </div>
      </div>

      {/* ====================================================================
          CARD 2: TOTAL EVENTS (Matches "Total Tasks" in Reference)
          ==================================================================== */}
      <div className="reference-kpi-card color-blue">
        <div className="kpi-top-row">
          <div className="kpi-icon-title-group">
            <div className="kpi-icon-concentric" title="Total Ingested Log Events">
              <Activity size={18} />
            </div>
            <div className="kpi-title-stack">
              <span className="kpi-title-text">Total Events</span>
              <span className="kpi-pct-badge pct-green">↑ 23%</span>
            </div>
          </div>
          <button
            className="kpi-arrow-circle-btn"
            onClick={() => handleJump("events-section")}
            title="Jump to Events stream"
            type="button"
            aria-label="Jump to Events stream"
          >
            <ArrowUpRight size={15} />
          </button>
        </div>

        <div className="kpi-metric-row">
          <span className="kpi-big-number">{totalEvents.toLocaleString()}</span>
        </div>

        <div className="kpi-sub-line">
          <span>Continuous log parsing</span>
          <span className="kpi-bullet-dot">•</span>
          <span>2s live polling</span>
        </div>

        <div className="kpi-bottom-row">
          <div className="kpi-dynamic-wrap">
            <Infinity size={13} className="dynamic-icon" />
            <span className="kpi-dynamic-text">Dynamic of changes</span>
          </div>
          <span className="kpi-status-pill">Monthly</span>
        </div>
      </div>

      {/* ====================================================================
          CARD 3: CRITICAL THREATS & SOC (Matches "Team Members" in Reference)
          ==================================================================== */}
      <div className="reference-kpi-card color-pink">
        <div className="kpi-top-row">
          <div className="kpi-icon-title-group">
            <div className="kpi-icon-concentric" title="Critical Threats & SOC Team">
              <Users size={18} />
            </div>
            <div className="kpi-title-stack">
              <span className="kpi-title-text">Critical Alerts</span>
              <span className="kpi-pct-badge pct-pink">
                {criticalIncidents > 0 ? "Alert" : "Clean"}
              </span>
            </div>
          </div>
          <button
            className="kpi-arrow-circle-btn"
            onClick={() => handleJump("incidents-section")}
            title="Jump to Critical alerts"
            type="button"
            aria-label="Jump to Critical alerts"
          >
            <ArrowUpRight size={15} />
          </button>
        </div>

        <div className="kpi-metric-row">
          <span className="kpi-big-number">{criticalIncidents}</span>
        </div>

        <div className="kpi-sub-line">
          <span>Requires immediate triage</span>
          <span className="kpi-bullet-dot">•</span>
          <span>Automated containment</span>
        </div>

        <div className="kpi-bottom-row">
          <span className="kpi-manage-text">Active Responders</span>
          <div className="kpi-avatar-cluster">
            <button
              className="avatar-add-chip"
              onClick={() => handleJump("attack-simulator")}
              title="Add SOC Incident / Simulation"
              type="button"
              aria-label="Add SOC Simulation"
            >
              <Plus size={11} />
            </button>
            <div className="analyst-chip chip-1" title="Lead Security Analyst (Darren Fernandes)">
              <span>DF</span>
            </div>
            <div className="analyst-chip chip-2" title="SOC Tier-2 Responder">
              <span>SA</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
