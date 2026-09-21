import { useState } from "react";
import { Search, ScrollText, X } from "lucide-react";

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
  const [displayLimit, setDisplayLimit] = useState(15);

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

  const formatTimestamp = (ts) => {
    if (!ts) return "-";
    const parts = ts.split("T");
    if (parts.length === 2) {
      const timePart = parts[1].slice(0, 8);
      const datePart = parts[0];
      return `${datePart} ${timePart}`;
    }
    return ts.slice(0, 19);
  };

  return (
    <section className="card modern-table-card events-panel" id="events-section">
      {/* CARD TOP: TITLE & COMPACT SEARCH */}
      <div className="card-header modern-table-header">
        <div className="card-title-wrap">
          <ScrollText size={15} className="card-title-icon text-muted" />
          <h3 className="modern-table-title">Security Events Stream</h3>
        </div>

        {/* Compact Search */}
        <div className="search-field-compact">
          <Search size={14} className="search-field-icon" />
          <input
            type="text"
            placeholder="Search events..."
            value={eventSearch}
            onChange={(e) => setEventSearch(e.target.value)}
          />
          {eventSearch && (
            <button
              className="search-clear-action"
              onClick={() => setEventSearch("")}
              type="button"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="modern-table-toolbar">
        <div className="modern-filters-row">
          <div className="filter-select-compact">
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

          <div className="filter-select-compact">
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

          <div className="filter-select-compact">
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
            <button className="btn-filter-reset-compact" onClick={clearFilters} type="button">
              <X size={11} />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="modern-table-counter">
          {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* MINIMAL ENTERPRISE RAW TELEMETRY TABLE */}
      <div className="table-responsive">
        <table className="modern-enterprise-table events-table">
          <thead>
            <tr>
              <th style={{ width: "150px" }}>Time</th>
              <th style={{ width: "170px" }}>Event</th>
              <th>Details</th>
              <th style={{ width: "140px" }}>Source IP</th>
              <th style={{ width: "120px" }}>Country</th>
              <th style={{ width: "110px" }}>Source</th>
              <th style={{ width: "100px" }}>Severity</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="empty-cell">
                  <div className="empty-message-wrap">
                    <span className="loading-spinner" />
                    <span>Loading security events stream...</span>
                  </div>
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-cell">
                  <div className="empty-message-wrap">
                    <ScrollText size={18} className="empty-state-icon text-muted" />
                    <span className="empty-title">No events recorded</span>
                  </div>
                </td>
              </tr>
            ) : filteredEvents.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-cell">
                  <div className="empty-message-wrap">
                    <Search size={20} className="empty-state-icon text-muted" />
                    <span className="empty-title">No matching events found</span>
                    <button className="btn-empty-reset" onClick={clearFilters} type="button">
                      Clear filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              displayedEvents.map((event) => {
                const sevKey = getSeverityClass(event.severity);

                return (
                  <tr key={event.id} className="modern-table-row">
                    <td>
                      <span className="row-time-text">{formatTimestamp(event.timestamp)}</span>
                    </td>

                    <td>
                      <span className="event-type-clean">{event.event_type}</span>
                    </td>

                    <td>
                      <span className="event-details-text" title={event.details}>
                        {event.details || "—"}
                      </span>
                    </td>

                    <td>
                      <span className="ip-mono-clean">{event.source_ip}</span>
                    </td>

                    <td>
                      <span className="country-clean-text">{event.country || "—"}</span>
                    </td>

                    <td>
                      <span className="source-subsystem-tag">{event.source || "System"}</span>
                    </td>

                    <td>
                      <span className={`badge-pill-compact sev-${sevKey}`}>
                        <span className="pill-dot" />
                        {event.severity}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* COMPACT PAGINATION FOOTER */}
      {filteredEvents.length > 10 && (
        <div className="modern-table-footer">
          <span className="footer-count-text">
            Showing {displayedEvents.length} of {filteredEvents.length}
          </span>
          <div className="pagination-pills-compact">
            {[10, 25, 50].map((limit) => (
              <button
                key={limit}
                className={`pill-btn-compact ${displayLimit === limit ? "active" : ""}`}
                onClick={() => setDisplayLimit(limit)}
                type="button"
              >
                {limit}
              </button>
            ))}
            <button
              className={`pill-btn-compact ${displayLimit >= filteredEvents.length ? "active" : ""}`}
              onClick={() => setDisplayLimit(filteredEvents.length)}
              type="button"
            >
              All
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
