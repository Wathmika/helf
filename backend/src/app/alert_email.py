"""The scan-alert email, and sending it with Amazon SES.

The email deliberately contains NO health details: only the person's name,
the time, and (if the person who scanned chose to share it) a map link.
"""
from __future__ import annotations

import html
from dataclasses import dataclass
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

COLOMBO = ZoneInfo("Asia/Colombo")


@dataclass
class Email:
    subject: str
    text: str
    html: str


def format_sri_lanka_time(iso: str) -> str:
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(COLOMBO)
    hour = dt.hour % 12 or 12
    ampm = "am" if dt.hour < 12 else "pm"
    return f"{dt:%a} {dt.day} {dt:%b}, {hour}:{dt:%M} {ampm} (Sri Lanka time)"


def map_link(lat: float, lng: float) -> str:
    return f"https://www.google.com/maps/search/?api=1&query={lat},{lng}"


def build_scan_email(p: dict[str, Any], app_name: str) -> Email:
    name = p["person_name"]
    when = format_sri_lanka_time(p["scanned_at"])
    lat, lng = p.get("lat"), p.get("lng")
    link = map_link(lat, lng) if lat is not None and lng is not None else None
    accuracy = p.get("accuracy_m")
    accuracy_text = f" (accurate to about {max(100, int(accuracy))} m)" if accuracy else " (approximate)"

    if p["kind"] == "location":
        subject = f"Location shared: {name}'s emergency QR"
        lines = [f"The person who scanned {name}'s emergency QR at {when} shared their location{accuracy_text}:"]
    else:
        subject = f"Alert: {name}'s emergency QR was scanned"
        lines = [
            f"{name}'s emergency QR was scanned at {when}.",
            f"This can mean someone is helping {name} in an emergency, or it may be a test or an accidental scan.",
        ]

    advice = (f"What to do: try calling {name} now. If you can't reach them and you're worried, "
              "call 1990 (Suwa Seriya ambulance) or the police on 119.")
    footer = [f"You are receiving this because you are listed as an emergency contact on {app_name}.",
              "Reply to this email if you no longer want these alerts."]

    text_parts = lines + ([link] if link and p["kind"] == "location" else []) + ["", advice, "", *footer]
    text = "\n".join(text_parts)

    e = html.escape
    html_parts = [f"<p>{e(line)}</p>" for line in lines]
    if link and p["kind"] == "location":
        html_parts.append(f'<p><a href="{e(link)}">Open the location in Google Maps</a></p>')
    body = (
        '<!doctype html><html><body style="font-family:Arial,sans-serif;font-size:16px;color:#1F2937;line-height:1.5">'
        + "".join(html_parts)
        + f"<p><strong>{e(advice)}</strong></p>"
        + f'<p style="color:#6B7280;font-size:14px">{e(footer[0])}<br>{e(footer[1])}</p>'
        + "</body></html>"
    )
    return Email(subject=subject, text=text, html=body)


def send_with_ses(region: str, sender: str, to: str, email: Email) -> None:
    # Imported here, not at the top, so the scan page doesn't pay boto3's
    # start-up time on a cold Lambda.
    import boto3

    client = boto3.client("sesv2", region_name=region)
    client.send_email(
        FromEmailAddress=sender,
        Destination={"ToAddresses": [to]},
        Content={"Simple": {
            "Subject": {"Data": email.subject, "Charset": "UTF-8"},
            "Body": {
                "Text": {"Data": email.text, "Charset": "UTF-8"},
                "Html": {"Data": email.html, "Charset": "UTF-8"},
            },
        }},
    )
