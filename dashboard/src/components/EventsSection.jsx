import { useState } from "react";
import { Search, Server, X, SlidersHorizontal } from "lucide-react";

export default function EventsSection({
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
}) {
  const [displayLimit, setDisplayLimit] = useState(10);

  const isFiltered =
    eventSearch !== "" ||
    eventSeverity !== "ALL" ||
    eventType !== "ALL" ||
    eventSourceIp !== "ALL";

  const clearFilters = () => {
    setEventSearch("");
    setEventSeverity("ALL");
    setEventType("ALL");
    setEventSourceIp("ALL");
  };

  const displayedEvents = filteredEvents.slice(0, displayLimit);

  return (
    <section className="panel large-panel" id="events-section">
      <div className="panel-header section-header-split">
        <div>
          <div className="section-kicker">
            <Server size={13} />
            <span>RAW LOG STREAM</span>
          </div>
          <h2>Recent Security Events</h2>
          <p>Latest raw security events received and indexed by the SIEM</p>
        </div>

        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search IP, host, or payload..."
            value={eventSearch}
            onChange={(e) => setEventSearch(e.target.value)}
          />
          {eventSearch && (
            <button
              className="search-clear-btn"
              onClick={() => setEventSearch("")}
              type="button"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* EVENT FILTERS */}
      <div className="event-filters">
        <div className="filters-group">
          <div className="filter-select-wrapper">
            <SlidersHorizontal size={14} className="filter-icon" />
            <select
              value={eventSeverity}
              onChange={(e) => setEventSeverity(e.target.value)}
              aria-label="Filter events by severity"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
              <option value="INFO">Info</option>
            </select>
          </div>

          <div className="filter-select-wrapper">
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              aria-label="Filter by event type"
            >
              <option value="ALL">All Event Types</option>
              {eventTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-select-wrapper">
            <select
              value={eventSourceIp}
              onChange={(e) => setEventSourceIp(e.target.value)}
              aria-label="Filter by source IP"
            >
              <option value="ALL">All Source IPs</option>
              {sourceIps.map((ip) => (
                <option key={ip} value={ip}>
                  {ip}
                </option>
              ))}
            </select>
          </div>

          {isFiltered && (
            <button className="clear-filters" onClick={clearFilters} type="button">
              <X size={14} />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="filter-result-count">
          Showing <strong>{filteredEvents.length}</strong> of{" "}
          <strong>{events.length}</strong> events
        </div>
      </div>

      {/* EVENTS TABLE */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: "170px" }}>Timestamp</th>
              <th>Event Type</th>
              <th>Source IP</th>
              <th>Source</th>
              <th>Severity</th>
              <th>Details</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="empty">
                  <div className="empty-state">
                    <span className="empty-spinner"></span>
                    <p>Streaming security events...</p>
                  </div>
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty">
                  <div className="empty-state">
                    <Server size={32} className="empty-icon" />
                    <p>No security events recorded yet</p>
                    <span>Waiting for ingest daemon telemetry...</span>
                  </div>
                </td>
              </tr>
            ) : filteredEvents.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty">
                  <div className="empty-state">
                    <Search size={32} className="empty-icon" />
                    <p>No events match the current filter criteria</p>
                    <button className="empty-reset-btn" onClick={clearFilters} type="button">
                      Clear filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              displayedEvents.map((event) => (
                <tr key={event.id} className="event-row">
                  <td className="time-cell">
                    <span className="timestamp-mono">
                      {event.timestamp
                        ? event.timestamp.replace("T", " ").slice(0, 19)
                        : "-"}
                    </span>
                  </td>

                  <td>
                    <span className="event-type-badge">
                      {event.event_type}
                    </span>
                  </td>

                  <td>
                    <span className="ip ip-pill">{event.source_ip}</span>
                  </td>

                  <td>
                    <span className="source-tag">{event.source}</span>
                  </td>

                  <td>
                    <span
                      className={`severity ${getSeverityClass(
                        event.severity
                      )}`}
                    >
                      <span className="severity-badge-dot"></span>
                      {event.severity}
                    </span>
                  </td>

                  <td className="details-cell">
                    <span className="details-text" title={event.details}>
                      {event.details}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination / Limit toggle (defaults to 10) */}
      {filteredEvents.length > 10 && (
        <div className="table-footer-controls">
          <span className="footer-status-text">
            Displaying {displayedEvents.length} of {filteredEvents.length} events
          </span>
          <div className="limit-buttons">
            <button
              className={`limit-btn ${displayLimit === 10 ? "active" : ""}`}
              onClick={() => setDisplayLimit(10)}
              type="button"
            >
              10
            </button>
            <button
              className={`limit-btn ${displayLimit === 25 ? "active" : ""}`}
              onClick={() => setDisplayLimit(25)}
              type="button"
            >
              25
            </button>
            <button
              className={`limit-btn ${displayLimit === 50 ? "active" : ""}`}
              onClick={() => setDisplayLimit(50)}
              type="button"
            >
              50
            </button>
            <button
              className={`limit-btn ${displayLimit >= filteredEvents.length ? "active" : ""}`}
              onClick={() => setDisplayLimit(filteredEvents.length)}
              type="button"
            >
              All ({filteredEvents.length})
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
