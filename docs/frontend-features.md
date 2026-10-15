# helf — Frontend Feature Specification (build prompt)

*Written 2026-10-15. This is a feature-level spec for generating the React management
app's UI and flows. It assumes the reader (human or AI tool) has also read
`docs/architecture-for-frontend.md` (same repo / project doc "Architecture for frontend
design.md") for the exact data model, RPC names, field names, and security model — this
file does not repeat those details, it tells you what screens and flows to build with
them. If anything here conflicts with that doc, the architecture doc is the source of
truth: it was written straight from the live backend code, this file was not.*

## 0. How to use this file

This is a prompt/spec for scaffolding a real app against a real, already-deployed
backend — not a greenfield concept. Treat these as hard constraints, not suggestions:

- Use the **exact** table names, column names, RPC names and argument names from
  `architecture-for-frontend.md`. Do not invent plausible-sounding alternatives.
- The backend is **Supabase** (Postgres + Auth). The frontend talks to Supabase directly
  with the Supabase JS client (`@supabase/supabase-js`) for almost everything. It only
  calls the separate Python backend for `POST /account/delete`.
- Auth is **phone number + SMS OTP only**. There is no password field anywhere in this
  app's UI, and no email/username login screen.
- Stack: **React + Vite**, deployed as static files (S3 + CloudFront, not relevant to
  local dev). Use React Router for navigation. Styling/component library is an open
  choice — pick something that renders cleanly in Sinhala, Tamil and English without
  extra plugins (plain CSS, Tailwind, or a simple component kit are all fine; avoid
  anything that assumes Latin-only typography).
- Mobile-first. Most users will be on a phone, often on a weak connection — this is true
  for both the person setting things up and, separately, the (already-built, out of
  scope) public scan page.
- This app is **three languages throughout**: Sinhala (`si`, default), Tamil (`ta`),
  English (`en`). Every screen below needs translated strings for all three, with correct
  gendered relationship wording in Sinhala/Tamil (see §4).

## 1. App shell and navigation

**Unauthenticated:**
- Landing/login screen (§2).

**Authenticated, top-level navigation** (bottom tab bar on mobile, sidebar on wider
screens):
- **Profiles** — list of people the user manages (home screen after login).
- **Account** — the logged-in user's own settings (display name, preferred language,
  account deletion).

A person's own profile (if `person_is_my = 'self'`) is just another row in the Profiles
list, not a separate top-level concept — don't build a special "me" tab.

## 2. Auth flow

Build exactly the two-step phone OTP flow from §8 of the architecture doc:

1. **Phone entry screen.** Country-aware phone input. Validate client-side against the
   allowed country list and Sri Lankan mobile-only rule (mirror `backend/src/app/phone.py`
   logic — don't let the user submit a number that will fail server-side). On submit, call
   `supabase.auth.signInWithOtp({ phone })`.
2. **OTP entry screen.** 6-digit code input (standard OTP UI pattern — auto-advance
   boxes or a single field, your choice). Resend-code link with a cooldown timer. On
   submit, call `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`.
3. On first-ever login, `app_users` is auto-created server-side by trigger — nothing for
   the frontend to do, but the **first-login experience** should prompt the user to set
   `display_name` and confirm `preferred_language` before dropping them into the main app
   (a short one-screen "welcome, what's your name, which language" step). On subsequent
   logins, skip straight to the Profiles list.
4. Handle OTP failure states clearly: wrong code, expired code, rate-limited (too many
   attempts), disallowed country.

## 3. Profiles list (home screen)

- Card per person the user manages: photo (or placeholder), name, relationship label
  (`person_is_my`, gendered), a freshness indicator ("Updated 3 days ago" / "Needs
  review" if stale — compute client-side from `content_updated_at`/`info_confirmed_at`
  the same way the scan page does, see architecture doc §10).
- "Add profile" action → name entry → calls `create_person`. Handle the 10-profile cap
  gracefully (disable/hide the add button with an explanation once at the limit, rather
  than letting the RPC fail unexplained).
- Tapping a profile opens the **Profile detail / editor** (§4).
- If the user has zero profiles (brand new account), show an empathetic empty state that
  explains what a profile is and leads straight into "Add profile" — frame it the way the
  go-to-market doc frames the product: peace of mind for family, not a tech feature list.

## 4. Profile detail / editor

This is the core screen of the app. Organize as sections (tabs, accordion, or a single
scrolling page with anchors — your call) matching the data model exactly:

### 4.1 Basic info
`full_name`, `display_name`, `date_of_birth`, `photo_path` (upload — see §4.7), `blood_group`,
`organ_donor`, `communication_needs`, `spoken_languages[]`, `home_area`,
`lost_person_mode` toggle, `preferred_hospital`, `insurer_name`, `insurance_policy_number`.

Each of these (except `insurance_policy_number`, which has no toggle at all — see
architecture doc §4) has a paired `show_*` visibility toggle. Build the editor so every
field visually pairs with its own "show on scan" switch — this dual-field pattern (value +
visibility) is the single most important interaction pattern in this whole app, and it
should look and feel the same everywhere it appears (here and in every sub-list below).

### 4.2 Critical alerts
Fixed closed list (the `alert_code` enum) — **render as a checklist/multi-select, not a
free-text field.** Each selected alert gets an optional `note` (≤120 chars) and its own
`show_on_scan` toggle. This is the loudest section on the public scan page, so visually
flag it as important here too (but don't over-alarm the editing UI itself).

### 4.3 Allergies, conditions, medications
Three separate repeatable lists, each with an "add" flow and inline edit/delete:
- **Allergies:** substance, reaction, severity (enum dropdown), `show_on_scan` toggle.
- **Conditions:** name, since year, notes, `show_on_scan` toggle.
- **Medications:** name, dose, frequency, kind (enum: prescription / over-the-counter /
  herbal-ayurvedic — keep the Ayurvedic option, it matters locally), current/past toggle,
  started-on date, optional packet photo (never shown on scan — no toggle needed, say so
  in the UI so users aren't confused about why). `show_on_scan` **defaults off** for every
  medication — make this default explicit in the UI copy ("Medicines are private by
  default — switch this on only for medicines responders must know about immediately").

### 4.4 Emergency contacts
List of up to **3** contacts (hard cap — disable "add" at 3, explain why). Each: name,
relationship (gendered enum dropdown), phone (E.164 validated), optional email, priority
(1–3, determines call-button order on the scan page), two independent toggles:
`notify_on_scan` (gets the scan alert email) and `show_on_scan` (appears as a public call
button). Make clear in the UI that these are independent — a contact can be notified
privately without being a public call button, though usually both are on.

### 4.5 Live preview pane
Call `preview_scan_profile(person_id)` and render it to look like the actual public scan
page (same fields, same structure — see architecture doc §7 for the exact returned
shape). This should update whenever the user changes a visible field, so they always know
exactly what a stranger would see — this is the trust mechanism for the whole product
("you choose what is shown," per the go-to-market positioning). Don't hand-build this
shape from the editable fields — always call the real RPC so it can never drift from
what the live scan page actually shows.

### 4.6 "Confirm info is still accurate" action
A single explicit button (not automatic) that updates `info_confirmed_at`. Separate from
ordinary edits — explain in the UI that this is different from editing a field: it's a way
to say "nothing has changed, but I checked." Per the go-to-market plan, prompt this every
~3 months (a banner on the profile when it's gone stale, not a push notification system —
that's out of scope for this frontend).

### 4.7 Photo upload
Upload to the `person-photos` Storage bucket at path `<person_id>/<filename>` (required
path convention — RLS depends on it, see architecture doc §7). Simple file picker +
preview + crop-to-square is enough; no need for advanced image editing.

## 5. QR codes screen (per profile)

- List of `qr_tokens` for this person (a person can have several active at once — e.g.
  "Wallet card", "Helmet sticker" — each with its own `label`).
- "Create new QR" → optional label → calls `issue_qr_token`. Show the resulting QR code
  visually (generate the QR image client-side from the scan URL `https://<domain>/s/{token}`
  — any QR-generation library is fine) with a download/print option.
- Each token shows its `status` (active/revoked) and a "Revoke" action (confirm dialog —
  revoking is permanent) calling `revoke_qr_token`. Make the consequence clear in the
  confirm dialog: the physical card/sticker becomes dead immediately and shows a
  "replaced" message instead of the profile (confirmed behavior — a revoked card returns
  HTTP 410 with a safe fallback message and still shows the 1990 ambulance button).
- Offer a **printable card** export: fetch `offline_qr_text(token_id, base_url)` for the
  short offline-readable payload, lay it out alongside the QR image in a simple printable
  card design (name + key alerts + the QR). This maps to the go-to-market plan's "free
  printable PDF card" feature — keep it simple for v1 (one clean printable layout is
  enough, not a template picker).
- Scan activity: list `scan_events` for this person (scanned_at, whether location was
  shared, country_code) — a simple reverse-chronological log, "last scanned 2 days ago."
  This is both a trust feature (family can see their QR is actually being checked/tested)
  and the "real emergency scans" metric from the go-to-market plan.

## 6. Family sharing (invites)

- **Owner view** (on a profile they own): list of pending invites (`person_invites`,
  minus `code_hash` — not returned by the grant), each showing note/created/expires,
  with a "revoke" action (`revoke_person_invite`). "Invite a co-manager" action → optional
  note (e.g. "For Nadeesha") → calls `create_person_invite` → **show the raw returned code
  prominently, exactly once, with explicit copy-to-clipboard / share buttons** (WhatsApp
  share intent if easy to wire up, since that's the expected channel per the go-to-market
  plan — otherwise a plain copy button is fine). Make the "this code will never be shown
  again, send it now" messaging unmissable — this is a one-shot value, not something
  recoverable from a later screen. Cap at 5 open invites — disable/explain at the limit.
- **Joining via a code:** a simple "I have an invite code" entry point (from the Profiles
  list empty state or a dedicated action) → code input + `person_is_my` relationship
  picker → calls `accept_person_invite`. On success, drop the user into that profile.
- On a shared profile, show who else manages it (list of co-managers' `display_name` via
  the `person_managers` → `app_users` join described in architecture doc §6) so a user
  understands they're not the only one responsible.

## 7. Account screen

- Edit `display_name`, `preferred_language` (drives this app's UI language — see §9).
- **Export my data**: per-person "download your data" action calling
  `export_person_data(person_id)` for each profile the user manages — present as a PDPA
  "right of access" feature (download as JSON or a simple formatted view; a raw JSON
  download is acceptable for v1).
- **Delete account**: a clearly separated, harder-to-reach danger-zone action. Require
  explicit confirmation text matching what the backend expects
  (`{"confirm": "DELETE MY ACCOUNT"}` per architecture doc §6) before calling
  `POST /account/delete` with the user's access token as a Bearer header — this is the
  **one and only** call this frontend makes to the Python backend rather than Supabase
  directly. Explain in the UI, before confirming, what happens to profiles this user owns
  (the backend hands off or deletes them — reflect whatever `prepare_account_deletion`
  actually does; if that behavior isn't fully documented yet, say plainly in the
  confirmation copy that owned profiles will be affected and advise reassigning
  ownership first if they want to keep a profile alive, rather than guessing at specifics
  the UI can't yet confirm).

## 8. Error and empty states worth designing deliberately

- 10-profile cap reached.
- 3-contact cap reached.
- 5-open-invite cap reached.
- Invite code expired / already used / not found.
- OTP send failed (disallowed country, rate limited).
- No network / Supabase unreachable (should degrade gracefully, not blank-screen).
- A profile with zero QR codes issued yet (prompt to create the first one).
- A profile with zero alerts/allergies/conditions/medications/contacts filled in yet
  (encourage completion — the go-to-market plan's key activation metric is "70% of
  sign-ups complete their profile").

## 9. Localization

Three-language UI (`si` default, `ta`, `en`), driven by `app_users.preferred_language`.
Use a standard i18n library (e.g. `react-i18next` or similar) with one string file per
language. These enums need translated labels wherever they appear in this app (same
enums the public scan page already translates — match its terms where you can, for
consistency between what a family member edits and what a stranger later sees):
`alert_code`, `allergy_severity`, `contact_relationship` (gendered — son/daughter have
different words in Sinhala and Tamil, don't collapse them), `medication_kind`,
`blood_group`, `profile_for`. There is no existing string source for this management
app specifically (the scan page's translations are scan-page-only) — these need to be
written fresh, ideally by/reviewed by a native Sinhala and Tamil speaker before launch
(flagged as an open item in the architecture doc too).

## 10. Explicitly out of scope for this frontend

- The public scan page (`/s/{token}`) — already built, server-rendered, separate
  codebase. Do not rebuild it; only the live-preview pane (§4.5) needs to visually
  approximate it, and that's done by calling the real preview RPC, not recreating the
  template.
- Payments / billing for physical cards, family plans, or organization contracts (per the
  go-to-market plan, these are real future revenue streams, but there is no payment
  integration decision made yet — do not add a payment flow speculatively).
- Push notifications / reminder scheduling system (the "confirm info" 3-month nudge is a
  banner on next login for v1, not a notification infrastructure).
- Admin/insurer/employer-facing bulk-management tooling (a B2B portal for organizations
  issuing many cards at once) — a real future need per the go-to-market plan, but a
  separate project, not part of this consumer-facing app.
- Any hospital/FHIR integration — explicitly a later phase per the go-to-market plan.

## 11. Source documents

Build strictly against:
- `docs/architecture-for-frontend.md` — exact schema, RPCs, security model, auth flow,
  constraints. This is the technical ground truth; re-check it before guessing at any
  field or function name.
- `Emergency Medical QR – Sri Lanka Go-To-Market Strategy.md` — product framing,
  target users, positioning, and which features matter for the business (used above to
  decide what deserves emphasis: live preview as a trust mechanism, printable card,
  family sharing via invite code, update-confirmation cadence, data export).

If backend behavior needed for a screen isn't fully covered in the architecture doc
(e.g. the precise effect of `prepare_account_deletion` on owned profiles), say so
explicitly in the UI copy or flag it as a TODO rather than inventing behavior that
doesn't match the real backend.
