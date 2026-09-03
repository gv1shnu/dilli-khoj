# Dilli Khoj

Dilli Khoj is a classroom-friendly PostgreSQL treasure hunt set in a fictional, post-collapse Delhi. Students explore twenty ruins, practise against PostgreSQL in the browser, and submit safe read-only queries to an authoritative hidden-case judge.

Current milestone: **foundation vertical slice** — Ruin 06 at Chandni Chowk.

## What works now

- Roamable Three.js ruin with WASD/arrow movement and collisions.
- A short Module 3 `SELECT`/`WHERE` question in the fixed title → description → sample output → hints format.
- PostgreSQL-compatible local practice in a PGlite Web Worker with IndexedDB persistence.
- Instant visible-case pass/fail feedback, result preview and query errors.
- Google OAuth client wiring for Supabase.
- An authenticated Edge Function judge with PostgreSQL 17 parsing, three result fixtures and idempotent XP awards.
- Separate executor/progression database roles, a per-player submission lease, cooldown and tight transaction timeouts.
- Cloudflare Workers Static Assets configuration for the production origin.
- Versioned Supabase auth, profile, progress, attempt and Ruin 06 fixture migrations.
- Unit tests for query-policy edge cases and ordered result comparison.

The judge code is not deployed yet. It needs the two restricted transaction-pooler URLs, the client publishable key, migrations and Google Auth configuration. Until then, local practice is intentionally labelled development mode and is never a progression authority.

## Run locally

Prerequisites: current Node.js and pnpm.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

The app runs without a publishable key in development mode: local **Run** works, while Google sign-in and authoritative **Submit** explain what is missing. To enable authentication, replace the placeholder in `.env.local` with the Supabase browser publishable key. Never place a secret/service-role key in a `VITE_` variable.

## Verify

```bash
pnpm test
pnpm typecheck
pnpm build
```

The build emits PGlite's PostgreSQL WebAssembly and data files. They are the dominant payload; preload the game before a synchronized classroom launch.

## Deploy the static shell

Production origin: `https://treasure-hunt.example.workers.dev`

```bash
pnpm deploy
```

Deploy only after `.env.local` contains the intended publishable key and the Supabase URL allowlist includes the production origin. Wrangler authentication remains in the developer's local account; no Cloudflare token belongs in Git.

## Continuous integration and deployment

GitHub Actions workflows live in `.github/workflows/`:

- **`ci.yml`** — runs on every push and pull request. Typechecks the browser, node and edge-function projects, runs the vitest suite, builds the production bundle, and type-checks the judge under the Deno runtime it deploys on. No secrets required.
- **`deploy-web.yml`** — deploys the static game shell to Cloudflare Workers Static Assets on pushes to `main` (or manual dispatch). The publishable key is inlined at build time, then the pinned Wrangler deploys `dist/`.
- **`deploy-supabase.yml`** — **manual only** (`workflow_dispatch`). Pushes database migrations and deploys the `judge-query` Edge Function, with per-run toggles for each. Kept off automatic triggers so schema changes are always deliberate.

### Required GitHub configuration

Set these in **Settings → Secrets and variables → Actions** before deploying.

| Kind | Name | Used by | Notes |
| --- | --- | --- | --- |
| Secret | `CLOUDFLARE_API_TOKEN` | deploy-web | Token with "Edit Cloudflare Workers" permissions |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | deploy-web | Cloudflare account id |
| Secret | `VITE_SUPABASE_PUBLISHABLE_KEY` | deploy-web | Browser publishable key (`sb_publishable_...`) |
| Variable | `VITE_SUPABASE_URL` | deploy-web | e.g. `https://your-project-ref.supabase.co` |
| Secret | `SUPABASE_ACCESS_TOKEN` | deploy-supabase | Supabase personal access token |
| Secret | `SUPABASE_DB_PASSWORD` | deploy-supabase | Database password for `db push` |
| Variable | `SUPABASE_PROJECT_REF` | deploy-supabase | e.g. `your-project-ref` |

The publishable key is safe in the browser bundle; still store it as a secret so it is not printed in logs. **Never** add a Supabase secret/service-role key, a database URL, or the two judge-role passwords to Actions — the judge-role passwords and the `JUDGE_*_DATABASE_URL` Edge Function secrets are configured manually per `docs/setup-supabase-google.md`, and `deploy-supabase.yml` assumes they already exist server-side.

## Documentation

- [Product specification](docs/product-spec.md)
- [Curriculum and twenty-ruin map](docs/curriculum-map.md)
- [Question authoring and tests](docs/question-authoring.md)
- [Submission architecture](docs/submission-architecture.md)
- [Implementation status](docs/implementation-status.md)
- [Supabase and Google setup](docs/setup-supabase-google.md)
- [Decisions and open items](docs/decisions-and-open-items.md)

## Repository rules

1. Every ruin must map to `docs/curriculum-map.md` and meet `docs/question-authoring.md`.
2. Browser **Run** is free and untrusted; only server **Submit** changes progression.
3. Never commit database passwords, OAuth secrets, Supabase secret keys or Cloudflare tokens.
4. Infrastructure changes update the architecture and setup docs in the same change.
5. Keep the game educational, playful and classroom-friendly, with limited humour.
