# SIEM Dashboard

A full-stack **Security Information and Event Management (SIEM)**
platform built as an academic cybersecurity project. The system ingests
security events, stores normalized telemetry, detects correlated attack
patterns, calculates risk, creates incidents, visualizes attack
activity, and provides a controlled attack simulator for demonstrations.

## Features

### Security Event Ingestion

-   Live security log watcher
-   Structured event parsing and normalization
-   SQLite event and incident persistence
-   Failed login, successful login, and command execution telemetry
-   Watcher starts from the end of the existing log to avoid duplicate
    ingestion

### Detection & Correlation

  ------------------------------------------------------------------------------
  Activity         Attack Type                             Risk Severity
  ---------------- ---------------------- --------------------- ----------------
  5+ failed logins `BRUTE_FORCE`                             40 HIGH

  5+ failed        `CREDENTIAL_ATTACK`                       60 HIGH
  logins +                                                      
  successful login                                              

  5+ failed        `ACCOUNT_COMPROMISE`                      90 CRITICAL
  logins +                                                      
  successful                                                    
  login + command                                               
  execution                                                     
  ------------------------------------------------------------------------------

The detection and risk-scoring logic is deterministic so attack
scenarios can be demonstrated consistently.

### Reported Attack Location

The system supports explicitly supplied source locations: - Country -
Latitude - Longitude - Country shown in Events and Incidents - Reported
location shown during investigation - Location included in PDF incident
reports - World Threat Map markers

The system **does not perform IP geolocation**. If no location is
supplied, the event remains valid and no map marker is created.

### World Threat Map

The map is data-driven and uses only explicit latitude/longitude values
stored with events. It displays attack source location, source IP,
country, event counts, and attack/severity information.

### Live Security Alerts

The dashboard includes an in-app alert system for: - New incidents -
Risk escalation - Severity changes - Attack-type escalation

Example:

``` text
BRUTE_FORCE
40 / 100 — HIGH
        ↓
CREDENTIAL_ATTACK
60 / 100 — HIGH
        ↓
ACCOUNT_COMPROMISE
90 / 100 — CRITICAL
```

Historical incidents are silently baselined on initial load, duplicate
alerts are prevented, alerts can be dismissed, and the existing
Investigation Modal can be opened directly from an alert.

### Attack Simulator

The simulator provides controlled attack scenarios with configurable
source IP and reported location.

The demonstration flow is:

``` text
Simulated Attack
      ↓
security.log
      ↓
Log Watcher
      ↓
Parser
      ↓
SQLite
      ↓
Correlation Engine
      ↓
Incident
      ↓
Dashboard Alert
      ↓
World Threat Map
```

### Dashboard

The React dashboard includes: - Security KPI cards - Total events and
incidents - Critical and high-severity counts - Correlation pipeline -
Incident severity visualization - Event type visualization - Top source
IP activity - World Threat Map - Live Security Alerts - Dark/light mode

### Incident Investigation

The Investigation Modal displays incident details, attack type, source
IP, risk, severity, status, reported location, correlation information,
and event telemetry.

### PDF Incident Reports

Individual incidents can be exported as PDF reports containing: 1.
Incident Overview 2. Incident Summary 3. Correlation Analysis 4. Event
Timeline 5. Source Information 6. Event Statistics 7. Raw Event Evidence
8. Persisted Incident Record

## Technology Stack

### Backend

-   Python
-   FastAPI
-   SQLite
-   ReportLab

### Frontend

-   React
-   Vite
-   Recharts
-   Lucide React

### Development

-   Python virtual environment
-   Node.js / npm
-   Git

## Project Structure

``` text
siem-project/
├── backend/
│   ├── main.py
│   ├── simulator.py
│   └── report_generator.py
├── dashboard/
│   └── src/
│       ├── App.jsx
│       ├── App.css
│       ├── AttackSimulator.jsx
│       ├── AttackSimulator.css
│       ├── components/
│       │   ├── Sidebar.jsx
│       │   ├── IncidentsSection.jsx
│       │   ├── InvestigationModal.jsx
│       │   ├── EventsSection.jsx
│       │   ├── WorldThreatMap.jsx
│       │   ├── LiveSecurityAlert.jsx
│       │   └── NotificationPopover.jsx
│       ├── hooks/
│       │   └── useLiveAlerts.js
│       └── pages/
│           └── DashboardPage.jsx
├── database/
│   ├── __init__.py
│   ├── db.py
│   ├── event_model.py
│   └── view_incidents.py
├── detection/
│   ├── attack_classifier.py
│   ├── correlation.py
│   ├── live_detector.py
│   └── rules.py
├── ingestion/
│   ├── __init__.py
│   ├── parser.py
│   └── watcher.py
├── logs/
│   └── security.log
├── seed_data.py
└── tests/
```

## Requirements

-   Python 3.x
-   Node.js and npm
-   Git

## Installation

### Clone

``` bash
git clone <repository-url>
cd siem-project
```

### Python environment

Windows PowerShell:

``` powershell
python -m venv venv
.env\Scripts\Activate.ps1
```

### Python dependencies

If the project contains `requirements.txt`:

``` powershell
pip install -r requirements.txt
```

### Frontend dependencies

``` powershell
cd dashboard
npm install
cd ..
```

## Running the Project

The project normally uses three processes.

### Terminal 1 --- FastAPI Backend

From the project root:

``` powershell
.env\Scripts\Activate.ps1
uvicorn backend.main:app --reload
```

Backend:

``` text
http://127.0.0.1:8000
```

API documentation:

``` text
http://127.0.0.1:8000/docs
```

### Terminal 2 --- Log Watcher

``` powershell
.env\Scripts\Activate.ps1
python -m ingestion.watcher
```

The watcher monitors:

``` text
logs/security.log
```

### Terminal 3 --- React Dashboard

``` powershell
cd dashboard
npm run dev
```

Open the local URL shown by Vite, normally:

``` text
http://localhost:5173
```

## Seed Demo Data

Run:

``` powershell
python seed_data.py
```

The seed data includes deterministic locations such as India, Germany,
the United States, and Singapore. Events without an explicit location
remain unlocated.

## Demonstration Flow

1.  Start the FastAPI backend, log watcher, and React dashboard.
2.  Open the Dashboard and show KPIs, charts, the World Threat Map, and
    Live Security Alerts.
3.  Use the Attack Simulator with a new private source IP and a reported
    location.
4.  Run a brute-force attack. After 5 failed logins, the system creates
    a HIGH-risk `BRUTE_FORCE` incident with risk 40.
5.  Continue with a successful login to demonstrate `CREDENTIAL_ATTACK`
    at risk 60.
6.  Execute a command to demonstrate `ACCOUNT_COMPROMISE` at risk 90 and
    CRITICAL severity.
7.  Open the Investigation Modal.
8.  Show the reported source location on the map.
9.  Export the incident as a PDF.

## API

The FastAPI Swagger UI is available at:

``` text
http://127.0.0.1:8000/docs
```

Use it to inspect the currently available endpoints and request/response
schemas.

## Data Model

### Security Events

Typical event fields include:

``` text
timestamp
source_ip
source
event_type
details
severity
country
latitude
longitude
```

### Security Incidents

Typical incident fields include:

``` text
id
timestamp
incident_type
attack_type
source_ip
failed_logins
successful_login
command_executions
risk_score
severity
message
status
country
latitude
longitude
created_at
updated_at
```

## Location Design

Locations are explicitly supplied by seed data or the Attack Simulator.

Example:

``` text
Country: Germany
Latitude: 52.5200
Longitude: 13.4050
```

The system intentionally does not infer location from an IP address.

If location is absent:

``` text
country = NULL
latitude = NULL
longitude = NULL
```

The event and incident still function normally and no map marker is
created.

## Security Design Notes

This project is an educational SIEM prototype and demonstration system.
It focuses on event collection, normalization, correlation, risk
scoring, incident generation, visualization, investigation, and
controlled synthetic attack simulation.

The simulator generates synthetic events and is not intended to be a
production intrusion-testing framework.

## Git / Branching

The currently developed version is maintained on:

``` text
frontend-redesign
```

The tested checkpoint is:

``` text
82061bb Complete SIEM dashboard features
```

This branch can continue to evolve before any future merge into `main`.

## Future Enhancements

Potential future development includes: - AI-assisted security analyst -
Natural-language incident investigation - Automated incident
summarization - LLM-assisted correlation explanations - Anomaly
detection - Threat intelligence integration - Advanced rule
configuration - Real-time WebSocket notifications - Authentication and
role-based dashboard access - Additional security data sources

## Project Status

The current implementation has been tested for: - Live event ingestion -
Incident correlation - Risk escalation - Attack simulation - Explicit
location propagation - World Threat Map updates - Incident
investigation - PDF incident reports - Live Security Alerts -
No-location telemetry handling - Frontend production build

## License

This project was developed as an academic cybersecurity project. Add an
appropriate license if the repository is intended for public
distribution.
