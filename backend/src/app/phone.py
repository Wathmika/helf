"""Phone number rules for sending login codes."""
from __future__ import annotations

import re


def normalize_phone(raw: str) -> str:
    """'+94 77 000 0000', '0094770000000' or '94770000000' -> '94770000000'"""
    digits = re.sub(r"\D", "", raw or "")
    if digits.startswith("00"):
        digits = digits[2:]
    return digits


def is_sri_lankan(digits: str) -> bool:
    return digits.startswith("94")


def is_sri_lankan_mobile(digits: str) -> bool:
    """Sri Lankan mobiles are 94 7X XXX XXXX. Landlines can't receive SMS."""
    return re.fullmatch(r"947\d{8}", digits) is not None


def is_allowed_country(digits: str, allowed_codes: tuple[str, ...]) -> bool:
    return any(code and digits.startswith(code) for code in allowed_codes)


def otp_message(otp: str, app_name: str) -> str:
    """English, plain ASCII: one SMS segment, cheapest everywhere."""
    return f"{otp} is your {app_name} code. Never share this code with anyone."


def mask_phone(digits: str) -> str:
    """For logs: 94770000012 -> 9477*****12"""
    if len(digits) <= 6:
        return "***"
    return digits[:4] + "*" * (len(digits) - 6) + digits[-2:]
