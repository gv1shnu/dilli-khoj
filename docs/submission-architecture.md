# Submission architecture

## Two execution paths

Implementation status: all 20 first-pass questions, trusted gameplay, revisits, leaderboard and audited read-only admin are implemented locally. No hosted rollout was performed. See [implementation status](implementation-status.md) for verification and remaining release gates.

### Run

- Executes in PGlite inside a Web Worker.
- Uses the visible fixture cached in IndexedDB.
- Returns immediate PostgreSQL-compatible rows or errors.
- Is unlimited, free and untrusted.
- Never changes official XP, server progression or the leaderboard. Only the DEV offline preview uses local `passed` state for preview unlocks; signed-in play reads server clearance.

### Submit

- Sends authenticated SQL, ruin ID, question variant, dataset version and an idempotency UUID to the judge.
- Runs against the visible fixture and hidden fixtures on server PostgreSQL.
- Returns the verdict in the same HTTP response; student verdicts do not need WebSockets or Supabase Realtime.
- Records the attempt and awards progression atomically.

## Request contract

```json
{
  "submission_id": "uuid",
  "ruin": 15,
  "variant": "first-pass",
  "dataset_version": "2026-09-04.1",
  "sql": "SELECT ..."
}
```

## Judge sequence

1. Verify the Supabase user JWT.
2. Verify the Google JWT provider and call `game_private.is_approved_player` using the authenticated subject. It checks the current confirmed, non-anonymous Google Auth record against the same domain/admin policy as signup. Check sequential prerequisites before execution and again when recording.
3. Enforce payload size, one in-flight submission per player and a short per-player cooldown.
4. Parse one `SELECT` or `WITH ... SELECT`; reject multiple statements, schema-qualified relations and unsafe functions.
5. Acquire a pooled connection as the restricted executor role.
6. Start a read-only transaction and apply local statement and lock timeouts.
7. Execute the query once per fixture by changing `search_path`.
8. Canonicalize and compare results using the question's comparison policy.
9. Call a fixed privileged progression function. Never pass student SQL to the privileged identity.
10. Return the verdict, case count and XP; the client then refreshes server game state.

Current implementation details:

- `@supabase/server` verifies user JWTs and exposes claims to the Edge Function. Authorization then reads current server Auth records through a fixed boolean function; no client-supplied email, user metadata or bundled allowlist grants access. The new migration must precede judge rollout; authorization lookup errors fail closed with 503.
- `libpg-query` uses PostgreSQL 17's native parser compiled to WebAssembly; this avoids a partial SQL grammar.
- The AST rejects non-`SelectStmt` nodes even when hidden inside a CTE, unknown relations, schema-qualified relations, row locks and functions outside the course allowlist.
- The database role, read-only transaction and grants remain the hard security boundary; the AST is defence in depth and friendly validation.
- A private manifest supplies fixture schemas and expected results. Hidden content is never returned to the browser.

## Identity separation

Use two server identities:

- `judge_executor`: can connect and `SELECT` only from fixture schemas; cannot read the vault or write progress.
- `judge_progress`: may call fixed vault/progression functions; never executes student-controlled SQL.

The browser receives only the Supabase URL and publishable key. It never receives database passwords or Supabase secret keys.

## Execution controls

Recommended initial limits for the small educational datasets:

- 10 KB SQL text;
- one statement;
- 50 preview rows;
- 250–500 ms statement timeout per fixture;
- 100 ms lock timeout;
- planner-cost ceiling through `pg_plan_filter` (proposed, not implemented);
- an allowlist of curriculum-safe functions;
- no database `TEMP` privilege;
- no access to `vault`, `auth`, internal metadata tables or arbitrary user-defined functions.

Tune these only from tests. A two-second statement timeout is too expensive when three fixtures and synchronized submissions share a free database.

## Correctness policy

Result semantics decide success. AST validation is used for safety, not to require a particular curriculum syntax. `EXPLAIN` analytics/cost checks remain proposed.

The `HAVING` ruin may record whether `HAVING` appeared for instructor insight, but its verdict depends only on safe execution and fixture results.

## Idempotency and concurrency

- `submission_id` is unique per player request.
- Retrying the same ID returns the stored verdict and never awards XP twice.
- First-time completion locks the player's progress row before updating XP and district state.
- `begin_revisit` selects a non-scoring alternate objective; revisit SQL runs locally and the judge accepts only `first-pass`.

The implemented first-pass endpoint acquires a private five-second lease keyed by player UUID before execution. A 300 ms per-player cooldown absorbs accidental double clicks. The final recording function uses the unique `(player_id, submission_id)` constraint and locks progression rows, so a retry cannot award XP twice.

## Load shape

With 3,000 students and approximately 25 first-pass submissions each, expect about 75,000 judge requests. Over 90–120 minutes this averages roughly 10–14 submissions per second, but checkpoint synchronization can create much larger bursts.

Three fixtures imply roughly 30–42 SQL executions per second at the average rate, before retries and bursts. The project must therefore load-test at 25, 50, 100 and 200 submission requests per second.

Free-tier strategy:

1. Keep local exploration entirely in PGlite.
2. Use Supavisor transaction pooling.
3. Keep all fixtures small, immutable, indexed and analyzed.
4. Reject costly plans before they consume the full timeout.
5. Preload the application and visible dataset before the simultaneous start.
6. If required, fall back from two hidden cases to one hidden case at runtime while retaining full CI coverage.

Splitting students across multiple projects is a last resort because it fragments authentication, progress and the leaderboard.

The Edge Function creates at most one executor and one progress connection per warm isolate and requires Supavisor transaction-pooler URLs on port 6543. Manifest lookup and lease acquisition share one progress transaction; verdict recording uses a second. Three cases run sequentially to reduce connection pressure. This shape is designed for the expected average but is not declared launch-ready until the 25/50/100/200 requests-per-second tests pass.

## Campus-network plan

- Keep the initial compressed application payload below 5 MB if practical.
- Lazy-load district visuals and non-current content.
- Cache immutable assets aggressively through Cloudflare.
- Install a service worker only after confirming update/rollback behavior.
- Ask students to open the landing page 10–15 minutes before play begins, even if the game opens for everyone at the same time.
- Provide a visible capability check for WebAssembly, IndexedDB and browser version before downloading world content.

## Server gameplay API

Authenticated browser RPCs `game_state`, `game_action` and `begin_revisit` verify the current approved player. The browser cannot write profile XP or ruin progress directly. Purchases and first solves lock the profile row, bind retry IDs, enforce prerequisites and affordability, and stamp completion once. `game_state` returns only hints/solutions already purchased by that player.

`completion_leaderboard` exposes top 20 completers plus the caller's eligible rank. It orders XP descending then `completed_at - auth.users.created_at` ascending. This is sign-up-to-completion wall time, including loading and time away; later revisits cannot change it.

`admin_players` and `admin_question` require current database allowlisting and record access in a private audit table. These are read-only endpoints; editing uses the DEV authoring pipeline. Canonical SQL is returned only through purchased help or the protected admin endpoint, never bundled into student assets.

Numeric comparison uses PostgreSQL type OIDs to normalize bigint/numeric wire values without losing decimal precision or treating ordinary text as numeric. Row fetches stop at the configured cap plus one. A result-byte ceiling and planner-cost gate remain unimplemented release risks.

## Measured local performance

[Local load results](local-load-results.json) record 25/50/100/200 requests per
second against one Node handler process and disposable PostgreSQL 17. All 1,125
verdicts were correct; the latest mixed-ruin p95 measurements were 6/5/4/3ms. A
separate mixed-ruin burst of 200 simultaneous requests completed in 285ms with 277ms
p95. The earlier roughly 17-second result did not reproduce without competing laptop
work. See the
[detailed review](navigation-and-performance-review.md) and
[burst profile](local-profile-results.json). These short mixed-ruin benchmarks are
not a hosted or sustained capacity claim. HTTP, Edge isolates, Supavisor and the
free-tier project require separate authorized measurement.
