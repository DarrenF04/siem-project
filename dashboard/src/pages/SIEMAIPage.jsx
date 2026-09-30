import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ShieldAlert,
  Activity,
  Users,
  Terminal,
  Globe,
  Target,
  ArrowUpRight,
  Send,
  User,
  RotateCcw,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Search,
  ShieldCheck,
  Flame,
  Radio,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";

// Dashboard-aligned SOC inquiry cards matching the KPI visual design
const SOC_QUERY_CARDS = [
  {
    id: "today",
    category: "LIVE INCIDENTS",
    query: "What happened today?",
    title: "Today's Threat Summary",
    desc: "Inspect security events and incident activity recorded today",
    icon: ShieldAlert,
    colorClass: "color-green",
    badgeText: "Real-time",
  },
  {
    id: "critical",
    category: "PRIORITY TRIAGE",
    query: "Show me critical incidents",
    title: "Critical & High-Risk Alerts",
    desc: "Review high-severity incidents requiring immediate containment",
    icon: Users,
    colorClass: "color-pink",
    badgeText: "High Sev",
  },
  {
    id: "recent",
    category: "LOG TELEMETRY",
    query: "What was the most recent attack?",
    title: "Most Recent Attack Chain",
    desc: "Step through the latest correlated attack and event sequence",
    icon: Activity,
    colorClass: "color-blue",
    badgeText: "Correlated",
  },
  {
    id: "latest",
    category: "KILL CHAIN ANALYSIS",
    query: "Analyze the latest incident",
    title: "Deep Incident Analysis",
    desc: "Break down authentication bypass and command execution steps",
    icon: Terminal,
    colorClass: "color-amber",
    badgeText: "Forensics",
  },
  {
    id: "countries",
    category: "GEO EXPOSURE",
    query: "Which country has the most attacks?",
    title: "Geographic Attack Origins",
    desc: "Analyze reported attacker locations from the World Threat Map",
    icon: Globe,
    colorClass: "color-cyan",
    badgeText: "Location",
  },
  {
    id: "risk",
    category: "HOSTILE RECON",
    query: "Which IP has the highest risk?",
    title: "Highest Risk Source IPs",
    desc: "Identify top hostile IP addresses and cumulative risk scores",
    icon: Target,
    colorClass: "color-purple",
    badgeText: "Risk: 90",
  },
];

// Quick query action chips
const QUICK_FILTER_PILLS = [
  { label: "What happened today?", query: "What happened today?" },
  { label: "Show recent attacks", query: "What was the most recent attack?" },
  { label: "Show critical incidents", query: "Show me critical incidents" },
  { label: "Highest risk IP", query: "Which IP has the highest risk?" },
  { label: "Attack by country", query: "Which country has the most attacks?" },
];

export default function SIEMAIPage({
  pendingQuery,
  onClearPendingQuery,
  onSelectIncident,
  incidents = [],
  statistics = {},
}) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState({
    available: true,
    configured: false,
    model: "gemini-2.5-flash",
    provider: "Google Gemini",
  });
  const [copiedIndex, setCopiedIndex] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch AI backend status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/ai/status`);
        if (res.ok) {
          const data = await res.json();
          setAiStatus(data);
        }
      } catch (err) {
        console.warn("AI status check error:", err);
      }
    };
    fetchStatus();
  }, []);

  // Handle pending query passed from InvestigationModal
  useEffect(() => {
    if (pendingQuery && pendingQuery.trim()) {
      handleSendMessage(pendingQuery.trim());
      if (onClearPendingQuery) {
        onClearPendingQuery();
      }
    }
  }, [pendingQuery]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend) => {
    const queryText = (textToSend || inputValue).trim();
    if (!queryText || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const conversationHistory = messages.slice(-6).map((m) => ({
        role: m.role === "user" ? "user" : "model",
        content: m.content,
      }));

      const res = await fetch(`${API_URL}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: queryText,
          conversation_history: conversationHistory,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();

      const aiMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.answer || "No response received from SIEM AI.",
        sources: data.sources || [],
        metadata: data.metadata || {},
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error("AI Chat request failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: `⚠️ **Unable to complete analysis:** ${err.message}. Please verify the FastAPI backend is running.`,
          sources: [],
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyText = (content, index) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleResetChat = () => {
    setMessages([]);
    setInputValue("");
  };

  const handleOpenSourceIncident = (incidentId) => {
    if (!onSelectIncident) return;
    const found = incidents.find((i) => i.id === incidentId);
    if (found) {
      onSelectIncident(found);
    } else {
      fetch(`${API_URL}/incidents`)
        .then((r) => r.json())
        .then((all) => {
          const match = all.find((i) => i.id === incidentId);
          if (match) onSelectIncident(match);
        })
        .catch((e) => console.error("Error finding incident:", e));
    }
  };

  const hasMessages = messages.length > 0;
  const openCount = statistics.open_incidents ?? statistics.active_incidents ?? 0;
  const eventCount = statistics.total_events ?? 0;
  const critCount = statistics.critical_incidents ?? 0;

  // Derive active engine badge from the most recent assistant message metadata
  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
  const lastMeta = lastAssistantMsg?.metadata || {};
  const isGeminiActive =
    lastMeta.fallback === false ||
    (lastMeta.provider && lastMeta.provider.includes("Gemini") && !lastMeta.fallback);
  const activeModel = lastMeta.model || aiStatus.model || "gemini-2.5-flash";
  const engineLabel = isGeminiActive
    ? `Gemini • ${activeModel}`
    : aiStatus.configured && !hasMessages
    ? `Gemini • ${aiStatus.model}`
    : "SQLite Grounded Engine";
  const engineOnline = isGeminiActive || (aiStatus.configured && !hasMessages);

  return (
    <div className="siem-ai-wrapper soc-theme-layout">
      {/* TOP STATUS BAR & ACTIONS */}
      <div className="ai-top-bar">
        <div className="soc-engine-status-group">
          <div className="ai-model-pill" title="Backend AI Engine Status">
            <span className={`status-indicator-dot ${engineOnline ? "dot-online" : "dot-grounded"}`} />
            <span className="model-label">
              {engineLabel}
            </span>
          </div>

        
        </div>

        {hasMessages && (
          <button
            type="button"
            className="btn-new-chat"
            onClick={handleResetChat}
            title="Clear and start a new investigation"
          >
            <RotateCcw size={14} />
            <span>New Investigation</span>
          </button>
        )}
      </div>

      {/* MAIN CONTAINER */}
      <div className="ai-main-container">
        {!hasMessages ? (
          /* SOC INVESTIGATION LANDING VIEW */
          <div className="ai-landing-view soc-landing">
            {/* Concentric SOC Security Emblem */}
            <div className="soc-hero-badge-wrap">
              <div className="kpi-icon-concentric color-green hero-concentric" title="SIEM Security Intelligence">
                <ShieldAlert size={24} />
              </div>
            </div>

            {/* Enterprise SOC Header */}
            <div className="ai-greeting-header">
              <div className="soc-header-tag">
                <ShieldCheck size={13} />
                <span>AUTONOMOUS SECURITY ANALYST</span>
              </div>
              <h1 className="ai-greeting-title">Security Intelligence Assistant</h1>
              <p className="ai-greeting-caption">
                Analyze live security events, investigate correlated attack chains, and inspect threat actors grounded in your database.
              </p>
            </div>

            {/* Live Telemetry Pulse Bar (Reflecting Dashboard KPIs) */}
            <div className="soc-telemetry-pulse-bar">
              <div className="telemetry-pill-stat">
                <div className="concentric-mini-dot color-green">
                  <ShieldAlert size={12} />
                </div>
                <span className="stat-number">{openCount}</span>
                <span className="stat-label">Active Incidents</span>
              </div>

              <div className="pulse-divider" />

              <div className="telemetry-pill-stat">
                <div className="concentric-mini-dot color-blue">
                  <Activity size={12} />
                </div>
                <span className="stat-number">{eventCount.toLocaleString()}</span>
                <span className="stat-label">Events Ingested</span>
              </div>

              <div className="pulse-divider" />

              <div className="telemetry-pill-stat">
                <div className="concentric-mini-dot color-pink">
                  <Users size={12} />
                </div>
                <span className="stat-number">{critCount}</span>
                <span className="stat-label">Critical Alerts</span>
              </div>
            </div>

            {/* Dashboard-Aligned Inquiry Cards Grid */}
            <div className="soc-cards-grid">
              {SOC_QUERY_CARDS.map((card) => {
                const IconComponent = card.icon;
                return (
                  <div
                    key={card.id}
                    className={`soc-prompt-card ${card.colorClass}`}
                    onClick={() => handleSendMessage(card.query)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="card-top-row">
                      <div className="card-icon-title-group">
                        <div className="kpi-icon-concentric" title={card.category}>
                          <IconComponent size={18} />
                        </div>
                        <div className="card-category-stack">
                          <span className="card-cat-label">{card.category}</span>
                          <span className="card-badge-pill">{card.badgeText}</span>
                        </div>
                      </div>

                      <div className="kpi-arrow-circle-btn" title="Run this analysis">
                        <ArrowUpRight size={14} />
                      </div>
                    </div>

                    <div className="card-query-body">
                      <h3 className="card-query-title">{card.title}</h3>
                      <p className="card-query-desc">{card.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* CONVERSATION THREAD */
          <div className="ai-conversation-thread">
            {messages.map((msg, index) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`ai-message-row ${isUser ? "row-user" : "row-assistant"}`}
                >
                  <div className="message-avatar">
                    {isUser ? (
                      <div className="avatar-user" title="SOC Analyst">
                        <User size={15} />
                      </div>
                    ) : (
                      <div className="kpi-icon-concentric color-green avatar-soc-bot" title="SIEM AI Analyst">
                        <ShieldAlert size={14} />
                      </div>
                    )}
                  </div>

                  <div className="message-content-wrapper">
                    <div className={`message-bubble ${isUser ? "bubble-user" : "bubble-assistant"}`}>
                      {isUser ? (
                        <p className="user-text-content">{msg.content}</p>
                      ) : (
                        <div className="markdown-body">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>

                    {/* Metadata & Cited Evidence Footer */}
                    {!isUser && (
                      <div className="message-footer-bar">
                        <span className="msg-time">{msg.timestamp}</span>

                        <div className="footer-actions">
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="sources-chips-group">
                              <span className="sources-label">Correlated Evidence:</span>
                              {msg.sources.map((src) => (
                                <button
                                  key={`${src.type}-${src.id}`}
                                  type="button"
                                  className="source-chip-btn"
                                  onClick={() => handleOpenSourceIncident(src.id)}
                                  title={`Open Incident #${src.id} in Investigation Modal`}
                                >
                                  <span>#{src.id} {src.attack_type || "INCIDENT"}</span>
                                  <ExternalLink size={10} />
                                </button>
                              ))}
                            </div>
                          )}

                          <button
                            type="button"
                            className="btn-copy-msg"
                            onClick={() => handleCopyText(msg.content, index)}
                            title="Copy analysis text"
                          >
                            {copiedIndex === index ? (
                              <>
                                <Check size={12} className="text-low" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="ai-message-row row-assistant">
                <div className="message-avatar">
                  <div className="kpi-icon-concentric color-green avatar-soc-bot pulse-avatar">
                    <ShieldAlert size={14} />
                  </div>
                </div>
                <div className="message-bubble bubble-assistant bubble-loading">
                  <div className="typing-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="loading-label">{aiStatus.configured ? "Querying Gemini AI & correlating kill chain..." : "Querying SQLite telemetry & correlating kill chain..."}</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* DOCKED INPUT AREA & QUICK FILTER PILLS */}
      <div className="ai-input-dock soc-dock">
        {/* Quick query chips */}
        <div className="soc-quick-pills-row">
          {QUICK_FILTER_PILLS.map((pill, idx) => (
            <button
              key={idx}
              type="button"
              className="soc-quick-pill"
              onClick={() => handleSendMessage(pill.query)}
              disabled={isLoading}
            >
              <span>{pill.label}</span>
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="ai-input-pill-container soc-input-container">
          <div className="input-left-icon" aria-hidden="true" title="Terminal Query">
            <Terminal size={17} className="pill-terminal-icon" />
          </div>

          <textarea
            ref={inputRef}
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask SIEM Analyst... (e.g. 'What was the most recent attack?', 'Analyze incident #9', 'Tell me about 192.168.100.177')"
            className="ai-textarea-field"
            disabled={isLoading}
          />

          <button
            type="button"
            className={`ai-send-btn ${inputValue.trim() && !isLoading ? "active" : ""}`}
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            aria-label="Submit query"
          >
            {isLoading ? (
              <Loader2 size={15} className="spin-icon" />
            ) : (
              <>
                <Send size={14} className="send-glyph" />
                <span className="send-text">Send</span>
              </>
            )}
          </button>
        </div>

        <p className="ai-input-disclaimer">
          Grounded in live SQLite telemetry • Read-only queries • Real-time SOC correlation
        </p>
      </div>
    </div>
  );
}
