"""Shared dependencies. Tests replace get_supabase with a fake."""
from __future__ import annotations

from functools import lru_cache

from .config import Settings, get_settings
from .supabase_client import Supabase


@lru_cache
def _client() -> Supabase:
    s = get_settings()
    return Supabase(s.supabase_url, s.supabase_secret_key)


def get_supabase() -> Supabase:
    return _client()


def settings() -> Settings:
    return get_settings()
