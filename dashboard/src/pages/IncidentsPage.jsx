import IncidentsSection from "../components/IncidentsSection";
import { Clock, Flame, CheckCircle2 } from "lucide-react";

export default function IncidentsPage({
  incidents,
  filteredIncidents,
  incidentSearch,
  setIncidentSearch,
  incidentSeverity,
  setIncidentSeverity,
  incidentStatus,
  setIncidentStatus,
  incidentAttackType,
  setIncidentAttackType,
  incidentAttackTypes,
  onSelectIncident,
  loading,
  getSeverityClass,
  statistics,
}) {
  const openCount = incidents.filter((i) => i.status === "OPEN").length;
  const investigatingCount = incidents.filter((i) => i.status === "INVESTIGATING").length;
  const resolvedCount = incidents.filter((i) => i.status === "RESOLVED").length;

  const criticalCount = incidents.filter((i) => i.severity === "CRITICAL").length;
  const highCount = incidents.filter((i) => i.severity === "HIGH").length;
  const mediumCount = incidents.filter((i) => i.severity === "MEDIUM").length;

  return (
    <div className="dedicated-page-view incidents-page-view">
      {/* TOP INCIDENT METRICS OVERVIEW */}
      <div className="page-summary-cards-grid">
        {/* Card 1: Triage Queue */}
        <div className="page-mini-card">
          <div className="mini-card-top">
            <span className="mini-card-title">Triage Queue</span>
            <Clock size={15} className="text-muted" />
          </div>
          <div className="mini-card-val-row">
            <span className="mini-card-big-num">{openCount + investigatingCount}</span>
            <span className="mini-card-tag text-muted">Pending Review</span>
          </div>
          <div className="mini-card-footer">
            <span className="queue-pill-minimal">{openCount} Open</span>
            <span className="queue-pill-minimal">{investigatingCount} Investigating</span>
            <span className="queue-pill-minimal">{resolvedCount} Resolved</span>
          </div>
        </div>

        {/* Card 2: Severity Overview */}
        <div className="page-mini-card">
          <div className="mini-card-top">
            <span className="mini-card-title">High Priority Alerts</span>
            <Flame size={15} className="text-muted" />
          </div>
          <div className="mini-card-val-row">
            <span className="mini-card-big-num">{criticalCount}</span>
            <span className="mini-card-tag text-red">Critical Severity</span>
          </div>
          <div className="mini-card-footer">
            <span className="sev-dot-item">
              <span className="dot dot-red" /> {criticalCount} Critical
            </span>
            <span className="sev-dot-item">
              <span className="dot dot-orange" /> {highCount} High
            </span>
            <span className="sev-dot-item">
              <span className="dot dot-amber" /> {mediumCount} Medium
            </span>
          </div>
        </div>

        {/* Card 3: Correlation Engine Health */}
        <div className="page-mini-card">
          <div className="mini-card-top">
            <span className="mini-card-title">Detection Health</span>
            <CheckCircle2 size={15} className="text-muted" />
          </div>
          <div className="mini-card-val-row">
            <span className="mini-card-big-num">{incidents.length}</span>
            <span className="mini-card-tag text-green">Correlated</span>
          </div>
          <div className="mini-card-footer">
            <span className="status-note-text">
              Automated multi-condition correlation rule engine active
            </span>
          </div>
        </div>
      </div>

      {/* FULL INCIDENTS MANAGEMENT TABLE */}
      <IncidentsSection
        incidents={incidents}
        filteredIncidents={filteredIncidents}
        incidentSearch={incidentSearch}
        setIncidentSearch={setIncidentSearch}
        incidentSeverity={incidentSeverity}
        setIncidentSeverity={setIncidentSeverity}
        incidentStatus={incidentStatus}
        setIncidentStatus={setIncidentStatus}
        incidentAttackType={incidentAttackType}
        setIncidentAttackType={setIncidentAttackType}
        incidentAttackTypes={incidentAttackTypes}
        onSelectIncident={onSelectIncident}
        loading={loading}
        getSeverityClass={getSeverityClass}
      />
    </div>
  );
}
