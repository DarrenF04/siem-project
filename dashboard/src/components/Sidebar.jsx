import {
  ShieldAlert,
  Activity,
  AlertTriangle,
  Server,
  Globe,
  Radio,
  Cpu,
} from "lucide-react";

export default function Sidebar({ activeSection, scrollToSection }) {
  const navItems = [
    { id: "dashboard-top", label: "Dashboard", icon: Activity },
    { id: "incidents-section", label: "Incidents", icon: AlertTriangle },
    { id: "events-section", label: "Events", icon: Server },
    { id: "sources-section", label: "Sources", icon: Globe },
  ];

  return (
    <aside className="sidebar">
      {/* BRANDING */}
      <div
        className="logo"
        onClick={() => scrollToSection("dashboard-top")}
        role="button"
        tabIndex={0}
      >
        <div className="logo-icon-wrapper">
          <div className="logo-icon">
            <ShieldAlert size={22} />
          </div>
        </div>

        <div className="logo-text">
          <div className="logo-title-row">
            <h2>SIEM</h2>
            <span className="logo-badge">SOC</span>
          </div>
          <span className="logo-subtitle">Security Center</span>
        </div>
      </div>

      {/* NAVIGATION */}
      <div className="nav-group-label">OPERATIONS</div>
      <nav>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? "active" : ""}`}
              onClick={() => scrollToSection(item.id)}
              type="button"
            >
              <Icon size={18} className="nav-icon" />
              <span className="nav-label">{item.label}</span>
              {isActive && <span className="active-indicator" />}
            </button>
          );
        })}
      </nav>

      {/* SYSTEM STATUS */}
      <div className="system-status-container">
        <div className="system-status">
          <div className="status-radar">
            <span className="status-dot"></span>
          </div>

          <div className="status-info">
            <div className="status-header">
              <strong>System Online</strong>
              <span className="status-tag">ACTIVE</span>
            </div>
            <span>SIEM Engine Active</span>
          </div>
        </div>

        <div className="system-meta">
          <div className="meta-item">
            <Cpu size={12} />
            <span>Detection Daemon 2.0</span>
          </div>
          <div className="meta-item">
            <Radio size={12} />
            <span>Poll: 2000ms</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
