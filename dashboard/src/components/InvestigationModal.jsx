import { useEffect } from "react";
import {
  X,
  ShieldAlert,
  Flame,
  Globe,
  Gauge,
  Clock,
  ArrowRight,
  CheckCircle,
  XCircle,
  FileCode,
  Terminal,
  Activity,
  Layers,
} from "lucide-react";

export default function InvestigationModal({
  selectedIncident,
  onClose,
  onUpdateStatus,
  events,
  getSeverityClass,
}) {
  // Close on Escape key
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

  const attackTypeFormatted = (
    selectedIncident.attack_type || "UNKNOWN"
  ).replaceAll("_", " ");

  const relatedEvents = events.filter(
    (event) => event.source_ip === selectedIncident.source_ip
  );

  const riskScore = selectedIncident.risk_score || 0;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="investigation-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="investigation-header">
          <div className="investigation-title-group">
            <div className="investigation-kicker">
              <span className="investigation-label">SECURITY INCIDENT TRIAGE</span>
              <span className="investigation-id-pill">#{selectedIncident.id}</span>
            </div>
            <h2>{selectedIncident.incident_type}</h2>
            <p>
              Incident #{selectedIncident.id} &bull; Detected on host vector{" "}
              <code className="modal-ip-inline">{selectedIncident.source_ip}</code>
            </p>
          </div>

          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close investigation modal"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {/* INCIDENT OVERVIEW KPI CARDS */}
        <div className="investigation-grid">
          {/* Source IP */}
          <div className="investigation-card">
            <div className="card-kicker">
              <Globe size={12} />
              <span>SOURCE IP</span>
            </div>
            <strong className="investigation-ip">
              {selectedIncident.source_ip}
            </strong>
          </div>

          {/* Risk Score */}
          <div className="investigation-card">
            <div className="card-kicker">
              <Gauge size={12} />
              <span>RISK SCORE</span>
            </div>
            <div className="modal-risk-row">
              <strong className="modal-risk-val">{riskScore}</strong>
              <span className="modal-risk-total">/ 100</span>
            </div>
          </div>

          {/* Severity */}
          <div className="investigation-card">
            <div className="card-kicker">
              <ShieldAlert size={12} />
              <span>SEVERITY</span>
            </div>
            <span
              className={`severity ${getSeverityClass(
                selectedIncident.severity
              )}`}
            >
              <span className="severity-badge-dot"></span>
              {selectedIncident.severity}
            </span>
          </div>

          {/* Attack Type */}
          <div className="investigation-card">
            <div className="card-kicker">
              <Flame size={12} />
              <span>CLASSIFICATION</span>
            </div>
            <span className="attack-type modal-attack-tag">
              {attackTypeFormatted}
            </span>
          </div>

          {/* Status Control */}
          <div className="investigation-card status-control-card">
            <div className="card-kicker">
              <Activity size={12} />
              <span>INCIDENT STATUS</span>
            </div>
            <div className="status-control">
              <select
                value={selectedIncident.status || "OPEN"}
                onChange={(e) =>
                  onUpdateStatus(selectedIncident.id, e.target.value)
                }
                className={`status-select status-${(
                  selectedIncident.status || "OPEN"
                ).toLowerCase()}`}
              >
                <option value="OPEN">OPEN (Active Threat)</option>
                <option value="INVESTIGATING">INVESTIGATING (In Triage)</option>
                <option value="RESOLVED">RESOLVED (Closed)</option>
              </select>
            </div>
          </div>
        </div>

        {/* CORRELATION ANALYSIS */}
        <div className="investigation-section">
          <div className="section-title-wrap">
            <Layers size={15} className="text-purple" />
            <div>
              <h3>Attack Classification & Correlation</h3>
              <span className="section-sub">
                Rule-based event correlation and kill chain progression
              </span>
            </div>
          </div>

          {/* Banner */}
          <div className="attack-classification-banner">
            <div className="banner-left">
              <Flame size={18} className="banner-icon" />
              <div>
                <span>DETECTED ATTACK SIGNATURE</span>
                <strong>{attackTypeFormatted}</strong>
              </div>
            </div>
            <span className="banner-meta">MITRE ATT&CK ALIGNED</span>
          </div>

          {/* Message */}
          <div className="investigation-message-box">
            <span className="message-label">CORRELATION NARRATIVE</span>
            <p className="investigation-message">{selectedIncident.message}</p>
          </div>

          {/* 3-Step Correlation Flow */}
          <div className="flow-container">
            <span className="flow-title">ATTACK KILL CHAIN SEQUENCE</span>
            <div className="correlation-flow">
              {/* Step 1: Failed Logins */}
              <div className="flow-step">
                <div className="step-header">
                  <span className="step-num">STAGE 01</span>
                  <Terminal size={14} />
                </div>
                <strong>{selectedIncident.failed_logins ?? 0}</strong>
                <span>Failed Logins</span>
              </div>

              <div className="flow-arrow">
                <ArrowRight size={20} />
              </div>

              {/* Step 2: Successful Login */}
              <div
                className={`flow-step ${
                  selectedIncident.successful_login
                    ? "step-breached"
                    : "step-safe"
                }`}
              >
                <div className="step-header">
                  <span className="step-num">STAGE 02</span>
                  {selectedIncident.successful_login ? (
                    <XCircle size={14} className="text-red" />
                  ) : (
                    <CheckCircle size={14} className="text-green" />
                  )}
                </div>
                <strong
                  className={
                    selectedIncident.successful_login
                      ? "text-red"
                      : "text-green"
                  }
                >
                  {selectedIncident.successful_login ? "YES" : "NO"}
                </strong>
                <span>Successful Login</span>
              </div>

              <div className="flow-arrow">
                <ArrowRight size={20} />
              </div>

              {/* Step 3: Command Executions */}
              <div className="flow-step">
                <div className="step-header">
                  <span className="step-num">STAGE 03</span>
                  <FileCode size={14} />
                </div>
                <strong>{selectedIncident.command_executions ?? 0}</strong>
                <span>Commands Executed</span>
              </div>
            </div>
          </div>
        </div>

        {/* RELATED SECURITY EVENTS */}
        <div className="investigation-section">
          <div className="related-events-header">
            <div className="section-title-wrap">
              <Clock size={15} className="text-cyan" />
              <div>
                <h3>Related Security Events</h3>
                <p>
                  Events originating from or associated with source IP{" "}
                  <code className="modal-ip-inline">
                    {selectedIncident.source_ip}
                  </code>
                </p>
              </div>
            </div>

            <span className="event-count-badge">
              {relatedEvents.length} events logged
            </span>
          </div>

          <div className="related-events">
            {relatedEvents.length === 0 ? (
              <div className="no-related-events">
                No individual security events found matching this source IP.
              </div>
            ) : (
              relatedEvents.slice(0, 15).map((event) => (
                <div className="related-event" key={event.id}>
                  <div className="event-time">
                    {event.timestamp
                      ? event.timestamp.replace("T", " ").slice(0, 19)
                      : "-"}
                  </div>

                  <div className="event-type">
                    <span className="event-type-pill">{event.event_type}</span>
                  </div>

                  <div className="event-details" title={event.details}>
                    {event.details}
                  </div>

                  <div className="event-sev-wrap">
                    <span
                      className={`severity ${getSeverityClass(
                        event.severity
                      )}`}
                    >
                      {event.severity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
