# helf — frontend project context

*Read this first, every session, before touching any code.*

## What this is

helf is an emergency medical QR service for Sri Lanka. A person (e.g. "Sunil Perera, 72")
has a profile with their allergies, conditions, medicines and emergency contacts. Their
family prints a QR code (wallet card, sticker, lock-screen wallpaper) that a stranger can
scan during a medical emergency. Scanning opens a public web page — no login — showing
only the fields the family chose to expose, with call buttons for emergency contacts and
the 1990 ambulance number. Scanning also alerts the family by SMS and email.

Two user types:
- **A user** logs in passwordless, by one-time code — either SMS OTP to their phone
  number, or OTP to their email address. These are two independent, unlinked sign-in
  methods (picking one creates/accesses a separate Supabase Auth identity; there is no
  "add your other contact method later" merge). No passwords, ever, on either path. One
  user can manage several people ("profiles"); one person can be managed by several users
  (e.g. two siblings both looking after their father).
- **A person** is the subject of a profile — may or may not be the logged-in user
  themself (self, parent, child, spouse, other).

**This repo/workspace is the React management app** — where a logged-in family member
creates and edits profiles, manages QR codes, invites co-managers, and reviews scan
activity. The public scan page is a *separate, already-built, already-deployed* piece
(server-rendered Python/Jinja2 on AWS Lambda) — do not rebuild it; see "Out of scope"
below.

## Source of truth — read these before guessing at anything

Two docs in `docs/` are the ground truth for this project. They were written directly
from the real, live backend code and database migrations — not from memory or
assumption. **When in doubt about a table name, column name, RPC name, argument name, or
any constraint/limit, re-read the relevant doc rather than guessing a plausible
alternative.** A wrong guess here doesn't just fail — it can silently pass TypeScript and
fail at runtime against the real Supabase project.

- **`docs/architecture-for-frontend.md`** — the technical reference: full data model
  (every table/column/constraint/enum), the complete RPC surface (exact function names
  and argument names, prefixed `p_`), the Row-Level Security model, the auth flow, and
  known hard limits (10 profiles/user, 3 contacts/person, 5 open invites/person, etc).
- **`docs/frontend-features.md`** — the feature spec: every screen this app needs, what
  belongs on it, and why, grounded in the architecture doc and the product's go-to-market
  plan. Build against this screen-by-screen rather than inventing new structure.

If `supabase/migrations/*.sql` is present in this workspace, that's the actual SQL these
two docs were summarized from — check it directly for anything the docs don't cover in
enough detail (exact check constraints, trigger behavior, etc).

## Stack

- **Frontend (this repo):** React + Vite, deployed as static files on S3 + CloudFront.
  React Router for navigation. No styling library is mandated — pick something that
  renders Sinhala/Tamil/English cleanly without extra plugins.
- **Database/auth/storage:** Supabase (hosted Postgres, Mumbai region). Business logic
  mostly lives in SQL functions (RPCs) behind RLS — a "thick database," not a thin one.
  The frontend talks to Supabase **directly** via `@supabase/supabase-js`, using the
  logged-in user's own session — RLS enforces authorization, there is no separate
  backend authorization layer to lean on for ordinary CRUD.
- **Backend (separate, already deployed, mostly not called from here):** Python/FastAPI
  on AWS Lambda. This frontend calls it for exactly one thing: `POST /account/delete`.
  Everything else it does (public scan page, SMS hooks, scan alerts, file purging) is
  either a different audience entirely or server-to-server — don't route ordinary CRUD
  through it.
- **Auth:** Supabase Auth, passwordless OTP only — phone number via SMS, or email
  address, as two fully independent sign-in methods (`frontend/src/pages/auth/LoginEntry.tsx`
  lets the person pick one at `/login`). No password field anywhere in this app's UI,
  on either path. `app_users` and RLS key everything off `auth.uid()`, not off phone or
  email, so this required no backend/schema changes — see
  `supabase/migrations/20261012000000_initial_schema.sql`'s `on_auth_user_created`
  trigger, which is already generic to any new `auth.users` row.

## Environment

`.env` (gitignored) holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — the
**anon/publishable key only**. Never use or ask for the `service_role`/secret key in this
project; it bypasses RLS and has no business in a frontend.

## backend/ and supabase/ are read-only reference material

`backend/` is a live, deployed, already-tested production service (AWS Lambda, real
Supabase project, real users eventually). `supabase/migrations/` is the real, applied
schema. **Never create, edit, or delete anything inside `backend/` or `supabase/`.** Read
them freely to double-check a table/column/RPC/constraint name against the real source
when the docs in `docs/` aren't detailed enough — that's exactly what they're there for —
but all frontend work happens inside `frontend/` (and `docs/` for spec updates only, if
asked). This repo also has permission rules (`.claude/settings.json`) enforcing this at
the tool level, so a write attempt there will be blocked — that's not a bug, it's
intentional. If a task seems to require changing backend or database code, stop and ask
first rather than finding a way around the restriction.

## House rules

- Match real schema/RPC names exactly — see "Source of truth" above. Don't rename things
  to be "cleaner"; the names are fixed by the live database.
- Mobile-first. Most users are on a phone, often on a weak connection.
- Three languages throughout: Sinhala (`si`, default), Tamil (`ta`), English (`en`).
  Gendered relationship wording (son/daughter etc.) must stay distinct in Sinhala and
  Tamil — don't collapse them.
- Any screen touching visibility (`show_*` toggles) should pair the value and its
  visibility toggle visually — this is the core trust pattern of the whole app ("you
  choose what's shown").
- Prefer calling the real `preview_scan_profile` RPC over hand-building what the public
  scan page would show — don't let the preview drift from reality.
- For anything atomic, privileged, or cross-cutting (creating a person, issuing/revoking
  a QR, accepting an invite, exporting data, deleting an account) use the RPC — don't try
  to replicate that logic with raw table writes.
- If something needed for a screen isn't covered in the docs (e.g. exact behavior of
  `prepare_account_deletion`), say so in code comments or UI copy rather than inventing
  backend behavior that may not match reality.
- Ask before making structural/architectural decisions not already settled in the docs
  (state management approach, component library, routing structure) — these are cheap to
  discuss up front and expensive to unwind later.

## Out of scope — do not build these here

- The public scan page (`/s/{token}`) — already built and deployed separately.
- Payments/billing for physical cards, family plans, or org contracts — no integration
  decided yet.
- Push notifications / reminder scheduling infrastructure.
- Admin/insurer/employer bulk-management tooling (a future, separate B2B project).
- Any hospital/FHIR integration — a later phase.

See `docs/frontend-features.md` §10 for the full list and reasoning.
