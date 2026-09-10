from collections import defaultdict


# Keeps track of failed login attempts for each IP
failed_login_counts = defaultdict(int)


def process_event(event):
    """
    Analyze a newly received SecurityEvent.
    Returns an alert if suspicious activity is detected.
    """

    # Check for failed login
    if event.event_type == "FAILED_LOGIN":

        ip = event.source_ip

        # Increase failed login count
        failed_login_counts[ip] += 1

        count = failed_login_counts[ip]

        print(f"🔎 Failed login count for {ip}: {count}")

        # Detect brute force after 5 failures
        if count == 5:

            alert = {
                "type": "BRUTE_FORCE",
                "source_ip": ip,
                "attempts": count,
                "severity": "HIGH",
                "message": "5 failed login attempts detected"
            }

            return alert

    # Reset failed login counter after successful login
    elif event.event_type == "SUCCESSFUL_LOGIN":

        ip = event.source_ip

        failed_login_counts[ip] = 0

        print(f"🔐 Successful login detected from {ip}")

    return None