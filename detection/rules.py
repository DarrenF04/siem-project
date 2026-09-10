def detect_brute_force(events):
    failed_logins = {}

    alerts = []

    for event in events:

        if event[4] == "FAILED_LOGIN":

            source_ip = event[2]

            if source_ip not in failed_logins:
                failed_logins[source_ip] = 0

            failed_logins[source_ip] += 1

            if failed_logins[source_ip] == 5:

                alerts.append({
                    "type": "BRUTE_FORCE",
                    "source_ip": source_ip,
                    "severity": "HIGH",
                    "message": "5 failed login attempts detected"
                })

    return alerts