"""The backend web app (FastAPI).

Endpoints
---------
GET  /s/{token}                 scan page (what the QR code opens)
POST /s/{token}/location        "share my location with the family"
POST /hooks/send-sms            Supabase Auth: send a login code
POST /internal/notify-family    database: a QR was scanned -> email contacts
POST /internal/purge-files      database schedule: remove photos of deleted people
POST /account/delete            React app: the user deletes their own account
GET  /health                    simple "I'm alive" check

On AWS Lambda, `handler` (bottom of this file) is the entry point.
Locally (from the backend folder):
    uvicorn app.main:app --app-dir src --env-file .env --reload --port 8000
"""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request

from .config import get_settings
from .routes import account, hooks, internal, scan
from .security import API_CSP, BASE_HEADERS

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")

app = FastAPI(title="MediQR backend", docs_url=None, redoc_url=None, openapi_url=None)

settings = get_settings()
if settings.app_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.app_origins),
        allow_methods=["POST", "OPTIONS"],
        allow_headers=["authorization", "content-type"],
    )


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    for name, value in BASE_HEADERS.items():
        response.headers.setdefault(name, value)
    response.headers.setdefault("Content-Security-Policy", API_CSP)  # scan page sets its own
    response.headers.setdefault("Cache-Control", "no-store")
    return response


app.include_router(scan.router)
app.include_router(hooks.router)
app.include_router(internal.router)
app.include_router(account.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# AWS Lambda entry point
try:
    from mangum import Mangum

    handler = Mangum(app, lifespan="off")
except ImportError:  # mangum is only needed on Lambda
    handler = None
