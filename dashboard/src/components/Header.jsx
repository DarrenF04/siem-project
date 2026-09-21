import { useState } from "react";
import {
  Shield,
  RefreshCw,
  Sun,
  Moon,
  Bell,
  Plus,
} from "lucide-react";
import NotificationPopover from "./NotificationPopover";

export default function Header({
  lastUpdated,
  onRefresh,
  isRefreshing,
  statistics,
  theme = "light",
  onToggleTheme,
  activePage = "dashboard",
  onNavigate,
  alerts = [],
  onDismissAlert,
  onDismissAllAlerts,
  onSelectIncident,
  incidents = [],
}) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "incidents", label: "Incidents" },
    { id: "events", label: "Events" },
    { id: "simulator", label: "Simulator" },
  ];

  const hasCritical = (statistics.critical_incidents ?? 0) > 0;
  const hasHigh = (statistics.high_incidents ?? 0) > 0;

  // Dynamic titles per page
  const pageTitles = {
    dashboard: "Security Operations Overview",
    incidents: "Security Incidents Queue",
    events: "Live Security Event",
    simulator: "Attack Simulation & Testing Console",
  };

  return (
    <div className="top-shell">
      {/* 1. TOP NAVBAR (Floating Pill Navigation) */}
      <nav className="top-navbar">
        {/* Left: Brand Identity */}
        <div
          className="brand-group"
          onClick={() => onNavigate && onNavigate("dashboard")}
          role="button"
          tabIndex={0}
          title="Return to Dashboard"
        >
          <div className="brand-logo-mark">
            <Shield size={18} />
          </div>
          <span className="brand-logo-name">SIEM Console</span>
        </div>

        {/* Center: Floating Pill Navigation Tabs (Open Dedicated Pages) */}
        <div className="nav-pill-bar">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                className={`nav-pill-btn ${isActive ? "active" : ""}`}
                onClick={() => onNavigate && onNavigate(item.id)}
                type="button"
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Right: Actions & Profile */}
        <div className="top-actions-group">
          {/* Theme Switcher Circle */}
          <button
            className="icon-circle-btn theme-btn"
            onClick={onToggleTheme}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            type="button"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Telemetry Refresh Circle */}
          <button
            className={`icon-circle-btn refresh-btn ${isRefreshing ? "refreshing" : ""}`}
            onClick={onRefresh}
            title="Refresh live telemetry"
            type="button"
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? "spin-icon" : ""} />
          </button>

          {/* Alert Status Bell with live badge and Dropdown */}
          <div className="notif-bell-wrapper">
            <button
              type="button"
              className={`icon-circle-btn alert-bell-btn ${
                alerts.length > 0
                  ? alerts.some((a) => a.severity === "CRITICAL" || (a.riskScore ?? 0) >= 80)
                    ? "has-critical"
                    : "has-high"
                  : hasCritical
                  ? "has-critical"
                  : hasHigh
                  ? "has-high"
                  : "normal"
              }`}
              onClick={() => setIsNotifOpen((prev) => !prev)}
              title={
                alerts.length > 0
                  ? `${alerts.length} live security alert(s) active`
                  : hasCritical
                  ? `${statistics.critical_incidents} Critical alerts active`
                  : hasHigh
                  ? `${statistics.high_incidents} High alerts active`
                  : "Security Notifications"
              }
              aria-expanded={isNotifOpen}
              aria-label="Toggle security notifications"
            >
              <Bell size={17} />
              {(alerts.length > 0 || hasCritical || hasHigh) && (
                <span className="alert-ping-dot" />
              )}
            </button>

            <NotificationPopover
              isOpen={isNotifOpen}
              onClose={() => setIsNotifOpen(false)}
              alerts={alerts}
              onDismissAlert={onDismissAlert}
              onDismissAllAlerts={onDismissAllAlerts}
              onSelectIncident={onSelectIncident}
              incidents={incidents}
              onNavigate={onNavigate}
            />
          </div>

          {/* Analyst Profile Avatar */}
          <div className="user-avatar-circle" title="SOC Security Analyst (Darren Fernandes)">
            <span className="avatar-initials">SOC</span>
          </div>
        </div>
      </nav>

      {/* 2. PAGE TITLE & QUICK ACTION BAR */}
      <div className="page-title-banner">
        <div className="page-title-left">
          <h1>{pageTitles[activePage] || "Security Operations Overview"}</h1>
        </div>

        <div className="page-title-right">
          <button
            className="btn-primary-pill"
            onClick={() => onNavigate && onNavigate("simulator")}
            type="button"
          >
            <Plus size={16} />
            <span>New Simulation</span>
          </button>
        </div>
      </div>
    </div>
  );
}
