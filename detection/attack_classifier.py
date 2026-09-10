"""Rule-based attack classification for the SIEM correlation engine."""


def classify_attack(failed_logins: int, successful_login: bool, command_executions: int) -> str:
    """Classify the most likely attack pattern from correlated events."""
    if failed_logins >= 5 and successful_login and command_executions > 0:
        return "ACCOUNT_COMPROMISE"
    if failed_logins >= 5 and successful_login:
        return "CREDENTIAL_ATTACK"
    if failed_logins >= 5:
        return "BRUTE_FORCE"
    if successful_login and command_executions > 0:
        return "POST_COMPROMISE_ACTIVITY"
    if command_executions > 0:
        return "SUSPICIOUS_COMMAND_EXECUTION"
    return "UNKNOWN"
