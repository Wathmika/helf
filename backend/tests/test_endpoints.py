"""Every endpoint, with a fake Supabase."""
from __future__ import annotations

import base64
import re
from datetime import datetime, timezone

from standardwebhooks.webhooks import Webhook

from conftest import HOOK_KEY, SUNIL_TOKEN


# ---- scan page ---------------------------------------------------------------
def test_scan_page_shows_essentials(client, fake):
    r = client.get(f"/s/{SUNIL_TOKEN}", headers={"accept-language": "en"})
    assert r.status_code == 200
    page = r.text
    for expected in ("Sunil Perera", "Age 72", "Takes blood thinners", "Warfarin", "Penicillin",
                     'href="tel:1990"', 'href="tel:+971500000000"', "Call Kasun (son)", "Organ donor",
                     "not medical advice"):
        assert expected in page, expected
    # medicines are private by default, and must not appear
    assert "Metformin" not in page and "Current medicines" not in page
    # the visitor key is a hash, never the IP
    args = fake.calls[0][1]
    assert args["p_token"] == SUNIL_TOKEN and len(args["p_client_key"]) == 32 and args["p_existing_scan_id"] is None


def test_scan_page_security_headers_and_nonce(client):
    r = client.get(f"/s/{SUNIL_TOKEN}")
    csp = r.headers["content-security-policy"]
    nonce = re.search(r"'nonce-([^']+)'", csp).group(1)
    assert f'<style nonce="{nonce}">' in r.text and f'<script nonce="{nonce}">' in r.text
    assert "https:" not in csp.replace("https://ref.supabase.co", "")      # no blanket https:
    assert "unsafe-inline" not in csp
    assert r.headers["cache-control"].startswith("no-store")
    assert r.headers["x-robots-tag"] == "noindex, nofollow"
    assert r.headers["referrer-policy"] == "no-referrer"
    # a new nonce every time
    assert re.search(r"'nonce-([^']+)'", client.get(f"/s/{SUNIL_TOKEN}").headers["content-security-policy"]).group(1) != nonce


def test_scan_page_in_sinhala_and_tamil(client):
    si = client.get(f"/s/{SUNIL_TOKEN}?lang=si").text
    assert '<html lang="si">' in si and "1990 ගිලන් රථයට අමතන්න" in si and "පුතා" in si
    ta = client.get(f"/s/{SUNIL_TOKEN}", headers={"accept-language": "ta-LK"}).text
    assert '<html lang="ta">' in ta and "முக்கிய எச்சரிக்கைகள்" in ta


def test_language_switch_reuses_the_scan(client, fake):
    page = client.get(f"/s/{SUNIL_TOKEN}").text
    assert f"/s/{SUNIL_TOKEN}?lang=ta&amp;s=7" in page
    client.get(f"/s/{SUNIL_TOKEN}?lang=ta&s=7")
    assert fake.calls[-1][1]["p_existing_scan_id"] == 7


def test_family_typed_text_is_escaped(client, fake):
    profile = fake.answers["get_scan_profile"]["profile"]
    profile["name"] = '<script>alert("x")</script>'
    profile["alerts"][0]["note"] = "<img src=x onerror=alert(1)>"
    page = client.get(f"/s/{SUNIL_TOKEN}").text
    assert '<script>alert("x")</script>' not in page and "<img src=x" not in page
    assert "&lt;script&gt;" in page


def test_lost_person_mode(client, fake):
    profile = fake.answers["get_scan_profile"]["profile"]
    profile.update(lost_person_mode=True, home_area="Nugegoda")
    page = client.get(f"/s/{SUNIL_TOKEN}?lang=en").text
    assert "may be lost or confused" in page and "Lives near: Nugegoda" in page


def test_photo_uses_short_lived_link(client, fake):
    fake.answers["get_scan_profile"]["profile"]["photo_path"] = "abc/profile.jpg"
    page = client.get(f"/s/{SUNIL_TOKEN}").text
    assert 'src="https://ref.supabase.co/storage/v1/object/sign/person-photos/abc/profile.jpg?token=x"' in page


def test_old_information_warning(client, fake):
    fake.answers["get_scan_profile"]["profile"]["updated_at"] = "2024-01-01T00:00:00Z"
    assert "details may be out of date" in client.get(f"/s/{SUNIL_TOKEN}?lang=en").text


def test_status_pages_always_offer_1990(client, fake):
    for status, code, words in (("not_found", 404, "recognised"), ("deactivated", 410, "replaced by its owner"),
                                ("rate_limited", 429, "Too many requests")):
        fake.answers["get_scan_profile"] = {"status": status}
        r = client.get(f"/s/{SUNIL_TOKEN}?lang=en")
        assert r.status_code == code and words in r.text and 'href="tel:1990"' in r.text


def test_bad_token_never_reaches_database(client, fake):
    r = client.get("/s/short")
    assert r.status_code == 404 and 'href="tel:1990"' in r.text and fake.calls == []


def test_database_down_still_shows_1990(client, fake):
    fake.fail.add("get_scan_profile")
    r = client.get(f"/s/{SUNIL_TOKEN}?lang=en")
    assert r.status_code == 503 and "be loaded right now" in r.text and 'href="tel:1990"' in r.text


# ---- share location ------------------------------------------------------------
def test_share_location(client, fake):
    fake.answers["add_scan_location"] = True
    r = client.post(f"/s/{SUNIL_TOKEN}/location", json={"scan_id": 7, "lat": 6.912, "lng": 79.861, "accuracy": 20})
    assert r.status_code == 204
    assert fake.calls[-1] == ("add_scan_location", {"p_scan_id": 7, "p_token": SUNIL_TOKEN, "p_lat": 6.912,
                                                    "p_lng": 79.861, "p_accuracy_m": 20})
    fake.answers["add_scan_location"] = False
    assert client.post(f"/s/{SUNIL_TOKEN}/location", json={"scan_id": 7, "lat": 1, "lng": 1}).status_code == 400
    assert client.post(f"/s/{SUNIL_TOKEN}/location", json={"scan_id": 7, "lat": 95, "lng": 1}).status_code == 422


# ---- send-sms hook -------------------------------------------------------------
def _signed(phone: str, key: str = HOOK_KEY):
    body = '{"user":{"phone":"%s"},"sms":{"otp":"123456"}}' % phone
    now = datetime.now(timezone.utc)
    headers = {"webhook-id": "msg_1", "webhook-timestamp": str(int(now.timestamp())),
               "webhook-signature": Webhook(key).sign("msg_1", now, body), "content-type": "application/json"}
    return body, headers


def test_send_sms_hook(client, caplog):
    caplog.set_level("INFO")
    for phone, code in (("94770000001", 200), ("+971500000000", 200), ("94112345678", 400), ("2348000000000", 400)):
        body, headers = _signed(phone)
        assert client.post("/hooks/send-sms", content=body, headers=headers).status_code == code, phone
    assert "123456" not in caplog.text                      # the code is never logged
    assert "9477*****01" in caplog.text and "via notifylk" in caplog.text and "via twilio" in caplog.text


def test_send_sms_rejects_wrong_signature(client):
    body, headers = _signed("94770000001", key=base64.b64encode(b"x" * 32).decode())
    r = client.post("/hooks/send-sms", content=body, headers=headers)
    assert r.status_code == 401 and r.json()["error"]["message"] == "Invalid signature"


# ---- notify-family ---------------------------------------------------------------
PAYLOAD = {"send": True, "reason": None, "kind": "scan", "person_name": "Sunil Perera",
           "scanned_at": "2026-10-12T05:12:00Z", "lat": None, "lng": None, "accuracy_m": None,
           "recipients": [{"name": "Kasun", "email": "kasun@example.com"}, {"name": "Nadeesha", "email": "n@example.com"}]}


def test_notify_family(client, fake, caplog):
    caplog.set_level("INFO")
    fake.answers["scan_notification_payload"] = PAYLOAD
    r = client.post("/internal/notify-family", json={"scan_id": 7, "kind": "scan"},
                    headers={"x-internal-secret": "notify-secret"})
    assert r.json() == {"sent": 2, "of": 2}
    assert fake.calls[-1] == ("mark_scan_notified", {"p_scan_id": 7, "p_kind": "scan"})
    assert "kasun@example.com" not in caplog.text       # no addresses in logs


def test_notify_family_skips_when_database_says_no(client, fake):
    fake.answers["scan_notification_payload"] = {"send": False, "reason": "throttled"}
    r = client.post("/internal/notify-family", json={"scan_id": 7, "kind": "scan"},
                    headers={"x-internal-secret": "notify-secret"})
    assert r.json() == {"sent": 0, "reason": "throttled"}
    assert "mark_scan_notified" not in [c[0] for c in fake.calls]


def test_internal_endpoints_need_the_secret(client, fake):
    assert client.post("/internal/notify-family", json={"scan_id": 7, "kind": "scan"}).status_code == 403
    assert client.post("/internal/notify-family", json={"scan_id": 7, "kind": "scan"},
                       headers={"x-internal-secret": "purge-secret"}).status_code == 403
    assert client.post("/internal/purge-files", headers={"x-internal-secret": "wrong"}).status_code == 403
    assert fake.calls == []


# ---- purge-files ----------------------------------------------------------------
def test_purge_files(client, fake):
    fake.answers["next_file_purges"] = [{"person_id": "p1", "object_names": ["p1/profile.jpg", "p1/medicines/m.jpg"]},
                                        {"person_id": "p2", "object_names": []}]
    fake.answers["complete_file_purge"] = True
    r = client.post("/internal/purge-files", headers={"x-internal-secret": "purge-secret"})
    assert r.json() == {"processed": 2, "completed": 2}
    assert fake.removed == [("person-photos", ["p1/profile.jpg", "p1/medicines/m.jpg"])]


# ---- account deletion ---------------------------------------------------------------
def test_delete_account(client, fake):
    fake.user = {"id": "user-1"}
    fake.answers["prepare_account_deletion"] = {"profiles_handed_over": 1, "profiles_deleted": 1}
    assert client.post("/account/delete", json={"confirm": "DELETE MY ACCOUNT"}).status_code == 401
    assert client.post("/account/delete", json={"confirm": "yes"},
                       headers={"authorization": "Bearer good-user-token"}).status_code == 400
    r = client.post("/account/delete", json={"confirm": "DELETE MY ACCOUNT"},
                    headers={"authorization": "Bearer good-user-token"})
    assert r.json() == {"deleted": True, "profiles_handed_over": 1, "profiles_deleted": 1}
    assert fake.deleted_users == ["user-1"]


def test_cors_only_for_the_app(client):
    ok = client.options("/account/delete", headers={"origin": "http://localhost:5173", "access-control-request-method": "POST"})
    bad = client.options("/account/delete", headers={"origin": "https://evil.example", "access-control-request-method": "POST"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert "access-control-allow-origin" not in bad.headers


def test_health_and_api_headers(client):
    r = client.get("/health")
    assert r.json() == {"status": "ok"}
    assert r.headers["content-security-policy"].startswith("default-src 'none'")
    assert r.headers["x-content-type-options"] == "nosniff"
