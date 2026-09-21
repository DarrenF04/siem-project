from collections import defaultdict
from detection.attack_classifier import classify_attack


class CorrelationEngine:
    def __init__(self):
        self.failed_logins = defaultdict(int)
        self.successful_logins = defaultdict(bool)
        self.command_executions = defaultdict(int)
        self.geo_metadata = {}

    def process_event(self, event):
        ip = event.source_ip

        if getattr(event, "country", None) is not None and getattr(event, "latitude", None) is not None:
            self.geo_metadata[ip] = {
                "country": event.country,
                "latitude": event.latitude,
                "longitude": event.longitude,
            }

        if event.event_type == "FAILED_LOGIN":
            self.failed_logins[ip] += 1
            print(f"🔎 {ip} failed logins: {self.failed_logins[ip]}")
        elif event.event_type == "SUCCESSFUL_LOGIN":
            self.successful_logins[ip] = True
            print(f"🔐 Successful login from {ip}")
        elif event.event_type == "COMMAND_EXECUTION":
            self.command_executions[ip] += 1
            print(f"💻 Command execution from {ip}: {self.command_executions[ip]}")

        return self.check_correlation(ip)

    def check_correlation(self, ip):
        failed = self.failed_logins[ip]
        successful = self.successful_logins[ip]
        commands = self.command_executions[ip]
        risk_score = 0

        if failed >= 5:
            risk_score += 40
        if successful and failed >= 5:
            risk_score += 20
        if commands > 0 and successful and failed >= 5:
            risk_score += 30

        attack_type = classify_attack(failed, successful, commands)
        geo = self.geo_metadata.get(ip, {})
        country = geo.get("country")
        latitude = geo.get("latitude")
        longitude = geo.get("longitude")

        if risk_score >= 90:
            return {
                "incident": "POSSIBLE_ACCOUNT_COMPROMISE",
                "attack_type": attack_type,
                "source_ip": ip,
                "failed_logins": failed,
                "successful_login": successful,
                "command_executions": commands,
                "risk_score": risk_score,
                "severity": "CRITICAL",
                "message": "Five or more failed logins followed by successful authentication and command execution",
                "country": country,
                "latitude": latitude,
                "longitude": longitude,
            }
        elif risk_score >= 40:
            return {
                "incident": "BRUTE_FORCE_ACTIVITY",
                "attack_type": attack_type,
                "source_ip": ip,
                "failed_logins": failed,
                "successful_login": successful,
                "command_executions": commands,
                "risk_score": risk_score,
                "severity": "HIGH",
                "message": "Multiple failed login attempts detected from the same source IP",
                "country": country,
                "latitude": latitude,
                "longitude": longitude,
            }
        return None
