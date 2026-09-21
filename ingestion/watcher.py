import sys
import time
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from ingestion.parser import parse_log_line
from database.db import insert_event, insert_or_update_incident
from detection.correlation import CorrelationEngine

project_dir = Path(__file__).resolve().parent.parent
log_file = project_dir / "logs" / "security.log"


def watch_log():
    print("🟢 SIEM Log Watcher Started")
    print(f"Watching: {log_file}")
    print("Waiting for new security events...\n")


    log_file.parent.mkdir(parents=True, exist_ok=True)
    log_file.touch(exist_ok=True)

    position = log_file.stat().st_size
    correlation_engine = CorrelationEngine()

    while True:
        with open(log_file, "r", encoding="utf-8") as file:
            file.seek(position)
            new_lines = file.readlines()
            position = file.tell()

        for line in new_lines:
            line = line.strip()
            if not line:    
                continue

            event = parse_log_line(line)
            insert_event(event)
            print("📥 New Event")
            print(event)

            incident = correlation_engine.process_event(event)
            if incident:
                insert_or_update_incident(incident)
                print("\n🚨 SECURITY INCIDENT 🚨")
                print("Incident:", incident["incident"])
                print("Attack Type:", incident["attack_type"])
                print("Source IP:", incident["source_ip"])
                print("Country:", incident.get("country"))
                print("Latitude:", incident.get("latitude"))
                print("Longitude:", incident.get("longitude"))
                print("Failed Logins:", incident["failed_logins"])
                print("Successful Login:", incident["successful_login"])
                print("Commands Executed:", incident["command_executions"])
                print("Risk Score:", incident["risk_score"], "/ 100")
                print("Severity:", incident["severity"])
                print("Message:", incident["message"])
                print()

        time.sleep(1)


if __name__ == "__main__":
    watch_log()
