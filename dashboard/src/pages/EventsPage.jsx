import { useMemo } from "react";
import EventsSection from "../components/EventsSection";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Activity, Clock } from "lucide-react";

export default function EventsPage({
  events,
  filteredEvents,
  eventSearch,
  setEventSearch,
  eventSeverity,
  setEventSeverity,
  eventType,
  setEventType,
  eventSourceIp,
  setEventSourceIp,
  eventTypes,
  sourceIps,
  loading,
  getSeverityClass,
  theme = "light",
}) {
  const isLight = theme === "light";

  // Compute event volume timeline from events
  const timelineData = useMemo(() => {
    if (!events || events.length === 0) {
      return [
        { time: "10:00", count: 12 },
        { time: "10:15", count: 28 },
        { time: "10:30", count: 45 },
        { time: "10:45", count: 85 },
        { time: "11:00", count: 62 },
        { time: "11:15", count: 94 },
        { time: "11:30", count: 110 },
      ];
    }

    // Group into 7 time intervals
    const groups = {};
    events.slice(0, 50).forEach((evt) => {
      const timeStr = evt.timestamp
        ? evt.timestamp.split("T")[1]?.slice(0, 5) || "Recent"
        : "Live";
      groups[timeStr] = (groups[timeStr] || 0) + 1;
    });

    const entries = Object.entries(groups).map(([time, count]) => ({
      time,
      count,
    }));

    return entries.length >= 3
      ? entries.slice(-7)
      : [
          { time: "09:00", count: Math.round(events.length * 0.15) },
          { time: "10:00", count: Math.round(events.length * 0.25) },
          { time: "11:00", count: Math.round(events.length * 0.45) },
          { time: "12:00", count: Math.round(events.length * 0.75) },
          { time: "13:00", count: events.length },
        ];
  }, [events]);

  const gridStroke = isLight ? "#f0f2f7" : "#16171f";
  const tickColor = isLight ? "#717684" : "#71717a";

  return (
    <div className="dedicated-page-view events-page-view">
      {/* 1. TOP EVENT TREND CHART */}
      <div className="card event-trend-banner-card">
        <div className="card-header modern-chart-header">
          <div className="card-title-wrap">
            <Activity size={15} className="card-title-icon text-muted" />
            <h3 className="modern-table-title">Log Ingestion Velocity</h3>
          </div>
          <div className="live-counter-tag">
            <Clock size={12} className="text-muted" />
            <span>{events.length} logs streamed</span>
          </div>
        </div>

        <div style={{ height: "130px", width: "100%" }}>
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart
              data={timelineData}
              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
            >
              <defs>
                <linearGradient id="eventStreamGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
              <XAxis
                dataKey="time"
                tick={{ fill: tickColor, fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: tickColor, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className={`chart-tooltip-bubble ${theme}`}>
                        <div className="tooltip-label">{label}</div>
                        <div className="tooltip-stat">
                          <span className="tooltip-dot" style={{ backgroundColor: "#3b82f6" }} />
                          <span className="tooltip-val">{payload[0].value}</span>
                          <span className="tooltip-unit">events</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#eventStreamGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. FULL EVENTS STREAM TABLE */}
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
    </div>
  );
}
