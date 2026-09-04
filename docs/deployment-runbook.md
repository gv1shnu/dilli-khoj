# Deployment runbook (zero to live URL)

This is the hand-holding guide. Follow it top to bottom the first time. It takes you
from nothing to a working, signed-in, judge-graded game at
`https://dilli-khoj.treasure-hunt.workers.dev`.

If you only want to *see* the game deployed (roaming + local **Run** working, with
sign-in and **Submit** showing "development mode" messages), you can stop after
**Part F** (Cloudflare). Sign-in and graded **Submit** need Parts B–E as well.

## The pieces and why each exists

| Piece | What it does | Who hosts it |
| --- | --- | --- |
| **Cloudflare** | Serves the game (HTML/JS/WASM) to students | Cloudflare Workers Static Assets |
| **Google OAuth** | "Sign in with Google" identity | Google Cloud |
| **Supabase Auth** | Verifies the Google login, restricts to your two domains | Supabase |
| **Supabase Postgres** | Stores profiles, progress, XP; holds the hidden fixtures | Supabase |
| **Judge (Edge Function)** | Grades **Submit** against hidden cases, awards XP | Supabase |
| **GitHub Actions** | Builds and deploys automatically | GitHub |

### Order of operations (do not reorder)

1. **A** — Install local tools.
2. **B** — Google Cloud: create the OAuth client. *(You get a Client ID + Secret.)*
3. **C** — Supabase dashboard: API key, URL config, enable Google, domain hook.
4. **D** — Supabase CLI: apply migrations to the live database.
5. **E** — Judge roles + secrets, then deploy the judge.
6. **F** — Cloudflare: deploy the site (locally or via GitHub Actions).
7. **G** — GitHub: add secrets so future deploys are automatic.
8. **H** — Verify everything end to end.

### Golden security rules (read once, keep forever)

- **Never paste** a password, OAuth **Client Secret**, database URL, Supabase
  **secret/service-role** key, or Cloudflare token into a chat, a commit, or a
  `VITE_` variable. The `VITE_` prefix ships to every student's browser.
- The **publishable key** (`sb_publishable_...`) is the *only* Supabase key that is
  safe in the browser. Everything else stays server-side.
- Enter passwords only in the CLI prompt or the dashboard, never on a shell line
  (shell history remembers them).

Project facts you will reuse (all public, safe to see):

- Supabase project ref: `your-project-ref`
- Supabase URL: `https://your-project-ref.supabase.co`
- Production origin: `https://dilli-khoj.treasure-hunt.workers.dev`
- Approved email domains: `example.edu`, `students.example.edu`

---

## Part A — Install local tools (once)

You need these on your Mac. Open **Terminal** and run each check.

1. **Node.js 20+** and **pnpm**:
   ```bash
   node -v
   corepack enable
   corepack prepare pnpm@latest --activate
   pnpm -v
   ```
   If `node -v` fails, install Node from https://nodejs.org (LTS) or `brew install node`.

2. **Supabase CLI** (for migrations and deploying the judge):
   ```bash
   brew install supabase/tap/supabase
   supabase --version
   ```

3. **psql** (to set the two judge passwords). It comes with the Postgres client:
   ```bash
   brew install libpq
   brew link --force libpq
   psql --version
   ```

4. Get the project and install dependencies:
   ```bash
   cd /Users/YOUR_NAME/Dev/treasure-hunt
   pnpm install
   ```

**Checkpoint A:** `node -v`, `pnpm -v`, `supabase --version`, and `psql --version`
all print a version.

---

## Part B — Google Cloud: create the OAuth client

You will end this part holding a **Client ID** and a **Client Secret**.

1. Go to https://console.cloud.google.com and sign in with an account in your
   Google Workspace (the one that owns `example.edu`).
2. Top bar → project dropdown → **New Project**. Name it `Dilli Khoj`. Create it,
   then make sure it is selected in the top bar.
3. In the search bar type **Google Auth Platform** (or "OAuth consent screen") and open it.
4. **Branding / consent screen:**
   - App name: `Dilli Khoj`
   - User support email: an address you monitor
   - Developer contact email: your email
5. **Audience:** choose **Internal**. (Both approved domains are in the same
   Workspace org, so Internal is correct and avoids Google's verification review.)
6. **Scopes:** add only `openid`, `email`, and `profile`. Do **not** add Drive,
   Calendar, or contacts scopes.
7. Left menu → **Clients** → **Create client**:
   - Application type: **Web application**
   - Name: `Dilli Khoj Web`
   - **Authorized JavaScript origins** — add both:
     - `https://dilli-khoj.treasure-hunt.workers.dev`
     - `http://localhost:5173`
   - **Authorized redirect URIs** — add exactly this one (this is Supabase's callback):
     - `https://your-project-ref.supabase.co/auth/v1/callback`
8. Click **Create**. A dialog shows your **Client ID** and **Client Secret**.
   Keep this tab open (or copy both into your password manager). **Do not paste the
   secret into chat or Git.**

**Checkpoint B:** you have a Client ID (ends in `.apps.googleusercontent.com`) and a
Client Secret, and the redirect URI above is listed on the client.

---

## Part C — Supabase dashboard: keys, URLs, Google, domain hook

Open https://supabase.com/dashboard and select project `your-project-ref`.

### C1. Get the publishable key

1. Left sidebar → **Project Settings** (gear) → **API Keys**.
2. Copy the **publishable** key (starts with `sb_publishable_...`).
   - Do **not** copy the `secret` / `service_role` key. That one never leaves the server.
3. Paste it into your local `.env.local` (create it if missing):
   ```dotenv
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_real_key_here
   ```
   (The file is already git-ignored.)

### C2. URL configuration

1. Left sidebar → **Authentication** → **URL Configuration**.
2. **Site URL:** `https://dilli-khoj.treasure-hunt.workers.dev`
3. **Redirect URLs** — add:
   - `https://dilli-khoj.treasure-hunt.workers.dev/**`
   - `http://localhost:5173/**`
   (The `/**` lets any path under that origin complete a login.)

### C3. Enable Google

1. **Authentication** → **Providers** (or **Sign In / Providers**) → **Google**.
2. Toggle it **on**.
3. Paste the **Client ID** and **Client Secret** from Part B.
4. Save.

### C4. Turn off what you do not use

1. In **Providers**, make sure **Email** signup and **Anonymous** sign-ins are
   **disabled**. Only Google should be enabled.

### C5. Domain restriction hook

The migration (Part D) creates a database function
`public.hook_restrict_dilli_khoj_signup` that rejects any account whose email is not
`@example.edu` or `@students.example.edu`. You just point Auth at it.

1. **Authentication** → **Hooks** (Auth Hooks).
2. Add a **Before User Created** hook.
3. Type: **Postgres function**. Schema `public`, function
   `hook_restrict_dilli_khoj_signup`.
4. Enable it.

> If the function is not selectable yet, do Part D first, then come back to C5.

**Checkpoint C:** publishable key is in `.env.local`; Site URL and redirect URLs are
set; Google shows "enabled"; email/anonymous are off.

---

## Part D — Apply the database migrations

This creates the tables, the RLS policies, the signup hook, the judge roles, and the
Ruin 06 fixtures on the **live** database.

1. Log in and link the CLI to the project:
   ```bash
   cd /Users/YOUR_NAME/Dev/treasure-hunt
   supabase login
   supabase link --project-ref your-project-ref
   ```
   `link` asks for the **database password**. It is in the dashboard under
   **Project Settings → Database → Database password** (reset it there if unknown).
   Type it at the prompt — never on the command line.

2. Push the migrations:
   ```bash
   supabase db push
   ```
   It lists the migration files and asks to confirm. Say yes.

**Checkpoint D:** `supabase db push` finishes without error. In the dashboard,
**Table Editor** shows the game tables and **Database → Roles** shows
`dilli_judge_executor` and `dilli_judge_progress`.

---

## Part E — Judge roles, secrets, and deploy

The two judge roles were created **without passwords**. You set the passwords with
`psql`, build one connection URL per role, store them as Edge Function secrets, then
deploy the judge.

### E1. Set the two role passwords (psql, no echo)

1. Get a direct `psql` connection string: dashboard → **Connect** (top bar) →
   **psql** tab. It looks like:
   ```
   psql "postgresql://postgres:[YOUR-PASSWORD]@db.your-project-ref.supabase.co:5432/postgres"
   ```
   Replace `[YOUR-PASSWORD]` with the database password and run it.

2. At the `postgres=#` prompt, set each password. `\password` prompts you and never
   writes the password to history:
   ```text
   \password dilli_judge_executor
   \password dilli_judge_progress
   ```
   Choose two strong, different passwords. Keep them in your password manager.
   Type `\q` to quit.

### E2. Build the two pooler URLs

1. Dashboard → **Connect** → **Transaction pooler** tab. Note the **host** (looks
   like `aws-0-<region>.pooler.supabase.com`) and the port **6543**.
2. The pooler username has the form `ROLE.PROJECT_REF`. Build each URL, URL-encoding
   any special characters in the password (e.g. `@` → `%40`):
   ```dotenv
   JUDGE_EXECUTOR_DATABASE_URL=postgresql://dilli_judge_executor.your-project-ref:EXECUTOR_PW@POOLER_HOST:6543/postgres
   JUDGE_PROGRESS_DATABASE_URL=postgresql://dilli_judge_progress.your-project-ref:PROGRESS_PW@POOLER_HOST:6543/postgres
   ```
3. Put both lines in a local, git-ignored file named `.env.judge` (never commit it).
   Do **not** use the `postgres`/owner URL for either one.

### E3. Upload the secrets and deploy the judge

```bash
supabase secrets set --env-file .env.judge
supabase functions deploy judge-query
```

`secrets set` stores the URLs server-side (they never ship to the browser). Deploy
uploads the judge. After it succeeds you can delete `.env.judge` if you like — the
secrets already live in Supabase.

**Checkpoint E:** `supabase functions deploy judge-query` prints a success URL. In the
dashboard, **Edge Functions** lists `judge-query`, and **Edge Functions → Secrets**
shows `JUDGE_EXECUTOR_DATABASE_URL` and `JUDGE_PROGRESS_DATABASE_URL`.

### E4. (Optional) Test locally before deploying the site

```bash
pnpm dev
```
Open http://localhost:5173. With `.env.local` filled in, **Sign in with Google**
should work with a `@example.edu` / `@students.example.edu` account and be
**rejected** for a normal `@gmail.com` account. **Submit** should now return a real
verdict instead of the development-mode message.

---

## Part F — Cloudflare: deploy the site

You can deploy from your laptop first (simplest), then automate it in Part G.

The target URL is `https://dilli-khoj.treasure-hunt.workers.dev`, which decodes as
`<worker-name>.<account-subdomain>.workers.dev` — worker **`dilli-khoj`** (already set
in `wrangler.jsonc`) on the account whose `workers.dev` **subdomain is `treasure-hunt`**.

### F0. Set the account subdomain to `treasure-hunt` (once)

The `workers.dev` subdomain is account-wide. To get the `…treasure-hunt.workers.dev`
part of the URL:

1. Cloudflare dashboard → **Workers & Pages**.
2. On the right, find **Your subdomain** and click **Change** (or set it, if unset).
3. Enter `treasure-hunt` and save. It must be globally available; if it is taken you
   will need a different subdomain (then update the origin in `wrangler.jsonc` docs,
   Supabase Site URL, and Google origins to match).

Changing the subdomain renames the URL of every Worker on this account and breaks the
old URLs — expected here, since this account is dedicated to Dilli Khoj.

### F1. First deploy from your laptop

The owner-confirmed account ID is `a34c3ecff69a697ae99c602e883ddb53`,
pinned in `wrangler.jsonc`. Before deploying, run `pnpm exec wrangler whoami`
and confirm the authenticated user has access to this account. If not, log out
and log in to the intended account; do not change the pinned ID to bypass an
authentication error. Any `CLOUDFLARE_ACCOUNT_ID` environment variable must match
this ID too. The intended URL remains `https://dilli-khoj.treasure-hunt.workers.dev`.

```bash
cd /Users/YOUR_NAME/Dev/treasure-hunt
pnpm deploy
```
The first run opens a browser to log in to Cloudflare (`wrangler login`). This uses
your own Cloudflare account — no token needed for a local deploy.

`pnpm deploy` runs `pnpm build` then `wrangler deploy`, which uploads `dist/` to the
Workers Static Assets project defined in `wrangler.jsonc`.

**Checkpoint F:** the command prints a live URL. Open
`https://dilli-khoj.treasure-hunt.workers.dev` — the game loads, the intro overlay
appears, and local **Run** works.

---

## Part G — GitHub Actions: automatic deploys

Now wire up the pipeline so a push to `main` deploys for you. The workflows already
exist in `.github/workflows/`; they just need secrets.

### G1. Get the two Cloudflare values

1. **Account ID:** Cloudflare dashboard → **Workers & Pages** → right sidebar shows
   **Account ID**. It must match the pinned ID `a34c3ecff69a697ae99c602e883ddb53`.
2. **API token:** Cloudflare dashboard → **My Profile** → **API Tokens** →
   **Create Token** → template **Edit Cloudflare Workers** → create → copy the token
   (shown once).

### G2. Get the Supabase access token

1. https://supabase.com/dashboard/account/tokens → **Generate new token** → copy it.

### G3. Add them to GitHub

In the GitHub repo → **Settings** → **Secrets and variables** → **Actions**.

**Secrets** (New repository secret):

| Name | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | the token from G1 |
| `CLOUDFLARE_ACCOUNT_ID` | the account id from G1 |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | your `sb_publishable_...` key |
| `SUPABASE_ACCESS_TOKEN` | the token from G2 |
| `SUPABASE_DB_PASSWORD` | the database password |

**Variables** (Variables tab → New repository variable):

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://your-project-ref.supabase.co` |
| `SUPABASE_PROJECT_REF` | `your-project-ref` |

### G4. Trigger a deploy

- Get the code onto `main` (open a pull request from `build/foundation` and merge it).
- On merge, **Deploy web (Cloudflare)** runs automatically and publishes the site.
- Migrations/judge deploys are **manual**: GitHub → **Actions** →
  **Deploy Supabase (migrations + judge)** → **Run workflow**. Use this only when you
  intend to change the schema or redeploy the judge; the first schema push was Part D.

**Checkpoint G:** the **Actions** tab shows a green **Deploy web** run, and the live
URL reflects your latest commit.

---

## Part H — Verify end to end

On `https://dilli-khoj.treasure-hunt.workers.dev`:

1. Intro overlay appears; roaming works (WASD, mouse-drag, arrows lead to the amber).
2. **Sign in with Google** with an approved-domain account → succeeds, your name shows.
3. Sign in with a normal `@gmail.com` account → **rejected** (the server hook blocks it).
4. Open the Ruin 06 archive → **Run** the starter query → wrong-result verdict.
5. Enter a correct query → **Run** passes the visible case → **Submit** → judge returns
   a pass and awards XP.
6. Submit the same thing again → no double XP (idempotent).

If all six pass, you are live.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Sign-in popup: `redirect_uri_mismatch` | Google redirect URI wrong | It must be exactly `https://your-project-ref.supabase.co/auth/v1/callback` (Part B7). |
| Login returns to a blank/error page | Missing Supabase redirect URL | Add the origin with `/**` in Part C2. |
| Approved account is rejected | Hook mis-wired or migration not applied | Redo Part D, then Part C5. |
| Any account can sign in | Before-User-Created hook not enabled | Enable it (Part C5). |
| Sign-in button does nothing locally | Publishable key missing/placeholder | Fill `.env.local` (Part C1) and restart `pnpm dev`. |
| **Submit**: "development mode" on the live site | Judge not deployed / key missing at build | Do Part E; ensure the deploy build had the publishable key (Part G3). |
| Judge error `JUDGE_EXECUTOR_DATABASE_URL` | Secret not set | Redo Part E3; confirm both secrets exist. |
| Judge `timeout`/`locked` under load | Free-tier database saturated | Expected under bursts; the load-testing/fallback plan in `submission-architecture.md` applies. |
| CI **Deploy web** fails on auth | Cloudflare secret wrong | Recheck `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` (Part G). |
| The project appears "paused" | Supabase Free auto-pause | Open the dashboard to wake it; wake it before any demo. |

## What must never be committed

`.env.local`, `.env.judge`, the Google **Client Secret**, either judge-role password,
the database password, the Supabase **secret/service-role** key, and any Cloudflare or
Supabase token. All of these belong in the dashboard, the CLI prompt, your password
manager, or GitHub Actions secrets — never in the repository.

## Related docs

- Concise version of the auth setup: [setup-supabase-google.md](setup-supabase-google.md)
- How the judge works: [submission-architecture.md](submission-architecture.md)
- Open decisions and defaults: [decisions-and-open-items.md](decisions-and-open-items.md)
