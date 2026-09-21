import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown, Plus, Minus } from "lucide-react";
import { WorldMapPaths } from "./WorldMapPaths";

// Continuous calibrated coordinate projection for arbitrary geo coordinates
export function geoToSvg(lat, lng) {
  const x = 410.0 + 2.318 * lng;
  const y = 535.0 - 2.85 * lat;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

// Preset geographic locations for demonstration & simulator selection
export const GEO_LOCATIONS = {
  "India": {
    country: "India",
    lat: 19.0760,
    lng: 72.8777,
    flag: "🇮🇳",
    x: 585,
    y: 480,
  },
  "Germany": {
    country: "Germany",
    lat: 52.5200,
    lng: 13.4050,
    flag: "🇩🇪",
    x: 430,
    y: 385,
  },
  "United States": {
    country: "United States",
    lat: 40.7128,
    lng: -74.0060,
    flag: "🇺🇸",
    x: 205,
    y: 425,
  },
  "Singapore": {
    country: "Singapore",
    lat: 1.3521,
    lng: 103.8198,
    flag: "🇸🇬",
    x: 659,
    y: 527,
  },
  "Brazil": {
    country: "Brazil",
    lat: -23.5505,
    lng: -46.6333,
    flag: "🇧🇷",
    x: 305,
    y: 580,
  },
  "South Africa": {
    country: "South Africa",
    lat: -26.2041,
    lng: 28.0473,
    flag: "🇿🇦",
    x: 470,
    y: 580,
  },
  "United Kingdom": {
    country: "United Kingdom",
    lat: 51.5074,
    lng: -0.1278,
    flag: "🇬🇧",
    x: 402,
    y: 372,
  },
  "Japan": {
    country: "Japan",
    lat: 35.6762,
    lng: 139.6503,
    flag: "🇯🇵",
    x: 710,
    y: 425,
  },
  "Australia": {
    country: "Australia",
    lat: -33.8688,
    lng: 151.2093,
    flag: "🇦🇺",
    x: 715,
    y: 625,
  },
  "None (No Location)": {
    country: null,
    lat: null,
    lng: null,
    flag: "🚫",
  },
};

export default function WorldThreatMap({
  events = [],
}) {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [timeRange, setTimeRange] = useState("Last 24 Hours");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute threat nodes strictly from real events that contain latitude and longitude
  const threatNodes = useMemo(() => {
    const geoEvents = (events || []).filter(
      (ev) =>
        ev &&
        ev.latitude !== null &&
        ev.latitude !== undefined &&
        ev.longitude !== null &&
        ev.longitude !== undefined &&
        !isNaN(Number(ev.latitude)) &&
        !isNaN(Number(ev.longitude))
    );

    // Rule: NO LOCATION DATA = NO MAP MARKER
    if (geoEvents.length === 0) {
      return [];
    }

    // Aggregate multiple events that report the same location cleanly
    const groups = new Map();
    const SEV_WEIGHT = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 };

    geoEvents.forEach((ev) => {
      const lat = Number(ev.latitude);
      const lng = Number(ev.longitude);
      const country = ev.country || "Reported Location";
      const key = `${country.toLowerCase()}-${lat.toFixed(3)}-${lng.toFixed(3)}`;

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          country,
          lat,
          lng,
          count: 0,
          sourceIps: new Set(),
          attackTypes: new Set(),
          maxSev: "INFO",
        });
      }

      const g = groups.get(key);
      g.count += 1;
      if (ev.source_ip) g.sourceIps.add(ev.source_ip);
      if (ev.event_type) g.attackTypes.add(ev.event_type.replace(/_/g, " "));

      const sev = (ev.severity || "INFO").toUpperCase();
      if ((SEV_WEIGHT[sev] || 0) > (SEV_WEIGHT[g.maxSev] || 0)) {
        g.maxSev = sev;
      }
    });

    const nodes = [];
    let idx = 0;

    groups.forEach((g) => {
      const preset = Object.values(GEO_LOCATIONS).find(
        (loc) => loc.country && loc.country.toLowerCase() === g.country.toLowerCase()
      );

      let x, y, flag;
      if (preset && preset.x && preset.y) {
        x = preset.x;
        y = preset.y;
        flag = preset.flag;
      } else {
        const projected = geoToSvg(g.lat, g.lng);
        x = projected.x;
        y = projected.y;
        flag = preset?.flag || "📍";
      }

      const scale = Math.min(1.5, 1.0 + (g.count / 20) * 0.4);
      const primaryAttack = Array.from(g.attackTypes).join(", ") || "SECURITY EVENT";

      nodes.push({
        id: `node-${idx++}-${g.key}`,
        country: g.country,
        flag,
        lat: g.lat,
        lng: g.lng,
        x,
        y,
        events: g.count,
        sourceIps: Array.from(g.sourceIps),
        severity: g.maxSev,
        attackType: primaryAttack,
        scale,
      });
    });

    return nodes;
  }, [events]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(2.0, Math.round((prev + 0.25) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(1.0, Math.round((prev - 0.25) * 100) / 100));
  };

  const timeRanges = [
    "Last 24 Hours",
    "Last 12 Hours",
    "Last 6 Hours",
    "Last 1 Hour",
    "All Time",
  ];

  // Smart tooltip positioning: flips below northern hotspots so it never goes off the top
  const tooltipPosition = useMemo(() => {
    if (!hoveredNode) return null;

    const zoomedX = 422 + (hoveredNode.x - 422) * zoom;
    const zoomedY = 470 + (hoveredNode.y - 470) * zoom;

    const leftPct = Math.max(16, Math.min(84, ((zoomedX - 30.767) / 784.077) * 100));
    const topPct = ((zoomedY - 241.591) / 458.627) * 100;
    const isBelow = topPct < 52;

    return {
      left: `${leftPct}%`,
      top: `${topPct}%`,
      transform: isBelow
        ? "translate(-50%, 28px)"
        : "translate(-50%, calc(-100% - 28px))",
      isBelow,
    };
  }, [hoveredNode, zoom]);

  return (
    <div className="reference-analytic-card world-threat-map-card">
      {/* Header with Truthful Labeling */}
      <div className="card-inner-top map-header-row">
        <div className="map-title-block">
          <h3 className="map-title-text">Global Threat Map</h3>
          <p className="map-subtitle-text">Attack Activity by Reported Source Location</p>
        </div>

        {/* Pill Dropdown: Last 24 Hours */}
        <div className="map-time-dropdown-wrap" ref={dropdownRef}>
          <button
            type="button"
            className="map-time-pill"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-expanded={isDropdownOpen}
          >
            <span>{timeRange}</span>
            <ChevronDown size={14} className={`dropdown-arrow ${isDropdownOpen ? "open" : ""}`} />
          </button>

          {isDropdownOpen && (
            <div className="map-time-menu">
              {timeRanges.map((range) => (
                <button
                  key={range}
                  type="button"
                  className={`map-time-menu-item ${range === timeRange ? "active" : ""}`}
                  onClick={() => {
                    setTimeRange(range);
                    setIsDropdownOpen(false);
                  }}
                >
                  {range}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map Stage */}
      <div className="threat-map-stage">
        <svg
          viewBox="30.767 241.591 784.077 458.627"
          className="world-map-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Zoomable Vector Canvas */}
          <g
            className="world-map-viewport"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "422px 470px",
              transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Continents and Country Outlines */}
            <WorldMapPaths />

            {/* Truthful Data-Driven Hotspots with Breathing Effect */}
            <g className="threat-hotspots-layer">
              {threatNodes.map((node, index) => {
                const isHovered = hoveredNode?.id === node.id;
                const scale = node.scale || 1.0;

                const r3 = 34 * scale;
                const r2 = 21 * scale;
                const r1 = 12 * scale;
                const r0 = 5.5 * scale;

                const breatheDelay = `${((index * 0.55) % 3.2).toFixed(2)}s`;
                const breatheStyle = { animationDelay: breatheDelay };

                return (
                  <g
                    key={node.id}
                    className={`threat-hotspot-group ${isHovered ? "is-hovered" : ""}`}
                    transform={`translate(${node.x}, ${node.y})`}
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{ cursor: "pointer" }}
                  >
                    {/* 1. Outermost Faint Halo */}
                    <circle
                      r={r3}
                      className="threat-aura-outer"
                      fill="#ff5a52"
                      fillOpacity={0.14}
                      style={breatheStyle}
                    />

                    {/* 2. Middle Translucent Ring */}
                    <circle
                      r={r2}
                      className="threat-aura-mid"
                      fill="#ff5a52"
                      fillOpacity={0.28}
                      style={breatheStyle}
                    />

                    {/* 3. Inner Aura */}
                    <circle
                      r={r1}
                      className="threat-aura-inner"
                      fill="#ff5a52"
                      fillOpacity={0.46}
                      style={breatheStyle}
                    />

                    {/* 4. Solid Center Dot */}
                    <circle
                      r={r0}
                      className="threat-aura-core"
                      fill="#ff5a52"
                      style={breatheStyle}
                    />
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        {/* Floating Zoom Controls (+ / -) in Bottom-Left */}
        <div className="map-zoom-controls">
          <button
            type="button"
            className="map-zoom-btn"
            onClick={handleZoomIn}
            disabled={zoom >= 2.0}
            title="Zoom In"
            aria-label="Zoom In"
          >
            <Plus size={15} strokeWidth={2.2} />
          </button>
          <div className="map-zoom-divider" />
          <button
            type="button"
            className="map-zoom-btn"
            onClick={handleZoomOut}
            disabled={zoom <= 1.0}
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <Minus size={15} strokeWidth={2.2} />
          </button>
        </div>

        {/* Hover Tooltip Overlay (Displaying Real Telemetry) */}
        {hoveredNode && tooltipPosition && (
          <div
            className={`map-node-tooltip ${tooltipPosition.isBelow ? "pos-below" : "pos-above"}`}
            style={{
              left: tooltipPosition.left,
              top: tooltipPosition.top,
              transform: tooltipPosition.transform,
            }}
          >
            <div className="tooltip-node-header">
              <span className="tooltip-flag">{hoveredNode.flag}</span>
              <strong>{hoveredNode.country}</strong>
            </div>
            <div className="tooltip-node-ip ip-mono">
              Source IP: {hoveredNode.sourceIps.join(", ") || "—"}
            </div>
            <div className="tooltip-node-meta">
              <span className={`badge-pill-compact sev-${hoveredNode.severity.toLowerCase()}`}>
                <span className="pill-dot" />
                {hoveredNode.severity}
              </span>
              <span className="tooltip-attack">{hoveredNode.attackType}</span>
            </div>
            <div className="tooltip-node-events">
              <strong>{hoveredNode.events}</strong> security event{hoveredNode.events !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
