"""Endpoints only the database calls (never the public).

Each request must carry the shared secret in the x-internal-secret header.
The same secret values are stored in Supabase Vault (see the setup guide).
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ..alert_email import build_scan_email, send_with_ses
from ..config import Settings
from ..deps import get_supabase, settings
from ..security import secrets_match
from ..supabase_client import Supabase

log = logging.getLogger("internal")
router = APIRouter(prefix="/internal")


class NotifyIn(BaseModel):
    scan_id: int
    kind: str


@router.post("/notify-family")
def notify_family(
    body: NotifyIn,
    x_internal_secret: str | None = Header(default=None),
    db: Supabase = Depends(get_supabase),
    cfg: Settings = Depends(settings),
) -> JSONResponse:
    """A QR was scanned (or the scanner shared location): email the contacts.
    One email per contact, so contacts never see each other's addresses."""
    if not secrets_match(x_internal_secret, cfg.notify_family_secret):
        return JSONResponse({"error": "forbidden"}, status_code=403)
    if body.kind not in ("scan", "location"):
        return JSONResponse({"error": "bad kind"}, status_code=400)

    payload = db.rpc("scan_notification_payload", {"p_scan_id": body.scan_id, "p_kind": body.kind})
    if not payload.get("send"):
        return JSONResponse({"sent": 0, "reason": payload.get("reason")})

    email = build_scan_email(payload, cfg.app_name)
    sent = 0
    for i, recipient in enumerate(payload["recipients"], start=1):
        try:
            if cfg.email_dry_run:
                log.info("[dry run] would email scan %s (%s) alert to contact #%s", body.scan_id, body.kind, i)
            else:
                send_with_ses(cfg.ses_region, cfg.ses_from, recipient["email"], email)
            sent += 1
        except Exception as exc:  # one failed address mustn't stop the others
            log.error("alert email to contact #%s failed: %s", i, exc)

    if sent:
        db.rpc("mark_scan_notified", {"p_scan_id": body.scan_id, "p_kind": body.kind})
    return JSONResponse({"sent": sent, "of": len(payload["recipients"])})


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
