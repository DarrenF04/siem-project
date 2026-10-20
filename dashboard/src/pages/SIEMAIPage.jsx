import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Shield,
  Sparkles,
  ArrowUp,
  RotateCcw,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  User,
  ShieldAlert,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export default function SIEMAIPage({
  pendingQuery,
  onClearPendingQuery,
  onSelectIncident,
  incidents = [],
  aiStatus: propAiStatus,
  onUpdateAIStatus,
}) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState(
    propAiStatus || {
      available: true,
      configured: false,
      model: "gemini-2.5-flash",
      provider: "Google Gemini",
    }
  );
  const [copiedIndex, setCopiedIndex] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (propAiStatus) {
      setAiStatus(propAiStatus);
    }
  }, [propAiStatus]);

  // Fetch initial AI backend status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/ai/status`);
        if (res.ok) {
          const data = await res.json();
          setAiStatus(data);
          if (onUpdateAIStatus) onUpdateAIStatus(data);
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
        fallback: data.fallback ?? (data.provider !== "Google Gemini"),
        provider: data.provider || data.metadata?.provider,
        model: data.model_used || data.metadata?.model,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (data.metadata?.configured !== undefined) {
        const nextStatus = {
          configured: data.metadata.configured && !data.fallback,
          model: data.model_used || data.metadata.model || "gemini-2.5-flash",
          provider: data.provider || data.metadata.provider || "Google Gemini",
        };
        setAiStatus((prev) => ({ ...prev, ...nextStatus }));
        if (onUpdateAIStatus) {
          onUpdateAIStatus((prev) => ({ ...prev, ...nextStatus }));
        }
      }
    } catch (err) {
      console.error("AI Chat request failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: `⚠️ **Unable to complete analysis:** ${err.message}. Please verify the FastAPI backend is running.`,
          sources: [],
          metadata: { fallback: true, error: err.message },
          fallback: true,
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
    setTimeout(() => inputRef.current?.focus(), 100);
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
  const greeting = getGreeting();

  // Derive active engine badge from the most recent assistant message metadata
  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
  const lastMeta = lastAssistantMsg?.metadata || {};
  const isGeminiActive =
    lastAssistantMsg
      ? lastAssistantMsg.fallback === false
      : aiStatus.configured;
  const activeModel =
    lastAssistantMsg?.model ||
    lastMeta.model ||
    aiStatus.model ||
    "gemini-3.5-flash";

  const engineLabel = isGeminiActive
    ? `Gemini • ${activeModel}`
    : "SQLite Grounded Engine";
  const engineOnline = isGeminiActive;

  return (
    <div className={`siem-ai-page-root ${hasMessages ? "has-thread" : "is-empty"}`}>
      {/* ACTIONS TOP BAR — ONLY WHEN THREAD IS ACTIVE */}
      {hasMessages && (
        <header className="siem-ai-subtle-top-bar has-actions-only">
          <button
            type="button"
            className="btn-new-investigation"
            onClick={handleResetChat}
            title="Clear and start a new investigation"
          >
            <RotateCcw size={13} />
            <span>New Investigation</span>
          </button>
        </header>
      )}

      {/* MAIN VIEW */}
      {!hasMessages ? (
        /* MINIMAL EMPTY STATE — REFERENCING ATTACHED DESIGN */
        <main className="siem-ai-hero-empty">
          <div className="siem-ai-hero-center">
            {/* 1. Small security/SIEM icon or subtle circular emblem */}
            <div className="siem-ai-emblem-wrapper" aria-hidden="true">
              <div className="siem-ai-emblem">
                <Shield size={20} className="siem-ai-emblem-icon" />
              </div>
            </div>

            {/* 2. Dynamic Local Time Greeting */}
            <h2 className="siem-ai-greeting-text">{greeting}</h2>

            {/* 3. Main heading */}
            <h1 className="siem-ai-heading-text">
              What&apos;s on <span className="siem-ai-accent-span">your mind?</span>
            </h1>

            {/* 4. ONE CHAT BOX */}
            <div className="siem-ai-hero-box">
              <div className="siem-ai-hero-input-area">
                <Sparkles size={16} className="siem-ai-sparkle-icon" aria-hidden="true" />
                <textarea
                  ref={inputRef}
                  rows={2}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask SIEM Analyst..."
                  className="siem-ai-hero-textarea"
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <div className="siem-ai-hero-footer">
                <div className="siem-ai-hero-actions-right">
                  <button
                    type="button"
                    className={`siem-ai-hero-send-btn ${inputValue.trim() && !isLoading ? "active" : ""}`}
                    onClick={() => handleSendMessage()}
                    disabled={!inputValue.trim() || isLoading}
                    aria-label="Send query"
                  >
                    {isLoading ? (
                      <Loader2 size={15} className="spin-icon" />
                    ) : (
                      <ArrowUp size={16} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      ) : (
        /* CONVERSATION THREAD VIEW */
        <main className="siem-ai-conversation-view">
          <div className="siem-ai-thread-container">
            {messages.map((msg, index) => {
              const isUser = msg.role === "user";
              return (
                <article
                  key={msg.id}
                  className={`ai-message-row ${isUser ? "row-user" : "row-assistant"}`}
                >
                  <div className="message-avatar">
                    {isUser ? (
                      <div className="avatar-user" title="SOC Analyst">
                        <User size={15} />
                      </div>
                    ) : (
                      <div className="avatar-soc-bot" title="SIEM AI Analyst">
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
                      <footer className="message-footer-bar">
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
                      </footer>
                    )}
                  </div>
                </article>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="ai-message-row row-assistant">
                <div className="message-avatar">
                  <div className="avatar-soc-bot pulse-avatar">
                    <ShieldAlert size={14} />
                  </div>
                </div>
                <div className="message-bubble bubble-assistant bubble-loading">
                  <div className="typing-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="loading-label">Looking into it...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* DOCKED INPUT BAR AT BOTTOM OF CONVERSATION */}
          <div className="siem-ai-docked-input-wrap">
            <div className="siem-ai-hero-box docked-box">
              <div className="siem-ai-hero-input-area docked-area">
                <Sparkles size={16} className="siem-ai-sparkle-icon" aria-hidden="true" />
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask SIEM Analyst... (e.g. 'Analyze incident #9', 'Tell me about 192.168.100.177')"
                  className="siem-ai-hero-textarea docked-textarea"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className={`siem-ai-hero-send-btn ${inputValue.trim() && !isLoading ? "active" : ""}`}
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isLoading}
                  aria-label="Send query"
                >
                  {isLoading ? (
                    <Loader2 size={15} className="spin-icon" />
                  ) : (
                    <ArrowUp size={16} />
                  )}
                </button>
              </div>
            </div>
            <p className="siem-ai-docked-hint">
              Grounded in live SQLite telemetry • Read-only queries
            </p>
          </div>
        </main>
      )}
    </div>
  );
}
