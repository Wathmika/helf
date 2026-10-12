"""The scan page: what opens when someone scans the QR code.

Built as finished HTML on the server, so it arrives in one trip and works
even if JavaScript fails. If anything goes wrong it still shows the
"call 1990" button, never a blank page.
"""
from __future__ import annotations

import logging
import re

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, JSONResponse, Response
from pydantic import BaseModel, Field

from ..config import Settings
from ..deps import get_supabase, settings
from ..scan_page import render_message_page, render_profile_page
from ..scan_text import pick_language
from ..security import new_nonce, scan_page_csp, visitor_key
from ..supabase_client import Supabase

log = logging.getLogger("scan")
router = APIRouter()

TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{24}$")
STATUS_PAGES = {"not_found": 404, "deactivated": 410, "rate_limited": 429}


def client_ip(request: Request, cfg: Settings) -> str:
    """The visitor's IP. Behind CloudFront, the real IP is in a header CloudFront
    adds itself (set TRUSTED_IP_HEADER); never trust X-Forwarded-For, which the
    visitor can fake to dodge the rate limit."""
    if cfg.trusted_ip_header:
        value = request.headers.get(cfg.trusted_ip_header, "")
        if value:
            # CloudFront-Viewer-Address is "<ip>:<port>"; drop the port
            return value.rsplit(":", 1)[0]
    return request.client.host if request.client else "unknown"


def _page(html: str, status_code: int, nonce: str, cfg: Settings) -> HTMLResponse:
    response = HTMLResponse(html, status_code=status_code)
    response.headers["Content-Security-Policy"] = scan_page_csp(nonce, cfg.supabase_url)
    response.headers["Cache-Control"] = "no-store, private"
    response.headers["X-Robots-Tag"] = "noindex, nofollow"
    return response


@router.get("/s/{token}", response_class=HTMLResponse)
def scan_page(
    token: str,
    request: Request,
    lang: str | None = None,
    s: str | None = None,
    db: Supabase = Depends(get_supabase),
    cfg: Settings = Depends(settings),
) -> HTMLResponse:
    language = pick_language(lang, request.headers.get("accept-language"))
    nonce = new_nonce()

    if not TOKEN_RE.fullmatch(token):
        return _page(render_message_page(language, nonce, "not_found", "not_found", "/s/invalid"), 404, nonce, cfg)
    base_path = f"/s/{token}"

    try:
        result = db.rpc("get_scan_profile", {
            "p_token": token,
            "p_client_key": visitor_key(client_ip(request, cfg), cfg.ip_hash_salt),
            "p_country": request.headers.get("cloudfront-viewer-country"),
            "p_existing_scan_id": int(s) if s and s.isdigit() else None,
        })
    except Exception:  # database unreachable: still show "call 1990"
        log.exception("get_scan_profile failed")
        return _page(render_message_page(language, nonce, "error", "unavailable", base_path), 503, nonce, cfg)

    status = (result or {}).get("status")
    if status != "ok":
        key = status if status in STATUS_PAGES else "not_found"
        return _page(render_message_page(language, nonce, key, key, base_path), STATUS_PAGES.get(key, 404), nonce, cfg)

    profile = result["profile"]
    photo_url = None
    if profile.get("photo_path"):
        try:
            photo_url = db.signed_photo_url(profile["photo_path"])
        except Exception:
            log.warning("could not sign photo url")

    html = render_profile_page(language, nonce, profile, result["scan_id"], photo_url, base_path)
    return _page(html, 200, nonce, cfg)


class LocationIn(BaseModel):
    scan_id: int = Field(gt=0)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    accuracy: int | None = Field(default=None, ge=0, le=100_000)


@router.post("/s/{token}/location")
def share_location(token: str, body: LocationIn, db: Supabase = Depends(get_supabase)) -> Response:
    if not TOKEN_RE.fullmatch(token):
        return JSONResponse({"error": "not found"}, status_code=404)
    try:
        accepted = db.rpc("add_scan_location", {
            "p_scan_id": body.scan_id, "p_token": token,
            "p_lat": body.lat, "p_lng": body.lng, "p_accuracy_m": body.accuracy,
        })
    except Exception:
        log.exception("add_scan_location failed")
        return JSONResponse({"error": "unavailable"}, status_code=503)
    if not accepted:
        return JSONResponse({"error": "not accepted"}, status_code=400)
    return Response(status_code=204)
