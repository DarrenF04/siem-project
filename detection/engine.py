import sqlite3
from pathlib import Path

from detection.rules import detect_brute_force


project_dir = Path(__file__).resolve().parent.parent
db_file = project_dir / "database" / "siem.db"


def get_events():

    connection = sqlite3.connect(db_file)

    cursor = connection.cursor()

    cursor.execute("""
        SELECT *
        FROM security_events
        ORDER BY timestamp
    """)

    events = cursor.fetchall()

    connection.close()

    return events


events = get_events()

alerts = detect_brute_force(events)


for alert in alerts:
    print("🚨 SECURITY ALERT")
    print("Type:", alert["type"])
    print("Source IP:", alert["source_ip"])
    print("Severity:", alert["severity"])
    print("Message:", alert["message"])
    print()