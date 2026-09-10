import sqlite3
from pathlib import Path
from datetime import datetime

project_dir = Path(__file__).resolve().parent.parent
# This file is intended to replace database/db.py
# when copied into the project's database directory.
db_file = project_dir / "database" / "siem.db"


def get_connection():
    return sqlite3.connect(db_file)


def create_database():
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
            severity TEXT NOT NULL
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
            updated_at TEXT
        )
    """)

    cursor.execute("PRAGMA table_info(security_incidents)")
    columns = [column[1] for column in cursor.fetchall()]
    migrations = {
        "attack_type": "ALTER TABLE security_incidents ADD COLUMN attack_type TEXT DEFAULT 'UNKNOWN'",
        "status": "ALTER TABLE security_incidents ADD COLUMN status TEXT DEFAULT 'OPEN'",
        "created_at": "ALTER TABLE security_incidents ADD COLUMN created_at TEXT",
        "updated_at": "ALTER TABLE security_incidents ADD COLUMN updated_at TEXT",
    }
    for column, statement in migrations.items():
        if column not in columns:
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
        (timestamp, source_ip, source, event_type, details, severity)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        event.timestamp.isoformat(), event.source_ip, event.source,
        event.event_type, event.details, event.severity
    ))
    connection.commit()
    connection.close()


def insert_or_update_incident(incident):
    connection = get_connection()
    cursor = connection.cursor()
    now = datetime.now().isoformat()

    cursor.execute("""
        SELECT id FROM security_incidents
        WHERE source_ip = ? AND status = 'OPEN'
        ORDER BY id DESC LIMIT 1
    """, (incident["source_ip"],))
    existing = cursor.fetchone()

    if existing:
        incident_id = existing[0]
        cursor.execute("""
            UPDATE security_incidents
            SET incident_type = ?, attack_type = ?, failed_logins = ?,
                successful_login = ?, command_executions = ?, risk_score = ?,
                severity = ?, message = ?, updated_at = ?
            WHERE id = ?
        """, (
            incident["incident"], incident.get("attack_type", "UNKNOWN"),
            incident["failed_logins"], int(incident["successful_login"]),
            incident["command_executions"], incident["risk_score"],
            incident["severity"], incident["message"], now, incident_id
        ))
        print(f"🔄 Existing incident #{incident_id} updated")
    else:
        cursor.execute("""
            INSERT INTO security_incidents
            (timestamp, incident_type, attack_type, source_ip, failed_logins,
             successful_login, command_executions, risk_score, severity, message,
             status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            now, incident["incident"], incident.get("attack_type", "UNKNOWN"),
            incident["source_ip"], incident["failed_logins"],
            int(incident["successful_login"]), incident["command_executions"],
            incident["risk_score"], incident["severity"], incident["message"],
            "OPEN", now, now
        ))
        incident_id = cursor.lastrowid
        print(f"🆕 New incident #{incident_id} created")

    connection.commit()
    connection.close()


if __name__ == "__main__":
    create_database()
    print("SIEM database created successfully.")
