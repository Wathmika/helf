# helf — the website (helf.lk)

One React + Vite project: the public pages, sign-in and the family dashboard.

| Address | What it is |
|---|---|
| `/` | Public home page (`src/site/`) |
| `/login`, `/login/email` | Sign in with a phone or email code |
| `/login/otp`, `/login/welcome` | Enter the code; first-time name and language |
| `/dashboard` | Your family: everyone you look after |
| `/dashboard/profiles/new` | Add a profile |
| `/dashboard/invite` | Join a profile with an invite code |
| `/dashboard/person/:id` | Profile editor with the live scan preview |
| `/dashboard/person/:id/qr` | QR codes, printable card, scan history |
| `/dashboard/account` | Name, language, data download, delete account |
| `/scan.html` | The scan-page design (a static sample) |

The live scan page, `/s/{token}`, is served by the backend, not by this
project; the host must route `/s/*` there.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173 — real backend (needs .env)
npm run dev:demo   # http://localhost:5199 — sample data, no backend
```

`.env` (git-ignored) holds `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
(anon key only, never the service_role key), `VITE_BACKEND_API_URL` and
`VITE_SCAN_PAGE_ORIGIN`. See `.env.example`. Port 5173 is the one local
address the backend's `APP_ORIGINS` allows.

## Walk through the whole system in one go

Start `npm run dev:demo` and open **http://localhost:5199/?demo=family**
(`?demo=family` loads a sample family of three; demo mode never sends
anything anywhere):

1. **Home page** — scroll the public site; try the scan demo and flip the
   wallet card.
2. **Sign in** — press *Sign in*, type any Sri Lankan mobile number (e.g.
   `077 123 4567`), then any 6 digits as the code; give a name and language.
3. **Your family** — three people; Amma is overdue for a check.
4. **Profile editor** — open *Thaththa*: flip any "On scan" switch and watch
   the phone preview and the *Kept private* list change; add an allergy;
   tick an alert.
5. **Overdue check** — open *Amma (Sriyani)* and press *Nothing has changed*;
   back on *Your family* her bar resets.
6. **QR codes** — from a profile, open *QR codes*: make a new QR, switch one
   off, see the printable card #78 and the scan history.
7. **Empty profile** — open *Kasun* to see the first-run states.
8. **Account** — rename yourself, switch the app to Sinhala or Tamil,
   download a profile's data, and read what deleting the account would do.
9. **Sign out** from the sidebar.

To do the same against the real database, run `npm run dev` and sign in
with a real phone number.

## Checks

```bash
npx tsc -b --noEmit
npm run lint
npm run build
```
