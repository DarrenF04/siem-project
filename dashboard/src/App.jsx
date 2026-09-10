import { useCallback, useEffect, useState } from "react";
import {
  ShieldAlert,
  Activity,
  AlertTriangle,
  Siren,
  Search,
  Server,
  Globe,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [statistics, setStatistics] = useState({
    total_events: 0,
    total_incidents: 0,
    critical_incidents: 0,
    high_incidents: 0,
    medium_incidents: 0,
    low_incidents: 0,
    open_incidents: 0,
  });

  const [events, setEvents] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [eventSearch, setEventSearch] = useState("");
const [eventSeverity, setEventSeverity] = useState("ALL");
const [eventType, setEventType] = useState("ALL");
const [eventSourceIp, setEventSourceIp] = useState("ALL");
  const [incidentSearch, setIncidentSearch] = useState("");
  const [incidentSeverity, setIncidentSeverity] = useState("ALL");
  const [incidentStatus, setIncidentStatus] = useState("ALL");
  const [incidentAttackType, setIncidentAttackType] = useState("ALL");

const scrollToSection = (sectionId) => {
  const section = document.getElementById(sectionId);

  if (section) {
    section.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
};

const eventTypes = [
  ...new Set(events.map((event) => event.event_type)),
];

const sourceIps = [
  ...new Set(events.map((event) => event.source_ip)),
];

const filteredEvents = events.filter((event) => {
  const matchesSearch =
    eventSearch === "" ||
    event.details
      ?.toLowerCase()
      .includes(eventSearch.toLowerCase()) ||
    event.source_ip
      ?.toLowerCase()
      .includes(eventSearch.toLowerCase());

  const matchesSeverity =
    eventSeverity === "ALL" ||
    event.severity === eventSeverity;

  const matchesType =
    eventType === "ALL" ||
    event.event_type === eventType;

  const matchesSourceIp =
    eventSourceIp === "ALL" ||
    event.source_ip === eventSourceIp;

  return (
    matchesSearch &&
    matchesSeverity &&
    matchesType &&
    matchesSourceIp
  );
});
  const severityData = [
  {
    name: "Critical",
    value: statistics.critical_incidents,
    fill: "#ef4444",
  },
  {
    name: "High",
    value: statistics.high_incidents,
    fill: "#f97316",
  },
  {
    name: "Medium",
    value: statistics.medium_incidents,
    fill: "#eab308",
  },
  {
    name: "Low",
    value: statistics.low_incidents,
    fill: "#22c55e",
  },
];

const eventTypeData = Object.entries(
  events.reduce((acc, event) => {
    acc[event.event_type] = (acc[event.event_type] || 0) + 1;
    return acc;
  }, {})
).map(([name, value]) => ({
  name,
  value,
}));

const sourceIpData = Object.entries(
  events.reduce((acc, event) => {
    acc[event.source_ip] = (acc[event.source_ip] || 0) + 1;
    return acc;
  }, {})
)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 8)
  .map(([name, value]) => ({
    name,
    value,
  }));
  const filteredIncidents = incidents.filter((incident) => {
    const search = incidentSearch.toLowerCase().trim();

    const matchesSearch =
      search === "" ||
      incident.incident_type?.toLowerCase().includes(search) ||
      incident.source_ip?.toLowerCase().includes(search) ||
      incident.message?.toLowerCase().includes(search) ||
      String(incident.id).includes(search);

    const matchesSeverity =
      incidentSeverity === "ALL" ||
      incident.severity === incidentSeverity;

    const matchesStatus =
      incidentStatus === "ALL" ||
      incident.status === incidentStatus;

    const matchesAttackType =
      incidentAttackType === "ALL" ||
      (incident.attack_type || "UNKNOWN") === incidentAttackType;

    return matchesSearch && matchesSeverity && matchesStatus && matchesAttackType;
  });

  const incidentAttackTypes = [
    ...new Set(
      incidents.map((incident) => incident.attack_type || "UNKNOWN")
    ),
  ];

  const [selectedIncident, setSelectedIncident] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [statisticsResponse, eventsResponse, incidentsResponse] =
        await Promise.all([
          fetch(`${API_URL}/statistics`),
          fetch(`${API_URL}/events`),
          fetch(`${API_URL}/incidents`),
        ]);

      const statisticsData = await statisticsResponse.json();
      const eventsData = await eventsResponse.json();
      const incidentsData = await incidentsResponse.json();

      setStatistics(statisticsData);
      setEvents(eventsData);
      setIncidents(incidentsData);
      setLastUpdated(new Date());

      setLoading(false);

    } catch (error) {
      console.error("Failed to connect to SIEM backend:", error);
    }
  }, []);

  const updateIncidentStatus = async (incidentId, newStatus) => {
    try {
      const response = await fetch(
        `${API_URL}/incidents/${incidentId}/status?status=${newStatus}`,
        {
          method: "PATCH",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update incident status");
      }

      // Refresh dashboard data
      await fetchData();

      // Update the currently opened incident in the modal
      setSelectedIncident((current) =>
        current
          ? {
            ...current,
            status: newStatus,
          }
          : current
      );
    } catch (error) {
      console.error("Failed to update incident status:", error);
    }
  };

  useEffect(() => {
    fetchData();

    const interval = setInterval(() => {
      fetchData();
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchData]);
  const getSeverityClass = (severity) => {
    return severity?.toLowerCase() || "info";
  };

  return (
    <div className="app">

      {/* SIDEBAR */}
      <aside className="sidebar">

        <div className="logo">
          <div className="logo-icon">
            <ShieldAlert size={26} />
          </div>

          <div>
            <h2>SIEM</h2>
            <span>Security Center</span>
          </div>
        </div>

        <nav>
          <div
            className="nav-item active"
            onClick={() => scrollToSection("dashboard-top")}
            role="button"
            tabIndex={0}
          >
            <Activity size={19} />
            Dashboard
          </div>

          <div
            className="nav-item"
            onClick={() => scrollToSection("incidents-section")}
            role="button"
            tabIndex={0}
          >
            <AlertTriangle size={19} />
            Incidents
          </div>

          <div
            className="nav-item"
            onClick={() => scrollToSection("events-section")}
            role="button"
            tabIndex={0}
          >
            <Server size={19} />
            Events
          </div>

          <div
            className="nav-item"
            onClick={() => scrollToSection("sources-section")}
            role="button"
            tabIndex={0}
          >
            <Globe size={19} />
            Sources
          </div>
        </nav>

        <div className="system-status">
          <div className="status-dot"></div>

          <div>
            <strong>System Online</strong>
            <span>SIEM Engine Active</span>
          </div>
        </div>

      </aside>


      {/* MAIN CONTENT */}
      <main className="main"  id="dashboard-top">

        {/* HEADER */}
        <header className="header">

          <div>
            <h1>Security Dashboard</h1>
            <p>
              Real-time security monitoring and incident analysis
            </p>
          </div>

          <div className="live-status">
            <span className="live-dot"></span>

            <div>
              <strong>LIVE MONITORING</strong>
              <span>
                {lastUpdated
                  ? `Updated ${lastUpdated.toLocaleTimeString()}`
                  : "Connecting..."}
              </span>
            </div>
          </div>

        </header>


        {/* STATISTICS */}
        <section className="stats-grid">

          <div className="stat-card">
            <div className="stat-icon blue">
              <Activity size={22} />
            </div>

            <div>
              <span>Total Events</span>
              <strong>{statistics.total_events}</strong>
            </div>
          </div>


          <div className="stat-card">
            <div className="stat-icon orange">
              <AlertTriangle size={22} />
            </div>

            <div>
              <span>Total Incidents</span>
              <strong>{statistics.total_incidents}</strong>
            </div>
          </div>


          <div className="stat-card">
            <div className="stat-icon red">
              <Siren size={22} />
            </div>

            <div>
              <span>Critical Incidents</span>
              <strong>{statistics.critical_incidents}</strong>
            </div>
          </div>


          <div className="stat-card">
            <div className="stat-icon purple">
              <ShieldAlert size={22} />
            </div>

            <div>
              <span>Open Incidents</span>
              <strong>{statistics.open_incidents}</strong>
            </div>
          </div>

        </section>


        {/* SECOND ROW */}
        <section className="content-grid">

          {/* SEVERITY */}
          <div className="panel">

            <div className="panel-header">
              <div>
                <h2>Incident Severity</h2>
                <p>Current threat distribution</p>
              </div>
            </div>

            <div className="severity-list">

              <div className="severity-row">
                <span>
                  <i className="severity-dot critical"></i>
                  Critical
                </span>

                <strong>{statistics.critical_incidents}</strong>
              </div>

              <div className="severity-row">
                <span>
                  <i className="severity-dot high"></i>
                  High
                </span>

                <strong>{statistics.high_incidents}</strong>
              </div>

              <div className="severity-row">
                <span>
                  <i className="severity-dot medium"></i>
                  Medium
                </span>

                <strong>{statistics.medium_incidents}</strong>
              </div>

              <div className="severity-row">
                <span>
                  <i className="severity-dot low"></i>
                  Low
                </span>

                <strong>{statistics.low_incidents}</strong>
              </div>

            </div>

          </div>


          {/* SYSTEM STATUS */}
          <div className="panel">

            <div className="panel-header">
              <div>
                <h2>Detection Engine</h2>
                <p>Current SIEM processing status</p>
              </div>
            </div>

            <div className="engine-status">

              <div className="engine-icon">
                <ShieldAlert size={30} />
              </div>

              <div>
                <strong>Correlation Engine Active</strong>
                <span>
                  Monitoring incoming security events
                </span>
              </div>

            </div>

            <div className="engine-stats">

              <div>
                <span>Events Processed</span>
                <strong>{statistics.total_events}</strong>
              </div>

              <div>
                <span>Open Threats</span>
                <strong>{statistics.open_incidents}</strong>
              </div>

            </div>

          </div>

        </section>

        <section className="analytics-section">

  <div className="section-header">
    <div>
      <h2>Security Analytics</h2>
      <p>Real-time analysis of detected security activity</p>
    </div>
  </div>

  <div className="analytics-grid">

    {/* Incident Severity */}

<div className="chart-card">

  <div className="chart-header">
    <div>
      <h3>Incident Severity</h3>
      <span>Current threat distribution</span>
    </div>
  </div>

  <div className="severity-chart">

    <ResponsiveContainer width="55%" height={250}>
      <PieChart>

        <Pie
          data={severityData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={88}
          paddingAngle={3}
          stroke="none"
        />

        <Tooltip />

      </PieChart>
    </ResponsiveContainer>

    <div className="severity-legend">

      {severityData.map((item) => (
        <div
          className="severity-item"
          key={item.name}
        >
          <span
            className="severity-dot"
            style={{ background: item.fill }}
          ></span>

          <span className="severity-name">
            {item.name}
          </span>

          <strong>{item.value}</strong>
        </div>
      ))}

    </div>

  </div>

</div>
{/* Event Types */}

<div className="chart-card">

  <div className="chart-header">
    <div>
      <h3>Event Types</h3>
      <span>Detected security activity</span>
    </div>
  </div>

  <ResponsiveContainer width="100%" height={250}>
    <BarChart
      data={eventTypeData}
      margin={{
        top: 10,
        right: 10,
        left: -10,
        bottom: 5,
      }}
    >

      <CartesianGrid
        strokeDasharray="3 3"
        vertical={false}
        strokeOpacity={0.15}
      />

      <XAxis
        dataKey="name"
        tick={{
          fill: "#9ca3af",
          fontSize: 10,
        }}
        axisLine={false}
        tickLine={false}
      />

      <YAxis
        allowDecimals={false}
        tick={{
          fill: "#6b7280",
          fontSize: 10,
        }}
        axisLine={false}
        tickLine={false}
      />

      <Tooltip
        contentStyle={{
          background: "#111827",
          border: "1px solid #374151",
          borderRadius: "8px",
          color: "#ffffff",
        }}
      />

      <Bar
        dataKey="value"
        fill="#3b82f6"
        radius={[6, 6, 0, 0]}
        barSize={42}
      />

    </BarChart>
  </ResponsiveContainer>

</div>


{/* Top Source IPs */}

<div className="chart-card chart-wide" id="sources-section">

  <div className="chart-header">
    <div>
      <h3>Top Source IPs</h3>
      <span>Event volume by source</span>
    </div>
  </div>

  <ResponsiveContainer width="100%" height={230}>
    <BarChart
      data={sourceIpData}
      margin={{
        top: 10,
        right: 20,
        left: -10,
        bottom: 5,
      }}
    >

      <CartesianGrid
        strokeDasharray="3 3"
        vertical={false}
        strokeOpacity={0.15}
      />

      <XAxis
        dataKey="name"
        tick={{
          fill: "#9ca3af",
          fontSize: 11,
        }}
        axisLine={false}
        tickLine={false}
      />

      <YAxis
        allowDecimals={false}
        tick={{
          fill: "#6b7280",
          fontSize: 10,
        }}
        axisLine={false}
        tickLine={false}
      />

      <Tooltip
        contentStyle={{
          background: "#111827",
          border: "1px solid #374151",
          borderRadius: "8px",
          color: "#ffffff",
        }}
      />

      <Bar
        dataKey="value"
        fill="#8b5cf6"
        radius={[6, 6, 0, 0]}
        barSize={42}
      />

    </BarChart>
  </ResponsiveContainer>

</div>

  </div>

</section>


        {/* INCIDENTS */}
        <section
          className="panel large-panel"
          id="incidents-section"
        >

          <div className="panel-header">

            <div>
              <h2>Security Incidents</h2>
              <p>Detected and correlated security threats</p>
            </div>

            <div className="search-box">
              <Search size={17} />
              <input
                type="text"
                placeholder="Search incidents..."
                value={incidentSearch}
                onChange={(e) => setIncidentSearch(e.target.value)}
              />
            </div>

          </div>


          <div className="incident-filters">
            <select
              value={incidentSeverity}
              onChange={(e) => setIncidentSeverity(e.target.value)}
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={incidentStatus}
              onChange={(e) => setIncidentStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="INVESTIGATING">Investigating</option>
              <option value="RESOLVED">Resolved</option>
            </select>

            <select
              value={incidentAttackType}
              onChange={(e) => setIncidentAttackType(e.target.value)}
            >
              <option value="ALL">All Attack Types</option>
              {incidentAttackTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </option>
              ))}
            </select>

            <button
              className="clear-filters"
              onClick={() => {
                setIncidentSearch("");
                setIncidentSeverity("ALL");
                setIncidentStatus("ALL");
                setIncidentAttackType("ALL");
              }}
            >
              Clear
            </button>

            <div className="filter-result-count">
              Showing <strong>{filteredIncidents.length}</strong> of{" "}
              <strong>{incidents.length}</strong> incidents
            </div>
          </div>

          <div className="table-container" >

            <table>

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Incident</th>
                  <th>Attack Type</th>
                  <th>Source IP</th>
                  <th>Risk Score</th>
                  <th>Severity</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>

                {loading ? (
                  <tr>
                    <td colSpan="7" className="empty">
                      Loading incidents...
                    </td>
                  </tr>
                ) : incidents.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty">
                      No incidents detected
                    </td>
                  </tr>
                ) : filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty">
                      No incidents match the current filters
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map((incident) => (

                    <tr
                      key={incident.id}
                      className="incident-row"
                      onClick={() => setSelectedIncident(incident)}
                    >

                      <td>#{incident.id}</td>

                      <td>
                        <strong>
                          {incident.incident_type}
                        </strong>
                      </td>

                      <td>
                        <span className="attack-type">
                          {(incident.attack_type || "UNKNOWN").replaceAll("_", " ")}
                        </span>
                      </td>

                      <td className="ip">
                        {incident.source_ip}
                      </td>

                      <td>
                        <span className="risk-score">
                          {incident.risk_score}/100
                        </span>
                      </td>

                      <td>
                        <span
                          className={`severity ${getSeverityClass(
                            incident.severity
                          )}`}
                        >
                          {incident.severity}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`status ${incident.status?.toLowerCase()}`}
                        >
                          {incident.status}
                        </span>
                      </td>

                    </tr>

                  ))
                )}

              </tbody>

            </table>

          </div>

        </section>

        {/* INCIDENT INVESTIGATION MODAL */}

        {selectedIncident && (
          <div
            className="modal-overlay"
            onClick={() => setSelectedIncident(null)}
          >

            <div
              className="investigation-modal"
              onClick={(e) => e.stopPropagation()}
            >

              {/* MODAL HEADER */}

              <div className="investigation-header">

                <div>
                  <span className="investigation-label">
                    SECURITY INCIDENT
                  </span>

                  <h2>
                    {selectedIncident.incident_type}
                  </h2>

                  <p>
                    Incident #{selectedIncident.id}
                  </p>
                </div>

                <button
                  className="close-button"
                  onClick={() => setSelectedIncident(null)}
                >
                  ×
                </button>

              </div>


              {/* INCIDENT OVERVIEW */}

              <div className="investigation-grid">

                <div className="investigation-card">
                  <span>Source IP</span>
                  <strong className="investigation-ip">
                    {selectedIncident.source_ip}
                  </strong>
                </div>

                <div className="investigation-card">
                  <span>Risk Score</span>
                  <strong>
                    {selectedIncident.risk_score}/100
                  </strong>
                </div>

                <div className="investigation-card">
                  <span>Severity</span>
                  <strong>
                    {selectedIncident.severity}
                  </strong>
                </div>

                <div className="investigation-card">
                  <span>Attack Type</span>
                  <strong>
                    {(selectedIncident.attack_type || "UNKNOWN").replaceAll("_", " ")}
                  </strong>
                </div>

                <div className="status-control">
                  <span className="detail-label">Status</span>

                  <select
                    value={selectedIncident.status || "OPEN"}
                    onChange={(e) =>
                      updateIncidentStatus(
                        selectedIncident.id,
                        e.target.value
                      )
                    }
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="INVESTIGATING">INVESTIGATING</option>
                    <option value="RESOLVED">RESOLVED</option>
                  </select>
                </div>

              </div>


              {/* CORRELATION ANALYSIS */}

              <div className="investigation-section">

                <h3>Attack Classification & Correlation</h3>

                <div className="attack-classification-banner">
                  <span>Detected Attack</span>
                  <strong>
                    {(selectedIncident.attack_type || "UNKNOWN").replaceAll("_", " ")}
                  </strong>
                </div>

                <p className="investigation-message">
                  {selectedIncident.message}
                </p>

                <div className="correlation-flow">

                  <div className="flow-step">
                    <strong>
                      {selectedIncident.failed_logins}
                    </strong>

                    <span>
                      Failed Logins
                    </span>
                  </div>

                  <div className="flow-arrow">
                    →
                  </div>

                  <div className="flow-step">
                    <strong>
                      {selectedIncident.successful_login
                        ? "YES"
                        : "NO"}
                    </strong>

                    <span>
                      Successful Login
                    </span>
                  </div>

                  <div className="flow-arrow">
                    →
                  </div>

                  <div className="flow-step">
                    <strong>
                      {selectedIncident.command_executions}
                    </strong>

                    <span>
                      Commands Executed
                    </span>
                  </div>

                </div>

              </div>


              {/* RELATED EVENTS */}

              <div className="investigation-section">

                <div className="related-events-header">
                  <div>
                    <h3>Related Security Events</h3>

                    <p>
                      Events associated with source IP{" "}
                      {selectedIncident.source_ip}
                    </p>
                  </div>

                  <span className="event-count">
                    {
                      events.filter(
                        (event) =>
                          event.source_ip ===
                          selectedIncident.source_ip
                      ).length
                    }{" "}
                    events
                  </span>
                </div>


                <div className="related-events">

                  {events
                    .filter(
                      (event) =>
                        event.source_ip ===
                        selectedIncident.source_ip
                    )
                    .slice(0, 15)
                    .map((event) => (

                      <div
                        className="related-event"
                        key={event.id}
                      >

                        <div className="event-time">
                          {event.timestamp
                            ? event.timestamp
                              .replace("T", " ")
                              .slice(0, 19)
                            : "-"}
                        </div>

                        <div className="event-type">
                          {event.event_type}
                        </div>

                        <div className="event-details">
                          {event.details}
                        </div>

                        <span
                          className={`severity ${getSeverityClass(
                            event.severity
                          )}`}
                        >
                          {event.severity}
                        </span>

                      </div>

                    ))}

                </div>

              </div>

            </div>

          </div>
        )}


        {/* RECENT EVENTS */}
        <section
          className="panel large-panel"
          id="events-section"
        >

          <div className="panel-header">

            <div>
              <h2>Recent Security Events</h2>
              <p>Latest events received by the SIEM</p>
            </div>

          </div>

          <div className="event-filters">

  <div className="filter-search">
    <Search size={16} />

    <input
      type="text"
      placeholder="Search IP or event details..."
      value={eventSearch}
      onChange={(e) => setEventSearch(e.target.value)}
    />
  </div>

  <select
    value={eventSeverity}
    onChange={(e) => setEventSeverity(e.target.value)}
  >
    <option value="ALL">All Severities</option>
    <option value="CRITICAL">Critical</option>
    <option value="HIGH">High</option>
    <option value="MEDIUM">Medium</option>
    <option value="LOW">Low</option>
    <option value="INFO">Info</option>
  </select>

  <select
    value={eventType}
    onChange={(e) => setEventType(e.target.value)}
  >
    <option value="ALL">All Event Types</option>

    {eventTypes.map((type) => (
      <option key={type} value={type}>
        {type}
      </option>
    ))}
  </select>

  <select
    value={eventSourceIp}
    onChange={(e) => setEventSourceIp(e.target.value)}
  >
    <option value="ALL">All Source IPs</option>

    {sourceIps.map((ip) => (
      <option key={ip} value={ip}>
        {ip}
      </option>
    ))}
  </select>

  <button
    className="clear-filters"
    onClick={() => {
      setEventSearch("");
      setEventSeverity("ALL");
      setEventType("ALL");
      setEventSourceIp("ALL");
    }}
  >
    Clear
  </button>

</div>
<div className="filter-result-count">
  Showing <strong>{filteredEvents.length}</strong> of{" "}
  <strong>{events.length}</strong> events
</div>


          <div className="table-container">

            <table>

              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event Type</th>
                  <th>Source IP</th>
                  <th>Source</th>
                  <th>Severity</th>
                  <th>Details</th>
                </tr>
              </thead>

              <tbody>

                {filteredEvents.slice(0, 10).map((event) => (

                  <tr key={event.id}>

                    <td>
                      {event.timestamp
                        ? event.timestamp.replace("T", " ").slice(0, 19)
                        : "-"}
                    </td>

                    <td>
                      <strong>{event.event_type}</strong>
                    </td>

                    <td className="ip">
                      {event.source_ip}
                    </td>

                    <td>
                      {event.source}
                    </td>

                    <td>
                      <span
                        className={`severity ${getSeverityClass(
                          event.severity
                        )}`}
                      >
                        {event.severity}
                      </span>
                    </td>

                    <td className="details">
                      {event.details}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </section>

      </main>

    </div>
  );
}

export default App;