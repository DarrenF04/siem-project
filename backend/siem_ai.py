"""
SIEM AI Analyst — Google Gemini Powered Telemetry Engine
========================================================
Analyzes security telemetry strictly grounded in the SQLite SIEM database.
Uses Google Gemini (via google-genai SDK) when GEMINI_API_KEY is configured in .env.
Gracefully handles missing or unconfigured API keys with structured local telemetry analysis.
"""

import os
import re
import sqlite3
import json
import logging
from pathlib import Path
from datetime import datetime, date
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

# Set up logging for SIEM AI
logger = logging.getLogger("siem.ai")

# Top-level official google-genai SDK import with diagnostic tracing
try:
    from google import genai
    from google.genai import types
    GEMINI_SDK_AVAILABLE = True
    GEMINI_IMPORT_ERROR = None
except Exception as _import_err:
    genai = None
    types = None
    GEMINI_SDK_AVAILABLE = False
    GEMINI_IMPORT_ERROR = str(_import_err)
    logger.error("Failed to import google-genai SDK at module level: %s", _import_err, exc_info=True)

# Load environment variables
PROJECT_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = PROJECT_DIR / ".env"
load_dotenv(ENV_FILE, override=True)

DB_FILE = PROJECT_DIR / "database" / "siem.db"

# Model configuration
DEFAULT_MODEL = "gemini-2.5-flash"


def get_gemini_config() -> Dict[str, Any]:
    """Retrieve Gemini API configuration from environment.
    Reloads .env on every call so GEMINI_API_KEY changes are picked up
    without restarting uvicorn.
    """
    load_dotenv(ENV_FILE, override=True)
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model = os.getenv("GEMINI_MODEL", "").strip() or DEFAULT_MODEL
    has_valid_key = bool(api_key and not api_key.startswith("YOUR_") and len(api_key) > 10)
    is_configured = has_valid_key and GEMINI_SDK_AVAILABLE
    return {
        "api_key": api_key,
        "model": model,
        "configured": is_configured,
        "sdk_available": GEMINI_SDK_AVAILABLE,
        "import_error": GEMINI_IMPORT_ERROR,
    }


def get_db_connection() -> sqlite3.Connection:
    """Create a read-only SQLite connection."""
    DB_FILE.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(f"file:{DB_FILE}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


# ── Telemetry Extraction Grounding ───────────────────────────────────────────

def extract_grounded_telemetry(query: str) -> Dict[str, Any]:
    """
    Extract relevant security telemetry from SQLite to ground Gemini's response.
    Never hallucinates; queries actual tables security_events and security_incidents.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    q_lower = query.lower()
    sources = []

    # 1. Total statistics
    total_events = cursor.execute("SELECT COUNT(*) FROM security_events").fetchone()[0]
    total_incidents = cursor.execute("SELECT COUNT(*) FROM security_incidents").fetchone()[0]
    open_incidents = cursor.execute("SELECT COUNT(*) FROM security_incidents WHERE status = 'OPEN'").fetchone()[0]

    # Severity distribution
    severity_counts = {}
    for row in cursor.execute("SELECT severity, COUNT(*) FROM security_incidents GROUP BY severity"):
        severity_counts[row[0]] = row[1]

    # Attack types distribution
    attack_type_counts = {}
    for row in cursor.execute("SELECT attack_type, COUNT(*) FROM security_incidents GROUP BY attack_type"):
        attack_type_counts[row[0] or "UNKNOWN"] = row[1]

    # 2. Recent incidents (latest 5)
    recent_incidents = []
    for r in cursor.execute("""
        SELECT id, timestamp, incident_type, attack_type, source_ip,
               failed_logins, successful_login, command_executions,
               risk_score, severity, message, status, country
        FROM security_incidents
        ORDER BY id DESC LIMIT 5
    """).fetchall():
        d = dict(r)
        d["country_reported"] = d.get("country") if d.get("country") else "Not Reported"
        recent_incidents.append(d)
        sources.append({"type": "incident", "id": d["id"], "attack_type": d["attack_type"], "source_ip": d["source_ip"], "risk_score": d["risk_score"], "severity": d["severity"]})

    # 3. Latest single incident (most recent attack)
    latest_incident = recent_incidents[0] if recent_incidents else None

    # Correlated events for latest incident if available
    latest_incident_events = []
    if latest_incident:
        latest_ts = latest_incident.get("timestamp", "")
        for ev in cursor.execute("""
            SELECT id, timestamp, source_ip, event_type, details, severity
            FROM security_events
            WHERE source_ip = ?
            ORDER BY id ASC LIMIT 10
        """, (latest_incident["source_ip"],)).fetchall():
            latest_incident_events.append(dict(ev))

    # 4. Check for specific IP pattern in query
    ip_matches = re.findall(r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b", query)
    targeted_ip_data = None
    if ip_matches:
        target_ip = ip_matches[0]
        ip_incidents = [dict(r) for r in cursor.execute(
            "SELECT * FROM security_incidents WHERE source_ip = ? ORDER BY id DESC", (target_ip,)
        ).fetchall()]
        ip_events = [dict(r) for r in cursor.execute(
            "SELECT * FROM security_events WHERE source_ip = ? ORDER BY id ASC", (target_ip,)
        ).fetchall()]

        failed_count = sum(1 for e in ip_events if e.get("event_type") == "FAILED_LOGIN")
        succ_count = sum(1 for e in ip_events if e.get("event_type") == "SUCCESSFUL_LOGIN")
        cmd_count = sum(1 for e in ip_events if e.get("event_type") == "COMMAND_EXECUTION")
        max_risk = max([i.get("risk_score") or 0 for i in ip_incidents], default=0)

        targeted_ip_data = {
            "source_ip": target_ip,
            "total_events": len(ip_events),
            "failed_logins": failed_count,
            "successful_logins": succ_count,
            "command_executions": cmd_count,
            "total_incidents": len(ip_incidents),
            "max_risk_score": max_risk,
            "attack_types": list(set([i.get("attack_type") for i in ip_incidents if i.get("attack_type")])),
            "country_reported": (ip_incidents[0].get("country") if ip_incidents else None) or "Not Reported",
            "incidents": ip_incidents,
            "events_sample": ip_events[:8]
        }
        for inc in ip_incidents:
            sources.append({"type": "incident", "id": inc["id"], "source_ip": target_ip, "attack_type": inc.get("attack_type")})

    # 5. Check for specific Incident ID in query
    id_matches = re.findall(r"(?:incident\s*#?\s*|#\s*)(\d+)", query, re.IGNORECASE)
    targeted_incident_data = None
    if id_matches:
        try:
            target_id = int(id_matches[0])
            row = cursor.execute("SELECT * FROM security_incidents WHERE id = ?", (target_id,)).fetchone()
            if row:
                inc_dict = dict(row)
                inc_dict["country_reported"] = inc_dict.get("country") if inc_dict.get("country") else "Not Reported"
                # Get related events
                rel_events = [dict(r) for r in cursor.execute("""
                    SELECT id, timestamp, source_ip, event_type, details, severity
                    FROM security_events
                    WHERE source_ip = ?
                    ORDER BY id ASC LIMIT 12
                """, (inc_dict["source_ip"],)).fetchall()]

                targeted_incident_data = {
                    "incident": inc_dict,
                    "related_events": rel_events
                }
                sources.append({"type": "incident", "id": target_id, "attack_type": inc_dict.get("attack_type"), "source_ip": inc_dict.get("source_ip")})
        except Exception:
            pass

    # 6. Today's records
    today_str = date.today().isoformat()
    today_incidents = [dict(r) for r in cursor.execute(
        "SELECT * FROM security_incidents WHERE timestamp LIKE ? ORDER BY id DESC", (f"{today_str}%",)
    ).fetchall()]
    today_events_count = cursor.execute(
        "SELECT COUNT(*) FROM security_events WHERE timestamp LIKE ?", (f"{today_str}%",)
    ).fetchone()[0]

    # 7. Highest risk incidents
    highest_risk_incidents = [dict(r) for r in cursor.execute("""
        SELECT id, attack_type, source_ip, risk_score, severity, status, country, timestamp
        FROM security_incidents
        ORDER BY risk_score DESC, id DESC LIMIT 5
    """).fetchall()]
    for h in highest_risk_incidents:
        h["country_reported"] = h.get("country") if h.get("country") else "Not Reported"

    # 8. Country breakdown (strictly reported locations only, no IP geolocation)
    country_rows = []
    for r in cursor.execute("""
        SELECT country, COUNT(*) as count, MAX(risk_score) as max_risk
        FROM security_incidents
        WHERE country IS NOT NULL AND country != ''
        GROUP BY country
        ORDER BY count DESC
    """).fetchall():
        country_rows.append(dict(r))

    unlocated_incidents = cursor.execute(
        "SELECT COUNT(*) FROM security_incidents WHERE country IS NULL OR country = ''"
    ).fetchone()[0]

    # 9. Top failed logins by IP
    failed_login_sources = []
    for r in cursor.execute("""
        SELECT source_ip, COUNT(*) as failed_count
        FROM security_events
        WHERE event_type = 'FAILED_LOGIN'
        GROUP BY source_ip
        ORDER BY failed_count DESC LIMIT 5
    """).fetchall():
        failed_login_sources.append(dict(r))

    # 10. Repeated attackers (IPs with > 1 incident)
    repeated_attackers = []
    for r in cursor.execute("""
        SELECT source_ip, COUNT(*) as incident_count, MAX(risk_score) as max_risk,
               MAX(country) as country, GROUP_CONCAT(DISTINCT attack_type) as attack_types
        FROM security_incidents
        GROUP BY source_ip
        HAVING incident_count > 1
        ORDER BY incident_count DESC
    """).fetchall():
        d = dict(r)
        d["country_reported"] = d.get("country") if d.get("country") else "Not Reported"
        repeated_attackers.append(d)

    conn.close()

    # Deduplicate sources
    unique_sources = []
    seen = set()
    for s in sources:
        key = (s.get("type"), s.get("id"))
        if key not in seen and s.get("id"):
            seen.add(key)
            unique_sources.append(s)

    return {
        "summary": {
            "total_events": total_events,
            "total_incidents": total_incidents,
            "open_incidents": open_incidents,
            "severity_distribution": severity_counts,
            "attack_type_distribution": attack_type_counts,
        },
        "recent_incidents": recent_incidents,
        "latest_incident": latest_incident,
        "latest_incident_events": latest_incident_events,
        "targeted_ip_data": targeted_ip_data,
        "targeted_incident_data": targeted_incident_data,
        "today_activity": {
            "date": today_str,
            "events_today": today_events_count,
            "incidents_today": len(today_incidents),
            "incidents": today_incidents,
        },
        "highest_risk_incidents": highest_risk_incidents,
        "countries_reported": country_rows,
        "unlocated_count": unlocated_incidents,
        "failed_login_sources": failed_login_sources,
        "repeated_attackers": repeated_attackers,
        "sources": unique_sources[:6]
    }


# ── Structured Local Grounded Responder (Fallback / Instant Telemetry) ────────

def generate_local_grounded_response(query: str, telemetry: Dict[str, Any]) -> str:
    """
    Generate an accurate, professional, fully database-grounded response
    from the retrieved SQLite telemetry. Used as direct answer or fallback.
    """
    q = query.lower()
    summary = telemetry.get("summary", {})
    recent = telemetry.get("recent_incidents", [])
    latest = telemetry.get("latest_incident")
    ip_data = telemetry.get("targeted_ip_data")
    inc_data = telemetry.get("targeted_incident_data")
    today = telemetry.get("today_activity", {})
    high_risk = telemetry.get("highest_risk_incidents", [])
    countries = telemetry.get("countries_reported", [])
    failed_logins = telemetry.get("failed_login_sources", [])
    repeated = telemetry.get("repeated_attackers", [])

    # Check if database is empty
    if summary.get("total_events", 0) == 0 and summary.get("total_incidents", 0) == 0:
        return "There is currently no SIEM telemetry available for analysis."

    # 1. Targeted Incident Query
    if inc_data:
        inc = inc_data["incident"]
        events = inc_data.get("related_events", [])
        lines = [
            f"### Incident #{inc['id']} Investigation",
            f"- **Attack Type:** `{inc.get('attack_type', 'UNKNOWN')}`",
            f"- **Source IP:** `{inc.get('source_ip')}`",
            f"- **Country:** {inc.get('country_reported', 'Not Reported')}",
            f"- **Timestamp:** `{inc.get('timestamp')}`",
            f"- **Risk Score:** **{inc.get('risk_score', 0)} / 100**",
            f"- **Severity:** **{inc.get('severity')}**",
            f"- **Status:** `{inc.get('status', 'OPEN')}`",
            f"- **Telemetry Breakdown:** {inc.get('failed_logins', 0)} Failed Logins | "
            f"{'Successful Login' if inc.get('successful_login') else 'No Successful Login'} | "
            f"{inc.get('command_executions', 0)} Commands Executed",
            "",
            "#### Attack Progression & Correlation",
        ]
        if inc.get("message"):
            lines.append(f"> {inc['message']}")
            lines.append("")

        if events:
            lines.append("#### Sequence of Correlated Events")
            for ev in events:
                lines.append(f"- `{ev.get('timestamp')}` — **{ev.get('event_type')}**: {ev.get('details')}")
        return "\n".join(lines)

    # 2. Targeted IP Query
    if ip_data:
        lines = [
            f"### IP Security Analysis: `{ip_data['source_ip']}`",
            f"- **Reported Country:** {ip_data.get('country_reported', 'Not Reported')}",
            f"- **Total Security Events:** {ip_data['total_events']}",
            f"  - Failed Logins: {ip_data['failed_logins']}",
            f"  - Successful Logins: {ip_data['successful_logins']}",
            f"  - Command Executions: {ip_data['command_executions']}",
            f"- **Associated Incidents:** {ip_data['total_incidents']}",
            f"- **Maximum Risk Score:** **{ip_data['max_risk_score']} / 100**",
            f"- **Attack Classifications:** {', '.join(ip_data['attack_types']) if ip_data['attack_types'] else 'None'}",
            "",
        ]
        if ip_data["incidents"]:
            lines.append("#### Recorded Incidents for this Source")
            for i in ip_data["incidents"]:
                lines.append(f"- **Incident #{i['id']}**: `{i.get('attack_type')}` (Risk: {i.get('risk_score')}, Severity: {i.get('severity')}, Status: {i.get('status')})")
        return "\n".join(lines)

    # 3. Recent / Latest Attack
    if any(k in q for k in ["recent", "latest", "last attack", "last incident", "newest"]):
        if not latest:
            return "No incidents have been recorded in the SIEM database yet."
        events_seq = telemetry.get("latest_incident_events", [])
        lines = [
            f"### Most Recent Attack Detected",
            f"- **Incident ID:** #{latest['id']}",
            f"- **Attack Type:** `{latest.get('attack_type', 'UNKNOWN')}`",
            f"- **Source IP:** `{latest.get('source_ip')}`",
            f"- **Reported Location:** {latest.get('country_reported', 'Not Reported')}",
            f"- **Timestamp:** `{latest.get('timestamp')}`",
            f"- **Risk Score:** **{latest.get('risk_score')} / 100**",
            f"- **Severity:** **{latest.get('severity')}**",
            f"- **Status:** `{latest.get('status', 'OPEN')}`",
            "",
            f"**Correlation Assessment:** {latest.get('message', 'Detected via SIEM correlation engine.')}",
        ]
        if events_seq:
            lines.append("")
            lines.append("#### Recent Correlated Telemetry Sequence")
            for ev in events_seq[:6]:
                lines.append(f"- `{ev.get('timestamp', '')}` — **{ev.get('event_type')}**: {ev.get('details')}")
        return "\n".join(lines)

    # 4. Today's Activity
    if "today" in q:
        lines = [
            f"### Today's Security Telemetry Summary ({today.get('date')})",
            f"- **Events Logged Today:** {today.get('events_today', 0)}",
            f"- **Incidents Detected Today:** {today.get('incidents_today', 0)}",
            "",
        ]
        inc_today = today.get("incidents", [])
        if inc_today:
            lines.append("#### Incidents Created Today:")
            for inc in inc_today:
                lines.append(f"- **Incident #{inc['id']}**: `{inc.get('attack_type')}` from `{inc.get('source_ip')}` | Risk: {inc.get('risk_score')} ({inc.get('severity')})")
        else:
            lines.append("No security incidents were triggered today. The SIEM correlation engine is actively monitoring incoming logs.")
        return "\n".join(lines)

    # 5. Critical / High-Risk Incidents
    if any(k in q for k in ["critical", "high risk", "highest risk", "dangerous", "threats"]):
        lines = ["### Critical & High-Risk Incidents Overview"]
        if not high_risk:
            lines.append("No critical or high-risk incidents currently recorded.")
        else:
            top = high_risk[0]
            lines.append(f"- **Highest Risk Incident:** Incident #{top['id']} (`{top.get('attack_type')}` from `{top.get('source_ip')}`) with Risk Score **{top.get('risk_score')} / 100** ({top.get('severity')}).")
            lines.append("")
            lines.append("| Incident | Attack Type | Source IP | Risk Score | Severity | Location | Status |")
            lines.append("| :--- | :--- | :--- | :--- | :--- | :--- | :--- |")
            for inc in high_risk:
                lines.append(f"| #{inc['id']} | `{inc.get('attack_type')}` | `{inc.get('source_ip')}` | **{inc.get('risk_score')}** | `{inc.get('severity')}` | {inc.get('country_reported')} | `{inc.get('status')}` |")
        return "\n".join(lines)

    # 6. Country Analysis
    if any(k in q for k in ["country", "countries", "location", "where"]):
        lines = ["### Reported Attack Locations"]
        if not countries:
            lines.append("No attacks with reported location data have been logged yet.")
        else:
            lines.append("| Country | Incident Count | Max Risk Score |")
            lines.append("| :--- | :--- | :--- |")
            for c in countries:
                lines.append(f"| **{c['country']}** | {c['count']} incident(s) | {c['max_risk']} / 100 |")
        if telemetry.get("unlocated_count", 0) > 0:
            lines.append(f"\n*Note: {telemetry['unlocated_count']} incident(s) have no explicit location supplied and are marked **Not Reported**. The SIEM does not perform IP geolocation.*")
        return "\n".join(lines)

    # 7. Attack Types
    if any(k in q for k in ["attack type", "attack types", "brute force", "credential", "compromise"]):
        types_dist = summary.get("attack_type_distribution", {})
        lines = ["### Detected Attack Types Distribution"]
        if not types_dist:
            lines.append("No attack types detected yet.")
        else:
            lines.append("| Attack Type | Incidents Triggered | Correlation Criteria |")
            lines.append("| :--- | :--- | :--- |")
            for at, count in types_dist.items():
                if at == "BRUTE_FORCE":
                    rule = "5+ Failed Logins (Risk 40, Severity: HIGH)"
                elif at == "CREDENTIAL_ATTACK":
                    rule = "5+ Failed Logins + Successful Login (Risk 60, Severity: HIGH)"
                elif at == "ACCOUNT_COMPROMISE":
                    rule = "5+ Failed Logins + Successful Login + Command Exec (Risk 90, Severity: CRITICAL)"
                else:
                    rule = "SIEM Correlation Rule"
                lines.append(f"| `{at}` | **{count}** | {rule} |")
        return "\n".join(lines)

    # 8. Failed Logins
    if any(k in q for k in ["failed login", "login attempt", "failed", "who tried"]):
        lines = ["### Failed Login Activity Analysis"]
        if not failed_logins:
            lines.append("No failed login attempts recorded in the events table.")
        else:
            top_failed = failed_logins[0]
            lines.append(f"- **Top Failed Login Source:** `{top_failed['source_ip']}` with **{top_failed['failed_count']}** failed login attempts.")
            lines.append("")
            lines.append("| Source IP | Failed Login Attempts |")
            lines.append("| :--- | :--- |")
            for fl in failed_logins:
                lines.append(f"| `{fl['source_ip']}` | **{fl['failed_count']}** |")
        return "\n".join(lines)

    # 9. Repeated Attackers
    if any(k in q for k in ["repeated", "multiple", "again"]):
        lines = ["### Repeated Attackers Analysis"]
        if not repeated:
            lines.append("No source IPs have generated multiple distinct incidents in the database.")
        else:
            for r in repeated:
                lines.append(f"- **`{r['source_ip']}`**: **{r['incident_count']}** incidents detected | Max Risk: {r['max_risk']} | Attack Types: `{r['attack_types']}` | Location: {r['country_reported']}")
        return "\n".join(lines)

    # 10. General Dashboard Summary (Default)
    sev = summary.get("severity_distribution", {})
    return f"""### SIEM Security Operations Summary
- **Total Security Events:** {summary.get('total_events', 0)}
- **Total Correlated Incidents:** {summary.get('total_incidents', 0)}
- **Open Incidents Requiring Triage:** {summary.get('open_incidents', 0)}
- **Severity Breakdown:**
  - 🔴 **CRITICAL:** {sev.get('CRITICAL', 0)}
  - 🟠 **HIGH:** {sev.get('HIGH', 0)}
  - 🟡 **MEDIUM:** {sev.get('MEDIUM', 0)}
  - 🟢 **LOW:** {sev.get('LOW', 0)}

**Highest Risk Threat:** {f"Incident #{high_risk[0]['id']} (`{high_risk[0]['attack_type']}` from `{high_risk[0]['source_ip']}` - Risk {high_risk[0]['risk_score']})" if high_risk else "None"}

*Ask for specific details, e.g. "What was the most recent attack?", "Analyze incident #1", or "Show critical incidents".*"""


# ── Gemini Integration ───────────────────────────────────────────────────────

SYSTEM_INSTRUCTION = """
You are the SIEM AI Analyst, an expert cybersecurity operations center (SOC) security analyst assistant.
You are analyzing security telemetry supplied directly from the organization's SIEM SQLite database.

CRITICAL OPERATIONAL RULES:
1. You must answer using ONLY the supplied SIEM telemetry and the existing SIEM detection rules.
2. NEVER invent or hallucinate IP addresses, incidents, events, timestamps, attack types, risk scores, severities, or countries.
3. If an IP or incident has no stored country or location, explicitly state "Country: Not Reported". NEVER perform IP geolocation or guess location.
4. If a requested incident or IP does not exist in the database, explicitly state that it was not found in the SIEM database.
5. The SIEM detection & correlation rules are:
   - 5+ failed logins = BRUTE_FORCE (Risk 40, Severity: HIGH)
   - 5+ failed logins + successful login = CREDENTIAL_ATTACK (Risk 60, Severity: HIGH)
   - 5+ failed logins + successful login + command execution = ACCOUNT_COMPROMISE (Risk 90, Severity: CRITICAL)
   - Standalone command execution = SUSPICIOUS_COMMAND_EXECUTION
6. Format responses professionally with Markdown: headings, bullet points, key-value pairs (e.g. **Attack:**, **Source IP:**, **Risk Score:**, **Severity:**, **Country:**, **Status:**), and concise timelines when relevant.
7. If the user asks general questions (e.g. what does CRITICAL mean, why did risk score increase, difference between attacks), explain using the exact SIEM rules above.
8. Be concise, direct, and security-focused. Answer the question directly first, followed by supporting evidence.
"""


def call_gemini_analyst(
    query: str,
    telemetry: Dict[str, Any],
    conversation_history: Optional[List[Dict[str, str]]] = None
) -> Dict[str, Any]:
    """
    Call Google Gemini model using the official google-genai SDK.
    Grounds the prompt with the exact SQLite telemetry context.
    Attempts the requested model, with automatic fallback across compatible
    official models if a model is unavailable or capacity-constrained.
    """
    if not GEMINI_SDK_AVAILABLE or genai is None:
        raise ImportError(f"google-genai SDK not available: {GEMINI_IMPORT_ERROR}")

    config = get_gemini_config()
    api_key = config["api_key"]
    requested_model = config["model"]

    client = genai.Client(api_key=api_key)

    # Format telemetry context for Gemini
    telemetry_json = json.dumps(telemetry, indent=2, default=str)

    # Construct messages with conversation history
    prompt_content = f"""
[CURRENT SIEM DATABASE TELEMETRY CONTEXT]
{telemetry_json}

[USER QUESTION]
{query}
"""

    contents = []
    if conversation_history:
        for msg in conversation_history[-6:]:  # Keep recent context
            role = "user" if msg.get("role") == "user" else "model"
            contents.append(types.Content(
                role=role,
                parts=[types.Part.from_text(text=msg.get("content", ""))]
            ))

    contents.append(types.Content(
        role="user",
        parts=[types.Part.from_text(text=prompt_content)]
    ))

    # Candidate models in priority order: requested model first, then compatible available models
    candidate_models = [requested_model]
    for fallback in ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"]:
        if fallback not in candidate_models:
            candidate_models.append(fallback)

    last_error = None
    for model_name in candidate_models:
        try:
            logger.info("Attempting Gemini model: %s", model_name)
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    temperature=0.2,
                )
            )
            return {
                "text": response.text,
                "model_used": model_name
            }
        except Exception as e:
            err_str = str(e)
            logger.warning("Gemini model %s returned error: %s", model_name, err_str)
            last_error = e
            # If model is 404 (e.g. deprecated for new accounts) or 503 (transient overload), try next candidate
            if any(code in err_str for code in ["404", "503", "NOT_FOUND", "UNAVAILABLE"]):
                continue
            else:
                # Other non-transient errors (such as invalid key), raise immediately
                raise e

    if last_error:
        raise last_error
    raise RuntimeError("Failed to generate response with any available Gemini model")


# ── Primary Analysis Dispatcher ──────────────────────────────────────────────

def analyze_siem_query(
    query: str,
    conversation_history: Optional[List[Dict[str, str]]] = None
) -> Dict[str, Any]:
    """
    Main entry point for SIEM AI questions.
    Extracts grounded SQLite telemetry, then passes it to Gemini (if API key is present)
    or generates an immediate, structured database-grounded response.
    """
    config = get_gemini_config()

    try:
        telemetry = extract_grounded_telemetry(query)
    except Exception as e:
        return {
            "answer": f"**Database Error:** Failed to read SIEM telemetry: {str(e)}",
            "sources": [],
            "fallback": True,
            "provider": "SQLite Grounded Engine",
            "model_used": "sqlite",
            "metadata": {"configured": config["configured"], "model": config["model"]}
        }

    sources = telemetry.get("sources", [])

    # If Gemini is configured with a valid API key, use Gemini LLM
    if config["configured"]:
        try:
            gemini_res = call_gemini_analyst(query, telemetry, conversation_history)
            model_used = gemini_res.get("model_used", config["model"])
            return {
                "answer": gemini_res["text"],
                "sources": sources,
                "fallback": False,
                "provider": "Google Gemini",
                "model_used": model_used,
                "metadata": {
                    "configured": True,
                    "model": model_used,
                    "provider": "Google Gemini",
                    "fallback": False,
                    "incidents_analyzed": len(telemetry.get("recent_incidents", [])),
                }
            }
        except Exception as e:
            logger.error("Gemini API call failed: %s", str(e), exc_info=True)
            # Fallback to local grounded response if Gemini call encounters an error (quota, key, network)
            local_ans = generate_local_grounded_response(query, telemetry)
            return {
                "answer": (
                    f"⚠️ *Gemini API Notice: {str(e)}*\n\n"
                    f"---\n\n"
                    f"{local_ans}"
                ),
                "sources": sources,
                "fallback": True,
                "provider": "SQLite Grounded Engine",
                "model_used": "sqlite",
                "metadata": {
                    "configured": True,
                    "model": config["model"],
                    "provider": "Local Telemetry Fallback (Gemini Error)",
                    "fallback": True,
                    "error": str(e)
                }
            }

    # If Gemini API key is not yet set:
    # Provide the exact grounded response from SQLite + clean setup guidance banner
    local_answer = generate_local_grounded_response(query, telemetry)
    return {
        "answer": local_answer,
        "sources": sources,
        "fallback": True,
        "provider": "SQLite Grounded Engine",
        "model_used": "sqlite",
        "metadata": {
            "configured": False,
            "model": config["model"],
            "provider": "SIEM Grounded Engine (Add GEMINI_API_KEY for Gemini LLM)",
            "fallback": True,
            "notice": "GEMINI_API_KEY is not yet configured in .env. Showing database-grounded telemetry."
        }
    }
