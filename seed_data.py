from pathlib import Path
from datetime import datetime
import time

from database.db import create_database


# ---------------------------------------------------------
# PATHS
# ---------------------------------------------------------

PROJECT_DIR = Path(__file__).resolve().parent
LOG_FILE = PROJECT_DIR / "logs" / "security.log"


# ---------------------------------------------------------
# EVENT WRITER
# ---------------------------------------------------------

def write_event(file, source_ip, event_type, details, country=None, latitude=None, longitude=None):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    geo_suffix = ""
    if country is not None and latitude is not None and longitude is not None:
        geo_suffix = f" | {country} | {latitude} | {longitude}"

    line = (
        f"{timestamp} | "
        f"{source_ip} | "
        f"SeedData | "
        f"{event_type} | "
        f"{details}"
        f"{geo_suffix}\n"
    )

    file.write(line)
    file.flush()

    geo_log = f" | [{country}]" if country else ""
    print(
        f"[SEED] {source_ip} | "
        f"{event_type} | "
        f"{details}{geo_log}"
    )


# ---------------------------------------------------------
# MAIN
# ---------------------------------------------------------

def main():

    print()
    print("=" * 60)
    print("        SIEM DEMO DATA SEEDER")
    print("=" * 60)
    print()

    # Make sure database structure exists
    create_database()

    # Make sure logs directory exists
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

    # Make sure security.log exists
    LOG_FILE.touch(exist_ok=True)

    print(f"Writing demo events to:")
    print(LOG_FILE)
    print()

    with open(LOG_FILE, "a", encoding="utf-8") as file:

        # =================================================
        # 1. NORMAL ACTIVITY (No Location Supplied)
        # =================================================

        print("▶ Generating normal activity (no location)...")

        write_event(
            file,
            "192.168.100.60",
            "SUCCESSFUL_LOGIN",
            "Normal user authentication"
        )
        time.sleep(0.5)

        write_event(
            file,
            "192.168.100.61",
            "SUCCESSFUL_LOGIN",
            "Normal user authentication"
        )
        time.sleep(0.5)

        write_event(
            file,
            "192.168.100.62",
            "FAILED_LOGIN",
            "Invalid password entered"
        )
        time.sleep(0.5)

        write_event(
            file,
            "192.168.100.62",
            "SUCCESSFUL_LOGIN",
            "Successful authentication after one failed attempt"
        )
        time.sleep(0.5)

        # =================================================
        # 2. BRUTE FORCE ATTACK (India)
        # =================================================

        print()
        print("▶ Generating brute-force attack (India: 19.0760, 72.8777)...")

        brute_force_ip = "192.168.100.50"

        for attempt in range(1, 6):

            write_event(
                file,
                brute_force_ip,
                "FAILED_LOGIN",
                f"Repeated failed authentication attempt {attempt}",
                country="India",
                latitude=19.0760,
                longitude=72.8777
            )

            time.sleep(0.5)

        # =================================================
        # 3. CREDENTIAL ATTACK (Germany)
        # =================================================

        print()
        print("▶ Generating credential attack (Germany: 52.5200, 13.4050)...")

        credential_ip = "192.168.100.51"

        for attempt in range(1, 6):

            write_event(
                file,
                credential_ip,
                "FAILED_LOGIN",
                f"Repeated failed authentication attempt {attempt}",
                country="Germany",
                latitude=52.5200,
                longitude=13.4050
            )

            time.sleep(0.5)

        write_event(
            file,
            credential_ip,
            "SUCCESSFUL_LOGIN",
            "Successful authentication after repeated failures",
            country="Germany",
            latitude=52.5200,
            longitude=13.4050
        )

        time.sleep(0.5)

        # =================================================
        # 4. ACCOUNT COMPROMISE (United States)
        # =================================================

        print()
        print("▶ Generating account compromise sequence (United States: 40.7128, -74.0060)...")

        compromise_ip = "192.168.100.52"

        for attempt in range(1, 6):

            write_event(
                file,
                compromise_ip,
                "FAILED_LOGIN",
                f"Repeated failed authentication attempt {attempt}",
                country="United States",
                latitude=40.7128,
                longitude=-74.0060
            )

            time.sleep(0.5)

        write_event(
            file,
            compromise_ip,
            "SUCCESSFUL_LOGIN",
            "Successful authentication after repeated failures",
            country="United States",
            latitude=40.7128,
            longitude=-74.0060
        )

        time.sleep(0.5)

        write_event(
            file,
            compromise_ip,
            "COMMAND_EXECUTION",
            "Suspicious command executed after authentication",
            country="United States",
            latitude=40.7128,
            longitude=-74.0060
        )

        time.sleep(0.5)

        # =================================================
        # 5. SUSPICIOUS COMMAND EXECUTION (No Location Supplied)
        # =================================================

        print()
        print("▶ Generating standalone suspicious command event (no location)...")

        command_ip = "192.168.100.53"

        write_event(
            file,
            command_ip,
            "COMMAND_EXECUTION",
            "Suspicious command execution detected"
        )

        time.sleep(0.5)

        # =================================================
        # 6. ANOTHER BRUTE FORCE SOURCE (Singapore)
        # =================================================

        print()
        print("▶ Generating second brute-force source (Singapore: 1.3521, 103.8198)...")

        brute_force_ip_2 = "192.168.100.54"

        for attempt in range(1, 6):

            write_event(
                file,
                brute_force_ip_2,
                "FAILED_LOGIN",
                f"Repeated failed authentication attempt {attempt}",
                country="Singapore",
                latitude=1.3521,
                longitude=103.8198
            )

            time.sleep(0.5)

    print()
    print("=" * 60)
    print("        SEEDING COMPLETE")
    print("=" * 60)
    print()
    print("Expected SIEM activity:")
    print()
    print("192.168.100.50 → BRUTE_FORCE       → Risk 40 / HIGH")
    print("192.168.100.51 → CREDENTIAL_ATTACK → Risk 60 / HIGH")
    print("192.168.100.52 → ACCOUNT_COMPROMISE → Risk 90 / CRITICAL")
    print("192.168.100.53 → COMMAND_EXECUTION  → Event only")
    print("192.168.100.54 → BRUTE_FORCE       → Risk 40 / HIGH")
    print()
    print("Dashboard should now contain events and incidents.")
    print()


if __name__ == "__main__":
    main()