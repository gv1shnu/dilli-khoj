# Dilli Khoj

Dilli Khoj is a classroom-friendly PostgreSQL treasure hunt set in a fictional, post-collapse Delhi. Students explore twenty ruins, practise against PostgreSQL in the browser, and submit safe read-only queries to an authoritative hidden-case judge.

Current milestone: **all 20 ruins playable locally**; authoritative grading live for Ruin 06.

## What works now

- Roamable 3D overgrown-ruins world (Three.js): animated character, third-person orbit camera, wind-swept grass, guide arrows to the nearest amber archive, procedural ambience, and a first-run how-to-play overlay.
- All 20 ruins are playable locally through an archive browser: open any ruin, read the question (title → description → sample output → hints), Run against PostgreSQL in a PGlite Web Worker, with saved SQL drafts and local practice progress.
- Three datasets per question; the visible case's expected rows are computed by real PostgreSQL. Canonical/authoring solutions are excluded from production builds.
- Authoritative Edge Function judge (PostgreSQL 17 parsing, hidden cases, idempotent XP, restricted roles) — grades **Ruin 06**; ruins 1–5 and 7–20 are drafted and await server fixtures.
- 7 districts and the XP economy are encoded (`src/game/ruins.ts`, `src/game/scoring.ts`).
- Admin **Question Studio** (dev-only, `#admin`): every ruin tagged by level/district/topic, each with its visible test case; edit and add questions locally and export JSON to commit.
- CI (typecheck, tests, build, Deno judge check) and Cloudflare/Supabase deploy workflows.

Not yet live: real sign-in and authoritative grading beyond Ruin 06. Local practice is non-scoring and never a progression authority. See [implementation status](docs/implementation-status.md) and the [deployment runbook](docs/deployment-runbook.md).

## Run locally

Prerequisites: current Node.js and pnpm.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

The app runs without a publishable key in development mode: local **Run** works, while Google sign-in and authoritative **Submit** explain what is missing. To enable authentication, replace the placeholder in `.env.local` with the Supabase browser publishable key. Never place a secret/service-role key in a `VITE_` variable.

## Author questions (dev only)

Open `http://localhost:5173/#admin` while running `pnpm dev` for the **Question Studio**: every ruin tagged by level, district and topic, with its visible test case. Edit or add questions there (changes persist in the browser) and use **Export JSON** to save them for committing. This view and all canonical solutions are stripped from production builds. Regenerate the practice fixtures/expected rows with:

```bash
pnpm content:generate
```

## Verify

```bash
pnpm test
pnpm typecheck
pnpm build
```

The build emits PGlite's PostgreSQL WebAssembly and data files. They are the dominant payload; preload the game before a synchronized classroom launch.

## Deploy the static shell

Production origin: `https://dilli-khoj.treasure-hunt.workers.dev`

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
- [Deployment runbook (zero to live URL)](docs/deployment-runbook.md)
- [Supabase and Google setup](docs/setup-supabase-google.md)
- [Decisions and open items](docs/decisions-and-open-items.md)

## Repository rules

1. Every ruin must map to `docs/curriculum-map.md` and meet `docs/question-authoring.md`.
2. Browser **Run** is free and untrusted; only server **Submit** changes progression.
3. Never commit database passwords, OAuth secrets, Supabase secret keys or Cloudflare tokens.
4. Infrastructure changes update the architecture and setup docs in the same change.
5. Keep the game educational, playful and classroom-friendly, with limited humour.
