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
    icon: AlertTriangle,
    events: 5,
    expected: "BRUTE_FORCE",
  },
  {
    id: "credential-attack",
    title: "Credential Attack",
    icon: LockKeyhole,
    events: 6,
    expected: "CREDENTIAL_ATTACK",
  },
  {
    id: "account-compromise",
    title: "Account Compromise",
    icon: ShieldAlert,
    events: 7,
    expected: "ACCOUNT_COMPROMISE",
  },
  {
    id: "command-execution",
    title: "Suspicious Command",
    icon: Terminal,
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

const DETECTION_MAP = {
  "account-compromise": "CRITICAL / RISK 90",
  "ACCOUNT_COMPROMISE": "CRITICAL / RISK 90",
  "credential-attack": "HIGH / RISK 60",
  "CREDENTIAL_ATTACK": "HIGH / RISK 60",
  "brute-force": "HIGH / RISK 40",
  "BRUTE_FORCE": "HIGH / RISK 40",
  "command-execution": "MEDIUM / RISK 25",
  "SUSPICIOUS_COMMAND_EXECUTION": "MEDIUM / RISK 25",
};

function randomPrivateIp() {
  return `192.168.100.${Math.floor(Math.random() * 241) + 10}`;
}

export default function AttackSimulator({ onAttackSimulated, recentSimulations = [] }) {
  const [sourceIp, setSourceIp] = useState("");
  const [geoLocation, setGeoLocation] = useState("India");
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
          data.scenarios.map((item) => {
            const fallback = SCENARIOS.find((s) => s.id === item.id) || {};
            return {
              ...fallback,
              id: item.id,
              title: item.name || fallback.title || item.id,
              events: item.events_generated ?? fallback.events ?? 5,
              expected: item.expected_classification || fallback.expected,
              icon: fallback.icon || AlertTriangle,
            };
          })
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
      const locData = GEO_LOCATIONS[geoLocation] || {};
      const body = {
        source_ip: targetIp,
        country: locData.country || null,
        latitude: locData.lat !== undefined ? locData.lat : null,
        longitude: locData.lng !== undefined ? locData.lng : null,
      };

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
        location: locData.country || "No Location",
        source_ip: targetIp,
        events_generated: data.events_generated || scenario?.events || 5,
        timestamp: new Date().toLocaleTimeString(),
      };

      setResult(simulationResult);

      // Notify parent to update recent history
      if (onAttackSimulated) {
        onAttackSimulated({
          ip: targetIp,
          location: locData.country || "No Location",
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
    <div className="simulator-view-container">
      {/* HEADER BAR */}
      <div className="sim-panel-header">
        <div className="sim-header-main">
          <div className="sim-header-title-row">
            
            
          </div>
          <p className="sim-subtitle">Test detection and correlation safely</p>
        </div>

        <div className={`sim-status-badge ${backendOnline ? "online" : "offline"}`}>
          <span className="sim-status-dot" />
          <span>{backendOnline ? "Online" : "Offline"}</span>
        </div>
      </div>

      {/* 3-STEP FLOW WORKSPACE */}
      <div className="sim-workflow-card">
        {/* STEP 1: CHOOSE ATTACK */}
        <div className="sim-section-block">
          <div className="sim-step-heading">
            <span className="sim-step-number">1</span>
            <div className="sim-step-labels">
              <span className="sim-step-title">Choose Attack</span>
              <span className="sim-step-hint">Select a threat scenario to simulate</span>
            </div>
          </div>

          <div className="sim-scenarios-grid">
            {scenarios.map((scenario) => {
              const Icon = scenario.icon || AlertTriangle;
              const isSelected = selectedScenario === scenario.id;

              return (
                <button
                  key={scenario.id}
                  className={`sim-scenario-card ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    setSelectedScenario(scenario.id);
                    setResult(null);
                    setError("");
                  }}
                  type="button"
                >
                  <div className="sim-scenario-top">
                    <Icon size={16} className="sim-scenario-icon" />
                    <span className="sim-event-badge">
                      {scenario.events ?? 5} events
                    </span>
                  </div>
                  <span className="sim-scenario-name">{scenario.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 2: CONFIGURE SOURCE */}
        <div className="sim-section-block">
          <div className="sim-step-heading">
            <span className="sim-step-number">2</span>
            <div className="sim-step-labels">
              <span className="sim-step-title">Configure Source</span>
              <span className="sim-step-hint">Set origin IP and visualization target</span>
            </div>
          </div>

          <div className="sim-config-grid">
            {/* Source IP Field */}
            <div className="sim-input-group">
              <label htmlFor="sim-source-ip" className="sim-field-label">
                Source IP
              </label>
              <div className="sim-input-box">
                <Network size={15} className="sim-field-icon" />
                <input
                  id="sim-source-ip"
                  type="text"
                  value={sourceIp}
                  onChange={(e) => setSourceIp(e.target.value)}
                  placeholder=""
                  spellCheck="false"
                />
              </div>
              <span className="sim-helper-text">
                Leave blank to generate a private demo IP.
              </span>
            </div>

            {/* Simulation Location Field */}
            <div className="sim-input-group">
              <label htmlFor="sim-location" className="sim-field-label">
                Simulation Location
              </label>
              <div className="sim-input-box">
                <Globe size={15} className="sim-field-icon" />
                <select
                  id="sim-location"
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
              <span className="sim-helper-text">
                Persists through SIEM pipeline to database & map.
              </span>
            </div>
          </div>
        </div>

        {/* STEP 3: RUN SIMULATION */}
        <div className="sim-section-block">
          <div className="sim-step-heading">
            <span className="sim-step-number">3</span>
            <div className="sim-step-labels">
              <span className="sim-step-title">Run Simulation</span>
              <span className="sim-step-hint">Execute and inspect output</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="sim-action-row">
            <button
              className="btn-run-simulation"
              onClick={runSimulation}
              disabled={loading}
              type="button"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spin-icon" />
                  <span>Running Simulation...</span>
                </>
              ) : (
                <>
                  <Play size={15} fill="currentColor" />
                  <span>Run Simulation</span>
                </>
              )}
            </button>

            <button
              className="btn-sim-reset-clean"
              onClick={reset}
              disabled={loading}
              type="button"
              title="Reset parameters"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          </div>

          {/* COMPACT RESULT BOX */}
          <div className="sim-compact-result-box">
            {loading && (
              <div className="result-banner running">
                <div className="result-badge-row">
                  <span className="result-status-tag status-running">
                    <Loader2 size={12} className="spin-icon" />
                    RUNNING
                  </span>
                  <span className="result-sub-label">Transmitting telemetry events...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="result-banner error">
                <div className="result-badge-row">
                  <span className="result-status-tag status-error">
                    <XCircle size={13} />
                    ERROR
                  </span>
                  <span className="result-error-msg">{error}</span>
                </div>
              </div>
            )}

            {result && !loading && !error && (
              <div className="result-banner success">
                <div className="result-summary-row">
                  <div className="result-metric-item">
                    <span className="metric-header">Status</span>
                    <span className="result-status-tag status-success">
                      <CheckCircle2 size={13} />
                      SUCCESS
                    </span>
                  </div>

                  <div className="result-metric-item">
                    <span className="metric-header">Scenario</span>
                    <span className="metric-value-text">{result.scenarioTitle}</span>
                  </div>

                  <div className="result-metric-item">
                    <span className="metric-header">Source</span>
                    <span className="metric-value-mono">{result.source_ip}</span>
                  </div>

                  <div className="result-metric-item">
                    <span className="metric-header">Events</span>
                    <span className="metric-value-text">{result.events_generated}</span>
                  </div>

                  <div className="result-metric-item">
                    <span className="metric-header">Detection</span>
                    <span className="metric-value-badge">
                      {DETECTION_MAP[result.expected] || DETECTION_MAP[result.scenario] || "CRITICAL / RISK 90"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {!result && !loading && !error && (
              <div className="result-banner idle">
                <span className="result-idle-text">
                  Ready for simulation. Select an attack scenario and click Run Simulation.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RECENT SIMULATIONS TABLE (MINIMAL SOC HISTORY) */}
      <div className="sim-history-card">
        <div className="sim-history-header">
          <div className="history-title-group">
            <Clock size={14} className="text-muted" />
            <h4 className="history-title">Recent Simulations</h4>
          </div>
          <span className="history-count-badge">{recentSimulations.length} total</span>
        </div>

        <div className="table-responsive">
          <table className="modern-enterprise-table sim-history-table">
            <thead>
              <tr>
                <th style={{ width: "110px" }}>Timestamp</th>
                <th>Scenario</th>
                <th>Source IP</th>
                <th>Location</th>
                <th style={{ width: "70px", textAlign: "right" }}>Events</th>
                <th style={{ width: "95px", textAlign: "right" }}>Status</th>
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
                      <strong className="sim-hist-scenario">{sim.scenarioTitle}</strong>
                    </td>
                    <td>
                      <code className="cell-mono">{sim.ip}</code>
                    </td>
                    <td className="text-secondary">{sim.location}</td>
                    <td style={{ textAlign: "right" }}>
                      <span className="cell-num">{sim.events}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className="badge-pill-compact sev-low">
                        <span className="pill-dot" />
                        Dispatched
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
