import { useCallback, useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import StatCards from "./components/StatCards";
import EngineStatus from "./components/EngineStatus";
import AnalyticsCharts from "./components/AnalyticsCharts";
import IncidentsSection from "./components/IncidentsSection";
import EventsSection from "./components/EventsSection";
import InvestigationModal from "./components/InvestigationModal";

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeSection, setActiveSection] = useState("dashboard-top");

  // Filter states for Events
  const [eventSearch, setEventSearch] = useState("");
  const [eventSeverity, setEventSeverity] = useState("ALL");
  const [eventType, setEventType] = useState("ALL");
  const [eventSourceIp, setEventSourceIp] = useState("ALL");

  // Filter states for Incidents
  const [incidentSearch, setIncidentSearch] = useState("");
  const [incidentSeverity, setIncidentSeverity] = useState("ALL");
  const [incidentStatus, setIncidentStatus] = useState("ALL");
  const [incidentAttackType, setIncidentAttackType] = useState("ALL");

  // Selected incident for investigation modal
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Smooth scroll handler
  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  // Event derived filters
  const eventTypes = [
    ...new Set(events.map((event) => event.event_type).filter(Boolean)),
  ];

  const sourceIps = [
    ...new Set(events.map((event) => event.source_ip).filter(Boolean)),
  ];

  const filteredEvents = events.filter((event) => {
    const search = eventSearch.toLowerCase().trim();
    const matchesSearch =
      search === "" ||
      event.details?.toLowerCase().includes(search) ||
      event.source_ip?.toLowerCase().includes(search);

    const matchesSeverity =
      eventSeverity === "ALL" || event.severity === eventSeverity;

    const matchesType =
      eventType === "ALL" || event.event_type === eventType;

    const matchesSourceIp =
      eventSourceIp === "ALL" || event.source_ip === eventSourceIp;

    return (
      matchesSearch && matchesSeverity && matchesType && matchesSourceIp
    );
  });

  // Chart data calculations
  const severityData = [
    {
      name: "Critical",
      value: statistics.critical_incidents || 0,
      fill: "#ef4444",
    },
    {
      name: "High",
      value: statistics.high_incidents || 0,
      fill: "#f97316",
    },
    {
      name: "Medium",
      value: statistics.medium_incidents || 0,
      fill: "#eab308",
    },
    {
      name: "Low",
      value: statistics.low_incidents || 0,
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

  // Incident derived filters
  const filteredIncidents = incidents.filter((incident) => {
    const search = incidentSearch.toLowerCase().trim();

    const matchesSearch =
      search === "" ||
      incident.incident_type?.toLowerCase().includes(search) ||
      incident.source_ip?.toLowerCase().includes(search) ||
      incident.message?.toLowerCase().includes(search) ||
      String(incident.id).includes(search);

    const matchesSeverity =
      incidentSeverity === "ALL" || incident.severity === incidentSeverity;

    const matchesStatus =
      incidentStatus === "ALL" || incident.status === incidentStatus;

    const matchesAttackType =
      incidentAttackType === "ALL" ||
      (incident.attack_type || "UNKNOWN") === incidentAttackType;

    return (
      matchesSearch && matchesSeverity && matchesStatus && matchesAttackType
    );
  });

  const incidentAttackTypes = [
    ...new Set(
      incidents.map((incident) => incident.attack_type || "UNKNOWN")
    ),
  ];

  // Data fetching
  const fetchData = useCallback(async () => {
    try {
      const [statisticsResponse, eventsResponse, incidentsResponse] =
        await Promise.all([
          fetch(`${API_URL}/statistics`),
          fetch(`${API_URL}/events`),
          fetch(`${API_URL}/incidents`),
        ]);

      if (
        !statisticsResponse.ok ||
        !eventsResponse.ok ||
        !incidentsResponse.ok
      ) {
        throw new Error("One or more API responses returned an error");
      }

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
      setLoading(false);
    }
  }, []);

  // Manual refresh trigger with button animation
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Update incident status via API
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

      // Update currently opened incident in modal
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

  // Polling hook (every 2 seconds) - safely invoked without synchronous setState warnings
  useEffect(() => {
    let isSubscribed = true;

    const runInitialFetch = async () => {
      if (isSubscribed) {
        await fetchData();
      }
    };

    runInitialFetch();

    const interval = setInterval(() => {
      if (isSubscribed) {
        fetchData();
      }
    }, 2000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [fetchData]);

  const getSeverityClass = (severity) => {
    return severity?.toLowerCase() || "info";
  };

  return (
    <div className="app">
      {/* SIDEBAR NAVIGATION */}
      <Sidebar
        activeSection={activeSection}
        scrollToSection={scrollToSection}
      />

      {/* MAIN OPERATIONS WORKSPACE */}
      <main className="main" id="dashboard-top">
        {/* HEADER & TELEMETRY POSTURE */}
        <Header
          lastUpdated={lastUpdated}
          onRefresh={handleManualRefresh}
          isRefreshing={isRefreshing}
          statistics={statistics}
        />

        {/* PRIMARY TELEMETRY KPI METRICS */}
        <StatCards statistics={statistics} />

        {/* SEVERITY BREAKDOWN & ENGINE STATUS */}
        <EngineStatus statistics={statistics} />

        {/* VISUAL ANALYTICS & SOURCE CHARTS */}
        <AnalyticsCharts
          severityData={severityData}
          eventTypeData={eventTypeData}
          sourceIpData={sourceIpData}
        />

        {/* INCIDENTS MANAGEMENT SECTION */}
        <IncidentsSection
          incidents={incidents}
          filteredIncidents={filteredIncidents}
          incidentSearch={incidentSearch}
          setIncidentSearch={setIncidentSearch}
          incidentSeverity={incidentSeverity}
          setIncidentSeverity={setIncidentSeverity}
          incidentStatus={incidentStatus}
          setIncidentStatus={setIncidentStatus}
          incidentAttackType={incidentAttackType}
          setIncidentAttackType={setIncidentAttackType}
          incidentAttackTypes={incidentAttackTypes}
          onSelectIncident={setSelectedIncident}
          loading={loading}
          getSeverityClass={getSeverityClass}
        />

        {/* RECENT SECURITY LOG EVENTS STREAM */}
        <EventsSection
          events={events}
          filteredEvents={filteredEvents}
          eventSearch={eventSearch}
          setEventSearch={setEventSearch}
          eventSeverity={eventSeverity}
          setEventSeverity={setEventSeverity}
          eventType={eventType}
          setEventType={setEventType}
          eventSourceIp={eventSourceIp}
          setEventSourceIp={setEventSourceIp}
          eventTypes={eventTypes}
          sourceIps={sourceIps}
          loading={loading}
          getSeverityClass={getSeverityClass}
        />

        {/* INCIDENT INVESTIGATION MODAL */}
        <InvestigationModal
          selectedIncident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onUpdateStatus={updateIncidentStatus}
          events={events}
          getSeverityClass={getSeverityClass}
        />
      </main>
    </div>
  );
}

export default App;