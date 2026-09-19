import {
  Shield,
  LayoutDashboard,
  AlertTriangle,
  ScrollText,
  Radio,
  Crosshair,
} from "lucide-react";

export default function Sidebar({ activeSection, scrollToSection }) {
  const navItems = [
    { id: "dashboard-top", label: "Dashboard", icon: LayoutDashboard },
    { id: "incidents-section", label: "Incidents", icon: AlertTriangle },
    { id: "events-section", label: "Events", icon: ScrollText },
    { id: "sources-section", label: "Sources", icon: Radio },
    { id: "attack-simulator", label: "Attack Simulator", icon: Crosshair },
  ];

  return (
    <aside className="sidebar">
      {/* BRANDING */}
      <div
        className="sidebar-brand"
        onClick={() => scrollToSection("dashboard-top")}
        role="button"
        tabIndex={0}
      >
        <div className="brand-icon">
          <Shield size={17} />
        </div>
        <div className="brand-text">
          <span className="brand-title">SIEM Console</span>
          <span className="brand-subtitle">Operations Center</span>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              className={`nav-link ${isActive ? "active" : ""}`}
              onClick={() => scrollToSection(item.id)}
              type="button"
            >
              <Icon size={15} className="nav-link-icon" />
              <span className="nav-link-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* SYSTEM STATUS FOOTER */}
      <div className="sidebar-footer">
        <div className="engine-status-pill">
          <span className="status-indicator-dot" />
          <span className="engine-name">Engine Active</span>
        </div>
      </div>
    </aside>
  );
}
