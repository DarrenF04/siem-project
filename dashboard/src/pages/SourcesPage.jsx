import { useState, useMemo } from "react";
import { Network, Search, X, ShieldAlert, Activity } from "lucide-react";

export default function SourcesPage({
  events = [],
  incidents = [],
  sourceIpData = [],
  onSelectIncident,
  theme = "light",
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const totalEventsCount = events.length || 1;

  // Aggregate source IP telemetry from both events and incidents
  const aggregatedSources = useMemo(() => {
    const ipMap = {};

    // 1. Ingest events per IP
    events.forEach((evt) => {
      const ip = evt.source_ip || "Unknown";
      if (!ipMap[ip]) {
        ipMap[ip] = {
          ip,
          eventCount: 0,
          incidentCount: 0,
          severities: new Set(),
          attackTypes: new Set(),
          latestTimestamp: evt.timestamp,
        };
      }
      ipMap[ip].eventCount += 1;
      if (evt.severity) ipMap[ip].severities.add(evt.severity);
      if (evt.event_type) ipMap[ip].attackTypes.add(evt.event_type);
    });

    // 2. Correlate incidents per IP
    incidents.forEach((inc) => {
      const ip = inc.source_ip || "Unknown";
      if (!ipMap[ip]) {
        ipMap[ip] = {
          ip,
          eventCount: 0,
          incidentCount: 0,
          severities: new Set(),
          attackTypes: new Set(),
          latestTimestamp: inc.timestamp,
        };
      }
      ipMap[ip].incidentCount += 1;
      if (inc.severity) ipMap[ip].severities.add(inc.severity);
      if (inc.attack_type) ipMap[ip].attackTypes.add(inc.attack_type);
    });

    // Convert to sorted array
    const list = Object.values(ipMap).map((item) => {
      const isCrit = item.severities.has("CRITICAL");
      const isHigh = item.severities.has("HIGH");
      const isMed = item.severities.has("MEDIUM");

      const riskRating = isCrit ? "CRITICAL" : isHigh ? "HIGH" : isMed ? "MEDIUM" : "LOW";
      const pctShare = Math.round((item.eventCount / totalEventsCount) * 100);

      return {
        ...item,
        riskRating,
        pctShare: Math.min(100, Math.max(1, pctShare)),
        attackTypesList: Array.from(item.attackTypes).slice(0, 2),
      };
    });

    list.sort((a, b) => b.eventCount - a.eventCount || b.incidentCount - a.incidentCount);

    // Fallback baseline if no events yet
    if (list.length === 0) {
      return [
        { ip: "192.168.100.50", eventCount: 72, incidentCount: 5, pctShare: 45, riskRating: "CRITICAL", attackTypesList: ["FAILED_LOGIN", "BRUTE_FORCE"] },
        { ip: "192.168.1.50", eventCount: 58, incidentCount: 3, pctShare: 32, riskRating: "HIGH", attackTypesList: ["COMMAND_EXECUTION", "SQLI_ATTEMPT"] },
        { ip: "10.0.0.230", eventCount: 21, incidentCount: 2, pctShare: 14, riskRating: "HIGH", attackTypesList: ["PORT_SCAN"] },
        { ip: "192.168.100.93", eventCount: 12, incidentCount: 1, pctShare: 6, riskRating: "MEDIUM", attackTypesList: ["AUTH_FAILURE"] },
        { ip: "192.168.100.52", eventCount: 4, incidentCount: 0, pctShare: 2, riskRating: "LOW", attackTypesList: ["PING_SWEEP"] },
      ];
    }

    return list;
  }, [events, incidents, totalEventsCount]);

  // Filtered by search
  const filteredSources = aggregatedSources.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      q === "" ||
      s.ip.toLowerCase().includes(q) ||
      s.riskRating.toLowerCase().includes(q)
    );
  });

  const maxEventCount = Math.max(...aggregatedSources.map((s) => s.eventCount), 1);

  return (
    <div className="dedicated-page-view sources-page-view">
      {/* 1. TOP SUMMARY ACTIVITY OVERVIEW */}
      <div className="card modern-table-card source-overview-hero-card">
        <div className="card-header modern-table-header">
          <div className="card-title-wrap">
            <Network size={15} className="card-title-icon text-muted" />
            <h3 className="modern-table-title">Source IP Telemetry Activity</h3>
          </div>
          <div className="live-counter-tag">
            <Activity size={12} className="text-muted" />
            <span>{aggregatedSources.length} origin IPs tracked</span>
          </div>
        </div>

        {/* Top 4 IP Micro Cards */}
        <div className="sources-quick-bars-grid">
          {aggregatedSources.slice(0, 4).map((s) => {
            const barWidth = Math.max(4, Math.round((s.eventCount / maxEventCount) * 100));
            return (
              <div className="source-quick-card" key={s.ip}>
                <div className="quick-card-header">
                  <span className="ip-mono-clean">{s.ip}</span>
                  <span className={`badge-pill-compact sev-${s.riskRating.toLowerCase()}`}>
                    <span className="pill-dot" />
                    {s.riskRating}
                  </span>
                </div>
                <div className="quick-bar-track">
                  <div
                    className={`quick-bar-fill ${s.riskRating === "CRITICAL" ? "bar-coral" : "bar-blue"}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <div className="quick-card-meta">
                  <span>{s.eventCount} events</span>
                  <span>{s.incidentCount} incident{s.incidentCount !== 1 ? "s" : ""}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. SOURCES THREAT DIRECTORY TABLE */}
      <div className="card modern-table-card sources-table-panel">
        <div className="card-header modern-table-header">
          <div className="card-title-wrap">
            <ShieldAlert size={15} className="card-title-icon text-muted" />
            <h3 className="modern-table-title">Source IP Threat Directory</h3>
          </div>

          {/* Compact Search Field */}
          <div className="search-field-compact">
            <Search size={14} className="search-field-icon" />
            <input
              type="text"
              placeholder="Search IP or risk level..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="search-clear-action"
                onClick={() => setSearchQuery("")}
                type="button"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Minimal Enterprise Table */}
        <div className="table-responsive">
          <table className="modern-enterprise-table sources-table">
            <thead>
              <tr>
                <th style={{ width: "170px" }}>Source IP</th>
                <th style={{ width: "100px" }}>Events</th>
                <th style={{ width: "150px" }}>Traffic Share</th>
                <th style={{ width: "140px" }}>Incidents</th>
                <th>Observed Attack Vectors</th>
                <th style={{ width: "110px", textAlign: "right" }}>Risk</th>
              </tr>
            </thead>
            <tbody>
              {filteredSources.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-cell">
                    <div className="empty-message-wrap">
                      <Search size={20} className="empty-state-icon text-muted" />
                      <span className="empty-title">No matching source IP records found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSources.map((source) => (
                  <tr key={source.ip} className="modern-table-row">
                    <td>
                      <span className="ip-mono-clean">{source.ip}</span>
                    </td>
                    <td>
                      <span className="table-num-mono">{source.eventCount}</span>
                    </td>
                    <td>
                      <div className="traffic-share-compact">
                        <span className="traffic-pct-label">{source.pctShare}%</span>
                        <div className="traffic-mini-track">
                          <div
                            className="traffic-mini-fill"
                            style={{ width: `${source.pctShare}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`incidents-count-cell ${source.incidentCount > 0 ? "has-incidents" : "no-incidents"}`}>
                        {source.incidentCount > 0 && <span className="pill-dot" />}
                        {source.incidentCount} incident{source.incidentCount !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td>
                      <div className="vector-tags-compact">
                        {source.attackTypesList.length > 0 ? (
                          source.attackTypesList.map((type) => (
                            <span className="vector-neutral-tag" key={type}>
                              {type.replace(/_/g, " ")}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted" style={{ fontSize: "11px" }}>Standard</span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className={`badge-pill-compact sev-${source.riskRating.toLowerCase()}`}>
                        <span className="pill-dot" />
                        {source.riskRating}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
