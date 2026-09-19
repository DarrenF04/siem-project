import {
  Search,
  AlertTriangle,
  X,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";

export default function IncidentsSection({
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
}) {
  const isFiltered =
    incidentSearch !== "" ||
    incidentSeverity !== "ALL" ||
    incidentStatus !== "ALL" ||
    incidentAttackType !== "ALL";

  const clearFilters = () => {
    setIncidentSearch("");
    setIncidentSeverity("ALL");
    setIncidentStatus("ALL");
    setIncidentAttackType("ALL");
  };

  const getRiskColorClass = (score) => {
    if (score >= 80) return "critical";
    if (score >= 60) return "high";
    if (score >= 40) return "medium";
    return "low";
  };

  return (
    <section className="card modern-table-card incidents-panel" id="incidents-section">
      {/* CARD TOP: TITLE & COMPACT SEARCH */}
      <div className="card-header modern-table-header">
        <div className="card-title-wrap">
          <AlertTriangle size={15} className="card-title-icon text-muted" />
          <h3 className="modern-table-title">Security Incidents</h3>
        </div>

        {/* Compact Search Input */}
        <div className="search-field-compact">
          <Search size={14} className="search-field-icon" />
          <input
            type="text"
            placeholder="Search incidents..."
            value={incidentSearch}
            onChange={(e) => setIncidentSearch(e.target.value)}
          />
          {incidentSearch && (
            <button
              className="search-clear-action"
              onClick={() => setIncidentSearch("")}
              type="button"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* FILTER CONTROLS TOOLBAR */}
      <div className="modern-table-toolbar">
        <div className="modern-filters-row">
          <div className="filter-select-compact">
            <select
              value={incidentSeverity}
              onChange={(e) => setIncidentSeverity(e.target.value)}
              aria-label="Filter by severity"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div className="filter-select-compact">
            <select
              value={incidentStatus}
              onChange={(e) => setIncidentStatus(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="INVESTIGATING">Investigating</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          <div className="filter-select-compact">
            <select
              value={incidentAttackType}
              onChange={(e) => setIncidentAttackType(e.target.value)}
              aria-label="Filter by attack classification"
            >
              <option value="ALL">All Attack Types</option>
              {incidentAttackTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {isFiltered && (
            <button className="btn-filter-reset-compact" onClick={clearFilters} type="button">
              <X size={11} />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="modern-table-counter">
          {filteredIncidents.length} incident{filteredIncidents.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* MINIMAL ENTERPRISE DATA TABLE */}
      <div className="table-responsive">
        <table className="modern-enterprise-table incidents-table">
          <thead>
            <tr>
              <th style={{ width: "80px" }}>ID</th>
              <th>Incident</th>
              <th style={{ width: "160px" }}>Source IP</th>
              <th style={{ width: "130px" }}>Risk</th>
              <th style={{ width: "110px" }}>Severity</th>
              <th style={{ width: "120px" }}>Status</th>
              <th style={{ width: "80px", textAlign: "right" }}>Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="empty-cell">
                  <div className="empty-message-wrap">
                    <span className="loading-spinner" />
                    <span>Loading security incidents...</span>
                  </div>
                </td>
              </tr>
            ) : incidents.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-cell">
                  <div className="empty-message-wrap">
                    <AlertTriangle size={18} className="empty-state-icon text-muted" />
                    <span className="empty-title">No incidents detected</span>
                  </div>
                </td>
              </tr>
            ) : filteredIncidents.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-cell">
                  <div className="empty-message-wrap">
                    <Search size={20} className="empty-state-icon text-muted" />
                    <span className="empty-title">No matching incidents found</span>
                    <button className="btn-empty-reset" onClick={clearFilters} type="button">
                      Clear filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredIncidents.map((incident) => {
                const score = incident.risk_score || 0;
                const riskClass = getRiskColorClass(score);
                const sevKey = getSeverityClass(incident.severity);

                return (
                  <tr
                    key={incident.id}
                    className="modern-table-row"
                    onClick={() => onSelectIncident(incident)}
                    tabIndex={0}
                    title="Click to view full investigation workspace"
                  >
                    <td>
                      <span className="row-id-text">#{incident.id}</span>
                    </td>

                    <td>
                      <div className="incident-single-line">
                        <span className="incident-type-label">{incident.incident_type}</span>
                        {incident.attack_type && (
                          <span className="incident-subtle-tag">
                            {incident.attack_type.replaceAll("_", " ")}
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <span className="ip-mono-clean">{incident.source_ip}</span>
                    </td>

                    <td>
                      <div className="risk-cell-compact">
                        <div className="risk-mini-track">
                          <div
                            className={`risk-mini-fill risk-fill-${riskClass}`}
                            style={{ width: `${Math.min(100, Math.max(8, score))}%` }}
                          />
                        </div>
                        <span className="risk-score-text">
                          {score}
                          <span className="risk-score-denom">/100</span>
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className={`badge-pill-compact sev-${sevKey}`}>
                        <span className="pill-dot" />
                        {incident.severity}
                      </span>
                    </td>

                    <td>
                      <span className={`badge-pill-compact status-${(incident.status || "open").toLowerCase()}`}>
                        {incident.status || "OPEN"}
                      </span>
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="btn-action-view"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectIncident(incident);
                        }}
                        title="Investigate incident"
                      >
                        <span>View</span>
                        <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
