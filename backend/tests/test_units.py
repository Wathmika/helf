"""Small pure functions: phone rules, webhook signatures, email text, freshness."""
from __future__ import annotations

import base64
import time
from datetime import datetime, timezone

import pytest

from app.alert_email import build_scan_email, format_sri_lanka_time
from app.phone import is_allowed_country, is_sri_lankan_mobile, mask_phone, normalize_phone, otp_message
from app.config import DEFAULT_ALLOWED_COUNTRY_CODES
from app.scan_page import updated_text
from app.scan_text import TEXT, pick_language
from app.security import WebhookVerificationError, verify_standard_webhook, visitor_key


# ---- phone ------------------------------------------------------------------
def test_normalizes_phone_formats():
    assert normalize_phone("+94 77 000 0000") == "94770000000"
    assert normalize_phone("0094770000000") == "94770000000"
    assert normalize_phone("+971-50-000-0000") == "971500000000"


def test_sri_lankan_mobile_rule():
    assert is_sri_lankan_mobile("94770000000")
    assert not is_sri_lankan_mobile("94112345678")   # Colombo landline
    assert not is_sri_lankan_mobile("9477000000")    # too short


def test_country_allowlist():
    assert is_allowed_country("971500000000", DEFAULT_ALLOWED_COUNTRY_CODES)
    assert not is_allowed_country("2348000000000", DEFAULT_ALLOWED_COUNTRY_CODES)


def test_otp_message_is_one_plain_sms():
    msg = otp_message("123456", "MediQR")
    assert len(msg) <= 160 and msg.isascii()


def test_mask_phone():
    assert mask_phone("94770000012") == "9477*****12"


# ---- webhook signature (cross-checked against the official library) ---------
def test_accepts_signature_made_by_official_library():
    from standardwebhooks.webhooks import Webhook

    key = base64.b64encode(b"k" * 32).decode()
    body = b'{"user":{"phone":"94770000001"},"sms":{"otp":"123456"}}'
    now = datetime.now(timezone.utc)
    signature = Webhook(key).sign("msg_1", now, body.decode())
    headers = {"webhook-id": "msg_1", "webhook-timestamp": str(int(now.timestamp())), "webhook-signature": signature}
    assert verify_standard_webhook(f"v1,whsec_{key}", headers, body)["sms"]["otp"] == "123456"


def test_rejects_tampered_or_old_webhooks():
    from standardwebhooks.webhooks import Webhook

    key = base64.b64encode(b"k" * 32).decode()
    body = b'{"a":1}'
    now = datetime.now(timezone.utc)
    sig = Webhook(key).sign("m", now, body.decode())
    headers = {"webhook-id": "m", "webhook-timestamp": str(int(now.timestamp())), "webhook-signature": sig}
    with pytest.raises(WebhookVerificationError):
        verify_standard_webhook(f"v1,whsec_{key}", headers, b'{"a":2}')
    with pytest.raises(WebhookVerificationError):
        verify_standard_webhook(f"v1,whsec_{key}", headers, body, now=time.time() + 3600)


# ---- visitor key -------------------------------------------------------------
def test_visitor_key_hides_ip_and_changes_daily():
    d1 = datetime(2026, 10, 12, tzinfo=timezone.utc)
    d2 = datetime(2026, 10, 13, tzinfo=timezone.utc)
    k1 = visitor_key("203.0.113.5", "salt", d1)
    assert "203" not in k1 and len(k1) == 32
    assert k1 != visitor_key("203.0.113.5", "salt", d2)
    assert k1 == visitor_key("203.0.113.5", "salt", d1)


# ---- email ------------------------------------------------------------------
BASE = {"person_name": "Sunil Perera", "scanned_at": "2026-10-12T05:12:00Z", "lat": None, "lng": None, "accuracy_m": None}


def test_email_time_is_sri_lanka_time():
    assert "10:42 am" in format_sri_lanka_time(BASE["scanned_at"])


def test_scan_email_has_no_health_details_or_map():
    e = build_scan_email({**BASE, "kind": "scan"}, "MediQR")
    assert "Sunil Perera" in e.subject and "1990" in e.text
    assert "google.com/maps" not in e.text
    for word in ("warfarin", "insulin", "penicillin"):
        assert word not in (e.text + e.html).lower()


def test_location_email_has_map_link_and_honest_accuracy():
    e = build_scan_email({**BASE, "kind": "location", "lat": 6.912, "lng": 79.861, "accuracy_m": 20}, "MediQR")
    assert "https://www.google.com/maps/search/?api=1&query=6.912,79.861" in e.text
    assert "about 100 m" in e.text


def test_email_escapes_names():
    e = build_scan_email({**BASE, "kind": "scan", "person_name": "<img src=x onerror=alert(1)>"}, "MediQR")
    assert "<img" not in e.html and "&lt;img" in e.html


# ---- scan page bits -----------------------------------------------------------
def test_language_choice():
    assert pick_language("ta", "en-US") == "ta"
    assert pick_language(None, "si-LK,en;q=0.8") == "si"
    assert pick_language(None, "en-GB,en;q=0.9") == "en"
    assert pick_language("xx", None) == "en"


def test_all_languages_have_every_phrase():
    for lang in ("si", "ta"):
        assert set(TEXT[lang]) == set(TEXT["en"]), f"{lang} is missing phrases"


def test_freshness_text():
    now = datetime(2026, 10, 24, tzinfo=timezone.utc)
    assert updated_text("en", "2026-10-12T00:00:00Z", now) == {"text": "Updated 12 days ago", "old": False}
    assert updated_text("en", "2025-01-01T00:00:00Z", now)["old"] is True
