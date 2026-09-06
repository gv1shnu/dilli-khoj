# Next-steps validation — 6 September 2026

Audited `main` at `c332d24`, with the local admin-revocation documentation and
migration changes present. This audit does not certify classroom readiness.

| Next-steps item | Current finding |
| --- | --- |
| 1. Classroom performance | Open. Existing MacBook measurements emulate Retina resolution and CPU slowdown on the host GPU. Physical oldest-MacBook memory, thermals, fullscreen GPU and campus-network/hosted-load evidence remain required. No new performance measurements in this audit. |
| 2. Browser/device/accessibility QA | Partial; fresh WebKit failure. Chrome twenty-archive smoke and mocked authenticated UI contracts pass. WebKit smoke times out after 30 seconds waiting for `.interact-prompt` in `openNearbyArchive`; the output does not identify the ruin or establish the cause. Existing MacBook matrix is historical evidence. Installed Safari/Firefox, audible mix and physical-device checks are not verified by this audit. |
| 3. Full local Supabase integration | Blocked by environment. `supabase status` reports neither Docker nor Podman available. Fresh isolated PostgreSQL 17 integration passes twenty authenticated three-case submissions, 600 XP completion, concurrent retries/purchases and explorer count. This harness models Auth tables and does not exercise real GoTrue/PostgREST. |
| 4. Real authenticated UI economy/progression | Open. Mocked UI contracts pass server-only unlocks, paid help, leaderboard, account switching and admin revocation. Two real approved accounts and two-device/refresh behavior remain unverified. |
| 5. Grading hardening | Open. Code has a 64 KiB result ceiling, cursor row bound and statement/lock timeouts. No planner-cost gate or overall admission/queue deadline found. Submission lease is five seconds; connection timeout is also five seconds, before execution and persistence overhead. Hosted mixed-query load was not run. |
| 6. Question/fixture acceptance | Open, with confirmed defects. Fresh queries against all three migrated fixtures for each of Ruins 01, 06 and 19 reproduce false positives using the production result comparator. Review ledger still has no blind human approvals. |
| 7. Operations/release candidate | Open. No retention cleanup scheduler or alert configuration found in the repository. Remote migration history matches through `20260906130000`; only `20260906140000_revoke_former_admin.sql` is pending. Owner reports its deletion was already performed manually. Remote judge is ACTIVE, version 4; this metadata does not prove deployed source parity. Exact deployed web parity, operational cleanup, alerting and rollback remain unverified. |

Fresh checks: 157 tests across 19 files pass; TypeScript/production build, Deno
judge check, production asset leak checks, PostgreSQL integration, Chrome smoke
and mocked authenticated UI contracts pass. Build still reports PGlite eval and
large-bundle warnings. Initial browser commands found no running dev server;
starting Vite resolved that prerequisite before the successful reruns.

Wrong queries reproduced (each accepted by all three case comparisons):

```sql
SELECT field, stores FROM record_fields WHERE book <> 'shelter' ORDER BY field;
SELECT stall_id FROM stalls WHERE daily_rations > 20 ORDER BY stall_id;
SELECT well_id, depth_m FROM wells WHERE depth_m > 30 ORDER BY depth_m DESC, well_id;
```

Documentation drift: `implementation-status.md` still names a feature branch and
an older Ruin-06-only hosted deployment; current branch is `main`, remote gameplay
migrations are applied and an active version-4 judge exists. Its older deployment
limitation should not be treated as current evidence. The question-review ledger's
old Ruin-01 names were superseded, but the underlying fixture loophole persists.

No live migrations, deployments or hosted load tests were performed in this audit.
