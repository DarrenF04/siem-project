import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  Loader2,
  LockKeyhole,
  Network,
  Play,
  RotateCcw,
  ShieldAlert,
  Terminal,
  XCircle,
  Activity,
  Globe,
  Clock,
} from "lucide-react";
import { GEO_LOCATIONS } from "./components/WorldThreatMap";
import "./AttackSimulator.css";

const API_URL = "http://127.0.0.1:8000";

const SCENARIOS = [
  {
    id: "brute-force",
    title: "Brute Force",
    description: "Five sequential failed authentications from the same origin IP.",
    icon: AlertTriangle,
    tone: "warning",
    events: 5,
    expected: "BRUTE_FORCE",
  },
  {
    id: "credential-attack",
    title: "Credential Attack",
    description: "Multiple failed attempts followed immediately by an authenticated login.",
    icon: LockKeyhole,
    tone: "high",
    events: 6,
    expected: "CREDENTIAL_ATTACK",
  },
  {
    id: "account-compromise",
    title: "Account Compromise",
    description: "Failed logins → successful login → unauthorized shell command execution.",
    icon: ShieldAlert,
    tone: "critical",
    events: 7,
    expected: "ACCOUNT_COMPROMISE",
  },
  {
    id: "command-execution",
    title: "Suspicious Command",
    description: "Isolated suspicious shell command executed without prior auth failure.",
    icon: Terminal,
    tone: "neutral",
    events: 1,
    expected: "SUSPICIOUS_COMMAND_EXECUTION",
  },
];

const ENDPOINTS = {
  "brute-force": "/simulate/brute-force",
  "credential-attack": "/simulate/credential-attack",
  "account-compromise": "/simulate/account-compromise",
  "command-execution": "/simulate/command-execution",
};

function randomPrivateIp() {
  return `192.168.100.${Math.floor(Math.random() * 241) + 10}`;
}

export default function AttackSimulator({ onAttackSimulated, recentSimulations = [] }) {
  const [sourceIp, setSourceIp] = useState("");
  const [geoLocation, setGeoLocation] = useState("New York, USA");
  const [selectedScenario, setSelectedScenario] = useState("account-compromise");
  const [scenarios, setScenarios] = useState(SCENARIOS);
  const [loading, setLoading] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadScenarios();
    checkBackend();
  }, []);

  async function checkBackend() {
    try {
      const response = await fetch(`${API_URL}/health`);
      setBackendOnline(response.ok);
    } catch {
      setBackendOnline(false);
    }
  }

  async function loadScenarios() {
    try {
      const response = await fetch(`${API_URL}/simulate/scenarios`);
      if (!response.ok) return;

      const data = await response.json();
      if (Array.isArray(data.scenarios) && data.scenarios.length) {
        setScenarios(
          data.scenarios.map((item) => ({
            ...SCENARIOS.find((scenario) => scenario.id === item.id),
            ...item,
          }))
        );
      }
    } catch {
      // Keep static fallbacks
    }
  }

  function reset() {
    setResult(null);
    setError("");
    setSourceIp("");
  }

  async function runSimulation() {
    setLoading(true);
    setError("");
    setResult(null);

    const scenario = scenarios.find((item) => item.id === selectedScenario);
    const endpoint = ENDPOINTS[selectedScenario];

    try {
      const targetIp = sourceIp.trim() || randomPrivateIp();
      const body = { source_ip: targetIp };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Simulation request failed.");
      }

      setBackendOnline(true);
      const simulationResult = {
        ...data,
        scenarioTitle: scenario?.title || selectedScenario,
        expected: scenario?.expected || data.scenario,
        location: geoLocation,
        source_ip: targetIp,
        timestamp: new Date().toLocaleTimeString(),
      };

      setResult(simulationResult);

      // Notify parent to update World Threat Map and recent history
      if (onAttackSimulated) {
        onAttackSimulated({
          ip: targetIp,
          location: geoLocation,
          scenarioTitle: scenario?.title || selectedScenario,
          attackType: scenario?.expected || "ATTACK_VECTOR",
          events: data.events_generated || scenario?.events || 5,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    } catch (err) {
      setBackendOnline(false);
      setError(
        err.message ||
          "Unable to connect to the SIEM backend. Verify FastAPI service is running."
      );
    } finally {
      setLoading(false);
    }
  }

  const selected = scenarios.find((item) => item.id === selectedScenario);

  return (
    <div className="card simulator-panel">
      <div className="card-header simulator-header-row">
        <div className="card-title-wrap">
          <Crosshair size={18} className="card-title-icon text-red" />
          <div>
            <h3 style={{ margin: 0, fontSize: "16px" }}>Attack Simulator</h3>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Inject synthetic attack patterns to test detection, correlation, and live SOC alert workflows
            </span>
          </div>
        </div>

        <div className={`backend-indicator ${backendOnline ? "online" : "offline"}`}>
          <span className="backend-dot" />
          <span>{backendOnline ? "API Online" : "API Disconnected"}</span>
        </div>
      </div>

      <div className="simulator-body-grid">
        {/* Scenario Selector */}
        <div className="sim-subcard scenario-picker-card">
          <div className="sim-step-title">
            <h4>Attack Scenario</h4>
          </div>

          <div className="scenario-options-stack">
            {scenarios.map((scenario) => {
              const Icon = scenario.icon || AlertTriangle;
              const active = selectedScenario === scenario.id;

              return (
                <button
                  key={scenario.id}
                  className={`scenario-card-btn ${active ? "active" : ""}`}
                  onClick={() => {
                    setSelectedScenario(scenario.id);
                    setResult(null);
                    setError("");
                  }}
                  type="button"
                >
                  <div className={`scenario-btn-icon tone-${scenario.tone || "neutral"}`}>
                    <Icon size={18} />
                  </div>

                  <div className="scenario-btn-content">
                    <div className="scenario-btn-top">
                      <span className="scenario-btn-title">{scenario.title || scenario.name}</span>
                      <span className="scenario-events-pill">
                        {scenario.events_generated ?? scenario.events} events
                      </span>
                    </div>
                    <p className="scenario-btn-desc">
                      {scenario.description || "Controlled SIEM simulation."}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Configure & Trigger */}
        <div className="sim-subcard execution-config-card">
          <div className="sim-step-title">
            <h4>Attack Parameters</h4>
          </div>

          <div className="selected-preview-banner">
            <span className="preview-label">Selected Vector</span>
            <strong className="preview-name">{selected?.title || selected?.name}</strong>
          </div>

          {/* Source IP Input */}
          <div className="form-field-group">
            <label htmlFor="source-ip-input" className="form-field-label">
              Source IP Address
            </label>
            <div className="input-with-icon">
              <Network size={15} className="input-field-icon" />
              <input
                id="source-ip-input"
                type="text"
                value={sourceIp}
                onChange={(e) => setSourceIp(e.target.value)}
                placeholder="Auto-generate RFC1918 (e.g. 192.168.100.45)"
                spellCheck="false"
              />
            </div>
            <span className="form-field-hint">Leave blank to randomize IP.</span>
          </div>

          {/* Geo-Location Selector (Updates World Threat Map) */}
          <div className="form-field-group">
            <label htmlFor="geo-location-select" className="form-field-label">
              Geo-Location (World Map Visualization)
            </label>
            <div className="input-with-icon">
              <Globe size={15} className="input-field-icon" />
              <select
                id="geo-location-select"
                className="sim-geo-select-input"
                value={geoLocation}
                onChange={(e) => setGeoLocation(e.target.value)}
              >
                {Object.keys(GEO_LOCATIONS).map((locKey) => (
                  <option key={locKey} value={locKey}>
                    {GEO_LOCATIONS[locKey].flag} {locKey}
                  </option>
                ))}
              </select>
            </div>
            <span className="form-field-hint">
              Target coordinates will pulse on the Dashboard World Threat Map.
            </span>
          </div>

          <div className="sim-actions-row">
            <button
              className="btn-sim-reset"
              onClick={reset}
              disabled={loading}
              type="button"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>

            <button
              className="btn-sim-execute"
              onClick={runSimulation}
              disabled={loading}
              type="button"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="spin-icon" />
                  <span>Simulating Vector...</span>
                </>
              ) : (
                <>
                  <Play size={15} />
                  <span>Run Simulation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Step 3: Simulation Results Card */}
      <div className="sim-subcard results-status-card">
        <div className="sim-step-title">
          <h4>Simulation Status & Output</h4>
        </div>

        {!result && !error && (
          <div className="sim-empty-result">
            <Activity size={18} className="empty-result-icon" />
            <div className="empty-result-text">
              <span className="empty-result-headline">Ready for simulation</span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                Select an attack scenario above and click Run Simulation to test log ingestion and correlation.
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="sim-alert-box alert-error">
            <XCircle size={16} className="alert-icon" />
            <div className="alert-text-group">
              <strong>Execution Failed</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {result && (
          <div className="sim-result-container">
            <div className="sim-alert-box alert-success">
              <CheckCircle2 size={16} className="alert-icon" />
              <div className="alert-text-group">
                <strong>{result.message || "Attack vector simulated successfully."}</strong>
              </div>
            </div>

            <div className="result-metrics-grid">
              <div className="result-metric-tile">
                <span className="tile-label">Scenario</span>
                <span className="tile-value">{result.scenarioTitle}</span>
              </div>
              <div className="result-metric-tile">
                <span className="tile-label">Origin IP</span>
                <code className="ip-mono tile-value">{result.source_ip}</code>
              </div>
              <div className="result-metric-tile">
                <span className="tile-label">Geo Location</span>
                <span className="tile-value">{result.location}</span>
              </div>
              <div className="result-metric-tile">
                <span className="tile-label">Events Generated</span>
                <span className="tile-value">{result.events_generated}</span>
              </div>
            </div>

            <div className="result-observe-bar">
              <Activity size={14} className="text-green" />
              <span>
                Telemetry dispatched to ingestion pipeline. Correlated incident triggered on Incidents page and World Map updated on Dashboard.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Step 4: Recent Simulations History (Matching Reference Image) */}
      <div className="sim-subcard recent-simulations-card" style={{ marginTop: "12px" }}>
        <div className="sim-step-title">
          <Clock size={15} />
          <h4>Recent Simulations</h4>
        </div>

        <div className="table-responsive">
          <table className="data-table recent-sim-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Scenario</th>
                <th>Source IP</th>
                <th>Geo Location</th>
                <th>Events</th>
                <th style={{ textAlign: "right" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentSimulations.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty-message">
                    No simulations executed in this session yet.
                  </td>
                </tr>
              ) : (
                recentSimulations.slice(0, 5).map((sim, idx) => (
                  <tr key={idx}>
                    <td className="time-mono">{sim.timestamp}</td>
                    <td>
                      <strong>{sim.scenarioTitle}</strong>
                    </td>
                    <td>
                      <code className="ip-mono">{sim.ip}</code>
                    </td>
                    <td>{sim.location}</td>
                    <td>{sim.events}</td>
                    <td style={{ textAlign: "right" }}>
                      <span className="badge-pill sev-low">Dispatched</span>
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
