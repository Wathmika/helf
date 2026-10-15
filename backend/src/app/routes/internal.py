"""Endpoints only the database calls (never the public).

Each request must carry the shared secret in the x-internal-secret header.
The same secret values are stored in Supabase Vault (see the setup guide).
"""
from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, Depends, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ..alert_email import build_scan_email, send_with_ses
from ..alert_sms import location_alert_sms, scan_alert_sms
from ..config import Settings
from ..deps import get_supabase, settings
from ..phone import is_allowed_country, is_sri_lankan, is_sri_lankan_mobile, mask_phone, normalize_phone
from ..security import secrets_match
from ..sms import SmsError, send_via_notifylk, send_via_textlk, send_via_twilio
from ..supabase_client import Supabase

log = logging.getLogger("internal")
router = APIRouter(prefix="/internal")


class NotifyIn(BaseModel):
    scan_id: int
    kind: str


def _send_alert_sms(cfg: Settings, digits: str, message: str) -> None:
    """Same routing as the OTP hook: Sri Lankan mobiles -> local gateway,
    allowed overseas numbers -> Twilio. Raises on failure; callers decide
    whether that should stop anything else."""
    if not is_allowed_country(digits, cfg.allowed_sms_country_codes):
        raise SmsError(f"country not allowed for {mask_phone(digits)}")
    if is_sri_lankan(digits) and not is_sri_lankan_mobile(digits):
        raise SmsError(f"not a Sri Lankan mobile: {mask_phone(digits)}")

    route = cfg.lk_sms_provider if is_sri_lankan(digits) else "twilio"
    if cfg.sms_dry_run:
        log.info("[dry run] would SMS alert via %s to %s", route, mask_phone(digits))
        return

    sender = {"notifylk": send_via_notifylk, "textlk": send_via_textlk, "twilio": send_via_twilio}.get(route)
    if sender is None:
        raise SmsError(f"unknown LK_SMS_PROVIDER {route!r}")
    with httpx.Client(timeout=8.0) as client:
        sender(cfg, digits, message, client)


@router.post("/notify-family")
def notify_family(
    body: NotifyIn,
    x_internal_secret: str | None = Header(default=None),
    db: Supabase = Depends(get_supabase),
    cfg: Settings = Depends(settings),
) -> JSONResponse:
    """A QR was scanned (or the scanner shared location): tell the contacts.

    SMS is the primary channel -- checked far more reliably than email in an
    emergency -- sent to every contact with a phone number (all of them: the
    column is required). Email goes too, to whichever contacts also have one
    on file. The two channels are independent: one failing doesn't stop the
    other, and a contact with only a phone still gets notified."""
    if not secrets_match(x_internal_secret, cfg.notify_family_secret):
        return JSONResponse({"error": "forbidden"}, status_code=403)
    if body.kind not in ("scan", "location"):
        return JSONResponse({"error": "bad kind"}, status_code=400)

    payload = db.rpc("scan_notification_payload", {"p_scan_id": body.scan_id, "p_kind": body.kind})
    if not payload.get("send"):
        return JSONResponse({"sms_sent": 0, "email_sent": 0, "reason": payload.get("reason")})

    if body.kind == "location" and payload.get("lat") is not None and payload.get("lng") is not None:
        sms_text = location_alert_sms(cfg.app_name, payload["person_name"], payload["lat"], payload["lng"])
    else:
        sms_text = scan_alert_sms(cfg.app_name, payload["person_name"], payload["scanned_at"])
    email = build_scan_email(payload, cfg.app_name)

    sms_sent = 0
    email_sent = 0
    for i, recipient in enumerate(payload["recipients"], start=1):
        phone = recipient.get("phone")
        if phone:
            try:
                _send_alert_sms(cfg, normalize_phone(phone), sms_text)
                sms_sent += 1
            except (SmsError, httpx.HTTPError) as exc:
                log.error("alert SMS to contact #%s failed: %s", i, exc)

        if recipient.get("email"):
            try:
                if cfg.email_dry_run:
                    log.info("[dry run] would email scan %s (%s) alert to contact #%s", body.scan_id, body.kind, i)
                else:
                    send_with_ses(cfg.ses_region, cfg.ses_from, recipient["email"], email)
                email_sent += 1
            except Exception as exc:  # one failed address mustn't stop the others
                log.error("alert email to contact #%s failed: %s", i, exc)

    if sms_sent or email_sent:
        db.rpc("mark_scan_notified", {"p_scan_id": body.scan_id, "p_kind": body.kind})
    return JSONResponse({
        "sms_sent": sms_sent, "email_sent": email_sent, "of": len(payload["recipients"]),
    })


@router.post("/purge-files")
def purge_files(
    x_internal_secret: str | None = Header(default=None),
    db: Supabase = Depends(get_supabase),
    cfg: Settings = Depends(settings),
) -> JSONResponse:
    """Removes photo files of deleted people (run every 15 minutes)."""
    if not secrets_match(x_internal_secret, cfg.purge_files_secret):
        return JSONResponse({"error": "forbidden"}, status_code=403)

    rows = db.rpc("next_file_purges", {"p_limit": 20}) or []
    completed = 0
    for row in rows:
        try:
            if row["object_names"]:
                db.remove_files("person-photos", row["object_names"])
            if db.rpc("complete_file_purge", {"p_person_id": row["person_id"]}):
                completed += 1
        except Exception as exc:
            log.error("purge for %s failed: %s", row["person_id"], exc)
    return JSONResponse({"processed": len(rows), "completed": completed})