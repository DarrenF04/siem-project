import { ShieldAlert, AlertTriangle, X, ChevronRight, MapPin, Radio, Clock, ShieldCheck } from "lucide-react";

/**
 * Cleanly format attack types into human-friendly alert headlines.
 */
function getAttackHeadline(attackType, isEscalation) {
  const clean = (attackType || "INCIDENT").replaceAll("_", " ").toUpperCase();
  if (clean.includes("ACCOUNT COMPROMISE")) {
    return "ACCOUNT COMPROMISE DETECTED";
  }
  if (clean.includes("CREDENTIAL")) {
    return "CREDENTIAL ATTACK DETECTED";
  }
  if (clean.includes("BRUTE FORCE")) {
    return "BRUTE FORCE ATTACK DETECTED";
  }
  if (clean.includes("COMMAND")) {
    return "SUSPICIOUS COMMAND EXECUTION DETECTED";
  }
  return `${clean} DETECTED`;
}

function formatAlertTimestamp(ts) {
  if (!ts) return "Just now";
  const clean = String(ts).replace("T", " ");
  if (clean.includes(".")) {
    return clean.split(".")[0];
  }
  return clean.slice(0, 19);
}

export default function LiveSecurityAlert({
  alerts = [],
  onDismissAlert,
  onDismissAll,
  onSelectIncident,
}) {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <section className="live-security-alerts-container" aria-live="assertive">
      {/* Alert Stack Header (if multiple attacks occurred) */}
      {alerts.length > 1 && (
        <div className="alert-stack-header">
          <div className="stack-header-left">
            <Radio size={14} className="pulse-radio-icon text-red" />
            <span className="stack-title">Active Security Alerts</span>
            <span className="stack-count-badge">{alerts.length} Pending</span>
          </div>
          <button
            type="button"
            className="btn-dismiss-all-alerts"
            onClick={onDismissAll}
            title="Dismiss all active alerts from dashboard view"
          >
            Dismiss All
          </button>
        </div>
      )}

      {/* Alert Cards Stack */}
      <div className="alert-cards-stack">
        {alerts.map((alert) => {
          const isCritical =
            alert.severity === "CRITICAL" || (alert.riskScore ?? 0) >= 80;
          const cardSeverityClass = isCritical ? "alert-critical" : "alert-high";
          const headline = getAttackHeadline(alert.attackType, alert.isEscalation);
          const locationDisplay = alert.country || "Not Reported";

          return (
            <div
              key={alert.id}
              className={`live-security-alert-card ${cardSeverityClass}`}
              role="alert"
            >
              {/* TOP ROW: Alert Banner & Actions */}
              <div className="alert-card-top">
                <div className="alert-title-block">
                  <span className={`alert-beacon-dot ${isCritical ? "beacon-red" : "beacon-amber"}`} />
                  <span className="alert-banner-heading">
                    {isCritical ? "CRITICAL SECURITY ALERT" : "LIVE SECURITY ALERT"}
                  </span>

                  {alert.isEscalation && (
                    <span className="badge-escalated" title="Incident risk score escalated">
                      ESCALATED
                    </span>
                  )}

                  <span className="alert-incident-pill">
                    INCIDENT #{alert.incidentId}
                  </span>
                </div>

                <div className="alert-card-actions-top">
                  <span className="alert-timestamp-text">
                    <Clock size={12} className="alert-clock-icon" />
                    {formatAlertTimestamp(alert.timestamp)}
                  </span>

                  <button
                    type="button"
                    className="alert-close-btn"
                    onClick={() => onDismissAlert(alert.id)}
                    title="Dismiss alert notification"
                    aria-label="Dismiss alert"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* MIDDLE ROW: Primary Attack Headline */}
              <div className="alert-card-headline-row">
                <h4 className="alert-headline-text">{headline}</h4>
              </div>

              {/* CONTENT GRID: Structured Telemetry Evidence */}
              <div className="alert-telemetry-grid">
                {/* 1. Source IP */}
                <div className="alert-telemetry-item">
                  <span className="telemetry-label">Source IP</span>
                  <code className="telemetry-value-ip">{alert.sourceIp}</code>
                </div>

                {/* 2. Reported Location */}
                <div className="alert-telemetry-item">
                  <span className="telemetry-label">Location</span>
                  <div className="telemetry-value-location">
                    <MapPin size={13} className="loc-pin-icon" />
                    <span className={alert.country ? "loc-country" : "loc-not-reported"}>
                      {locationDisplay}
                    </span>
                  </div>
                </div>

                {/* 3. Attack Type */}
                <div className="alert-telemetry-item">
                  <span className="telemetry-label">Attack Type</span>
                  <span className="telemetry-value-attack">
                    {alert.attackType || "UNKNOWN"}
                  </span>
                </div>

                {/* 4. Risk Score */}
                <div className="alert-telemetry-item">
                  <span className="telemetry-label">Correlated Risk</span>
                  <div className="alert-risk-flex">
                    <span className={`alert-risk-number ${isCritical ? "text-critical" : "text-high"}`}>
                      {alert.riskScore}
                    </span>
                    <span className="alert-risk-denom">/ 100</span>
                  </div>
                </div>

                {/* 5. Severity */}
                <div className="alert-telemetry-item">
                  <span className="telemetry-label">Severity</span>
                  <span className={`badge-pill-compact sev-${alert.severity?.toLowerCase() || "high"}`}>
                    <span className="pill-dot" />
                    {alert.severity}
                  </span>
                </div>
              </div>

              {/* BOTTOM ROW: Action Buttons */}
              <div className="alert-card-bottom">
                <button
                  type="button"
                  className="btn-alert-view-incident"
                  onClick={() => onSelectIncident(alert.incident)}
                  title="Open incident investigation modal"
                >
                  <span>View Incident</span>
                  <ChevronRight size={14} />
                </button>

                <button
                  type="button"
                  className="btn-alert-dismiss"
                  onClick={() => onDismissAlert(alert.id)}
                  title="Dismiss notification from dashboard view"
                >
                  Dismiss
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
