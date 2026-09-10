import { Activity, AlertTriangle, Siren, ShieldAlert } from "lucide-react";

export default function StatCards({ statistics }) {
  const cards = [
    {
      title: "Total Events",
      value: statistics.total_events ?? 0,
      icon: Activity,
      color: "blue",
      subtext: "Ingested security logs",
    },
    {
      title: "Total Incidents",
      value: statistics.total_incidents ?? 0,
      icon: AlertTriangle,
      color: "orange",
      subtext: "Correlated threat detections",
    },
    {
      title: "Critical Incidents",
      value: statistics.critical_incidents ?? 0,
      icon: Siren,
      color: "red",
      subtext: "Immediate triage priority",
      alert: (statistics.critical_incidents ?? 0) > 0,
    },
    {
      title: "Open Incidents",
      value: statistics.open_incidents ?? 0,
      icon: ShieldAlert,
      color: "purple",
      subtext: "Active investigation backlog",
    },
  ];

  return (
    <section className="stats-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            className={`stat-card stat-${card.color} ${card.alert ? "has-alert" : ""}`}
            key={card.title}
          >
            <div className="stat-card-top">
              <div className={`stat-icon ${card.color}`}>
                <Icon size={22} />
              </div>
              {card.alert && (
                <span className="critical-action-badge">ACTION REQUIRED</span>
              )}
            </div>

            <div className="stat-card-content">
              <span className="stat-title">{card.title}</span>
              <strong className="stat-value">
                {card.value.toLocaleString()}
              </strong>
              <span className="stat-subtext">{card.subtext}</span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
