import { useCallback, useEffect, useState } from "react";
import Header from "./components/Header";
import DashboardPage from "./pages/DashboardPage";
import IncidentsPage from "./pages/IncidentsPage";
import EventsPage from "./pages/EventsPage";
import SourcesPage from "./pages/SourcesPage";
import AttackSimulator from "./AttackSimulator";
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

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("siem-theme") || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("siem-theme", theme);
    } catch {
      // Storage fallback
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Dedicated Page Routing (dashboard, incidents, events, sources, simulator)
  const [activePage, setActivePage] = useState(() => {
    try {
      const hash = window.location.hash.replace("#/", "").replace("#", "");
      const validPages = ["dashboard", "incidents", "events", "sources", "simulator"];
      return validPages.includes(hash) ? hash : "dashboard";
    } catch {
      return "dashboard";
    }
  });

  // Keep browser hash in sync
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#/", "").replace("#", "");
      const validPages = ["dashboard", "incidents", "events", "sources", "simulator"];
      if (validPages.includes(hash)) {
        setActivePage(hash);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleNavigate = (pageId) => {
    setActivePage(pageId);
    window.location.hash = `#/${pageId}`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Simulated attacks state with geo-coordinates for World Threat Map
  const [simulatedAttacks, setSimulatedAttacks] = useState(() => {
    try {
      const saved = localStorage.getItem("siem-simulated-attacks");
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return [
      {
        ip: "192.168.100.45",
        location: "New York, USA",
        scenarioTitle: "Account Compromise",
        attackType: "ACCOUNT_COMPROMISE",
        events: 7,
        timestamp: "Initial Seed",
      },
    ];
  });

  const handleAttackSimulated = (newAttack) => {
    setSimulatedAttacks((prev) => {
      const updated = [newAttack, ...prev].slice(0, 10);
      try {
        localStorage.setItem("siem-simulated-attacks", JSON.stringify(updated));
      } catch {
        // Fallback
      }
      return updated;
    });
  };

  const [events, setEvents] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

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

  // Data fetching from backend API
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

  // Manual refresh trigger
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

      await fetchData();

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

  // Polling hook (every 2 seconds)
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
      {/* TOP NAVIGATION & HEADER */}
      <Header
        lastUpdated={lastUpdated}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
        statistics={statistics}
        theme={theme}
        onToggleTheme={toggleTheme}
        activePage={activePage}
        onNavigate={handleNavigate}
      />

      {/* MAIN DEDICATED PAGE WORKSPACE */}
      <main className="main-workspace">
        {/* 1. DASHBOARD PAGE (CHARTS ONLY — NO TABLES) */}
        {activePage === "dashboard" && (
          <DashboardPage
            statistics={statistics}
            severityData={severityData}
            eventTypeData={eventTypeData}
            sourceIpData={sourceIpData}
            simulatedAttacks={simulatedAttacks}
            theme={theme}
          />
        )}

        {/* 2. INCIDENTS PAGE (DEDICATED) */}
        {activePage === "incidents" && (
          <IncidentsPage
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
            statistics={statistics}
          />
        )}

        {/* 3. EVENTS PAGE (DEDICATED) */}
        {activePage === "events" && (
          <EventsPage
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
            theme={theme}
          />
        )}

        {/* 4. SOURCES PAGE (DEDICATED) */}
        {activePage === "sources" && (
          <SourcesPage
            events={events}
            incidents={incidents}
            sourceIpData={sourceIpData}
            onSelectIncident={setSelectedIncident}
            theme={theme}
          />
        )}

        {/* 5. ATTACK SIMULATOR PAGE (DEDICATED) */}
        {activePage === "simulator" && (
          <AttackSimulator
            onAttackSimulated={handleAttackSimulated}
            recentSimulations={simulatedAttacks}
          />
        )}

        {/* INCIDENT INVESTIGATION MODAL (AVAILABLE ACROSS ALL PAGES) */}
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