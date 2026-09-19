# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- Primary User: Student/Researcher presenting in an academic defense and lab evaluation context (NMIMS MCA Capstone Project).
- Secondary Audience: Academic evaluators, professors, and technical reviewers examining cybersecurity fundamentals, log pipeline architecture, detection engineering, and incident response.
- Operational Persona: Security Operations Center (SOC) Tier-1/Tier-2 Analyst triaging alerts, inspecting raw event logs, correlating multi-stage attacks, and managing incident resolution lifecycles.

## Product Purpose
Provide a transparent, full-stack Security Information and Event Management (SIEM) platform that ingests raw system/network security logs, parses and stores events into a relational datastore (SQLite), correlates log patterns to detect high-severity cyber attacks in real time, and equips analysts with an intuitive investigation dashboard and built-in interactive Attack Simulator. Success is defined by clear, immediate visibility from attack simulation to event log ingestion, automated rule correlation, and incident resolution.

## Positioning
Unlike commercial enterprise SIEMs (Splunk, IBM QRadar, Microsoft Sentinel) which are opaque black boxes requiring complex infrastructure and high resource overhead, this SIEM is a lean, self-contained, end-to-end demonstrable platform featuring an integrated Attack Simulator that generates synthetic attack vectors (Brute Force, SQL Injection, Port Scanning, DDoS) directly against the pipeline to vividly demonstrate detection, correlation, and SOC triage workflows in real time.

## Operating Context
- Environments: Localhost / lab environment (FastAPI backend at `http://127.0.0.1:8000`, Vite React frontend at `http://127.0.0.1:5173`).
- Ingestion Pipeline: Python file watcher (`ingestion.watcher`) monitoring log sources, passing raw logs to parser and database models.
- Detection Pipeline: Rule engine and live correlation detector (`detection/`) evaluating sliding time windows to trigger classified security incidents.
- Presentation Rituals: Live academic presentations, capstone defense, live attack demonstration, and threat hunting walk-throughs.

## Capabilities and Constraints
- Capabilities:
  - Live log monitoring and structured event ingestion (source IP, event type, severity, timestamp, details).
  - Multi-condition attack detection rules & correlation engine (identifying brute force attempts, port scans, SQL injection attacks, DDoS patterns).
  - Incident triage lifecycle: Status tracking (`OPEN`, `INVESTIGATING`, `CONTAINED`, `RESOLVED`, `FALSE_POSITIVE`).
  - Investigation modal displaying drill-down incident timeline, correlated events, analyst notes, and status transitions.
  - Multi-dimensional filtering and search across events and incidents (by severity, event type, source IP, attack type, keyword).
  - Visual analytics: Severity distribution, attack category charts, and event activity timelines.
  - Interactive Attack Simulator: Single-click synthetic attack generator triggering simulated security telemetry.
- Technical Constraints:
  - SQLite backend database with parameterized queries for SQL injection defense.
  - Single-node architecture designed for responsive local evaluation and demonstration.
  - Plain React 19 + Recharts + Lucide icons frontend without heavy enterprise UI framework bloat.

## Evidence on Hand
- Full backend implementation in `backend/` (`main.py`, `simulator.py`).
- Functional detection and correlation engines in `detection/` (`engine.py`, `correlation.py`, `attack_classifier.py`, `rules.py`).
- Ingestion pipeline in `ingestion/` (`watcher.py`, `parser.py`).
- Seeded and operational SQLite database in `database/siem.db`.
- React frontend dashboard in `dashboard/` with existing components (`AnalyticsCharts`, `EventsSection`, `IncidentsSection`, `InvestigationModal`, `AttackSimulator`, `StatCards`).

## Product Principles
1. Direct Observability: Every simulated attack or ingested log must have an immediate, traceable path through event ingestion, correlation rule triggering, and incident presentation.
2. Analyst-Centric Clarity: Present security telemetry with high information density without clutter; prioritize actionable triage data (severity, source IP, time delta, attack classification).
3. Demo Reliability: The system must run deterministically and withstand live demonstration sequences without state corruption or lag.
4. Truth in Data: Maintain verifiable correlation between raw logs, parsed events, and triggered incidents; never fake or detach incident records from underlying evidence.

## Accessibility & Inclusion
- High-contrast color coding for critical, high, medium, and low security severities.
- Clear typographic hierarchy for fast scanning during high-stress alert triage.
- Responsive layout adapting to standard desktop monitors and presentation displays.
