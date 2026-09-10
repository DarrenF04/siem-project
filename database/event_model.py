from dataclasses import dataclass
from datetime import datetime


@dataclass
class SecurityEvent:
    timestamp: datetime
    source_ip: str
    source: str
    event_type: str
    details: str
    severity: str