"""Scan-alert SMS: the family's primary alert channel.

SMS is checked far more reliably than email in an emergency, so this is the
channel every contact with a phone number gets (email is a bonus for
contacts who also have one -- see routes/internal.py). Kept to one GSM
segment (160 characters) wherever possible: the OTP message pattern already
proved this is cheap and reliable, so alerts follow the same shape.

No health details: only the person's name, that their QR was scanned (or
location shared), and what to do.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

COLOMBO = ZoneInfo("Asia/Colombo")


def _time_short(iso: str) -> str:
    """'Tue 3:14pm' -- short enough to leave room for the rest of the message."""
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(COLOMBO)
    hour = dt.hour % 12 or 12
    ampm = "am" if dt.hour < 12 else "pm"
    return f"{dt:%a} {hour}:{dt:%M}{ampm}"


def map_link(lat: float, lng: float) -> str:
    # Same short query-style link as the email alert (alert_email.map_link),
    # so a contact who gets both sees the same thing. ~45 chars: plenty of
    # room left in a single 160-character SMS segment.
    return f"https://maps.google.com/?q={lat},{lng}"


def scan_alert_sms(app_name: str, person_name: str, scanned_at: str) -> str:
    when = _time_short(scanned_at)
    return (
        f"{app_name}: {person_name}'s emergency QR was scanned {when}. "
        f"Try calling {person_name} now. If you can't reach them, call 1990 (ambulance)."
    )


def location_alert_sms(app_name: str, person_name: str, lat: float, lng: float) -> str:
    link = map_link(lat, lng)
    return f"{app_name}: location shared for {person_name}. {link} Call 1990 if needed."