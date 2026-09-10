import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PieChart as PieIcon, BarChart3, Globe2 } from "lucide-react";

// Custom dark cyber tooltip for Recharts
const CustomChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="custom-chart-tooltip">
        <div className="tooltip-header">{label || item.name}</div>
        <div className="tooltip-body">
          <span
            className="tooltip-dot"
            style={{ backgroundColor: item.color || item.fill || "#38bdf8" }}
          />
          <span className="tooltip-key">Count:</span>
          <strong className="tooltip-value">{item.value}</strong>
        </div>
      </div>
    );
  }
  return null;
};

export default function AnalyticsCharts({
  severityData,
  eventTypeData,
  sourceIpData,
}) {
  const totalSeverityCount = severityData.reduce(
    (acc, cur) => acc + (cur.value || 0),
    0
  );

  return (
    <section className="analytics-section">
      <div className="section-header">
        <div>
          <div className="section-kicker">
            <span>TELEMETRY VISUALIZATION</span>
          </div>
          <h2>Security Analytics</h2>
          <p>Real-time statistical analysis of detected security activity</p>
        </div>
      </div>

      <div className="analytics-grid">
        {/* Incident Severity Donut */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title-wrap">
              <PieIcon size={16} className="chart-title-icon text-cyan" />
              <div>
                <h3>Incident Severity</h3>
                <span>Current threat severity distribution</span>
              </div>
            </div>
            <div className="chart-total-pill">
              <span>Total: {totalSeverityCount}</span>
            </div>
          </div>

          <div className="severity-chart-wrapper">
            <div className="severity-chart-viz">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={severityData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    stroke="rgba(11, 15, 20, 0.8)"
                    strokeWidth={2}
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center-stat">
                <span className="donut-stat-val">{totalSeverityCount}</span>
                <span className="donut-stat-lbl">ALERTS</span>
              </div>
            </div>

            <div className="severity-legend">
              {severityData.map((item) => {
                const pct =
                  totalSeverityCount > 0
                    ? Math.round((item.value / totalSeverityCount) * 100)
                    : 0;
                return (
                  <div className="severity-legend-item" key={item.name}>
                    <div className="legend-left">
                      <span
                        className="severity-dot"
                        style={{ background: item.fill }}
                      />
                      <span className="severity-name">{item.name}</span>
                    </div>
                    <div className="legend-right">
                      <span className="legend-pct">{pct}%</span>
                      <strong className="legend-count">{item.value}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Event Types Bar Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title-wrap">
              <BarChart3 size={16} className="chart-title-icon text-blue" />
              <div>
                <h3>Event Types</h3>
                <span>Distribution across detected event categories</span>
              </div>
            </div>
          </div>

          <div className="chart-container-inner">
            {eventTypeData.length === 0 ? (
              <div className="chart-empty">No event types recorded yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={eventTypeData}
                  margin={{ top: 15, right: 15, left: -15, bottom: 25 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(148, 163, 184, 0.08)"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(148, 163, 184, 0.15)" }}
                    tickLine={false}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip cursor={false} content={<CustomChartTooltip />} />
                  <Bar
                    dataKey="value"
                    fill="#2563eb"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={45}
                    activeBar={{ fill: "#38bdf8" }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Source IPs Bar Chart (Wide) */}
        <div className="chart-card chart-wide" id="sources-section">
          <div className="chart-header">
            <div className="chart-title-wrap">
              <Globe2 size={16} className="chart-title-icon text-purple" />
              <div>
                <h3>Top Source IPs</h3>
                <span>Highest event volume originated by source IP address</span>
              </div>
            </div>
            <div className="chart-badge">
              <span>TOP {sourceIpData.length} VECTORS</span>
            </div>
          </div>

          <div className="chart-container-inner">
            {sourceIpData.length === 0 ? (
              <div className="chart-empty">No source IP activity recorded yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={sourceIpData}
                  margin={{ top: 15, right: 20, left: -15, bottom: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(148, 163, 184, 0.08)"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                    axisLine={{ stroke: "rgba(148, 163, 184, 0.15)" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip cursor={false} content={<CustomChartTooltip />} />
                  <Bar
                    dataKey="value"
                    fill="#7c3aed"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                    activeBar={{ fill: "#a855f7" }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
