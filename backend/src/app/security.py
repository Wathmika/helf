"""Security helpers: shared secrets, webhook signatures, visitor keys, headers."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from datetime import datetime, timezone
from typing import Any, Mapping


def secrets_match(given: str | None, expected: str) -> bool:
    """Constant-time comparison, so a secret can't be guessed by timing."""
    if not expected:
        return False
    return hmac.compare_digest((given or "").encode(), expected.encode())


class WebhookVerificationError(Exception):
    pass


def verify_standard_webhook(
    secret: str, headers: Mapping[str, str], body: bytes, tolerance_seconds: int = 300, now: float | None = None
) -> Any:
    """Check a "Standard Webhooks" signature (what Supabase Auth hooks use).

    The secret looks like "v1,whsec_<base64>". The signature is an HMAC-SHA256
    of "<webhook-id>.<webhook-timestamp>.<body>". Returns the parsed JSON body.
    """
    key_b64 = secret.removeprefix("v1,").removeprefix("whsec_")
    try:
        key = base64.b64decode(key_b64)
    except ValueError as exc:
        raise WebhookVerificationError("bad secret") from exc
    if not key:
        raise WebhookVerificationError("no secret configured")

    msg_id = headers.get("webhook-id")
    timestamp = headers.get("webhook-timestamp")
    signatures = headers.get("webhook-signature")
    if not (msg_id and timestamp and signatures):
        raise WebhookVerificationError("missing headers")
    try:
        ts = int(timestamp)
    except ValueError as exc:
        raise WebhookVerificationError("bad timestamp") from exc
    if abs((now or time.time()) - ts) > tolerance_seconds:
        raise WebhookVerificationError("timestamp too old or in the future")

    signed = f"{msg_id}.{timestamp}.".encode() + body
    expected = base64.b64encode(hmac.new(key, signed, hashlib.sha256).digest()).decode()
    for part in signatures.split(" "):
        version, _, sig = part.partition(",")
        if version == "v1" and hmac.compare_digest(sig, expected):
            return json.loads(body)
    raise WebhookVerificationError("signature mismatch")


def visitor_key(ip: str, salt: str, today: datetime | None = None) -> str:
    """Turn a visitor's IP into an anonymous rate-limit key.

    Salted and mixed with the date, so the database never sees the IP and the
    key can't be linked across days.
    """
    day = (today or datetime.now(timezone.utc)).strftime("%Y-%m-%d")
    return hmac.new(salt.encode(), f"{ip}|{day}".encode(), hashlib.sha256).hexdigest()[:32]


def new_nonce() -> str:
    return secrets.token_urlsafe(18)


BASE_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
}

API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"


def scan_page_csp(nonce: str, supabase_url: str) -> str:
    """Strict policy for the scan page: only our own inline code (with this
    request's nonce), photos from our Supabase project, and requests back to us."""
    return "; ".join([
        "default-src 'none'",
        f"script-src 'nonce-{nonce}'",
        f"style-src 'nonce-{nonce}'",
        f"img-src 'self' data: {supabase_url}",
        "connect-src 'self'",
        "base-uri 'none'",
        "form-action 'none'",
        "frame-ancestors 'none'",
    ])
