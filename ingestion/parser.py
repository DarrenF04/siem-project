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

    country = None
    latitude = None
    longitude = None

    if len(parts) > 5 and parts[5].strip() and parts[5].strip().upper() not in ("NONE", "NULL", ""):
        country = parts[5].strip()
    if len(parts) > 6 and parts[6].strip() and parts[6].strip().upper() not in ("NONE", "NULL", ""):
        try:
            latitude = float(parts[6].strip())
        except ValueError:
            latitude = None
    if len(parts) > 7 and parts[7].strip() and parts[7].strip().upper() not in ("NONE", "NULL", ""):
        try:
            longitude = float(parts[7].strip())
        except ValueError:
            longitude = None

    event = SecurityEvent(
        timestamp=datetime.strptime(
            parts[0],
            "%Y-%m-%d %H:%M:%S"
        ),
        source_ip=parts[1],
        source=parts[2],
        event_type=event_type,
        details=parts[4],
        severity=get_severity(event_type),
        country=country,
        latitude=latitude,
        longitude=longitude
    )

    return event