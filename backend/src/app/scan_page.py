"""Turns the database's scan answer into the scan page.

Kept separate from the web routes so it can be tested on its own.
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

from .scan_text import LANGS, SPEECH_LANG, t

_env = Environment(
    loader=FileSystemLoader(Path(__file__).parent / "templates"),
    autoescape=select_autoescape(["html"]),   # everything a family typed is escaped
    trim_blocks=True,
    lstrip_blocks=True,
)
_template = _env.get_template("scan.html")

PHONE_ICON = ('<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M6.6 10.8a15.1 15.1 '
              '0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 '
              '1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>')

LANG_BUTTON_LABELS = {"si": "සිං", "ta": "தமி", "en": "EN"}


def updated_text(lang: str, updated_at: str | None, now: datetime | None = None) -> dict[str, Any]:
    if not updated_at:
        return {"text": t(lang, "updated_old"), "old": True}
    when = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
    days = max(0, ((now or datetime.now(timezone.utc)) - when).days)
    if days >= 365:
        return {"text": t(lang, "updated_old"), "old": True}
    if days == 0:
        return {"text": t(lang, "updated_today"), "old": False}
    if days < 60:
        return {"text": t(lang, "updated_days", n=days), "old": False}
    return {"text": t(lang, "updated_months", n=days // 30), "old": False}


def render_message_page(lang: str, nonce: str, status: str, message_key: str, base_path: str) -> str:
    return _template.render(
        lang=lang, nonce=nonce, status=status, message=t(lang, message_key),
        t=lambda key, **kw: t(lang, key, **kw), lang_links=_lang_links(lang, base_path, None), phone_icon=PHONE_ICON,
    )


def render_profile_page(
    lang: str, nonce: str, profile: dict[str, Any], scan_id: int, photo_url: str | None,
    base_path: str, now: datetime | None = None,
) -> str:
    tr = lambda key, **kw: t(lang, key, **kw)  # noqa: E731

    alerts = [{"label": tr(f"alert_{a['code']}"), "note": a.get("note")} for a in profile.get("alerts", [])]

    contacts = [{
        "label": tr("call_contact", name=c["name"], relationship=tr(f"rel_{c['relationship']}")),
        "phone": c["phone"],
    } for c in profile.get("contacts", [])]

    allergies = [{
        "substance": al["substance"],
        "severity": tr(f"sev_{al.get('severity', 'unknown')}"),
        "reaction": al.get("reaction"),
    } for al in profile.get("allergies", [])]

    conditions = [
        c["name"] + (f" ({tr('since', year=c['since_year'])})" if c.get("since_year") else "")
        for c in profile.get("conditions", [])
    ]

    medicines = [
        " ".join(x for x in (m["name"], m.get("dose"), m.get("frequency")) if x)
        for m in profile.get("medications", [])
    ]

    facts = []
    if profile.get("communication_needs"):
        facts.append({"label": tr("communication"), "value": profile["communication_needs"]})
    if profile.get("languages"):
        names = [tr(f"lang_{code}") if code in LANGS else code for code in profile["languages"]]
        facts.append({"label": tr("languages"), "value": ", ".join(names)})
    if profile.get("blood_group"):
        facts.append({"label": tr("blood_group"), "value": profile["blood_group"]})
    if profile.get("organ_donor"):
        facts.append({"label": tr("organ_donor"), "value": None})
    if profile.get("preferred_hospital"):
        facts.append({"label": tr("preferred_hospital"), "value": profile["preferred_hospital"]})
    if profile.get("insurer"):
        facts.append({"label": tr("insurer"), "value": profile["insurer"]})

    lost = None
    if profile.get("lost_person_mode"):
        lost = {"home_area": profile.get("home_area")}

    # What the Listen button reads: the essentials only.
    speech_parts = [tr("title") + ".", profile["name"] + "."]
    speech_parts += [a["label"] + (f": {a['note']}" if a["note"] else "") + "." for a in alerts]
    speech_parts += [f"{tr('allergies')}: " + ", ".join(al["substance"] for al in allergies) + "."] if allergies else []
    speech_parts += [tr("step_1"), tr("step_2"), tr("step_3")]

    return _template.render(
        lang=lang, nonce=nonce, status="ok", t=tr, lang_links=_lang_links(lang, base_path, scan_id), phone_icon=PHONE_ICON,
        person={"name": profile["name"], "age": profile.get("age")}, photo_url=photo_url,
        alerts=alerts, contacts=contacts, allergies=allergies, conditions=conditions, medicines=medicines,
        facts=facts, lost=lost, updated=updated_text(lang, profile.get("updated_at"), now),
        page_data={
            "scanId": scan_id,
            "locationUrl": f"{base_path}/location",
            "speechLang": SPEECH_LANG[lang],
            "speech": " ".join(speech_parts),
        },
    )


def _lang_links(current: str, base_path: str, scan_id: int | None) -> list[dict[str, Any]]:
    """Language buttons reload the page. Passing the scan id lets the backend
    reuse the same scan instead of logging (and alerting) a new one."""
    extra = f"&s={scan_id}" if scan_id is not None else ""
    return [{"code": code, "label": LANG_BUTTON_LABELS[code], "url": f"{base_path}?lang={code}{extra}",
             "current": code == current} for code in LANGS]
