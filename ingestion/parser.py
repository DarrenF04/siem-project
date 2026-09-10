from datetime import datetime

from database.event_model import SecurityEvent


def get_severity(event_type):
    severity_map = {
        "FAILED_LOGIN": "MEDIUM",
        "SUCCESSFUL_LOGIN": "LOW",
        "COMMAND_EXECUTION": "HIGH"
    }

    return severity_map.get(event_type, "INFO")


def parse_log_line(line):
    parts = line.strip().split(" | ")

    event_type = parts[3]

    event = SecurityEvent(
        timestamp=datetime.strptime(
            parts[0],
            "%Y-%m-%d %H:%M:%S"
        ),
        source_ip=parts[1],
        source=parts[2],
        event_type=event_type,
        details=parts[4],
        severity=get_severity(event_type)
    )

    return event