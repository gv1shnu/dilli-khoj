# Implementation status

Last updated: 3 September 2026

## Foundation vertical slice

Status: implemented and verified locally on branch `build/foundation`.

### Browser

- Vite, React, TypeScript and Three.js application shell.
- Roamable Chandni Chowk ruin with keyboard movement and collisions.
- Ruin 06 question using the required short format.
- PGlite in a Web Worker with an IndexedDB-backed visible fixture.
- Correct visible-case and wrong-result feedback with a 50-row preview cap.
- Google OAuth client wiring; development mode remains usable without a key.
- Cloudflare Workers Static Assets package passes a Wrangler dry run.

### Authoritative judge

- Supabase Edge Function source at `supabase/functions/judge-query`.
- Caller JWT enforcement through `@supabase/server` with a second Google/domain check.
- Native PostgreSQL 17 AST parsing through `libpg-query`.
- One `SELECT` or `WITH … SELECT`, unqualified ruin tables and an explicit course-function allowlist.
- Three fixture runs in read-only transactions with 400 ms statement and 100 ms lock timeouts.
- Exact column/value comparison with ordered and unordered policies that preserve duplicates.
- Separate `dilli_judge_executor` and `dilli_judge_progress` login roles; no passwords in migrations.
- Per-player five-second leases, a 300 ms cooldown and idempotent submission IDs.
- Atomic first-solve progression and +20 XP; wrong submissions cost zero.

### Database

- Approved-domain Before User Created hook.
- Profile and ruin-progress RLS with no browser write policies.
- Private attempts, question manifests, expected answers and fixture schemas.
- Ruin 06 has one visible and two hidden data cases with different correct answers.
- A pgTAP contract file is present but cannot run until the Supabase local stack or linked project is available.

## Verification completed

- Twelve unit tests pass: browser preflight, PostgreSQL AST rules, ordered/unordered result comparison and duplicate handling.
- TypeScript checks pass for the browser and Edge Function code.
- Deno 2.9 checks the Edge Function and resolves its exact npm/WASM dependencies.
- Production Vite build passes.
- Wrangler static-assets dry run passes without uploading.
- Browser checks pass at a 1440 × 900 MacBook-class viewport with no fresh warnings or errors.
- The starter query receives a wrong visible verdict and a valid solution receives a pass verdict with rows 102 and 107.

The Vite build reports direct-`eval` warnings inside PGlite's distributed dependency code. No application source uses `eval`. PGlite's WASM/data files dominate the payload, so classroom preloading remains required.

## Not yet production-ready

1. Apply migrations and run the pgTAP/RLS attack tests on a real Postgres instance.
2. Provision the two judge role passwords outside Git and add both transaction-pooler URLs as Edge Function secrets.
3. Add the Supabase publishable key to the browser build.
4. Finish or verify Google OAuth, redirect URLs and the Before User Created hook in the dashboard.
5. Deploy the Edge Function and static shell to staging, then test approved and rejected accounts.
6. Load-test 25, 50, 100 and 200 submissions per second; the free database remains the primary unknown.
7. Add plan-cost enforcement or reduce runtime hidden cases if the load test requires it.
8. Author, test and review Ruins 01–05 and 07–20.
