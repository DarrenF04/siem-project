import { useState } from "react";
import { Search, ScrollText, X, ChevronRight, Eye } from "lucide-react";

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
  const [selectedEvent, setSelectedEvent] = useState(null);

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
    // If ISO string like 2025-02-15T18:05:11
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

      {/* MINIMAL ENTERPRISE EVENTS TABLE */}
      <div className="table-responsive">
        <table className="modern-enterprise-table events-table">
          <thead>
            <tr>
              <th style={{ width: "170px" }}>Time</th>
              <th>Event</th>
              <th style={{ width: "160px" }}>Source IP</th>
              <th style={{ width: "140px" }}>Source</th>
              <th style={{ width: "110px" }}>Severity</th>
              <th style={{ width: "80px", textAlign: "right" }}>Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="empty-cell">
                  <div className="empty-message-wrap">
                    <span className="loading-spinner" />
                    <span>Loading security events stream...</span>
                  </div>
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-cell">
                  <div className="empty-message-wrap">
                    <ScrollText size={18} className="empty-state-icon text-muted" />
                    <span className="empty-title">No events recorded</span>
                  </div>
                </td>
              </tr>
            ) : filteredEvents.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-cell">
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
                  <tr
                    key={event.id}
                    className="modern-table-row"
                    onClick={() => setSelectedEvent(event)}
                    tabIndex={0}
                    title="Click to view full event details"
                  >
                    <td>
                      <span className="row-time-text">{formatTimestamp(event.timestamp)}</span>
                    </td>

                    <td>
                      <span className="event-type-clean">{event.event_type}</span>
                    </td>

                    <td>
                      <span className="ip-mono-clean">{event.source_ip}</span>
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

                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="btn-action-view"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                        }}
                        title="View event payload details"
                      >
                        <span>View</span>
                        <ChevronRight size={13} />
                      </button>
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

      {/* EVENT DETAILS MODAL (ACCESSIBLE ON ROW CLICK) */}
      {selectedEvent && (
        <div className="modal-backdrop" onClick={() => setSelectedEvent(null)}>
          <div
            className="modal-window event-detail-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <div className="modal-header-info">
                <span className="modal-category">Event Telemetry Inspector</span>
                <h3 className="modal-title">{selectedEvent.event_type}</h3>
              </div>
              <button
                className="modal-close-action"
                onClick={() => setSelectedEvent(null)}
                type="button"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body-content">
              <div className="event-meta-grid">
                <div className="event-meta-item">
                  <span className="meta-label">Event ID</span>
                  <span className="meta-val-mono">#{selectedEvent.id}</span>
                </div>
                <div className="event-meta-item">
                  <span className="meta-label">Timestamp</span>
                  <span className="meta-val-mono">{selectedEvent.timestamp || "-"}</span>
                </div>
                <div className="event-meta-item">
                  <span className="meta-label">Source IP</span>
                  <span className="meta-val-mono">{selectedEvent.source_ip}</span>
                </div>
                <div className="event-meta-item">
                  <span className="meta-label">Origin Subsystem</span>
                  <span className="meta-val-text">{selectedEvent.source || "Unknown"}</span>
                </div>
                <div className="event-meta-item">
                  <span className="meta-label">Severity</span>
                  <span className={`badge-pill-compact sev-${getSeverityClass(selectedEvent.severity)}`}>
                    <span className="pill-dot" />
                    {selectedEvent.severity}
                  </span>
                </div>
              </div>

              <div className="event-payload-box">
                <span className="meta-label">Raw Log Message / Details</span>
                <pre className="event-payload-code">
                  {selectedEvent.details || "No raw payload details provided."}
                </pre>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
