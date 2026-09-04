# Implementation status

Reviewed 4 September 2026. Branch: `build/foundation`. **Development preview; classroom release is blocked.** Local implementation does not imply deployment.

## Implemented on this branch

| Area | Behavior |
| --- | --- |
| World | Infinite 150-unit tiled world, wrapped player/camera, animated Soldier, geographic atlas, ambience, intro and browser fullscreen; model yaw offset preserved |
| Atlas access | Animated SVG geography; players reveal cleared ruin parcels only; admins inspect all 20; pause/reduced motion and compact-screen map access |
| Content | 20 curriculum-ordered first-pass questions; 60 generated server datasets; visible-only browser fixtures |
| Identity | Shared three-domain/admin policy; confirmed, non-anonymous Google accounts required; current server records checked |
| Grading | All 20 ruins supported; JWT validation, AST policy, read-only restricted role, bounded row fetch, timeouts and three-case comparison |
| Progress | Server prerequisites, survey +5, first solve +20, hints −10, reveal −20; start 100, maximum 600; wrong answers free |
| Consistency | Profile-row locking and idempotent requests prevent repeated awards/purchases; completion timestamp recorded once |
| Browser state | Signed-in progression comes from server; drafts/retry IDs keyed by UUID; account changes remount the game; DEV preview is separate |
| Help | Only purchased hints/solutions returned to a student; answers and hints excluded from production content |
| Revisits | Two alternate objectives per ruin, alternating server-selected variants; local, non-scoring practice |
| Leaderboard | Completed players only, XP descending then server signup-to-completion elapsed time; top 20 plus personal rank; no emails |
| Admin | Server allowlist, protected player/content reads and audit trail; editing remains DEV-only and requires reviewed source updates |

## Verification

- Laptop baseline: Node 22.23.2, pnpm 11.19.0, frozen install, typecheck, 39 original tests, build and `dist/models/soldier.glb` verified.
- Current unit/integration suite: **102 tests pass**, including migration reproduction, all-ruin fixtures, authorization, grants, transactional gameplay, revisits, leaderboard, admin, retry isolation and cleared-only/full-admin geographic visibility.
- Final frozen install, typecheck, Deno runtime check, production build and production asset checks pass. Soldier GLB is present; canonical answers, hints and DEV bypass markup are absent from student assets. Existing PGlite eval and large-bundle warnings remain.
- Real local PostgreSQL 17: actual JWT judge and PostgreSQL driver accepted all 20 canonical submissions with 3/3 cases, ended at 600 XP, and passed concurrent retry and purchase checks.
- Chromium offline smoke: all 20 sequential questions with wrong/correct SQL, draft restore, alternate revisit and write rejection passed.
- Geographic atlas validation: 102 tests pass; interactive checks covered cleared-only player geography, Region 20 admin inspection, pause animation and Escape/focus restoration. Mocked signed-in browser checks covered compact-screen map access, one-region player visibility, all-20 admin visibility and revocation. Build and student-asset checks pass.
- Chromium authenticated UI contracts: mocked server-only unlocks, paid help, leaderboard and account switching passed without live requests.
- Load test repeated without competing browser/unit tests: 1,125 first-solve requests passed. At 25/50/100/200 requests/second, p95 was 34/8/9/8ms. The earlier 16,911ms p95 at 200/s did not reproduce; laptop contention is a likely factor, not a proven attribution. See [current load evidence](local-load-results.json) and [review](navigation-and-performance-review.md).
- A separate 200-simultaneous-request profile completed in 356ms, p95 345ms. It records aggregate PostgreSQL protocol timings. Both tests use one local Node handler and PostgreSQL 17, first-ruin SQL only, and exclude HTTP/Edge/Supavisor. They do not prove sustained or hosted capacity for 3,000 students.
- Fullscreen entry and explicit exit passed interactively in both the game and DEV studio; typecheck/build/asset checks passed afterward.

## Limitations and release blockers

- No new live migrations, judge deployment or web deployment have been performed. Handoff reports an older hosted build and Ruin 06 judge; current remote state was not independently rechecked.
- Full Supabase Auth/PostgREST/hook/pooler integration and real multi-device sessions remain unverified. Minimal Auth tables in local tests do not replace that gate.
- Sustained mixed-query load, hosted free-tier compute and campus download capacity remain unproven. Clean local results do not remove those release gates.
- Blind human question review, additional adversarial SQL tests, Safari/Firefox and baseline hardware coverage remain required.
- No planner-cost ceiling or result-byte ceiling is implemented. Statement/lock timeouts, AST policy, read-only grants and row limits provide partial resource controls.
- Revisit drafts are session-only; first-pass drafts persist on the current browser, scoped by account, without cross-device synchronization.
- Admin is read-only in production. Content edits are exported from the DEV studio, reviewed, regenerated and deployed by maintainers.
- Retention policy requires an operational cleanup process before launch; no hosted scheduler was configured.

See [next steps](next-steps.md) for the remaining release work and [deployment](deployment-runbook.md) for the approval boundary.
