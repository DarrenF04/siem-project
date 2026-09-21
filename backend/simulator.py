from datetime import datetime
from pathlib import Path
from typing import Optional
import ipaddress
import random

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel


router = APIRouter(prefix="/simulate", tags=["Attack Simulator"])

# Project root
PROJECT_DIR = Path(__file__).resolve().parent.parent

# Existing SIEM log file
LOG_FILE = PROJECT_DIR / "logs" / "security.log"


class SimulationRequest(BaseModel):
    source_ip: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


def generate_simulation_ip() -> str:
    """
    Generate an RFC1918 private IP for controlled SIEM demonstration.
    """
    return f"192.168.100.{random.randint(10, 250)}"


def validate_source_ip(source_ip: str) -> str:
    """
    Only allow private IP addresses for the simulator.
    This ensures the simulator remains a controlled demo tool.
    """
    try:
        ip = ipaddress.ip_address(source_ip)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid source IP address"
        )

    if not ip.is_private:
        raise HTTPException(
            status_code=400,
            detail="Simulator only accepts private IP addresses"
        )

    return source_ip


def write_event(
    source_ip: str,
    event_type: str,
    details: str,
    country: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
):
    """
    Write one simulated security event using the same format
    consumed by the existing SIEM log watcher.
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    geo_suffix = ""
    if country is not None and latitude is not None and longitude is not None:
        geo_suffix = f" | {country} | {latitude} | {longitude}"

    log_line = (
        f"{timestamp} | {source_ip} | Simulator | "
        f"{event_type} | {details}"
        f"{geo_suffix}\n"
    )

    with open(LOG_FILE, "a", encoding="utf-8") as file:
        file.write(log_line)


def run_brute_force(
    source_ip: str,
    country: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
):
    """
    Generate five failed authentication attempts.
    Expected SIEM classification: BRUTE_FORCE
    """
    for attempt in range(1, 6):
        write_event(
            source_ip,
            "FAILED_LOGIN",
            f"Simulated failed authentication attempt {attempt}",
            country=country,
            latitude=latitude,
            longitude=longitude,
        )


def run_credential_attack(
    source_ip: str,
    country: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
):
    """
    Generate repeated failures followed by successful authentication.
    Expected SIEM classification: CREDENTIAL_ATTACK
    """
    for attempt in range(1, 6):
        write_event(
            source_ip,
            "FAILED_LOGIN",
            f"Simulated failed authentication attempt {attempt}",
            country=country,
            latitude=latitude,
            longitude=longitude,
        )

    write_event(
        source_ip,
        "SUCCESSFUL_LOGIN",
        "Simulated successful authentication after repeated failures",
        country=country,
        latitude=latitude,
        longitude=longitude,
    )


def run_account_compromise(
    source_ip: str,
    country: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
):
    """
    Generate a multi-stage sequence:
    failed logins -> successful login -> command execution.

    Expected SIEM classification: ACCOUNT_COMPROMISE
    """
    for attempt in range(1, 6):
        write_event(
            source_ip,
            "FAILED_LOGIN",
            f"Simulated failed authentication attempt {attempt}",
            country=country,
            latitude=latitude,
            longitude=longitude,
        )

    write_event(
        source_ip,
        "SUCCESSFUL_LOGIN",
        "Simulated successful authentication after repeated failures",
        country=country,
        latitude=latitude,
        longitude=longitude,
    )

    write_event(
        source_ip,
        "COMMAND_EXECUTION",
        "Simulated suspicious command execution after authentication",
        country=country,
        latitude=latitude,
        longitude=longitude,
    )


def run_command_execution(
    source_ip: str,
    country: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
):
    """
    Generate a suspicious command execution event.
    Expected SIEM classification:
    SUSPICIOUS_COMMAND_EXECUTION
    """
    write_event(
        source_ip,
        "COMMAND_EXECUTION",
        "Simulated suspicious command execution",
        country=country,
        latitude=latitude,
        longitude=longitude,
    )


def prepare_source_ip(request: SimulationRequest) -> str:
    if request.source_ip:
        return validate_source_ip(request.source_ip)

    return generate_simulation_ip()


@router.post("/brute-force")
def simulate_brute_force(
    request: SimulationRequest,
    background_tasks: BackgroundTasks
):
    source_ip = prepare_source_ip(request)

    background_tasks.add_task(
        run_brute_force,
        source_ip,
        request.country,
        request.latitude,
        request.longitude,
    )

    return {
        "message": "Brute-force simulation started",
        "scenario": "BRUTE_FORCE",
        "source_ip": source_ip,
        "country": request.country,
        "latitude": request.latitude,
        "longitude": request.longitude,
        "events_generated": 5
    }


@router.post("/credential-attack")
def simulate_credential_attack(
    request: SimulationRequest,
    background_tasks: BackgroundTasks
):
    source_ip = prepare_source_ip(request)

    background_tasks.add_task(
        run_credential_attack,
        source_ip,
        request.country,
        request.latitude,
        request.longitude,
    )

    return {
        "message": "Credential attack simulation started",
        "scenario": "CREDENTIAL_ATTACK",
        "source_ip": source_ip,
        "country": request.country,
        "latitude": request.latitude,
        "longitude": request.longitude,
        "events_generated": 6
    }


@router.post("/account-compromise")
def simulate_account_compromise(
    request: SimulationRequest,
    background_tasks: BackgroundTasks
):
    source_ip = prepare_source_ip(request)

    background_tasks.add_task(
        run_account_compromise,
        source_ip,
        request.country,
        request.latitude,
        request.longitude,
    )

    return {
        "message": "Account compromise simulation started",
        "scenario": "ACCOUNT_COMPROMISE",
        "source_ip": source_ip,
        "country": request.country,
        "latitude": request.latitude,
        "longitude": request.longitude,
        "events_generated": 7
    }


@router.post("/command-execution")
def simulate_command_execution(
    request: SimulationRequest,
    background_tasks: BackgroundTasks
):
    source_ip = prepare_source_ip(request)

    background_tasks.add_task(
        run_command_execution,
        source_ip,
        request.country,
        request.latitude,
        request.longitude,
    )

    return {
        "message": "Command execution simulation started",
        "scenario": "SUSPICIOUS_COMMAND_EXECUTION",
        "source_ip": source_ip,
        "country": request.country,
        "latitude": request.latitude,
        "longitude": request.longitude,
        "events_generated": 1
    }
@router.get("/scenarios")
def get_simulation_scenarios():
    return {
        "scenarios": [
            {
                "id": "brute-force",
                "name": "Brute Force",
                "description": "Simulates repeated failed authentication attempts.",
                "events_generated": 5,
                "expected_classification": "BRUTE_FORCE"
            },
            {
                "id": "credential-attack",
                "name": "Credential Attack",
                "description": "Simulates repeated failures followed by successful authentication.",
                "events_generated": 6,
                "expected_classification": "CREDENTIAL_ATTACK"
            },
            {
                "id": "account-compromise",
                "name": "Account Compromise",
                "description": "Simulates failed logins followed by successful authentication and command execution.",
                "events_generated": 7,
                "expected_classification": "ACCOUNT_COMPROMISE"
            },
            {
                "id": "command-execution",
                "name": "Suspicious Command Execution",
                "description": "Simulates suspicious command execution from a source IP.",
                "events_generated": 1,
                "expected_classification": "SUSPICIOUS_COMMAND_EXECUTION"
            }
        ]
    }