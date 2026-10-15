"""Supabase Auth "Send SMS" hook: sends login codes.

Sri Lankan mobiles (+94 7x)  -> local gateway (Notify.lk or Text.lk)
allowed overseas numbers     -> Twilio
anything else                -> refused (stops "SMS pumping" fraud, where
                                bots request codes to costly numbers)

SMS_DRY_RUN defaults to true: it logs instead of sending.
"""
from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, Depends, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse

from ..config import Settings
from ..deps import settings
from ..phone import is_allowed_country, is_sri_lankan, is_sri_lankan_mobile, mask_phone, normalize_phone, otp_message
from ..security import WebhookVerificationError, verify_standard_webhook
from ..sms import SmsError, send_via_notifylk, send_via_textlk, send_via_twilio

log = logging.getLogger("send_sms")
router = APIRouter()


def hook_error(code: int, message: str) -> JSONResponse:
    """Supabase shows `message` to the person logging in, so keep it friendly."""
    return JSONResponse({"error": {"http_code": code, "message": message}}, status_code=code)


@router.post("/hooks/send-sms")
async def send_sms(request: Request, cfg: Settings = Depends(settings)) -> JSONResponse:
    log.info("send-sms hook called")

    # 1. Check this really came from Supabase Auth
    body = await request.body()
    try:
        payload = verify_standard_webhook(cfg.send_sms_hook_secret, request.headers, body)
    except WebhookVerificationError as exc:
        log.warning("signature verification failed: %s", exc)
        return hook_error(401, "Invalid signature")

    # 2. Check the number
    digits = normalize_phone(((payload.get("user") or {}).get("phone")) or "")
    otp = str(((payload.get("sms") or {}).get("otp")) or "")
    if not digits or not otp.isdigit() or not 4 <= len(otp) <= 10:
        log.warning("missing or malformed phone/otp in payload")
        return hook_error(400, "Missing phone number or code")
    if not is_allowed_country(digits, cfg.allowed_sms_country_codes):
        log.warning("country not allowed for %s", mask_phone(digits))
        return hook_error(400, "Sorry, we can't send codes to this country yet.")
    if is_sri_lankan(digits) and not is_sri_lankan_mobile(digits):
        log.warning("Sri Lankan number not a mobile: %s", mask_phone(digits))
        return hook_error(400, "Please use a mobile number (07x).")

    # 3. Send
    route = cfg.lk_sms_provider if is_sri_lankan(digits) else "twilio"
    if cfg.sms_dry_run:
        log.info("[dry run] would send OTP via %s to %s", route, mask_phone(digits))  # never log the code
        return JSONResponse({})

    message = otp_message(otp, cfg.app_name)
    sender = {"notifylk": send_via_notifylk, "textlk": send_via_textlk, "twilio": send_via_twilio}.get(route)
    if sender is None:
        log.error("unknown LK_SMS_PROVIDER %r", route)
        return hook_error(503, "We couldn't send the code right now. Please try again in a minute.")

    def _send() -> None:
        with httpx.Client(timeout=8.0) as client:
            sender(cfg, digits, message, client)

    try:
        await run_in_threadpool(_send)
    except (SmsError, httpx.HTTPError) as exc:
        log.error("OTP send failed via %s to %s: %s", route, mask_phone(digits), exc)
        return hook_error(503, "We couldn't send the code right now. Please try again in a minute.")
    log.info("OTP sent via %s to %s", route, mask_phone(digits))
    return JSONResponse({})