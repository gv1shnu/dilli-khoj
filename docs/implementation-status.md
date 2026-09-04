# Implementation status

Last updated: 4 September 2026. Branch: `build/foundation` (nothing pushed or deployed).

## Milestone

All 20 ruins are **playable locally**. Authoritative server grading is live for **Ruin 06** only; local practice is non-scoring.

## Done

### World and client
- 3D overgrown-ruins world: animated character (open-source Soldier GLB), third-person orbit camera, procedural Mughal ruins, instanced wind-swept grass, guide arrows to the nearest amber, procedural ambience, dusk lighting + bloom.
- First-run how-to-play overlay (no endgame revealed); reopenable from the top bar.
- Archive browser: open any of the 20 ruins, read the question, Run against PGlite (PostgreSQL in a Web Worker), see results/errors, open hints.
- Saved SQL drafts and local practice progress persist per player; movement pauses while editing SQL.

### Content
- All 20 questions authored in the required format (`src/questions/catalog.ts`).
- Content pipeline (`scripts/`, `pnpm content:generate`): three datasets per question; the visible case's expected rows are **computed by real PostgreSQL**, never hand-written.
- Only the visible case ships to the browser; canonical/authoring solutions are excluded from production builds (verified absent from the bundle).

### Gameplay model
- 7 districts as contiguous ruin ranges (`src/game/ruins.ts`).
- XP economy in one place (`src/game/scoring.ts`): start 100, survey +5, solve +20, hint −10, reveal −30, wrong/revisit 0. Max 600; 30 hints total; floor −300 (negative allowed).

### Authoritative judge
- Edge Function judge with PostgreSQL 17 AST parsing, hidden-case grading, restricted executor/progress roles, per-player lease, cooldown, idempotent XP. Grades Ruin 06 today.

### Admin
- Dev-only **Question Studio** (`#admin`): ruins tagged by level/district/topic, each with its visible test case (computed expected + seed); edit/add questions locally and export JSON to commit.

### Tooling
- CI (`ci.yml`): typecheck, vitest, build, Deno judge check. Deploy workflows for Cloudflare (`deploy-web.yml`) and Supabase (`deploy-supabase.yml`, manual).
- Cloudflare config: worker `dilli-khoj`, account pinned; target origin `https://dilli-khoj.example.workers.dev`.

## Verified
- `pnpm typecheck`, `pnpm build`, and **38 unit tests** pass. Browser checks pass at a MacBook-class viewport.

## Not yet done
1. **Authoritative grading for all 20**: generate the server judge migrations (hidden cases + computed expected into `game_private.question_cases`) from the content pipeline, add near-miss tests, and get a blind human review per `question-authoring.md`.
2. **Deploy**: the Cloudflare account subdomain is `example` (live origin `https://dilli-khoj.example.workers.dev`); complete Google OAuth + Supabase auth/migrations and deploy the judge (see the deployment runbook).
3. **Multi-ruin gameplay**: place multiple archives and drive unlock gating from `ruins.ts`/districts; wire XP and progression to the server once grading covers all ruins.
4. **Admin auth**: the studio is dev-only today; a secured, deployed admin surface (approved emails + RLS) is a later step.
5. **Load test** the free database at 25/50/100/200 submissions per second before a class-wide launch.
