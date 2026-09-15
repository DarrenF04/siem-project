import sqlite3
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from backend.simulator import router as simulator_router

project_dir = Path(__file__).resolve().parent.parent
db_file = project_dir / "database" / "siem.db"

app = FastAPI(title="SIEM Backend", version="1.0")
app.include_router(simulator_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def query_all(sql, params=()):
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
