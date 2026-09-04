# Next steps

This roadmap separates local implementation from deployed capability. Deployments and live data changes require owner approval.

## 1. Fix authorization consistency

Local implementation complete: migration `20260904110000_shared_identity_policy.sql` gives signup and the judge one private email policy. Judge authorization checks current `auth.users` confirmation, Google provider and non-anonymous status using the JWT subject; the client admin constant is not trusted. Production with missing auth configuration stops before mounting the game.

Verified locally: all three domains, allowlisted admins outside those domains, rejected/malformed emails, wrong provider, unconfirmed/anonymous users, admin revocation, role privileges, and real JWT middleware rejection of absent, expired and forged tokens. Total suite: 66 tests, including the 39-test migration baseline.

Remaining before declaring the deployed policy fixed:

- Run migrations and pgTAP/RLS tests on a disposable full Supabase stack. The new policy SQL has passed PGlite tests with minimal Auth tables and real role grants; this is not a full Supabase integration test.
- With explicit owner approval, apply the new migration **before** deploying the updated judge. Without the function the new judge fails closed with 503. No live change was made during laptop setup.
- Confirm the signup hook is enabled, unused Email/Anonymous providers are disabled, and approved/rejected accounts behave correctly through live OAuth and direct submissions. These dashboard checks remain unverified.

Continue local development with step 2; release actions remain separately gated.

## 2. Extend grading to every ruin

The generator and regression suite cover 20 questions, but the judge client explicitly rejects all ids except 6. Server migrations/manifests currently implement the Ruin 06 vertical slice.

- Generate versioned server fixtures, manifests and computed expected rows from the authoring pipeline. Include `game_private.questions`, `question_cases`, schemas and least-privilege grants.
- Keep hidden data and solutions server-side; retain the public visible-only artifact.
- Complete the authoring acceptance matrix: genuinely different equivalent solutions, actual wrong SQL, hard-coded answers, NULL/tie/duplicate traps, excess rows and resource limits. Green comparison-unit tests alone do not finish human question review.
- Add blind human review and migration/role integration tests, then remove the client's Ruin 06 restriction only when the backend contract supports every id.

Done when all 20 canonical and equivalent solutions pass all cases, near misses fail appropriately, and hidden results cannot be fetched by students.

## 3. Connect the real game economy and progression

The current map uses `session.passed`, written by visible-case Run. `PRACTICE_STORAGE_KEY` is shared within the browser origin, not keyed by Supabase UUID; signing into a different account can reuse local state. `scoring.ts` defines affordability and the -20 reveal rule, but the current terminal still opens free practice hints. Server tables and an idempotent +20 first-solve function already exist; extend them rather than creating a second progress system.

- Use server progress for official clearance and sequential unlocks. Enforce prerequisites in the judge/recording path, not just the selector UI.
- Persist survey awards, help purchases, reveals and first completion atomically. Concurrent tabs/retries must not double-charge or double-award.
- Scope drafts by user; clear/reload account-specific state on auth changes. Never promote local preview passes into official completions.
- Persist a request id across network retries of the same submission; the current client creates a new UUID for each invocation.
- Use server timestamps. Resolve the remaining timing-spec contradiction: sign-up-to-completion wall time versus excluding loading/revisit time. Do not invent a hybrid metric.

Done when two devices agree, account switching does not leak drafts/progress, wrong answers cost zero, unaffordable help is denied server-side, and solving remains free.

## 4. Complete revisits and progression presentation

The personal map opens cleared ruins, but currently reopens the same question. Add deterministic topic-matched variants keyed by player, ruin and visit count; keep them non-scoring. Connect distinct archive destinations to the curriculum where appropriate. Preserve the infinite tiled world and Soldier's -Z-facing yaw offset; do not restore the old radius clamp.

Done when a revisit presents a different tested objective, never changes official XP/unlocks, and map/world navigation stays in sync.

## 5. Add leaderboard and production administration

- Leaderboard: server-derived completers only, XP descending then the agreed time metric; top 20 plus the current eligible player's rank; no emails.
- Admin: authenticate against the database allowlist, not `#admin` or a bundled email array. Add protected player-progress and content endpoints, validation/versioning and audit history.
- Keep canonical solutions absent from student assets. The current dev studio exports edits; it does not publish them into the catalog or server automatically.

## 6. Test the complete product

- Update `scripts/browser-smoke.mjs` for the new sign-in gate and sequential progression. It predates those features; its earlier pass is not current browser verification.
- Add tests for `progression.ts`, `scoring.ts`, map state, auth switching, persisted drafts and server transactions. The current test suite does not cover all new systems.
- Execute pgTAP/RLS/role-attack tests on a disposable local Supabase stack before any approved live migration.
- Load-test at 25/50/100/200 submission requests per second. Keep the one-hidden-runtime-case fallback only if measurements require it, with full three-case CI coverage.
- Check Safari/Firefox and a baseline MacBook Air, repeated world wrapping, memory growth, asset downloads and campus preload behavior.

## 7. Release intentionally

The handoff reports a live **older** Cloudflare build, active Ruin 06 judge, configured secrets/migrations, and working Google sign-in. It also reports Google External / Testing. Verify current dashboard state before changing it. Plan the External production rollout and any requested brand verification through Google's current console requirements; do not promise that publishing is always review-free.

Confirm hook/provider settings, test rejected accounts and successful Submit, review the exact release commit, then ask for deployment approval. A private branch push is not a merge to main, and a live HTTP 200 is not proof that the new game flow or grading works.

The custom auth-domain branding question remains open under the zero-cost constraint. It is not required to migrate laptops or continue gameplay work; do not purchase anything without approval.
