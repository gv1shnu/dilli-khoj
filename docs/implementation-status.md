# Implementation status

Last updated: 4 September 2026. Code inspected at `de81407`, branch `build/foundation`, 13 commits ahead of the local origin tracking ref before this documentation update. No push, deployment or live database change was performed in this documentation pass.

## Deployment snapshot versus local verification

The maintainer handoff reports all five migrations applied, judge-query active with both judge connection secrets configured, successful Google sign-in, and the site live at `https://dilli-khoj.example.workers.dev`. The hosted site is an **older build** predating the latest sign-in gate, sequential map and infinite world. These remote details were not independently rechecked in this pass.

The handoff reports Google External / Testing. Hook enablement, disabling Email signup, wider OAuth rollout and an approved redeploy remain release checks. Do not repeat resource creation or reset credentials simply to move laptops.

## Milestone

All 20 ruins are **playable locally**. Authoritative server grading is live for **Ruin 06** only; local practice is non-scoring.

## Done

### World and client
- Infinite looping 3D world: a 150-unit tile repeated 3×3, wrapped player/camera, animated Soldier GLB, procedural ruins, wind-swept grass, amber guide, ambience and dusk lighting. Preserve the -Z model yaw offset; no radius clamp.
- First-run how-to-play overlay (no endgame revealed); reopenable from the top bar.
- Sequential archive browser and personal map: current and cleared ruins are available; future ruins are locked in the UI. Local Run passes clear the preview, not official progression.
- Saved SQL drafts, surveyed/cleared ruins and first-play/completion timestamps persist in localStorage. Despite the intended per-player model, the current storage key is shared within a browser origin, not scoped by account. Movement pauses while editing.
- Sign-in gate after the intro when Supabase is configured; local bypass is DEV-only. Fail-closed production configuration still needs a test.

### Content
- All 20 questions authored in the required format (`src/questions/catalog.ts`).
- Content pipeline (`scripts/`, `pnpm content:generate`): three datasets per question; the visible case's expected rows are **computed by real PostgreSQL**, never hand-written.
- Only the visible case ships to the browser; canonical/authoring solutions are excluded from production builds (verified absent from the bundle).

### Gameplay model
- 7 districts as contiguous ruin ranges (`src/game/ruins.ts`).
- XP model (`src/game/scoring.ts`): start 100, survey +5, solve +20, hint −10, reveal −20, wrong/revisit 0. Max 600; 30 hints. Affordability helpers exist; the current terminal still provides free practice hints. Paid help, survey awards and all-ruin official progression are not integrated yet.

### Authoritative judge
- Edge Function judge with PostgreSQL 17 AST parsing, hidden-case grading, restricted executor/progress roles, per-player lease, cooldown, idempotent XP. Grades Ruin 06 today.

### Admin
- Dev-only **Question Studio** (`#admin`): ruins tagged by level/district/topic, each with its visible test case (computed expected + seed); edit/add questions locally and export JSON to commit.

### Tooling
- CI (`ci.yml`): typecheck, vitest, build, Deno judge check. Deploy workflows for Cloudflare (`deploy-web.yml`) and Supabase (`deploy-supabase.yml`, manual).
- Cloudflare config: worker `dilli-khoj`, account pinned; target origin `https://dilli-khoj.example.workers.dev`.

## Verified
- This pass: `pnpm typecheck`, `pnpm build`, and **39 tests** pass; `dist/models/soldier.glb` exists. Known PGlite eval and bundle-size warnings remain.
- Earlier browser checks predate the latest gate/map/world changes. The smoke script must be updated for that gate; no new interactive browser or remote auth test was performed here.

## Not yet done
1. **Authoritative grading for all 20**: generate the server judge migrations (hidden cases + computed expected into `game_private.question_cases`) from the content pipeline, add near-miss tests, and get a blind human review per `question-authoring.md`.
2. **Authorization mismatch**: signup permits three domains/admins, but `isApprovedIdentity` in the judge still permits only the two university domains. Align and test before claiming partner-domain Submit works.
3. **Trusted gameplay**: connect map, XP, help purchases and unlocks to server progress; isolate local drafts by user; implement actual revisit variants and the completion leaderboard.
4. **Admin auth**: the studio is dev-only today; a secured, deployed admin surface (approved emails + RLS) is a later step.
5. **Load test** the free database at 25/50/100/200 submissions per second before a class-wide launch.

