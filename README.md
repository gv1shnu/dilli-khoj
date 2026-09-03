# Dilli Khoj

Dilli Khoj is a classroom-friendly PostgreSQL treasure hunt set in a fictional, post-collapse Delhi. Students explore twenty ruins, practise against PostgreSQL in the browser, and submit safe read-only queries to an authoritative hidden-case judge.

Current milestone: **foundation vertical slice** — Ruin 06 at Chandni Chowk.

## What works now

- Roamable Three.js ruin with WASD/arrow movement and collisions.
- A short Module 3 `SELECT`/`WHERE` question in the fixed title → description → sample output → hints format.
- PostgreSQL-compatible local practice in a PGlite Web Worker with IndexedDB persistence.
- Instant visible-case pass/fail feedback, result preview and query errors.
- Google OAuth client wiring for Supabase.
- Authoritative judge request contract; Submit does not pretend to award XP when the server judge is absent.
- Cloudflare Workers Static Assets configuration for the production origin.
- Versioned Supabase auth, profile, progress, attempt and Ruin 06 fixture migrations.
- Unit tests for query-policy edge cases and ordered result comparison.

The restricted server executor and production judge are the next infrastructure milestone. Local practice is intentionally not a security boundary.

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

## Documentation

- [Product specification](docs/product-spec.md)
- [Curriculum and twenty-ruin map](docs/curriculum-map.md)
- [Question authoring and tests](docs/question-authoring.md)
- [Submission architecture](docs/submission-architecture.md)
- [Supabase and Google setup](docs/setup-supabase-google.md)
- [Decisions and open items](docs/decisions-and-open-items.md)

## Repository rules

1. Every ruin must map to `docs/curriculum-map.md` and meet `docs/question-authoring.md`.
2. Browser **Run** is free and untrusted; only server **Submit** changes progression.
3. Never commit database passwords, OAuth secrets, Supabase secret keys or Cloudflare tokens.
4. Infrastructure changes update the architecture and setup docs in the same change.
5. Keep the game educational, playful and classroom-friendly, with limited humour.
