"""Test setup: fake settings and a fake Supabase, so tests run offline."""
from __future__ import annotations

import base64
import copy
import os
from typing import Any

import pytest

HOOK_KEY = base64.b64encode(b"test-hook-key-32-bytes-long-ok!!").decode()

os.environ.update({
    "SUPABASE_URL": "https://ref.supabase.co",
    "SUPABASE_SECRET_KEY": "sb_secret_test",
    "APP_NAME": "MediQR",
    "APP_ORIGINS": "http://localhost:5173",
    "IP_HASH_SALT": "test-salt",
    "SEND_SMS_HOOK_SECRET": f"v1,whsec_{HOOK_KEY}",
    "SMS_DRY_RUN": "true",
    "NOTIFY_FAMILY_SECRET": "notify-secret",
    "PURGE_FILES_SECRET": "purge-secret",
    "EMAIL_DRY_RUN": "true",
})

from fastapi.testclient import TestClient  # noqa: E402

from app.deps import get_supabase  # noqa: E402
from app.main import app  # noqa: E402

# What the database actually returned for Sunil in the SQL checks
SUNIL_PROFILE: dict[str, Any] = {
    "age": 72,
    "name": "Sunil Perera",
    "alerts": [
        {"code": "blood_thinner", "note": "Warfarin"},
        {"code": "diabetes_insulin", "note": "Insulin glargine at night"},
        {"code": "severe_allergy", "note": "Penicillin"},
    ],
    "contacts": [
        {"name": "Kasun", "phone": "+971500000000", "relationship": "son"},
        {"name": "Nadeesha", "phone": "+94770000000", "relationship": "daughter"},
    ],
    "allergies": [{"severity": "severe", "substance": "Penicillin"}],
    "languages": ["si"],
    "conditions": [
        {"name": "Type 2 diabetes", "since_year": 2012},
        {"name": "Atrial fibrillation", "since_year": 2019},
        {"name": "High blood pressure"},
    ],
    "updated_at": "2026-10-12T10:35:41.152319+05:30",
    "blood_group": "O+",
    "medications": [],
    "organ_donor": True,
    "lost_person_mode": False,
    "communication_needs": "Hard of hearing in left ear. Speak on his right side.",
}

SUNIL_TOKEN = "devonly_SunilPerera_0001"


class FakeSupabase:
    """Records every call; answers from `answers` (a dict or a function)."""

    def __init__(self) -> None:
        self.calls: list[tuple[str, Any]] = []
        self.answers: dict[str, Any] = {}
        self.fail: set[str] = set()
        self.user: dict[str, Any] | None = None
        self.deleted_users: list[str] = []
        self.removed: list[tuple[str, list[str]]] = []

    def rpc(self, function: str, args: dict[str, Any]) -> Any:
        self.calls.append((function, args))
        if function in self.fail:
            raise RuntimeError("database down")
        answer = self.answers.get(function)
        return answer(args) if callable(answer) else copy.deepcopy(answer)

    def signed_photo_url(self, path: str, expires_in: int = 300) -> str | None:
        return f"https://ref.supabase.co/storage/v1/object/sign/person-photos/{path}?token=x"

    def remove_files(self, bucket: str, names: list[str]) -> None:
        self.removed.append((bucket, names))

    def get_user(self, token: str) -> dict[str, Any] | None:
        return self.user if token == "good-user-token" else None

    def delete_user(self, user_id: str) -> None:
        self.deleted_users.append(user_id)


@pytest.fixture
def fake() -> FakeSupabase:
    f = FakeSupabase()
    f.answers["get_scan_profile"] = {"status": "ok", "scan_id": 7, "profile": copy.deepcopy(SUNIL_PROFILE)}
    return f


@pytest.fixture
def client(fake: FakeSupabase):
    app.dependency_overrides[get_supabase] = lambda: fake
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
