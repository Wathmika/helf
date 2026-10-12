# Backend setup guide (Python + Supabase + AWS)

This guide takes you from nothing to a working backend: first on your own
computer with fake data, then live on Supabase and AWS. Do the steps in
order. Each part ends with a **Check** so you know it worked.

> **Rule until the security checklist is done:** sample data only. Don't
> put any real person's health information into either database.

---

## 1. How the pieces fit together

```
Phone camera ──scan──▶ Python backend: GET /s/<token> ──secret key──▶ get_scan_profile()   ─┐
                                                                                             │
React app (later) ──user's login──▶ Supabase tables (row-level security) ───────────────────┤ Supabase
                                                                                             │ (Mumbai)
Supabase Auth ── "send a login code" ──▶ Python: /hooks/send-sms ──▶ Notify.lk / Text.lk / Twilio
Database ── "a QR was scanned" ──▶ Python: /internal/notify-family ──▶ Amazon SES email
Database (every 15 min) ──▶ Python: /internal/purge-files ──▶ removes photos of deleted people
React app ── "delete my account" ──▶ Python: /account/delete
```

| Folder / file | What it is |
|---|---|
| `supabase/migrations/` | The database design (SQL). Applied in filename order. |
| `supabase/seed.sql` | Sunil Perera sample data. **Local only.** |
| `supabase/tests/security_checks.sql` | Privacy and security checks for the database. |
| `supabase/config.toml` | Settings for the local copy of Supabase. |
| `backend/src/app/` | The Python backend (FastAPI). |
| `backend/src/app/routes/` | One file per group of endpoints. |
| `backend/src/app/templates/scan.html` | The scan page. |
| `backend/src/app/scan_text.py` | Scan page wording in Sinhala, Tamil, English. |
| `backend/tests/` | 36 Python tests. |
| `backend/template.yaml` | AWS deployment description (SAM). |
| `docs/scan-page-preview-*.html` | What the scan page looks like, in each language. |

---

## 2. Install the tools (once)

1. **Python 3.12 or newer**: <https://www.python.org/downloads/>
2. **Node.js 20 or newer** (only for the Supabase command-line tool): <https://nodejs.org>, choose "LTS".
3. **Docker Desktop**: <https://www.docker.com/products/docker-desktop/>. Start it and leave it running; local Supabase runs inside it.
4. In the project folder, install the Supabase command-line tool:
   ```bash
   npm init -y
   npm install supabase --save-dev
   npx supabase --version
   ```

AWS tools come later, in section 5.

---

## 3. Run everything on your computer

### 3.1 Secrets for local use

Make two random secrets and keep the output for the next steps:

```bash
echo "v1,whsec_$(openssl rand -base64 32)"    # the SMS hook secret
openssl rand -hex 32                           # run 3 times: notify, purge, IP salt
```

Create `supabase/.env` with the hook secret (the Supabase settings file reads it):

```
SEND_SMS_HOOK_SECRETS=v1,whsec_...
```

### 3.2 Start Supabase and load the database

```bash
npx supabase start          # first run downloads a lot; takes several minutes
npx supabase db reset       # applies all migrations and loads Sunil Perera
```

`supabase start` prints addresses and keys at the end. `npx supabase status`
shows them again any time.

**Check:** Studio at <http://127.0.0.1:54323> → Table Editor → `people` shows Sunil Perera.

### 3.3 Run the database security checks

```bash
docker exec -i supabase_db_medi psql -U postgres < supabase/tests/security_checks.sql
```

**Check:** the last line says `ALL CHECKS PASSED`. If a line starts with
`FAIL`, stop and send me the output. The checks undo themselves, so run
them as often as you like. Run them after every database change.

### 3.4 Set up the Python backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env
```

Open `backend/.env` and fill in:

| Setting | Value |
|---|---|
| `SUPABASE_SECRET_KEY` | the **service_role** (or **secret**) key from `npx supabase status` |
| `IP_HASH_SALT` | one of your `openssl rand -hex 32` values |
| `SEND_SMS_HOOK_SECRET` | exactly the same as in `supabase/.env` |
| `NOTIFY_FAMILY_SECRET`, `PURGE_FILES_SECRET` | the other two random values |

Leave `SMS_DRY_RUN=true` and `EMAIL_DRY_RUN=true`: nothing is really sent.

**Check:** run the tests.

```bash
python -m pytest
```

You should see `36 passed`.

### 3.5 Start the backend and open the scan page

```bash
uvicorn app.main:app --app-dir src --env-file .env --reload --port 8000
```

Leave it running. `--reload` restarts it whenever you save a file.

**Check:** open <http://localhost:8000/s/devonly_SunilPerera_0001>.
You'll see Sunil's emergency page. Try the සිං / தமி / EN buttons.

### 3.6 Let the database call your backend (scan alerts)

In Studio → SQL Editor, run this once (with your two values from 3.1):

```sql
select vault.create_secret('http://host.docker.internal:8000/internal/notify-family', 'notify_family_url');
select vault.create_secret('<NOTIFY_FAMILY_SECRET value>',                             'notify_family_secret');
select vault.create_secret('http://host.docker.internal:8000/internal/purge-files',   'purge_files_url');
select vault.create_secret('<PURGE_FILES_SECRET value>',                               'purge_files_secret');
update public.emergency_contacts set email = 'you@example.com' where name = 'Kasun';
```

**Check:** reload the scan page. In the terminal running uvicorn you'll
see `[dry run] would email scan … alert to contact #1`.

### 3.7 Try a login code by hand (optional)

```bash
export API=http://127.0.0.1:54321
export ANON=...the anon (or publishable) key from npx supabase status...

curl -s -X POST "$API/auth/v1/otp" -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d '{"phone":"+94770000001"}'
curl -s -X POST "$API/auth/v1/verify" -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d '{"type":"sms","phone":"+94770000001","token":"123456"}'
```

The second answer contains an `access_token`: that's Kasun logged in.
Test numbers (`94770000001` to `…03`, code `123456`) never send an SMS. Any
other number goes to your backend's `/hooks/send-sms`, which only logs
while `SMS_DRY_RUN=true`.

---

## 4. The live Supabase project

### 4.1 Create it

1. <https://supabase.com/dashboard> → **New project**.
2. Region: **South Asia (Mumbai)**.
3. Database password: generate a long one; keep it in a password manager.
4. **Plan:** free projects are paused after a period of inactivity, and a paused project means every scan fails. Free is fine while building; move to a paid plan before any real card is printed.

### 4.2 Push the database design

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push                 # migrations only, NOT the sample data
```

**Check:** Dashboard → Table Editor shows the tables, all empty.

### 4.3 Dashboard settings

| Where | Setting |
|---|---|
| Authentication → Sign In / Providers → Phone | Enable phone sign-in. |
| Authentication → Sign In / Providers → Email | Disable (phone only). |
| Authentication → Rate Limits | SMS sent per hour: start at 30. |
| API settings → Exposed schemas | `public` only (never `private`). |
| Authentication → Hooks → Send SMS | Done in section 5.4, once the backend has an address. |

---

## 5. Deploy the backend to AWS (Mumbai)

### 5.1 Install the AWS tools

1. **AWS CLI**: <https://aws.amazon.com/cli/>
2. **AWS SAM CLI**: <https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html>
3. Sign in: create an IAM user for yourself (not the root account), turn on MFA, then run `aws configure` and choose region `ap-south-1`.

### 5.2 Build and deploy

```bash
cd backend
sam build
sam deploy --guided
```

Answer the questions:

- Stack name: `medi-backend`
- Region: `ap-south-1`
- Each parameter: the live values. Use **new** random secrets, not your local ones. Keep `SmsDryRun` and `EmailDryRun` as `true` for now.
- "Save arguments to samconfig.toml": **yes**. This file then holds your
  answers, including the secrets, so it's listed in `.gitignore`: never
  commit or share it.

After a few minutes it prints **ApiUrl**, like
`https://abc123.execute-api.ap-south-1.amazonaws.com`.

**Check:** open `<ApiUrl>/health` and you'll see `{"status":"ok"}`.

From now on, after changing code: `sam build && sam deploy`. To change a
setting, edit its value in `samconfig.toml` (`parameter_overrides`) and
run `sam deploy` again.

### 5.3 Tell the live database where the backend is

Supabase Dashboard → SQL Editor:

```sql
select vault.create_secret('<ApiUrl>/internal/notify-family', 'notify_family_url');
select vault.create_secret('<live NOTIFY_FAMILY_SECRET>',      'notify_family_secret');
select vault.create_secret('<ApiUrl>/internal/purge-files',   'purge_files_url');
select vault.create_secret('<live PURGE_FILES_SECRET>',        'purge_files_secret');
```

**Check:** Dashboard → Integrations → Cron shows `daily-maintenance` and `purge-person-files`.

### 5.4 Connect the SMS hook

Authentication → Hooks → **Send SMS** → type **HTTPS**, URL `<ApiUrl>/hooks/send-sms`,
click **Generate secret**. Copy it into `SendSmsHookSecret` in
`samconfig.toml`, then run `sam deploy`.

> **Before printing any card:** the `execute-api` address is temporary.
> QR codes must point at your own domain (e.g. `https://yourdomain.lk/s/…`)
> forever. We'll put CloudFront and your domain in front when we build the
> React app, and then set `TrustedIpHeader` to `cloudfront-viewer-address`.

---

## 6. Email alerts with Amazon SES

1. AWS console → region **ap-south-1** → Amazon SES → **Identities → Create identity → Domain**. Add the DKIM records to your domain's DNS and wait for *Verified*.
2. New accounts are in the **sandbox**: they can only send to verified addresses. Verify your own email to test. Before real users, request **production access** and describe the alerts honestly.
3. No access keys are needed: the template already allows the Lambda to send email from `SesFromAddress` only.
4. In `samconfig.toml` set `SesFromAddress` to `alerts@yourdomain.lk` and `EmailDryRun` to `false`, then `sam deploy`.

**Check:** put your verified email on a test contact, scan its QR, and the
alert arrives within a minute. AWS console → CloudWatch → Log groups →
`/aws/lambda/medi-backend-…` shows each request.

---

## 7. Login codes by SMS

**Sri Lankan numbers:** open an account with **Notify.lk** or **Text.lk**,
add a little credit, and apply for your own **Sender ID** (your brand name).
Notify.lk asks you not to send login codes with its demo sender, so wait for
approval.

**Overseas numbers:** a **Twilio** account with a Messaging Service. In
Twilio → Messaging → Settings → **Geo permissions**, enable only the
countries in `AllowedSmsCountryCodes`. This is a second fence against bots
running up SMS costs.

Put the provider values in `samconfig.toml`, set `SmsDryRun` to `false`, and `sam deploy`.

**Check:** log in on the live project with your own phone. The code
arrives. The logs show the provider and a partly hidden number, never the code.

---

## 8. Scan page speed (decision pending)

Lambda sleeps when unused. The first request after a quiet period waits
while it starts ("cold start"); the app itself takes about 0.4 s to load.
With few users at launch, most scans will be cold. Options, cheapest first:

| Option | Effect | Cost |
|---|---|---|
| Do nothing | Occasional extra wait of roughly 1 s or more | Free |
| SnapStart (uncomment in `template.yaml`) | Shorter cold starts | Small |
| Provisioned concurrency = 1 (uncomment) | No cold starts for one request at a time | A few USD per month |
| Always-on container (App Runner) | No cold starts | More per month |

We'll measure on the real deployment and decide together.

---

## 9. Troubleshooting

| Problem | Likely cause |
|---|---|
| Scan page says the information can't be loaded | Wrong `SUPABASE_URL` / `SUPABASE_SECRET_KEY`, or Supabase is paused. |
| `permission denied for function get_scan_profile` | Correct when using the public key. Only the backend's secret key may scan. |
| Login code never arrives | `SmsDryRun` still `true`, Sender ID not approved, or country not allowed. Check the logs. |
| "Invalid signature" in the logs | `SEND_SMS_HOOK_SECRET` differs from the secret in Auth → Hooks. |
| No alert emails | Contact has no email or alerts are off; Vault secrets missing; SES in sandbox; `EmailDryRun` still `true`. |
| `supabase start` fails | Docker Desktop isn't running. |
| `ModuleNotFoundError: app` | Run uvicorn from the `backend` folder with `--app-dir src`. |
