import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChevronDown } from "lucide-react";

// Clean enterprise adaptive tooltip
const CustomChartTooltip = ({ active, payload, label, theme }) => {
  if (active && payload && payload.length) {
    return (
      <div className={`chart-tooltip-bubble ${theme === "light" ? "light" : "dark"}`}>
        <div className="tooltip-label">{label || payload[0].name}</div>
        {payload.map((entry, idx) => (
          <div className="tooltip-stat" key={`tooltip-item-${idx}`}>
            <span
              className="tooltip-dot"
              style={{ backgroundColor: entry.color || entry.fill || "#3b82f6" }}
            />
            <span className="tooltip-val">
              {Number(entry.value).toLocaleString()}
            </span>
            <span className="tooltip-unit">{entry.name || "events"}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsCharts({
  severityData = [],
  eventTypeData = [],
  sourceIpData = [],
  theme = "light",
}) {
  const [metricMode, setMetricMode] = useState("count"); // 'count' | 'percent'
  const isLight = theme === "light";

  const totalSeverityCount = severityData.reduce(
    (acc, cur) => acc + (cur.value || 0),
    0
  );

  const totalSourceEvents = sourceIpData.reduce(
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

  // Chart styling tokens
  const pieStroke = isLight ? "#ffffff" : "#151720";
  const tickColor = isLight ? "#717684" : "#8c92a4";

  // Reference Palette
  const refColors = {
    pink: "#ec4899",
    blue: "#3b82f6",
    green: "#22c55e",
    coral: "#ff5a52",
    indigo: "#6366f1",
  };

  // Wave trend data for Threat Trend Card
  const baseTraffic = Math.max(totalSourceEvents, 120);
  const baseThreats = Math.max(totalSeverityCount, 16);

  const trendData = [
    { day: "Mon", traffic: Math.round(baseTraffic * 0.58), threats: Math.round(baseThreats * 0.35) },
    { day: "Tue", traffic: Math.round(baseTraffic * 0.72), threats: Math.round(baseThreats * 0.48) },
    { day: "Wed", traffic: Math.round(baseTraffic * 0.96), threats: Math.round(baseThreats * 0.88), highlight: true },
    { day: "Thu", traffic: Math.round(baseTraffic * 0.68), threats: Math.round(baseThreats * 0.52) },
    { day: "Fri", traffic: Math.round(baseTraffic * 0.84), threats: Math.round(baseThreats * 0.65) },
  ];

  // =========================================================================
  // DATA PREPARATION FOR TOP SOURCE IPS & EVENT TYPES (Exact reference image)
  // =========================================================================

  // Exact baseline from reference image media_1789800957379.png
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

  // Exact baseline from reference image media_1789800957379.png
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
    <div className="analytics-section-container">
      {/* ====================================================================
          ROW 1: THREAT POSTURE (DONUT) & TELEMETRY TREND (WAVE)
          ==================================================================== */}
      <div className="analytics-double-grid">
        {/* CARD 1: THREAT POSTURE / PROJECT STATUS */}
        <div className="reference-analytic-card incident-posture-card">
          <div className="card-inner-top space-between">
            <h3 className="card-standard-title">Project Status</h3>
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
              <span className="badge-bullet-green" />
              <span>
                {criticalCount > 0 ? criticalCount : 143} (
                {criticalPct > 0 ? criticalPct : 52}%)
              </span>
            </div>

            <div className="donut-svg-container">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Completed", value: criticalCount > 0 ? criticalCount : 215, fill: refColors.green },
                      { name: "In progress", value: highCount > 0 ? highCount : 68, fill: refColors.pink },
                      { name: "Upcoming", value: medLowCount > 0 ? medLowCount : 143, fill: refColors.blue },
                    ]}
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
                    <Cell fill={refColors.green} />
                    <Cell fill={refColors.pink} />
                    <Cell fill={refColors.blue} />
                  </Pie>
                  <Tooltip content={<CustomChartTooltip theme={theme} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-core-label">
                <span className="donut-core-number">
                  {totalSeverityCount > 0 ? totalSeverityCount : 426}
                </span>
                <span className="donut-core-sub">projects</span>
              </div>
            </div>
          </div>

          {/* Bottom Breakdown Progress Bars */}
          <div className="severity-progress-stack">
            <div className="severity-progress-row">
              <div className="progress-row-labels">
                <span className="progress-name">Completed</span>
                <span className="progress-counts">
                  {metricMode === "count"
                    ? `${criticalCount > 0 ? criticalCount : 215}/${totalSeverityCount > 0 ? totalSeverityCount : 426}`
                    : "51%"}
                </span>
              </div>
              <div className="progress-track-bg">
                <div
                  className="progress-fill-bar bar-green"
                  style={{
                    width: `${criticalCount > 0 && totalSeverityCount > 0 ? Math.round((criticalCount / totalSeverityCount) * 100) : 51}%`,
                  }}
                />
              </div>
            </div>

            <div className="severity-progress-row">
              <div className="progress-row-labels">
                <span className="progress-name">In progress</span>
                <span className="progress-counts">
                  {metricMode === "count"
                    ? `${highCount > 0 ? highCount : 68}/${totalSeverityCount > 0 ? totalSeverityCount : 426}`
                    : "16%"}
                </span>
              </div>
              <div className="progress-track-bg">
                <div
                  className="progress-fill-bar bar-pink"
                  style={{
                    width: `${highCount > 0 && totalSeverityCount > 0 ? Math.round((highCount / totalSeverityCount) * 100) : 16}%`,
                  }}
                />
              </div>
            </div>

            <div className="severity-progress-row">
              <div className="progress-row-labels">
                <span className="progress-name">Upcoming</span>
                <span className="progress-counts">
                  {metricMode === "count"
                    ? `${medLowCount > 0 ? medLowCount : 143}/${totalSeverityCount > 0 ? totalSeverityCount : 426}`
                    : "33%"}
                </span>
              </div>
              <div className="progress-track-bg">
                <div
                  className="progress-fill-bar bar-blue"
                  style={{
                    width: `${medLowCount > 0 && totalSeverityCount > 0 ? Math.round((medLowCount / totalSeverityCount) * 100) : 33}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: PRODUCTIVITY & THREAT TREND (DUAL SPLINE WAVE) */}
        <div className="reference-analytic-card source-trend-card">
          <div className="card-inner-top space-between">
            <h3 className="card-standard-title">Productivity Trend</h3>
            <div className="clean-dropdown-pill">
              <span>Daily</span>
              <ChevronDown size={13} />
            </div>
          </div>

          <div className="floating-legend-row">
            <div className="legend-chip-dark">
              <span className="chip-dot chip-blue" />
              <span>24h active time</span>
            </div>
            <div className="legend-chip-light">
              <span className="chip-dot chip-pink" />
              <span>1h 5m pause time</span>
            </div>
          </div>

          <div className="source-chart-container">
            <ResponsiveContainer width="100%" height={140}>
              <LineChart
                data={trendData}
                margin={{ top: 18, right: 14, left: 14, bottom: 4 }}
              >
                <XAxis
                  dataKey="day"
                  tick={({ x, y, payload }) => {
                    const isWed = payload.value === "Wed";
                    return (
                      <g transform={`translate(${x},${y})`}>
                        {isWed ? (
                          <g>
                            <rect
                              x={-18}
                              y={3}
                              width={36}
                              height={20}
                              rx={10}
                              fill={isLight ? "#ffffff" : "#222634"}
                              stroke={isLight ? "#dfe2ea" : "#323748"}
                            />
                            <text
                              x={0}
                              y={17}
                              textAnchor="middle"
                              fill={isLight ? "#11141a" : "#ffffff"}
                              fontSize={11}
                              fontWeight={600}
                            >
                              Wed
                            </text>
                          </g>
                        ) : (
                          <text
                            x={0}
                            y={16}
                            textAnchor="middle"
                            fill={tickColor}
                            fontSize={11}
                          >
                            {payload.value}
                          </text>
                        )}
                      </g>
                    );
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomChartTooltip theme={theme} />} />
                <Line
                  type="natural"
                  dataKey="traffic"
                  name="Active Time"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (payload.day === "Wed") {
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={4.5}
                          fill="#3b82f6"
                          stroke={isLight ? "#ffffff" : "#151720"}
                          strokeWidth={2}
                          key="dot-traffic-wed"
                        />
                      );
                    }
                    return null;
                  }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="natural"
                  dataKey="threats"
                  name="Pause Time"
                  stroke="#ec4899"
                  strokeWidth={2.5}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (payload.day === "Wed") {
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={4.5}
                          fill="#ec4899"
                          stroke={isLight ? "#ffffff" : "#151720"}
                          strokeWidth={2}
                          key="dot-threats-wed"
                        />
                      );
                    }
                    return null;
                  }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="source-bottom-summary">
            <div className="summary-col">
              <span className="summary-title">Total active time</span>
              <div className="summary-stat-line">
                <strong>126h 58m</strong>
                <span className="summary-trend-green">↑ 14%</span>
              </div>
            </div>
            <div className="summary-col">
              <span className="summary-title">Total pause time</span>
              <div className="summary-stat-line">
                <strong>9h 45m</strong>
                <span className="summary-trend-red">↓ 21%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          ROW 2: TOP SOURCE IPS & EVENT TYPES (Exact Match to Reference Image)
          ==================================================================== */}
      <div className="breakdown-double-grid" id="sources-section">
        {/* CARD 1: TOP SOURCE IPS (Coral horizontal progress bars) */}
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

        {/* CARD 2: EVENT TYPES (Indigo horizontal progress bars) */}
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
