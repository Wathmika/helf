"""Talks to Supabase over its normal web API, using the server's secret key.

Only the few calls the backend needs: database functions (RPC), photo
links, file removal, and login lookups. Plain HTTP with httpx keeps the
Lambda small and quick to start.
"""
from __future__ import annotations

from typing import Any

import httpx


class SupabaseError(Exception):
    pass


class Supabase:
    def __init__(self, url: str, secret_key: str, transport: httpx.BaseTransport | None = None):
        if not url or not secret_key:
            raise SupabaseError("SUPABASE_URL / SUPABASE_SECRET_KEY are not set")
        headers = {"apikey": secret_key}
        # Older "service_role" keys are JWTs (start with eyJ) and also go in the
        # Authorization header. Newer "sb_secret_..." keys go in apikey only.
        if secret_key.startswith("eyJ"):
            headers["Authorization"] = f"Bearer {secret_key}"
        self._key = secret_key
        self._http = httpx.Client(base_url=url, headers=headers, timeout=5.0, transport=transport)

    # ---- database functions -------------------------------------------------
    def rpc(self, function: str, args: dict[str, Any]) -> Any:
        r = self._http.post(f"/rest/v1/rpc/{function}", json=args)
        if r.status_code >= 400:
            raise SupabaseError(f"rpc {function} failed: HTTP {r.status_code} {r.text[:200]}")
        return r.json() if r.content else None

    # ---- storage ------------------------------------------------------------
    def signed_photo_url(self, path: str, expires_in: int = 300) -> str | None:
        """Short-lived link to a private photo, for the scan page."""
        r = self._http.post(f"/storage/v1/object/sign/person-photos/{path}", json={"expiresIn": expires_in})
        if r.status_code >= 400:
            return None
        signed = r.json().get("signedURL") or r.json().get("signedUrl")
        if not signed:
            return None
        return str(self._http.base_url).rstrip("/") + "/storage/v1" + signed

    def remove_files(self, bucket: str, names: list[str]) -> None:
        r = self._http.request("DELETE", f"/storage/v1/object/{bucket}", json={"prefixes": names})
        if r.status_code >= 400:
            raise SupabaseError(f"remove files failed: HTTP {r.status_code} {r.text[:200]}")

    # ---- auth ---------------------------------------------------------------
    def get_user(self, user_access_token: str) -> dict[str, Any] | None:
        """Who is this login token for? None if it's invalid or expired."""
        r = self._http.get("/auth/v1/user", headers={"Authorization": f"Bearer {user_access_token}"})
        if r.status_code != 200:
            return None
        return r.json()

    def delete_user(self, user_id: str) -> None:
        headers = {"Authorization": f"Bearer {self._key}"} if self._key.startswith("eyJ") else {}
        r = self._http.delete(f"/auth/v1/admin/users/{user_id}", headers=headers)
        if r.status_code >= 400:
            raise SupabaseError(f"delete user failed: HTTP {r.status_code} {r.text[:200]}")
