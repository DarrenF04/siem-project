import { useEffect, useState } from "react";
import {
  X,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Terminal,
  FileCode,
  ShieldCheck,
  FileDown,
  Loader2,
} from "lucide-react";

export default function InvestigationModal({
  selectedIncident,
  onClose,
  onUpdateStatus,
  events,
  getSeverityClass,
}) {
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!selectedIncident) return null;

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      const res = await fetch(`http://127.0.0.1:8000/reports/incidents/${selectedIncident.id}/pdf`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error (${res.status})`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const attackType = (selectedIncident.attack_type || "INCIDENT").replace(/\s+/g, "_");
      a.download = `SIEM_Incident_${selectedIncident.id}_${attackType}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Investigation PDF Export error:", err);
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const attackTypeFormatted = (
    selectedIncident.attack_type || "UNKNOWN"
  ).replaceAll("_", " ");

  const relatedEvents = events.filter(
    (event) => event.source_ip === selectedIncident.source_ip
  );

  const riskScore = selectedIncident.risk_score || 0;

  const getRiskScoreClass = (score) => {
    if (score >= 80) return "risk-critical";
    if (score >= 60) return "risk-high";
    if (score >= 40) return "risk-medium";
    return "risk-low";
  };

  const riskClass = getRiskScoreClass(riskScore);

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-window" onClick={(e) => e.stopPropagation()}>
        {/* MODAL HEADER */}
        <div className="modal-header">
          <div className="modal-title-row">
            <span className="id-badge">#{selectedIncident.id}</span>
            <h2>{selectedIncident.incident_type}</h2>
          </div>

          <div className="modal-header-actions">
            <button
              type="button"
              className="btn-modal-export-pdf"
              onClick={handleExportPdf}
              disabled={isExporting}
              title="Export Incident PDF Report"
            >
              {isExporting ? (
                <>
                  <Loader2 size={13} className="spin-icon" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <FileDown size={13} />
                  <span>Export PDF Report</span>
                </>
              )}
            </button>

            <button
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close investigation"
              type="button"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="modal-body">
          {/* PRIMARY INCIDENT METRICS GRID */}
          <div className="modal-metrics-grid">
            {/* Attack Classification */}
            <div className="modal-metric-card">
              <span className="modal-metric-label">Classification</span>
              <span className="badge-classification modal-classification-badge">
                {attackTypeFormatted}
              </span>
            </div>

            {/* Source IP */}
            <div className="modal-metric-card">
              <span className="modal-metric-label">Source IP</span>
              <code className="ip-mono modal-ip-large">{selectedIncident.source_ip}</code>
            </div>

            {/* Risk Score */}
            <div className="modal-metric-card">
              <span className="modal-metric-label">Risk Score</span>
              <div className="modal-risk-display">
                <span className={`modal-risk-value text-${riskClass}`}>{riskScore}</span>
                <span className="modal-risk-scale">/ 100</span>
              </div>
            </div>

            {/* Severity */}
            <div className="modal-metric-card">
              <span className="modal-metric-label">Severity</span>
              <span className={`badge-severity sev-${getSeverityClass(selectedIncident.severity)}`}>
                {selectedIncident.severity}
              </span>
            </div>

            {/* Reported Location */}
            <div className="modal-metric-card">
              <span className="modal-metric-label">Reported Location</span>
              <span className="country-clean-text" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                {selectedIncident.country || "—"}
              </span>
            </div>

            {/* Status Selector */}
            <div className="modal-metric-card status-change-card">
              <span className="modal-metric-label">Incident Status</span>
              <select
                value={selectedIncident.status || "OPEN"}
                onChange={(e) => onUpdateStatus(selectedIncident.id, e.target.value)}
                className={`status-select-control status-${(selectedIncident.status || "open").toLowerCase()}`}
                aria-label="Update incident status"
              >
                <option value="OPEN">OPEN</option>
                <option value="INVESTIGATING">INVESTIGATING</option>
                <option value="RESOLVED">RESOLVED</option>
              </select>
            </div>
          </div>

          {/* ATTACK KILL CHAIN / CORRELATION LOGIC */}
          <div className="modal-section-card">
            <div className="modal-section-title">
              <Activity size={15} className="section-icon" />
              <h4>Attack Kill Chain & Correlation</h4>
            </div>

            {selectedIncident.message && (
              <div className="correlation-narrative-box">
                <span className="narrative-label">Correlation Narrative</span>
                <p className="narrative-text">{selectedIncident.message}</p>
              </div>
            )}

            {/* 3-Step Sequence */}
            <div className="kill-chain-flow">
              {/* Step 1: Failed Logins */}
              <div className="chain-step">
                <div className="chain-step-header">
                  <Terminal size={13} />
                  <span>Phase 1: Infiltration</span>
                </div>
                <div className="chain-step-val">
                  <strong>{selectedIncident.failed_logins ?? 0}</strong>
                  <span>Failed Logins</span>
                </div>
              </div>

              <div className="chain-arrow">
                <ArrowRight size={16} />
              </div>

              {/* Step 2: Successful Login */}
              <div
                className={`chain-step ${
                  selectedIncident.successful_login ? "chain-breached" : "chain-normal"
                }`}
              >
                <div className="chain-step-header">
                  {selectedIncident.successful_login ? (
                    <XCircle size={13} className="text-critical" />
                  ) : (
                    <CheckCircle2 size={13} className="text-low" />
                  )}
                  <span>Phase 2: Auth</span>
                </div>
                <div className="chain-step-val">
                  <strong className={selectedIncident.successful_login ? "text-critical" : "text-low"}>
                    {selectedIncident.successful_login ? "COMPROMISED" : "BLOCKED"}
                  </strong>
                  <span>Login Success</span>
                </div>
              </div>

              <div className="chain-arrow">
                <ArrowRight size={16} />
              </div>

              {/* Step 3: Commands Executed */}
              <div className="chain-step">
                <div className="chain-step-header">
                  <FileCode size={13} />
                  <span>Phase 3: Execution</span>
                </div>
                <div className="chain-step-val">
                  <strong>{selectedIncident.command_executions ?? 0}</strong>
                  <span>Commands Executed</span>
                </div>
              </div>
            </div>
          </div>

          {/* RELATED SECURITY EVIDENCE */}
          <div className="modal-section-card">
            <div className="modal-section-title split-title">
              <div className="title-left">
                <Clock size={15} className="section-icon" />
                <h4>Correlated Security Events</h4>
              </div>
              <span className="evidence-count-pill">{relatedEvents.length} Events Logged</span>
            </div>

            <div className="modal-evidence-table-wrap">
              {relatedEvents.length === 0 ? (
                <div className="empty-subtext">No individual log events linked to this source IP.</div>
              ) : (
                <table className="mini-evidence-table">
                  <thead>
                    <tr>
                      <th style={{ width: "150px" }}>Timestamp</th>
                      <th style={{ width: "160px" }}>Event Type</th>
                      <th>Details</th>
                      <th style={{ width: "90px" }}>Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedEvents.slice(0, 15).map((ev) => (
                      <tr key={ev.id}>
                        <td className="time-mono">
                          {ev.timestamp ? ev.timestamp.replace("T", " ").slice(0, 19) : "-"}
                        </td>
                        <td>
                          <span className="badge-event-type">{ev.event_type}</span>
                        </td>
                        <td className="details-text-cell" title={ev.details}>
                          {ev.details}
                        </td>
                        <td>
                          <span className={`badge-severity sev-${getSeverityClass(ev.severity)}`}>
                            {ev.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

