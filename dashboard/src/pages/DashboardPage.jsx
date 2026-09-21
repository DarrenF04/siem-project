import { useState, useMemo } from "react";
import StatCards from "../components/StatCards";
import EngineStatus from "../components/EngineStatus";
import WorldThreatMap from "../components/WorldThreatMap";
import LiveSecurityAlert from "../components/LiveSecurityAlert";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ChevronDown, ShieldAlert } from "lucide-react";

// Tooltip for severity donut chart
const DonutTooltip = ({ active, payload, theme }) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className={`chart-tooltip-bubble ${theme === "light" ? "light" : "dark"}`}>
        <div className="tooltip-label">{item.name} Severity</div>
        <div className="tooltip-stat">
          <span className="tooltip-dot" style={{ backgroundColor: item.payload?.fill || "#3b82f6" }} />
          <span className="tooltip-val">{Number(item.value).toLocaleString()}</span>
          <span className="tooltip-unit">incidents</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function DashboardPage({
  events = [],
  statistics,
  severityData = [],
  simulatedAttacks = [],
  theme = "light",
  alerts = [],
  onDismissAlert,
  onDismissAllAlerts,
  onSelectIncident,
}) {
  const [metricMode, setMetricMode] = useState("count"); // 'count' | 'percent'
  const isLight = theme === "light";

  const totalSeverityCount = severityData.reduce(
    (acc, cur) => acc + (cur.value || 0),
    0
  );

  const criticalItem = severityData.find((s) => s.name === "Critical");
  const criticalCount = criticalItem?.value || 0;
  const criticalPct =
    totalSeverityCount > 0
      ? Math.round((criticalCount / totalSeverityCount) * 100)
      : 0;

  const highItem = severityData.find((s) => s.name === "High");
  const highCount = highItem?.value || 0;
  const medLowCount = totalSeverityCount - (criticalCount + highCount);

  // Colors
  const pieStroke = isLight ? "#ffffff" : "#151720";

  // 1. TOP SOURCE IPS (Calculated dynamically from real events)
  const topSourceIps = useMemo(() => {
    if (!events || events.length === 0) return [];
    const counts = {};
    events.forEach((event) => {
      const ip = event.source_ip;
      if (ip) {
        counts[ip] = (counts[ip] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [events]);

  const maxSourceIpCount = topSourceIps.length > 0 ? topSourceIps[0].count : 1;

  // 2. EVENT TYPES (Calculated dynamically from real events)
  const topEventTypes = useMemo(() => {
    if (!events || events.length === 0) return [];
    const counts = {};
    events.forEach((event) => {
      const type = event.event_type;
      if (type) {
        counts[type] = (counts[type] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [events]);

  const maxEventTypeCount = topEventTypes.length > 0 ? topEventTypes[0].count : 1;

  // Map representation of source IPs for World Threat Map
  const mapSourceIps = useMemo(() => {
    return topSourceIps.map((item) => ({ name: item.ip, value: item.count }));
  }, [topSourceIps]);

  return (
    <div className="dashboard-page-view">
      {/* 0. LIVE SECURITY ALERT NOTIFICATION (IN-APP PROMINENT BANNER / STACK) */}
      <LiveSecurityAlert
        alerts={alerts}
        onDismissAlert={onDismissAlert}
        onDismissAll={onDismissAllAlerts}
        onSelectIncident={onSelectIncident}
      />

      {/* 1. TOP KPI TELEMETRY METRICS */}
      <StatCards statistics={statistics} />

      {/* 2. CORRELATION ENGINE STATUS */}
      <EngineStatus statistics={statistics} />

      {/* 3. VISUAL ANALYTICS ROW 1: WORLD THREAT MAP + INCIDENT SEVERITY DONUT */}
      <div className="analytics-double-grid">
        {/* World Threat Map with Truthful Telemetry Coordinates */}
        <WorldThreatMap
          events={events}
        />

        {/* Incident Severity Donut Card (Prominently Included) */}
        <div className="reference-analytic-card incident-posture-card">
          <div className="card-inner-top space-between">
            <div className="map-title-group">
              <ShieldAlert size={18} className="map-title-icon text-red" />
              <h3 className="card-standard-title">Incident Severity</h3>
            </div>
            <div className="metric-toggle-group">
              <button
                className={`toggle-pill-btn ${metricMode === "count" ? "active" : ""}`}
                onClick={() => setMetricMode("count")}
                type="button"
              >
                ∑
              </button>
              <button
                className={`toggle-pill-btn ${metricMode === "percent" ? "active" : ""}`}
                onClick={() => setMetricMode("percent")}
                type="button"
              >
                %
              </button>
            </div>
          </div>

          <div className="donut-center-stage">
            <div className="floating-segment-badge">
              <span className="badge-bullet-pink" />
              <span>
                {criticalCount} Critical ({criticalPct}%)
              </span>
            </div>

            <div className="donut-svg-container">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={severityData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={78}
                    paddingAngle={5}
                    stroke={pieStroke}
                    strokeWidth={3}
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip theme={theme} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-core-label">
                <span className="donut-core-number">
                  {totalSeverityCount}
                </span>
                <span className="donut-core-sub">incidents</span>
              </div>
            </div>
          </div>

          {/* Severity Progress Breakdown */}
          <div className="severity-progress-stack">
            {severityData.map((item) => {
              const pct =
                totalSeverityCount > 0
                  ? Math.round((item.value / totalSeverityCount) * 100)
                  : 0;

              return (
                <div className="severity-progress-row" key={item.name}>
                  <div className="progress-row-labels">
                    <span className="progress-name">{item.name}</span>
                    <span className="progress-counts">
                      {metricMode === "count"
                        ? `${item.value}/${totalSeverityCount}`
                        : `${pct}%`}
                    </span>
                  </div>
                  <div className="progress-track-bg">
                    <div
                      className="progress-fill-bar"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: item.fill,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. VISUAL ANALYTICS ROW 2: TOP SOURCE IPS & EVENT TYPES (100% Dynamic Telemetry) */}
      <div className="breakdown-double-grid">
        {/* Top Source IPs Card (Coral horizontal bars) */}
        <div className="breakdown-card">
          <div className="breakdown-header">
            <h3 className="breakdown-title">Top Source IPs</h3>
            <div className="time-range-pill" title="Filter time window">
              <span>Last 24 Hours</span>
              <ChevronDown size={13} />
            </div>
          </div>

          <div className="breakdown-list">
            {topSourceIps.length === 0 ? (
              <div className="breakdown-empty-state">No source activity</div>
            ) : (
              topSourceIps.map((item) => {
                const pct = (item.count / maxSourceIpCount) * 100;
                return (
                  <div className="breakdown-row" key={item.ip}>
                    <span className="breakdown-label source-ip-label">{item.ip}</span>
                    <div className="breakdown-bar-track">
                      <div
                        className="breakdown-bar-fill breakdown-bar-coral"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="breakdown-value">{item.count}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Event Types Card (Indigo horizontal bars) */}
        <div className="breakdown-card">
          <div className="breakdown-header">
            <h3 className="breakdown-title">Event Types</h3>
            <div className="time-range-pill" title="Filter time window">
              <span>Last 24 Hours</span>
              <ChevronDown size={13} />
            </div>
          </div>

          <div className="breakdown-list">
            {topEventTypes.length === 0 ? (
              <div className="breakdown-empty-state">No event activity</div>
            ) : (
              topEventTypes.map((item) => {
                const pct = (item.count / maxEventTypeCount) * 100;
                return (
                  <div className="breakdown-row" key={item.type}>
                    <span className="breakdown-label event-type-label">{item.type}</span>
                    <div className="breakdown-bar-track">
                      <div
                        className="breakdown-bar-fill breakdown-bar-indigo"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="breakdown-value">{item.count}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
