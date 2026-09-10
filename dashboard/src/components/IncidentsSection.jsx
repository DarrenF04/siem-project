import {
  Search,
  AlertTriangle,
  X,
  ChevronRight,
  SlidersHorizontal,
  Flame,
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

  // Helper for risk score gradient/color
  const getRiskScoreColor = (score) => {
    if (score >= 80) return "risk-critical";
    if (score >= 60) return "risk-high";
    if (score >= 40) return "risk-medium";
    return "risk-low";
  };

  return (
    <section className="panel large-panel" id="incidents-section">
      <div className="panel-header section-header-split">
        <div>
          <div className="section-kicker">
            <AlertTriangle size={13} />
            <span>CORRELATED THREATS</span>
          </div>
          <h2>Security Incidents</h2>
          <p>Detected, correlated security threats requiring SOC intervention</p>
        </div>

        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search incident, IP, payload, ID..."
            value={incidentSearch}
            onChange={(e) => setIncidentSearch(e.target.value)}
          />
          {incidentSearch && (
            <button
              className="search-clear-btn"
              onClick={() => setIncidentSearch("")}
              type="button"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="incident-filters">
        <div className="filters-group">
          <div className="filter-select-wrapper">
            <SlidersHorizontal size={14} className="filter-icon" />
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

          <div className="filter-select-wrapper">
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

          <div className="filter-select-wrapper">
            <select
              value={incidentAttackType}
              onChange={(e) => setIncidentAttackType(e.target.value)}
              aria-label="Filter by attack type"
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
            <button className="clear-filters" onClick={clearFilters} type="button">
              <X size={14} />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="filter-result-count">
          Showing <strong>{filteredIncidents.length}</strong> of{" "}
          <strong>{incidents.length}</strong> incidents
        </div>
      </div>

      {/* INCIDENTS TABLE */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: "80px" }}>ID</th>
              <th>Incident</th>
              <th>Attack Classification</th>
              <th>Source IP</th>
              <th style={{ width: "160px" }}>Risk Score</th>
              <th>Severity</th>
              <th>Status</th>
              <th style={{ width: "40px" }}></th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="empty">
                  <div className="empty-state">
                    <span className="empty-spinner"></span>
                    <p>Loading security incidents from database...</p>
                  </div>
                </td>
              </tr>
            ) : incidents.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty">
                  <div className="empty-state">
                    <AlertTriangle size={32} className="empty-icon" />
                    <p>No incidents detected</p>
                    <span>All monitored vectors report no active threat correlations</span>
                  </div>
                </td>
              </tr>
            ) : filteredIncidents.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty">
                  <div className="empty-state">
                    <Search size={32} className="empty-icon" />
                    <p>No incidents match the current filters</p>
                    <button className="empty-reset-btn" onClick={clearFilters} type="button">
                      Clear search & filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredIncidents.map((incident) => {
                const score = incident.risk_score || 0;
                const riskColor = getRiskScoreColor(score);
                const attackTypeStr = (incident.attack_type || "UNKNOWN").replaceAll("_", " ");

                return (
                  <tr
                    key={incident.id}
                    className="incident-row"
                    onClick={() => onSelectIncident(incident)}
                    role="button"
                    tabIndex={0}
                  >
                    <td>
                      <span className="incident-id-tag">#{incident.id}</span>
                    </td>

                    <td>
                      <div className="incident-type-cell">
                        <strong>{incident.incident_type}</strong>
                        {incident.message && (
                          <span className="incident-preview-msg">
                            {incident.message.slice(0, 48)}
                            {incident.message.length > 48 ? "..." : ""}
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <span className="attack-type">
                        <Flame size={12} className="attack-type-icon" />
                        {attackTypeStr}
                      </span>
                    </td>

                    <td>
                      <span className="ip ip-pill">{incident.source_ip}</span>
                    </td>

                    <td>
                      <div className="risk-score-cell">
                        <div className="risk-score-bar-bg">
                          <div
                            className={`risk-score-bar-fill ${riskColor}`}
                            style={{ width: `${Math.min(100, Math.max(8, score))}%` }}
                          />
                        </div>
                        <span className={`risk-score ${riskColor}`}>
                          {score}
                          <span className="risk-max">/100</span>
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className={`severity ${getSeverityClass(incident.severity)}`}>
                        <span className="severity-badge-dot"></span>
                        {incident.severity}
                      </span>
                    </td>

                    <td>
                      <span className={`status ${incident.status?.toLowerCase()}`}>
                        {incident.status}
                      </span>
                    </td>

                    <td className="row-action-cell">
                      <div className="investigate-hint" title="Investigate Incident">
                        <ChevronRight size={16} />
                      </div>
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
