# helf — Architecture Reference for Frontend Design

*Written 2026-10-14. This is a grounded reference for a separate chat building the React
frontend — everything here is read from the actual backend code and database migrations,
not from memory. If anything here looks ambiguous once you're building, re-check the
source files named in each section rather than guessing.*

## 1. What this product is

helf is an emergency medical information service for Sri Lanka. A person (e.g. "Sunil
Perera, 72") has a profile with their allergies, conditions, medicines, and emergency
contacts. Their family prints a QR code — on a wallet card, a sticker, a wallpaper — that
a stranger can scan during a medical emergency. Scanning it opens a public web page (no
login) showing only the fields the family chose to expose, with call buttons for
emergency contacts and the 1990 ambulance number. Scanning also quietly emails the
emergency contacts so the family knows their person was found.

Two user types:
- **A user** is someone who logs in with their phone number (OTP via SMS). One user can
  manage several people ("profiles"); one person can be managed by several users (e.g. two
  siblings both looking after their father).
- **A person** is the subject of a profile — may or may not be the same individual as the
  user (self, parent, child, spouse, other).

The React app being designed is **the management app** — where a logged-in family member
creates and edits profiles, manages QR codes, invites co-managers, and reviews scan
activity. It is entirely separate from the public scan page (which already exists,
server-rendered, and is out of scope for this frontend — see §7).

## 2. Repo layout

```
medi/
├── backend/                  FastAPI app (Python), deployed to AWS Lambda
│   ├── src/app/
│   │   ├── main.py            FastAPI app, middleware, router wiring
│   │   ├── config.py          Settings, all from env vars
│   │   ├── deps.py            DI: get_supabase(), settings()
│   │   ├── supabase_client.py Thin httpx wrapper over Supabase's REST/Auth/Storage API
│   │   ├── security.py        CSP, nonces, webhook verification, visitor-key hashing
│   │   ├── phone.py           Phone number validation/formatting (Sri Lanka + allowlist)
│   │   ├── sms.py             SMS senders: Notify.lk, Text.lk, Twilio
│   │   ├── alert_email.py     Builds + sends the "someone scanned the QR" email (SES)
│   │   ├── scan_page.py       Renders the public scan page (Jinja2)
│   │   ├── scan_text.py       All scan-page translated strings (si/ta/en)
│   │   ├── templates/scan.html  The public scan page template
│   │   └── routes/
│   │       ├── scan.py        GET /s/{token}, POST /s/{token}/location
│   │       ├── account.py     POST /account/delete
│   │       ├── hooks.py       POST /hooks/send-sms (Supabase Auth SMS hook)
│   │       └── internal.py    POST /internal/notify-family, /internal/purge-files
│   ├── template.yaml          AWS SAM template (Lambda + env vars)
│   └── tests/
├── supabase/
│   ├── migrations/
│   │   ├── 20261012000000_initial_schema.sql           tables, RLS, core RPCs
│   │   ├── 20261012000100_family_qr_alerts_privacy.sql  invites, alerts, PDPA, cleanup
│   │   └── 20261012000200_scan_reuse_on_language_switch.sql
│   └── tests/security_checks.sql
└── docs/
    └── backend-setup.md       Full deployment/setup walkthrough
```

**There is no frontend code yet.** This doc exists so frontend work can start from an
accurate model of the backend rather than guessing at it.

## 3. The stack, end to end

- **Database:** Supabase (hosted Postgres 15+, Mumbai region). Almost all business logic
  lives here as SQL functions (RPCs) behind Row-Level Security — this is a
  "thick database" design, not a thin one.
- **Auth:** Supabase Auth, **phone number + SMS OTP only** (no passwords, no email
  login). The frontend will use the Supabase JS client directly for sign-in.
- **Backend:** FastAPI on AWS Lambda (Mumbai), behind API Gateway HTTP API. Small and
  narrowly scoped — it does NOT proxy general CRUD. Its jobs are: render the public scan
  page, receive the "share my location" tap, send OTP SMS (Supabase webhook), send scan
  alert emails, and delete a user's own account. **The React app will NOT call most of
  this backend** — see §6.
- **Frontend (to be built):** React + Vite, static files on S3 + CloudFront. Talks to
  Supabase directly (its JS client) for essentially everything: auth, reading/writing
  profiles, calling RPCs. It calls the small Python backend only for account deletion
  (`POST /account/delete`) and anything else listed in §6.
- **File storage:** Supabase Storage, private bucket `person-photos`. Photos are never
  publicly readable; the backend creates short-lived signed URLs for the scan page.

## 4. Data model (from `supabase/migrations/*.sql`)

### Core tables

**`app_users`** — one row per login, auto-created by trigger on signup.
```
id (uuid, = auth.users.id), display_name, preferred_language ('si'|'ta'|'en'), created_at, updated_at
```

**`people`** — one row per emergency profile.
```
id, created_by
full_name, display_name, date_of_birth, photo_path, spoken_languages (text[]),
blood_group, organ_donor, communication_needs
home_area, lost_person_mode (bool)              -- dementia "lost person" mode
insurer_name, insurance_policy_number, preferred_hospital
show_photo, show_age, show_blood_group, show_languages, show_communication_needs,
show_organ_donor, show_preferred_hospital, show_insurance   -- per-field "show when scanned" toggles
info_confirmed_at, content_updated_at           -- drives "Updated 12 days ago" on scan page
created_at, updated_at
```
Note: `insurance_policy_number` has NO show toggle — it is never shown on the scan page,
period (only `show_insurance` reveals the insurer *name*).

**`person_managers`** — join table: who can see/edit which person.
```
person_id, user_id, role ('owner'|'editor'), person_is_my ('self'|'parent'|'child'|'spouse'|'other')
```
A user can have at most one `person_is_my = 'self'` row (enforced by a unique partial
index). There's exactly one `owner` per person; everyone else managing it is an `editor`.
Only the owner can delete the person, revoke the QR, or create invites.

**`critical_alerts`** — the loud banner items on the scan page.
```
id, person_id, code (enum, see below), note (≤120 chars), show_on_scan, created_at, updated_at
unique (person_id, code)   -- one row per alert type per person
```
`alert_code` enum: `blood_thinner, diabetes_insulin, epilepsy, heart_condition,
pacemaker_implant, severe_allergy, pregnancy, dementia, hearing_impairment,
vision_impairment`. This is a **fixed, closed list** — the UI should present these as a
checklist/multi-select, not a free-text field, because the scan page needs to translate
each one into Sinhala/Tamil/English by code.

**`allergies`**
```
id, person_id, substance (1-80 chars), reaction (≤120), severity (enum), code_system, code,
show_on_scan, created_at, updated_at
```
`allergy_severity` enum: `mild, moderate, severe, life_threatening, unknown`.
`code_system`/`code` are nullable placeholders for future SNOMED CT codes — leave as
plain text fields for now, no UI needed for them yet.

**`conditions`**
```
id, person_id, name (1-120), since_year (1900-2100), notes (≤200), code_system, code,
show_on_scan, created_at, updated_at
```

**`medications`**
```
id, person_id, name (1-120), dose (≤60), frequency (≤60), kind (enum), packet_photo_path,
is_current (bool), started_on (date), code_system, code, show_on_scan (default FALSE),
created_at, updated_at
```
`medication_kind` enum: `prescription, over_the_counter, herbal_ayurvedic` (the last one
matters locally — e.g. "Kothala himbutu tea"). Medicines default to **private** —
the scan page only shows critical ones via `critical_alerts`, not the full medicine list,
unless the family explicitly flips `show_on_scan` per medicine. `packet_photo_path` is
never shown on the scan page at all (no toggle needed — always private).

**`emergency_contacts`**
```
id, person_id, name (1-60), relationship (enum), phone_e164, email (nullable),
priority (1-3, unique per person), notify_on_scan (bool), show_on_scan (bool),
created_at, updated_at
unique (person_id, priority)
```
`contact_relationship` enum: `son, daughter, husband, wife, father, mother, brother,
sister, grandson, granddaughter, relative, friend, neighbour, caregiver, other`
(gendered deliberately — Sinhala/Tamil have different words for son vs. daughter).
**At most 3 contacts per person** (priority 1/2/3, enforced by the unique constraint).
`phone_e164` must match `^\+[1-9][0-9]{7,14}$` — the UI should collect/validate
international format. `notify_on_scan` controls the scan-alert email; `show_on_scan`
controls whether this contact's name/number appears as a call button on the scan page —
these are independent toggles (a contact could be notified by email but not shown as a
public call button, though in practice they're usually the same).

**`qr_tokens`** — one row per *printed artifact* (a person can have several active at once
— e.g. a wallet card and a separate helmet sticker — each individually revocable).
```
id, person_id, token (24-char URL-safe random string, unique), label (≤40, e.g. "Wallet card"),
status ('active'|'revoked'), created_by, created_at, revoked_at
```
The public scan URL is `https://<domain>/s/{token}`.

**`scan_events`** — append-only log of every scan.
```
id (bigint identity), person_id, token_id, scanned_at,
approx_lat, approx_lng (numeric(6,3) — ~100m precision, only if visitor opts in),
location_accuracy_m, location_added_at, country_code,
family_notified_at, location_notified_at
```
Location is rounded to 3 decimal places (~100m) and only ever present if the scanning
visitor tapped "Share my location." Locations older than 90 days are nulled out by a
nightly job (data minimisation). No IP addresses are ever stored.

**`person_invites`** (migration 2) — family sharing.
```
id, person_id, code_hash (sha256 of a one-time code — the raw code is shown once, never stored),
role (always 'editor'), note (≤60, e.g. "For Nadeesha"), created_by, created_at,
expires_at (default now()+7 days), accepted_by, accepted_at, revoked_at
```
Flow: owner calls `create_person_invite(person_id, note)` → gets back a raw code to send
via WhatsApp/SMS themselves (the app does not send it) → relative calls
`accept_person_invite(code, person_is_my)` while logged in → becomes an editor. The
`code_hash` column itself is **not readable** by the client (grant excludes it) — only
metadata about invites (who, when, expired?) is visible, for an "pending invites" list UI.

### Enums reference (`profile_for`, used for `person_is_my`)
`self, parent, child, spouse, other`

## 5. Security model: Row-Level Security (RLS)

This is the most important thing for the frontend to understand correctly, because **the
React app will likely talk to Supabase directly with the logged-in user's own JWT**, and
RLS is what keeps that safe. There is no separate backend authorization layer to lean on.

- Every table has RLS **enabled**, default-deny. A query returns zero rows unless a
  policy explicitly allows it.
- The core rule, used everywhere: `private.is_manager(person_id)` — true if
  `person_managers` has a row linking the current `auth.uid()` to that person. Almost
  every policy on every health-data table boils down to "are you a manager of this
  person?"
- `private.is_owner(person_id)` — stricter: only true for the owner role. Used for delete,
  QR revoke, invite creation.
- **`people`**: managers can SELECT/UPDATE; only the owner can DELETE; there is
  **no INSERT policy** — rows are only created through the `create_person()` RPC (which
  also makes the caller the owner, atomically).
- **Column-level grants** on `people`: `UPDATE` is granted only on a specific column list
  (see migration §6) — e.g. `insurance_policy_number` is updatable but was deliberately
  left out of `show_*` toggles; **`content_updated_at` and `info_confirmed_at` are not in
  the grantable column list for raw updates** in the way you'd expect from the client —
  `content_updated_at` is maintained automatically by a trigger on any `people` update, so
  the frontend never sets it directly. `info_confirmed_at` the frontend DOES set directly
  (the "still accurate" / "confirm info" button), and it IS in the authenticated grant
  list.
- **Health tables** (`critical_alerts`, `allergies`, `conditions`, `medications`,
  `emergency_contacts`): managers get full CRUD (`for all ... using is_manager(...) with
  check is_manager(...)`).
- **`qr_tokens` / `scan_events`**: managers can only SELECT. All writes happen through
  RPCs (`issue_qr_token`, `revoke_qr_token`) — there is no direct INSERT/UPDATE grant on
  these tables for `authenticated`.
- **`person_invites`**: managers can SELECT (minus `code_hash`, which isn't grantable at
  all). All writes go through RPCs.
- The `anon` role (unauthenticated) has **zero** grants on any public table. The public
  scan page never queries tables directly — it only ever calls `get_scan_profile()` via
  the backend's `service_role` key, which bypasses RLS entirely but only exposes exactly
  what `build_public_profile()` computes (see §7).
- A second lock sits behind RLS: explicit `revoke all ... from anon, authenticated` at the
  top of the permissions section, with each grant added back individually. So even a
  future RLS policy mistake doesn't accidentally expose a table — the grant itself has to
  exist too.

**Practical implication for the frontend:** normal CRUD screens (edit a person, add an
allergy, add a contact) can go straight to `supabase.from('allergies').insert(...)` etc.
with the user's session — RLS will do the authorization. Anything that needs to be atomic,
privileged, or cross-cutting (creating a person + becoming its owner; generating a QR
token; accepting an invite; exporting data; deleting an account) **must** go through an
RPC (`supabase.rpc('function_name', {...})`), not a raw table write, because the logic
(and in some cases the elevated privilege) only exists in the function.

## 6. The full RPC surface (what the frontend calls)

All of these are called as `supabase.rpc('<name>', { p_arg: value })` using the logged-in
user's session (anon/publishable key + user JWT) — **not** the backend. Argument names use
the `p_` prefix shown.

| Function | Args | Returns | Who can call | Purpose |
|---|---|---|---|---|
| `create_person` | `p_full_name text, p_profile_for profile_for='other'` | `uuid` (new person id) | any authenticated user | Create a profile; caller becomes owner. Capped at 10 profiles per user. |
| `issue_qr_token` | `p_person_id uuid, p_label text=null` | row of `qr_tokens` | manager | Mint a new QR token (new card/sticker). |
| `revoke_qr_token` | `p_token_id uuid` | void | manager | Permanently deactivate one QR (e.g. "I lost my card"). |
| `preview_scan_profile` | `p_person_id uuid` | jsonb (same shape as public scan profile) | manager | "Test your QR" — exactly what a stranger would see, not logged as a scan. **Use this to build a live preview pane in the editor.** |
| `offline_qr_text` | `p_token_id uuid, p_base_url text` | text | manager | The short plain-text payload encoded inside the QR for offline-readable fallback (≤~300 bytes). `p_base_url` must match `^(https://[a-z0-9.-]+|http://localhost(:[0-9]+)?)$`. |
| `create_person_invite` | `p_person_id uuid, p_note text=null` | text (raw one-time code — **shown once**) | owner only | Start a family-sharing invite. Max 5 open invites per person. |
| `accept_person_invite` | `p_code text, p_person_is_my profile_for='parent'` | `uuid` (person id) | any authenticated user | Join as an editor using a code someone sent them. |
| `revoke_person_invite` | `p_invite_id uuid` | void | owner only | Cancel a pending invite. |
| `export_person_data` | `p_person_id uuid` | jsonb (everything about the person) | manager | PDPA "right of access" — download-your-data button. |

RPCs **not** callable by the frontend (server/`service_role`-only — don't try to call
these from React, they'll be rejected): `get_scan_profile`, `add_scan_location`,
`scan_notification_payload`, `mark_scan_notified`, `prepare_account_deletion`,
`next_file_purges`, `complete_file_purge`.

### Direct table access patterns (not RPCs — ordinary Supabase client calls)
- Read a person + nested children: `select('*, critical_alerts(*), allergies(*),
  conditions(*), medications(*), emergency_contacts(*)')` style queries work fine; RLS
  filters to what the user manages.
- List "my profiles": query `person_managers` where `user_id = auth.uid()`, joined to
  `people`.
- List co-managers of a person (to show "Nadeesha also manages Amma"): query
  `person_managers` joined to `app_users` — allowed by the
  `private.shares_person_with()` policy added in migration 2, which lets managers read
  each other's `app_users.display_name` (but nothing else of each other's accounts).
- Insert/update/delete rows in `critical_alerts`, `allergies`, `conditions`,
  `medications`, `emergency_contacts` directly.
- Update `people` columns directly (the grantable list, §4/§5) — including all the
  `show_*` booleans, `lost_person_mode`, `info_confirmed_at`, etc.
- List QR tokens / scan history for a person: `select('*')` from `qr_tokens` /
  `scan_events` (read-only, as above).
- List pending invites for a person: `select('*')` from `person_invites` (code_hash
  omitted automatically by the grant).

### Calls that DO go to the Python backend (not Supabase directly)
Base URL is the API Gateway endpoint from the SAM stack output (`ApiUrl`).
- `POST /account/delete` — body `{"confirm": "DELETE MY ACCOUNT"}`, header
  `Authorization: Bearer <user's access token>`. This is the only backend endpoint the
  React app calls. It runs `prepare_account_deletion` server-side (hands off or deletes
  owned profiles) then deletes the login itself — something the client can never do with
  its own privileges.
- Everything else under `/s/*`, `/hooks/*`, `/internal/*` is either the public scan page
  (different audience entirely) or server-to-server/database-to-server calls the frontend
  never touches.

## 7. The public scan page (context, not something to build)

Not part of this frontend project, but worth understanding because the management app's
"preview" and "which fields are visible" UI needs to mirror it exactly.

- Route: `GET /s/{token}` on the Python backend, server-rendered Jinja2 HTML
  (`backend/src/app/templates/scan.html`, logic in `scan_page.py`). No React, no client
  framework — works with JS disabled, loads fast on weak 3G.
- The **only** gateway to profile data for this page is the `get_scan_profile(token,
  client_key, country, existing_scan_id)` RPC, called with the `service_role` key. It rate
  limits (30/min per hashed visitor IP), validates token shape/status, logs a
  `scan_events` row (or reuses one if the same token scanned the same page within 30 min —
  e.g. switching language shouldn't count as a second scan or re-alert the family), and
  returns `private.build_public_profile(person_id)`.
- `build_public_profile()` is **the single source of truth** for "what does a stranger
  see" — it is a `jsonb_strip_nulls` object gated field-by-field by each `show_*` column.
  The exact same function backs `preview_scan_profile()` (§6), so whatever the management
  app shows in its live preview is guaranteed to match reality. **When building the
  profile editor's preview pane, call `preview_scan_profile`, don't try to reconstruct
  the shape by hand.**
- Shape of the returned profile jsonb (fields only present if the toggle is on and there's
  data — nulls are stripped):
  ```
  name, age, photo_path, blood_group, languages[], communication_needs, organ_donor,
  preferred_hospital, insurer, lost_person_mode, home_area, updated_at,
  alerts: [{code, note}],
  allergies: [{substance, reaction, severity}],
  conditions: [{name, since_year}],
  medications: [{name, dose, frequency, kind}]   -- only is_current=true ones, only show_on_scan=true
  contacts: [{name, relationship, phone}]
  ```
- Page behavior worth knowing about (in case the management app's own UI echoes it):
  Sinhala/Tamil/English toggle, a "Listen" button using the browser's `speechSynthesis`,
  a critical-alerts banner that's the visually loudest element, two always-present call
  buttons (top emergency contact + 1990 ambulance), a "lost person" banner (dementia mode)
  showing only a general area never an address, and a "Share my location with the family"
  button that POSTs to `/s/{token}/location`.
- Photos: `photo_path` points into the private `person-photos` Storage bucket; the backend
  signs a short-lived URL (5 min) server-side. The management app's own photo upload UI
  should upload to that same bucket path convention (`<person_id>/...`) — RLS on storage
  objects is enforced by `private.is_manager_of_path()`, which parses the person_id out of
  the object path, so uploads must be pathed as `<person_id>/filename.jpg` for a manager to
  be allowed to write them.

## 8. Auth flow (what the frontend implements)

Phone-only, no passwords, via Supabase Auth's native phone OTP:
1. User enters phone number → frontend calls Supabase JS client's phone OTP sign-in
   (`supabase.auth.signInWithOtp({ phone })`).
2. Supabase Auth, on sending the OTP, calls our custom "Send SMS" hook
   (`POST /hooks/send-sms` on the Python backend, signed with a webhook secret, verified
   via Standard Webhooks spec) instead of its own built-in senders. That hook picks
   Notify.lk/Text.lk for Sri Lankan mobiles or Twilio for an allowlisted set of other
   countries, and rejects anything else outright (anti-SMS-pumping-fraud measure).
   **This is entirely backend-side; the frontend just calls the normal Supabase OTP
   sign-in/verify methods and never talks to `/hooks/send-sms` itself.**
3. User enters the received code → `supabase.auth.verifyOtp({ phone, token, type: 'sms'
   })` → session established.
4. On first-ever login, a Postgres trigger (`on_auth_user_created`) auto-creates the
   matching `app_users` row. The frontend can immediately read/update
   `app_users.display_name` and `preferred_language` for that user.
5. From here on, the Supabase client is initialized with the session's access token, and
   every table/RPC call is authorized by RLS using `auth.uid()`.

Allowed phone countries for OTP delivery (configurable, current default): `94` (Sri
Lanka), `971`, `966`, `974`, `965`, `968`, `973` (Gulf states — large Sri Lankan diaspora),
`44`, `61`, `39`, `1`. Sri Lankan numbers are further restricted to mobile-looking numbers
(`07x`) only. **The phone input UI should validate against this list up front** rather
than letting the user submit and fail at OTP-send time — `backend/src/app/phone.py` has
the exact validation logic to mirror.

## 9. Localization

Three languages throughout: Sinhala (`si`, default), Tamil (`ta`), English (`en`) —
`app_users.preferred_language` stores the user's choice for the management app itself.
(The public scan page has its own independent language switch per visitor, unrelated to
this.) The enums that need translated labels in the management UI are the same ones the
scan page translates: `alert_code`, `allergy_severity`, `contact_relationship`,
`medication_kind`, plus blood group values and `profile_for`. There's no existing
translation-string source for the *management app* (scan_text.py's strings are scan-page
only) — that will need to be built fresh, but should follow the same three-language
pattern and the same gendered-relationship handling (son/daughter wording differs in
Sinhala and Tamil).

## 10. Known constraints and limits worth designing around

- Max 10 profiles managed per user (`create_person` / `accept_person_invite` both enforce
  this) — the "add profile" UI should handle the limit-reached error gracefully.
- Max 3 emergency contacts per person (DB unique constraint on `priority` 1-3) — not a
  soft suggestion, a hard cap; UI should disable "add contact" at 3.
- Max 5 open (unaccepted, unexpired) invites per person at once.
- Invite codes expire in 7 days and are single-use; the raw code is returned exactly once
  from `create_person_invite` and must be displayed/copyable immediately (e.g. "send this
  via WhatsApp") since it can never be retrieved again.
- Field length limits are enforced at the DB level (see §4 for exact numbers per field) —
  worth mirroring as client-side `maxLength` so users get instant feedback instead of a
  failed RPC.
- `lost_person_mode` + `home_area`: explicitly designed to reveal only a general
  neighborhood, never a precise address — if the UI adds any "home address" field in the
  future, it must stay separate from what's capable of being shown on scan.
- Sensitive-by-default fields: medicines (`show_on_scan` defaults false),
  `insurance_policy_number` (never shown, no toggle at all), `packet_photo_path` (never
  shown). Don't build a toggle UI for things that have no toggle.
- "Updated N days ago" freshness indicator on the scan page is computed from
  `greatest(content_updated_at, info_confirmed_at)` — `content_updated_at` auto-bumps on
  any edit to the person or their health rows (via triggers), `info_confirmed_at` only
  bumps when the user explicitly taps something like "This is still accurate" — the
  management app should have that explicit confirmation action as its own button, since
  it means something different from "I edited a field."

## 11. Open items (per the project's own technical-decisions log)

- No production domain secured yet — printed QR links (`/s/<token>`) must never change
  once printed, so this blocks final launch but not frontend development against a
  Supabase dev project.
- Twilio signup blocked from Sri Lanka IPs — affects overseas SMS delivery, not frontend
  work.
- Sinhala/Tamil copy needs native-speaker review (applies to scan page strings already
  written; will also apply to whatever strings this frontend introduces).
- No frontend code exists yet — this app is being built from zero in React/Vite.

---

*Sources read for this document: `supabase/migrations/20261012000000_initial_schema.sql`,
`20261012000100_family_qr_alerts_privacy.sql`, `20261012000200_scan_reuse_on_language_switch.sql`;
`backend/src/app/{main,config,deps,supabase_client,scan_page}.py` and `routes/{scan,account,hooks,internal}.py`;
`backend/template.yaml`; project doc "Technical decisions.md".*
