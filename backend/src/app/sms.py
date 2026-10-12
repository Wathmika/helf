"""SMS companies. Sri Lankan mobiles go to a local gateway, others to Twilio."""
from __future__ import annotations

import httpx

from .config import Settings


class SmsError(Exception):
    pass


def _need(value: str, name: str) -> str:
    if not value:
        raise SmsError(f"{name} is not set")
    return value


def send_via_notifylk(s: Settings, digits: str, message: str, client: httpx.Client) -> None:
    r = client.post("https://app.notify.lk/api/v1/send", data={
        "user_id": _need(s.notifylk_user_id, "NOTIFYLK_USER_ID"),
        "api_key": _need(s.notifylk_api_key, "NOTIFYLK_API_KEY"),
        "sender_id": _need(s.notifylk_sender_id, "NOTIFYLK_SENDER_ID"),
        "to": digits,
        "message": message,
    })
    ok = r.status_code < 400 and _json(r).get("status") == "success"
    if not ok:
        raise SmsError(f"Notify.lk failed: HTTP {r.status_code}")


def send_via_textlk(s: Settings, digits: str, message: str, client: httpx.Client) -> None:
    r = client.get("https://app.text.lk/api/http/sms/send", params={
        "recipient": digits,
        "sender_id": _need(s.textlk_sender_id, "TEXTLK_SENDER_ID"),
        "message": message,
        "api_token": _need(s.textlk_api_token, "TEXTLK_API_TOKEN"),
    })
    status = _json(r).get("status")
    if r.status_code >= 400 or (status is not None and status != "success"):
        raise SmsError(f"Text.lk failed: HTTP {r.status_code}")


def send_via_twilio(s: Settings, digits: str, message: str, client: httpx.Client) -> None:
    sid = _need(s.twilio_account_sid, "TWILIO_ACCOUNT_SID")
    form = {"To": f"+{digits}", "Body": message}
    if s.twilio_messaging_service_sid:
        form["MessagingServiceSid"] = s.twilio_messaging_service_sid
    else:
        form["From"] = _need(s.twilio_from, "TWILIO_FROM")
    r = client.post(
        f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
        data=form,
        auth=(sid, _need(s.twilio_auth_token, "TWILIO_AUTH_TOKEN")),
    )
    if r.status_code >= 400:
        raise SmsError(f"Twilio failed: HTTP {r.status_code}")


def _json(r: httpx.Response) -> dict:
    try:
        data = r.json()
        return data if isinstance(data, dict) else {}
    except ValueError:
        return {}
