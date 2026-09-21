import sqlite3
from pathlib import Path
from datetime import datetime

project_dir = Path(__file__).resolve().parent.parent
# This file is intended to replace database/db.py
# when copied into the project's database directory.
db_file = project_dir / "database" / "siem.db"


def get_connection():
    db_file.parent.mkdir(parents=True, exist_ok=True)
    return sqlite3.connect(db_file)


def create_database():
    db_file.parent.mkdir(parents=True, exist_ok=True)
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS security_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            source_ip TEXT NOT NULL,
            source TEXT NOT NULL,
            event_type TEXT NOT NULL,
            details TEXT,
            severity TEXT NOT NULL,
            country TEXT,
            latitude REAL,
            longitude REAL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS security_incidents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            incident_type TEXT NOT NULL,
            attack_type TEXT DEFAULT 'UNKNOWN',
            source_ip TEXT NOT NULL,
            failed_logins INTEGER,
            successful_login INTEGER,
            command_executions INTEGER,
            risk_score INTEGER NOT NULL,
            severity TEXT NOT NULL,
            message TEXT,
            status TEXT DEFAULT 'OPEN',
            created_at TEXT,
            updated_at TEXT,
            country TEXT,
            latitude REAL,
            longitude REAL
        )
    """)

    cursor.execute("PRAGMA table_info(security_events)")
    event_columns = [column[1] for column in cursor.fetchall()]
    event_migrations = {
        "country": "ALTER TABLE security_events ADD COLUMN country TEXT",
        "latitude": "ALTER TABLE security_events ADD COLUMN latitude REAL",
        "longitude": "ALTER TABLE security_events ADD COLUMN longitude REAL",
    }
    for column, statement in event_migrations.items():
        if column not in event_columns:
            cursor.execute(statement)

    cursor.execute("PRAGMA table_info(security_incidents)")
    incident_columns = [column[1] for column in cursor.fetchall()]
    incident_migrations = {
        "attack_type": "ALTER TABLE security_incidents ADD COLUMN attack_type TEXT DEFAULT 'UNKNOWN'",
        "status": "ALTER TABLE security_incidents ADD COLUMN status TEXT DEFAULT 'OPEN'",
        "created_at": "ALTER TABLE security_incidents ADD COLUMN created_at TEXT",
        "updated_at": "ALTER TABLE security_incidents ADD COLUMN updated_at TEXT",
        "country": "ALTER TABLE security_incidents ADD COLUMN country TEXT",
        "latitude": "ALTER TABLE security_incidents ADD COLUMN latitude REAL",
        "longitude": "ALTER TABLE security_incidents ADD COLUMN longitude REAL",
    }
    for column, statement in incident_migrations.items():
        if column not in incident_columns:
            cursor.execute(statement)

    cursor.execute("""
        UPDATE security_incidents
        SET attack_type = 'UNKNOWN'
        WHERE attack_type IS NULL OR attack_type = ''
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_incident_source_ip
        ON security_incidents(source_ip)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_incident_attack_type
        ON security_incidents(attack_type)
    """)

    connection.commit()
    connection.close()


def insert_event(event):
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute("""
        INSERT INTO security_events
        (timestamp, source_ip, source, event_type, details, severity, country, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        event.timestamp.isoformat(), event.source_ip, event.source,
        event.event_type, event.details, event.severity,
        getattr(event, "country", None),
        getattr(event, "latitude", None),
        getattr(event, "longitude", None)
    ))
    connection.commit()
    connection.close()


def insert_or_update_incident(incident):
    connection = get_connection()
    cursor = connection.cursor()
    now = datetime.now().isoformat()

    cursor.execute("""
        SELECT id, country, latitude, longitude FROM security_incidents
        WHERE source_ip = ? AND status = 'OPEN'
        ORDER BY id DESC LIMIT 1
    """, (incident["source_ip"],))
    existing = cursor.fetchone()

    country = incident.get("country")
    latitude = incident.get("latitude")
    longitude = incident.get("longitude")

    if existing:
        incident_id = existing[0]
        if country is None:
            country = existing[1]
            latitude = existing[2]
            longitude = existing[3]

        cursor.execute("""
            UPDATE security_incidents
            SET incident_type = ?, attack_type = ?, failed_logins = ?,
                successful_login = ?, command_executions = ?, risk_score = ?,
                severity = ?, message = ?, updated_at = ?,
                country = ?, latitude = ?, longitude = ?
            WHERE id = ?
        """, (
            incident["incident"], incident.get("attack_type", "UNKNOWN"),
            incident["failed_logins"], int(incident["successful_login"]),
            incident["command_executions"], incident["risk_score"],
            incident["severity"], incident["message"], now,
            country, latitude, longitude,
            incident_id
        ))
        print(f"🔄 Existing incident #{incident_id} updated")
    else:
        cursor.execute("""
            INSERT INTO security_incidents
            (timestamp, incident_type, attack_type, source_ip, failed_logins,
             successful_login, command_executions, risk_score, severity, message,
             status, created_at, updated_at, country, latitude, longitude)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            now, incident["incident"], incident.get("attack_type", "UNKNOWN"),
            incident["source_ip"], incident["failed_logins"],
            int(incident["successful_login"]), incident["command_executions"],
            incident["risk_score"], incident["severity"], incident["message"],
            "OPEN", now, now,
            country, latitude, longitude
        ))
        incident_id = cursor.lastrowid
        print(f"🆕 New incident #{incident_id} created")

    connection.commit()
    connection.close()


if __name__ == "__main__":
    create_database()
    print("SIEM database created successfully.")
