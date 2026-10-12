"""The user deletes their own account (PDPA right to erasure).

Called from the React app by a logged-in user:
  1. Work out who is asking from their login token.
  2. Profiles they own are handed to a co-manager, or deleted if nobody
     else manages them (prepare_account_deletion in the database).
  3. Delete the login. The database then removes their remaining links.

The body must be {"confirm": "DELETE MY ACCOUNT"} so it can't happen by accident.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ..deps import get_supabase
from ..supabase_client import Supabase, SupabaseError

log = logging.getLogger("account")
router = APIRouter(prefix="/account")

CONFIRM_PHRASE = "DELETE MY ACCOUNT"


class DeleteIn(BaseModel):
    confirm: str = ""


@router.post("/delete")
def delete_account(
    body: DeleteIn,
    authorization: str | None = Header(default=None),
    db: Supabase = Depends(get_supabase),
) -> JSONResponse:
    token = (authorization or "").removeprefix("Bearer ").removeprefix("bearer ").strip()
    user = db.get_user(token) if token else None
    if not user or not user.get("id"):
        return JSONResponse({"error": "not signed in"}, status_code=401)
    if body.confirm != CONFIRM_PHRASE:
        return JSONResponse({"error": f'send {{"confirm": "{CONFIRM_PHRASE}"}} to continue'}, status_code=400)

    try:
        summary = db.rpc("prepare_account_deletion", {"p_user_id": user["id"]}) or {}
        db.delete_user(user["id"])
    except SupabaseError as exc:
        log.error("account deletion failed: %s", exc)
        return JSONResponse({"error": "could not delete the account, please try again"}, status_code=500)

    return JSONResponse({"deleted": True, **summary})
