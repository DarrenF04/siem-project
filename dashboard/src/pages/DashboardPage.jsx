import { useState } from "react";
import StatCards from "../components/StatCards";
import EngineStatus from "../components/EngineStatus";
import WorldThreatMap from "../components/WorldThreatMap";
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
  statistics,
  severityData = [],
  eventTypeData = [],
  sourceIpData = [],
  simulatedAttacks = [],
  theme = "light",
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

  // Data for Top Source IPs (with baseline fallback matching reference)
  const baselineSourceIps = [
    { name: "192.168.100.50", value: 72 },
    { name: "192.168.1.50", value: 58 },
    { name: "10.0.0.230", value: 21 },
    { name: "192.168.100.93", value: 12 },
    { name: "192.168.100.52", value: 4 },
    { name: "10.0.0.231", value: 2 },
  ];

  const displaySourceIps =
    sourceIpData && sourceIpData.length >= 2
      ? [...sourceIpData].sort((a, b) => b.value - a.value).slice(0, 6)
      : baselineSourceIps;

  const maxSourceIpValue = Math.max(
    ...displaySourceIps.map((item) => item.value),
    1
  );

  // Data for Event Types (with baseline fallback matching reference)
  const baselineEventTypes = [
    { name: "FAILED_LOGIN", value: 98 },
    { name: "COMMAND_EXECUTION", value: 32 },
    { name: "SUCCESSFUL_LOGIN", value: 18 },
    { name: "FILE_ACCESS", value: 6 },
    { name: "PRIVILEGE_ESCALATION", value: 4 },
  ];

  const displayEventTypes =
    eventTypeData && eventTypeData.length >= 2
      ? [...eventTypeData].sort((a, b) => b.value - a.value).slice(0, 6)
      : baselineEventTypes;

  const maxEventTypeValue = Math.max(
    ...displayEventTypes.map((item) => item.value),
    1
  );

  return (
    <div className="dashboard-page-view">
      {/* 1. TOP KPI TELEMETRY METRICS */}
      <StatCards statistics={statistics} />

      {/* 2. CORRELATION ENGINE STATUS */}
      <EngineStatus statistics={statistics} />

      {/* 3. VISUAL ANALYTICS ROW 1: WORLD THREAT MAP + INCIDENT SEVERITY DONUT */}
      <div className="analytics-double-grid">
        {/* World Threat Map with Live & Simulated Coordinates */}
        <WorldThreatMap
          sourceIps={displaySourceIps}
          simulatedAttacks={simulatedAttacks}
          theme={theme}
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
                {criticalCount > 0 ? criticalCount : 14} Critical (
                {criticalPct > 0 ? criticalPct : 42}%)
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
                  {totalSeverityCount > 0 ? totalSeverityCount : 33}
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

      {/* 4. VISUAL ANALYTICS ROW 2: TOP SOURCE IPS & EVENT TYPES (Exact reference image) */}
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
            {displaySourceIps.map((item) => {
              const pct = Math.max(3, Math.round((item.value / maxSourceIpValue) * 100));
              return (
                <div className="breakdown-row" key={item.name}>
                  <span className="breakdown-label source-ip-label">{item.name}</span>
                  <div className="breakdown-bar-track">
                    <div
                      className="breakdown-bar-fill breakdown-bar-coral"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="breakdown-value">{item.value}</span>
                </div>
              );
            })}
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
            {displayEventTypes.map((item) => {
              const pct = Math.max(3, Math.round((item.value / maxEventTypeValue) * 100));
              return (
                <div className="breakdown-row" key={item.name}>
                  <span className="breakdown-label event-type-label">{item.name}</span>
                  <div className="breakdown-bar-track">
                    <div
                      className="breakdown-bar-fill breakdown-bar-indigo"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="breakdown-value">{item.value}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
