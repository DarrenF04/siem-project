from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class SecurityEvent:
    timestamp: datetime
    source_ip: str
    source: str
    event_type: str
    details: str
    severity: str
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None