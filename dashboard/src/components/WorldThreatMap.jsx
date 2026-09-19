import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown, Plus, Minus } from "lucide-react";
import { WorldMapPaths } from "./WorldMapPaths";

// Standard Miller/Robinson projection for arbitrary geo coordinates
function geoToSvg(lat, lng) {
  const x = 403 + (lng * (784.077 / 360));
  const latRad = (lat * Math.PI) / 180;
  const y = 492 - Math.sin(latRad * 0.95) * 195;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

// Preset geographic locations for IP telemetry mapping
export const GEO_LOCATIONS = {
  "New York, USA": {
    lat: 40.71,
    lng: -74.0,
    region: "North America",
    flag: "🇺🇸",
    x: 205,
    y: 425,
    baseScale: 1.45,
    defaultEvents: 142,
    defaultType: "BRUTE_FORCE",
    defaultSev: "CRITICAL",
  },
  "São Paulo, Brazil": {
    lat: -23.55,
    lng: -46.63,
    region: "South America",
    flag: "🇧🇷",
    x: 305,
    y: 580,
    baseScale: 1.15,
    defaultEvents: 38,
    defaultType: "PORT_SCAN",
    defaultSev: "HIGH",
  },
  "Berlin, Germany": {
    lat: 52.52,
    lng: 13.4,
    region: "Europe",
    flag: "🇩🇪",
    x: 430,
    y: 385,
    baseScale: 1.35,
    defaultEvents: 89,
    defaultType: "CREDENTIAL_ATTACK",
    defaultSev: "CRITICAL",
  },
  "London, UK": {
    lat: 51.51,
    lng: -0.13,
    region: "Europe",
    flag: "🇬🇧",
    x: 402,
    y: 372,
    baseScale: 1.1,
    defaultEvents: 24,
    defaultType: "AUTH_FAILURE",
    defaultSev: "MEDIUM",
  },
  "Johannesburg, South Africa": {
    lat: -26.2,
    lng: 28.04,
    region: "Africa",
    flag: "🇿🇦",
    x: 470,
    y: 580,
    baseScale: 1.1,
    defaultEvents: 45,
    defaultType: "SQL_INJECTION",
    defaultSev: "HIGH",
  },
  "Beijing, China": {
    lat: 39.9,
    lng: 116.4,
    region: "East Asia",
    flag: "🇨🇳",
    x: 655,
    y: 425,
    baseScale: 1.25,
    defaultEvents: 76,
    defaultType: "ACCOUNT_COMPROMISE",
    defaultSev: "CRITICAL",
  },
  "Tokyo, Japan": {
    lat: 35.68,
    lng: 139.69,
    region: "East Asia",
    flag: "🇯🇵",
    x: 710,
    y: 425,
    baseScale: 1.05,
    defaultEvents: 19,
    defaultType: "PORT_SCAN",
    defaultSev: "MEDIUM",
  },
  "Sydney, Australia": {
    lat: -33.87,
    lng: 151.21,
    region: "Oceania",
    flag: "🇦🇺",
    x: 715,
    y: 625,
    baseScale: 1.35,
    defaultEvents: 94,
    defaultType: "BRUTE_FORCE",
    defaultSev: "HIGH",
  },
  "Moscow, Russia": {
    lat: 55.75,
    lng: 37.62,
    region: "Eastern Europe",
    flag: "🇷🇺",
    x: 485,
    y: 360,
    baseScale: 1.1,
    defaultEvents: 31,
    defaultType: "AUTH_FAILURE",
    defaultSev: "MEDIUM",
  },
};

// Global primary hotspots matching the reference visual distribution
const GLOBAL_HOTSPOT_KEYS = [
  "New York, USA",
  "São Paulo, Brazil",
  "Berlin, Germany",
  "Johannesburg, South Africa",
  "Beijing, China",
  "Sydney, Australia",
];

export default function WorldThreatMap({
  sourceIps = [],
  simulatedAttacks = [],
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

  // Compute threat nodes based on live source IPs, simulated attacks, and baseline global hubs
  const threatNodes = useMemo(() => {
    const nodes = [];
    const locationKeys = Object.keys(GEO_LOCATIONS);

    // 1. Incorporate live source IPs
    const liveIpMap = new Map();
    sourceIps.forEach((ipData, idx) => {
      const locKey = locationKeys[idx % locationKeys.length];
      liveIpMap.set(locKey, {
        ip: ipData.name,
        events: ipData.value || 12,
        attackType: idx % 2 === 0 ? "BRUTE_FORCE" : "PORT_SCAN",
        severity: idx === 0 ? "CRITICAL" : idx < 3 ? "HIGH" : "MEDIUM",
      });
    });

    // 2. Incorporate recent simulated attacks
    const simMap = new Map();
    simulatedAttacks.forEach((sim) => {
      const locKey = sim.location || "New York, USA";
      simMap.set(locKey, {
        ip: sim.ip || "192.168.100.45",
        events: sim.events || 5,
        attackType: sim.attackType || "ACCOUNT_COMPROMISE",
        severity: "CRITICAL",
        isSimulated: true,
      });
    });

    // 3. Build nodes for the 6 primary global hotspots
    GLOBAL_HOTSPOT_KEYS.forEach((locKey, idx) => {
      const geo = GEO_LOCATIONS[locKey];
      const live = liveIpMap.get(locKey);
      const sim = simMap.get(locKey);

      let events = geo.defaultEvents;
      let attackType = geo.defaultType;
      let severity = geo.defaultSev;
      let ip = `192.168.${10 + idx * 5}.${45 + idx * 7}`;
      let isSimulated = false;

      if (sim) {
        events += sim.events * 10;
        attackType = sim.attackType;
        severity = "CRITICAL";
        ip = sim.ip;
        isSimulated = true;
      } else if (live) {
        events = Math.max(events, live.events);
        attackType = live.attackType;
        severity = live.severity;
        ip = live.ip;
      }

      const coords = { x: geo.x, y: geo.y };

      nodes.push({
        id: `node-${idx}-${locKey}`,
        location: locKey,
        region: geo.region,
        flag: geo.flag,
        ip,
        events,
        attackType,
        severity,
        x: coords.x,
        y: coords.y,
        scale: geo.baseScale * (isSimulated ? 1.2 : 1.0),
        isSimulated,
      });
    });

    // Optional faint companion node in Central Asia to match reference subtle sub-aura
    nodes.push({
      id: "node-companion-asia",
      location: "Central Asia Node",
      region: "Central Asia",
      flag: "🌐",
      ip: "10.14.88.12",
      events: 18,
      attackType: "NETWORK_PROBE",
      severity: "LOW",
      x: 605,
      y: 435,
      scale: 0.65,
      isSimulated: false,
      isSecondary: true,
    });

    return nodes;
  }, [sourceIps, simulatedAttacks]);

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

  return (
    <div className="reference-analytic-card world-threat-map-card">
      {/* Header matching Reference Image */}
      <div className="card-inner-top map-header-row">
        <div className="map-title-block">
          <h3 className="map-title-text">Global Threat Map</h3>
          <p className="map-subtitle-text">Live attack activity by source location</p>
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
            {/* High-Fidelity World Continents with Country Borders */}
            <WorldMapPaths />

            {/* Coral-Red Threat Hotspots with Layered Halos */}
            <g className="threat-hotspots-layer">
              {threatNodes.map((node) => {
                const isHovered = hoveredNode?.id === node.id;
                const scale = node.scale || 1.0;

                // Fixed radii matching reference proportions without position shifting
                const r3 = 34 * scale; // outermost faint halo
                const r2 = 21 * scale; // middle translucent ring
                const r1 = 12 * scale; // inner aura
                const r0 = 5.5 * scale; // solid core dot

                return (
                  <g
                    key={node.id}
                    className={`threat-hotspot-group ${isHovered ? "is-hovered" : ""} ${node.isSecondary ? "is-secondary" : ""}`}
                    transform={`translate(${node.x}, ${node.y})`}
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{ cursor: "pointer" }}
                  >
                    {/* 1. Outermost Faint Halo (rgba coral red ~12%) */}
                    <circle
                      r={r3}
                      className="threat-aura-outer"
                      fill="#ff5a52"
                      fillOpacity={node.isSecondary ? 0.08 : 0.14}
                    />

                    {/* 2. Middle Translucent Ring (~26%) */}
                    <circle
                      r={r2}
                      className="threat-aura-mid"
                      fill="#ff5a52"
                      fillOpacity={node.isSecondary ? 0.15 : 0.28}
                    />

                    {/* 3. Inner Aura (~45%) */}
                    <circle
                      r={r1}
                      className="threat-aura-inner"
                      fill="#ff5a52"
                      fillOpacity={node.isSecondary ? 0.25 : 0.46}
                    />

                    {/* 4. Solid Center Dot */}
                    <circle
                      r={r0}
                      className="threat-aura-core"
                      fill="#ff5a52"
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

        {/* Hover Tooltip Overlay */}
        {hoveredNode && (
          <div
            className="map-node-tooltip"
            style={{
              left: `${((hoveredNode.x - 30.767) / 784.077) * 100}%`,
              top: `${((hoveredNode.y - 241.591) / 458.627) * 100}%`,
            }}
          >
            <div className="tooltip-node-header">
              <span className="tooltip-flag">{hoveredNode.flag}</span>
              <strong>{hoveredNode.location}</strong>
            </div>
            <div className="tooltip-node-ip ip-mono">{hoveredNode.ip}</div>
            <div className="tooltip-node-meta">
              <span className={`badge-pill sev-${hoveredNode.severity.toLowerCase()}`}>
                {hoveredNode.severity}
              </span>
              <span className="tooltip-attack">{hoveredNode.attackType.replace(/_/g, " ")}</span>
            </div>
            <div className="tooltip-node-events">
              <strong>{hoveredNode.events}</strong> security events detected
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
