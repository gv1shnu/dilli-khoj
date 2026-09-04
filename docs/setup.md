# Local setup

## Prerequisites

- Git and access to the private `gv1shnu/treasure-hunt` repository.
- Node **22.23.2**, pinned in `.nvmrc` (CI uses Node 22).
- pnpm **11.19.0**, pinned in `package.json`.
- A modern browser; Chrome is the primary support target.

With nvm installed:

```bash
git clone --branch build/foundation https://github.com/gv1shnu/treasure-hunt.git
cd treasure-hunt
nvm install
nvm use
npm install --global pnpm@11.19.0
pnpm install --frozen-lockfile
```

Use your own project folder. Do not copy another laptop's `node_modules`, `dist`, credentials or absolute paths. If using a different Node manager, select the version in `.nvmrc` before installing pnpm.

## Browser configuration

```bash
cp -n .env.example .env.local
pnpm dev
```

Open **http://localhost:5173**. Keep this exact origin for the configured OAuth redirect.

Offline development does not need hosted credentials. If a sign-in gate appears, choose **Continue for local development**. The bypass is excluded from production.

For real Google login, open the existing Supabase project (`your-project-ref`) and copy its browser **publishable** key into `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. The example already supplies the project URL. Restart Vite after changing configuration. Never place a Supabase secret/service-role key, database password or OAuth secret in a `VITE_` variable. Do not print environment files or commit them.

A new laptop does not require recreating the database, OAuth client, Cloudflare site or server secrets. Maintainers should use [auth configuration](setup-supabase-google.md) only when those settings actually need review.

## Verify your checkout

```bash
node --version
pnpm --version
pnpm typecheck
pnpm test
pnpm build
test -s dist/models/soldier.glb
```

Current verification is recorded in [implementation status](implementation-status.md). Known PGlite `eval` and large-bundle warnings do not fail the build.

Browser check: dismiss the intro, use the DEV bypass if offered, run Ruin 01's starter query (it should fail), then solve the stated objective. Confirm the preview opens Ruin 02 and preserves your draft after reload. This only verifies local practice, not official progression or live grading.

## Author questions

Run the dev server and open **http://localhost:5173/#admin**. Question Studio edits remain browser-local until exported, reviewed and integrated into `src/questions/catalog.ts` and the fixture generator.

```bash
pnpm content:generate
pnpm test
```

Never commit hand-edited computed answers. Canonical solutions and hidden cases must remain outside student assets.

## Optional backend tools

Browser work needs no Docker or local PostgreSQL. Backend integration testing needs a Docker-compatible runtime and Supabase CLI; judge runtime checking needs Deno 2.x.

```bash
deno check --config supabase/functions/judge-query/deno.json supabase/functions/judge-query/index.ts
```

Run migrations and database tests against a disposable **local** stack before any approved live migration. See [deployment](deployment-runbook.md) for release gates.

## Troubleshooting and moving laptops

- Wrong Node: run `nvm use` in the repository, then reinstall with the frozen lockfile.
- Port 5173 busy: stop your existing dev server before starting another; changing the port can break OAuth redirects.
- Production unavailable screen: supply the intended browser auth configuration before building.
- Stale visible dataset: refresh the page; browser PGlite data is disposable.
- Preserve uncommitted work and export browser-only Question Studio edits before switching laptops. Transfer only `dk_practice_*` keys if drafts matter, never all browser storage or auth tokens.
- For offline Git transfer, create a private `git bundle`, verify its checksum and HEAD after restoration. Do not retire the old laptop until the new checkout passes the checks above.
