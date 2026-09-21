import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from database.db import create_database
from backend.simulator import router as simulator_router
from backend.report_generator import generate_incident_pdf, get_related_events_for_incident

project_dir = Path(__file__).resolve().parent.parent
db_file = project_dir / "database" / "siem.db"


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_database()
    yield


app = FastAPI(title="SIEM Backend", version="1.0", lifespan=lifespan)
app.include_router(simulator_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def query_all(sql, params=()):
    db_file.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db_file)
    connection.row_factory = sqlite3.Row
    cursor = connection.cursor()
    cursor.execute(sql, params)
    rows = [dict(row) for row in cursor.fetchall()]
    connection.close()
    return rows


@app.get("/")
def root():
    return {"message": "SIEM Backend is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/events")
def get_events(severity: str = "ALL", source_ip: str = "ALL", event_type: str = "ALL"):
    sql = "SELECT * FROM security_events WHERE 1=1"
    params = []

    if severity != "ALL":
        sql += " AND severity = ?"
        params.append(severity)
    if source_ip != "ALL":
        sql += " AND source_ip = ?"
        params.append(source_ip)
    if event_type != "ALL":
        sql += " AND event_type = ?"
        params.append(event_type)

    sql += " ORDER BY id DESC"
    return query_all(sql, params)


@app.get("/incidents")
def get_incidents(
    severity: str = "ALL",
    source_ip: str = "ALL",
    status: str = "ALL",
    attack_type: str = "ALL",
):
    sql = "SELECT * FROM security_incidents WHERE 1=1"
    params = []

    if severity != "ALL":
        sql += " AND severity = ?"
        params.append(severity)
    if source_ip != "ALL":
        sql += " AND source_ip = ?"
        params.append(source_ip)
    if status != "ALL":
        sql += " AND status = ?"
        params.append(status.upper())
    if attack_type != "ALL":
        sql += " AND attack_type = ?"
        params.append(attack_type)

    sql += " ORDER BY id DESC"
    return query_all(sql, params)


@app.get("/statistics")
def get_statistics():
    connection = sqlite3.connect(db_file)
    cursor = connection.cursor()

    total_events = cursor.execute("SELECT COUNT(*) FROM security_events").fetchone()[0]
    total_incidents = cursor.execute("SELECT COUNT(*) FROM security_incidents").fetchone()[0]
    critical = cursor.execute("SELECT COUNT(*) FROM security_incidents WHERE severity='CRITICAL'").fetchone()[0]
    high = cursor.execute("SELECT COUNT(*) FROM security_incidents WHERE severity='HIGH'").fetchone()[0]
    medium = cursor.execute("SELECT COUNT(*) FROM security_incidents WHERE severity='MEDIUM'").fetchone()[0]
    low = cursor.execute("SELECT COUNT(*) FROM security_incidents WHERE severity='LOW'").fetchone()[0]
    open_incidents = cursor.execute("SELECT COUNT(*) FROM security_incidents WHERE status='OPEN'").fetchone()[0]

    connection.close()

    return {
        "total_events": total_events,
        "total_incidents": total_incidents,
        "critical_incidents": critical,
        "high_incidents": high,
        "medium_incidents": medium,
        "low_incidents": low,
        "open_incidents": open_incidents,
    }


@app.patch("/incidents/{incident_id}/status")
def update_incident_status(incident_id: int, status: str):
    allowed_statuses = {"OPEN", "INVESTIGATING", "RESOLVED"}
    status = status.upper()

    if status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid incident status")

    connection = sqlite3.connect(db_file)
    cursor = connection.cursor()
    cursor.execute("""
        UPDATE security_incidents
        SET status = ?, updated_at = datetime('now')
        WHERE id = ?
    """, (status, incident_id))

    if cursor.rowcount == 0:
        connection.close()
        raise HTTPException(status_code=404, detail="Incident not found")

    connection.commit()
    connection.close()
    return {"message": "Incident status updated", "incident_id": incident_id, "status": status}


@app.get("/reports/incidents/{incident_id}/pdf")
def export_incident_pdf(incident_id: int):
    """
    Generate and stream an audit-ready factual SIEM Incident Report PDF.
    Retrieves incident and related events from SQLite within the correlation window.
    """
    connection = sqlite3.connect(db_file)
    connection.row_factory = sqlite3.Row
    cursor = connection.cursor()

    cursor.execute("SELECT * FROM security_incidents WHERE id = ?", (incident_id,))
    row = cursor.fetchone()
    if not row:
        connection.close()
        raise HTTPException(status_code=404, detail=f"Incident #{incident_id} not found in SIEM database")

    incident = dict(row)
    related_events = get_related_events_for_incident(connection, incident)
    connection.close()

    try:
        pdf_bytes = generate_incident_pdf(incident, related_events)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate incident PDF report: {str(e)}")

    attack_type = incident.get("attack_type") or "INCIDENT"
    filename = f"SIEM_Incident_{incident_id}_{attack_type}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )

