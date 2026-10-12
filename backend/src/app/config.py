"""All settings come from environment variables.

Locally they are read from backend/.env (see .env.example).
On AWS Lambda they are set by the SAM template at deploy time.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache

DEFAULT_ALLOWED_COUNTRY_CODES = ("94", "971", "966", "974", "965", "968", "973", "44", "61", "39", "1")


def _bool(name: str, default: bool) -> bool:
    value = os.environ.get(name, "")
    if value == "":
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _list(name: str) -> tuple[str, ...]:
    return tuple(s.strip() for s in os.environ.get(name, "").split(",") if s.strip())


@dataclass(frozen=True)
class Settings:
    # Supabase
    supabase_url: str
    supabase_secret_key: str          # service role / secret key: server only, bypasses RLS

    # The app
    app_name: str
    app_origins: tuple[str, ...]      # React app addresses allowed to call /account/*
    ip_hash_salt: str                 # secret salt for turning visitor IPs into rate-limit keys
    trusted_ip_header: str            # e.g. "cloudfront-viewer-address" once behind CloudFront

    # Login codes (Supabase "Send SMS" hook)
    send_sms_hook_secret: str
    sms_dry_run: bool
    allowed_sms_country_codes: tuple[str, ...]
    lk_sms_provider: str              # "notifylk" or "textlk"
    notifylk_user_id: str
    notifylk_api_key: str
    notifylk_sender_id: str
    textlk_api_token: str
    textlk_sender_id: str
    twilio_account_sid: str
    twilio_auth_token: str
    twilio_messaging_service_sid: str
    twilio_from: str

    # Internal endpoints called by the database
    notify_family_secret: str
    purge_files_secret: str

    # Scan alert emails (Amazon SES)
    email_dry_run: bool
    ses_region: str
    ses_from: str


@lru_cache
def get_settings() -> Settings:
    codes = tuple(c.lstrip("+") for c in _list("ALLOWED_SMS_COUNTRY_CODES") if c.lstrip("+").isdigit())
    return Settings(
        supabase_url=os.environ.get("SUPABASE_URL", "").rstrip("/"),
        supabase_secret_key=os.environ.get("SUPABASE_SECRET_KEY", ""),
        app_name=os.environ.get("APP_NAME", "MediQR"),
        app_origins=_list("APP_ORIGINS"),
        ip_hash_salt=os.environ.get("IP_HASH_SALT", ""),
        trusted_ip_header=os.environ.get("TRUSTED_IP_HEADER", "").strip().lower(),
        send_sms_hook_secret=os.environ.get("SEND_SMS_HOOK_SECRET", ""),
        sms_dry_run=_bool("SMS_DRY_RUN", True),
        allowed_sms_country_codes=codes or DEFAULT_ALLOWED_COUNTRY_CODES,
        lk_sms_provider=os.environ.get("LK_SMS_PROVIDER", "notifylk"),
        notifylk_user_id=os.environ.get("NOTIFYLK_USER_ID", ""),
        notifylk_api_key=os.environ.get("NOTIFYLK_API_KEY", ""),
        notifylk_sender_id=os.environ.get("NOTIFYLK_SENDER_ID", ""),
        textlk_api_token=os.environ.get("TEXTLK_API_TOKEN", ""),
        textlk_sender_id=os.environ.get("TEXTLK_SENDER_ID", ""),
        twilio_account_sid=os.environ.get("TWILIO_ACCOUNT_SID", ""),
        twilio_auth_token=os.environ.get("TWILIO_AUTH_TOKEN", ""),
        twilio_messaging_service_sid=os.environ.get("TWILIO_MESSAGING_SERVICE_SID", ""),
        twilio_from=os.environ.get("TWILIO_FROM", ""),
        notify_family_secret=os.environ.get("NOTIFY_FAMILY_SECRET", ""),
        purge_files_secret=os.environ.get("PURGE_FILES_SECRET", ""),
        email_dry_run=_bool("EMAIL_DRY_RUN", True),
        ses_region=os.environ.get("SES_REGION", "ap-south-1"),
        ses_from=os.environ.get("SES_FROM", ""),
    )
