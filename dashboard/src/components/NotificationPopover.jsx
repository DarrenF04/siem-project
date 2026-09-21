import { useEffect, useRef } from "react";
import {
  Bell,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  X,
  ChevronRight,
  MapPin,
  ExternalLink,
  Clock,
  ShieldCheck,
} from "lucide-react";

function formatRelativeTime(ts) {
  if (!ts) return "Just now";
  const clean = String(ts).replace("T", " ");
  if (clean.includes(".")) {
    return clean.split(".")[0];
  }
  return clean.slice(0, 19);
}

export default function NotificationPopover({
  isOpen,
  onClose,
  alerts = [],
  onDismissAlert,
  onDismissAllAlerts,
  onSelectIncident,
  incidents = [],
  onNavigate,
}) {
  const popoverRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose();
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Recent incidents fallback when no active un-dismissed alerts
  const recentIncidents = (incidents || []).slice(0, 4);

  const handleOpenIncident = (inc) => {
    onSelectIncident(inc);
    onClose();
  };

  const handleNavigateIncidents = () => {
    if (onNavigate) {
      onNavigate("incidents");
    }
    onClose();
  };

  return (
    <div
      className="notifications-dropdown-menu"
      ref={popoverRef}
      role="dialog"
      aria-label="Security Notifications"
    >
      {/* 1. Header */}
      <div className="notif-header">
        <div className="notif-header-left">
          <Bell size={15} className="notif-title-bell" />
          <h4 className="notif-title">Security Notifications</h4>
          {alerts.length > 0 && (
            <span className="notif-badge-count">{alerts.length} Active</span>
          )}
        </div>

        {alerts.length > 0 && (
          <button
            type="button"
            className="notif-btn-clear-all"
            onClick={onDismissAllAlerts}
            title="Dismiss all active alerts"
          >
            Clear All
          </button>
        )}
      </div>

      {/* 2. Scrollable Body */}
      <div className="notif-body">
        {/* Section A: Active Live Security Alerts */}
        {alerts.length > 0 ? (
          <div className="notif-alerts-section">
            <div className="notif-section-label">Live Threat Alerts</div>
            {alerts.map((alert) => {
              const isCritical =
                alert.severity === "CRITICAL" || (alert.riskScore ?? 0) >= 80;
              const locationText = alert.country || "Not Reported";

              return (
                <div
                  key={alert.id}
                  className={`notif-alert-item ${isCritical ? "is-critical" : "is-high"}`}
                  onClick={() => handleOpenIncident(alert.incident)}
                  tabIndex={0}
                  role="button"
                  title="Click to investigate incident"
                >
                  <div className="notif-item-top">
                    <div className="notif-item-title-row">
                      <span
                        className={`notif-beacon-dot ${isCritical ? "beacon-red" : "beacon-amber"}`}
                      />
                      <span className="notif-attack-title">
                        {(alert.attackType || "ATTACK").replaceAll("_", " ")}
                      </span>
                      {alert.isEscalation && (
                        <span className="notif-escalated-tag">ESCALATED</span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="notif-item-dismiss-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDismissAlert(alert.id);
                      }}
                      title="Dismiss alert"
                      aria-label="Dismiss alert"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  <div className="notif-item-details">
                    <span className="notif-ip-mono">{alert.sourceIp}</span>
                    <span className="notif-dot-sep">·</span>
                    <span className="notif-loc-text">
                      <MapPin size={11} className="notif-pin-icon" />
                      {locationText}
                    </span>
                  </div>

                  <div className="notif-item-footer">
                    <div className="notif-meta-tags">
                      <span
                        className={`badge-pill-compact sev-${alert.severity?.toLowerCase() || "high"}`}
                      >
                        <span className="pill-dot" />
                        {alert.severity}
                      </span>
                      <span className="notif-risk-tag">
                        Risk <strong>{alert.riskScore}</strong>/100
                      </span>
                    </div>

                    <span className="notif-item-action-link">
                      <span>Investigate</span>
                      <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Section B: Empty State + Recent Activity */
          <div className="notif-empty-state-wrap">
            <div className="notif-empty-box">
              <ShieldCheck size={26} className="notif-empty-icon text-green" />
              <span className="notif-empty-heading">No Active Alerts</span>
              <p className="notif-empty-sub">
                All correlation rules and monitored IPs are within normal thresholds.
              </p>
            </div>

            {recentIncidents.length > 0 && (
              <div className="notif-recent-incidents-section">
                <div className="notif-section-label">Recent Incident Activity</div>
                {recentIncidents.map((inc) => {
                  const isCrit = inc.severity === "CRITICAL";
                  return (
                    <div
                      key={inc.id}
                      className="notif-recent-item"
                      onClick={() => handleOpenIncident(inc)}
                      tabIndex={0}
                      role="button"
                    >
                      <div className="recent-item-left">
                        <span className="recent-item-id">#{inc.id}</span>
                        <div className="recent-item-info">
                          <span className="recent-item-name">
                            {(inc.attack_type || inc.incident_type || "INCIDENT").replaceAll("_", " ")}
                          </span>
                          <span className="recent-item-ip">{inc.source_ip}</span>
                        </div>
                      </div>

                      <div className="recent-item-right">
                        <span
                          className={`badge-pill-compact sev-${inc.severity?.toLowerCase() || "info"}`}
                        >
                          {inc.severity}
                        </span>
                        <span className="recent-item-risk">{inc.risk_score}/100</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Footer */}
      <div className="notif-footer">
        <button
          type="button"
          className="notif-footer-btn"
          onClick={handleNavigateIncidents}
        >
          <span>View All Incidents</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
