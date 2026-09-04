# Next steps

The gameplay implementation is now on `build/foundation`; no hosted rollout has been performed. See [implementation status](implementation-status.md) for the evidence and [setup](setup.md) to reproduce it.

## Completed locally

1. Shared signup/judge policy accepts the three approved domains and current server admin allowlist.
2. All 20 ruins have generated, versioned server fixtures: visible plus two hidden cases.
3. Server transactions own progression, XP, ordered help purchases and unlocks. Signed-in Run passes never unlock ruins. Drafts and retry identifiers are scoped by account.
4. Each ruin has two different non-scoring revisit objectives; server visit counts choose alternating variants.
5. Completers-only leaderboard ranks XP descending, then **server sign-up-to-completion wall time** ascending. Loading and time away count; revisits do not change completion time. Top 20 and personal rank are available.
6. Protected, audited admin reads expose player progress and question content. Editing remains in the DEV Question Studio and reviewed source pipeline.

## Next tasks, in order

1. **Review questions with the owner now.** Start at Ruin 01 in [question review](question-review.md), agree the intended difficulty and explicit NULL/tie semantics, then review all 20 first passes and 40 revisits. This is a discussion in progress, not approval. Keep curriculum order unchanged.
2. **Repair the acceptance matrix.** Add targeted wrong-SQL regressions for the confirmed loopholes in 01, 06 and 19, strengthen hidden data distributions, and replace cosmetic variants with genuinely different correct approaches that meet the authoring standard. Regenerate public/server/revisit content with coherent versioning; obtain blind human solves before release. Existing green tests do not cover these gaps.
3. **Complete full local Supabase integration.** Use a disposable stack to test Auth, PostgREST, signup hooks, RLS, new RPCs, real account switching/two devices and denied/revoked admin access. Current PGlite/PostgreSQL tests model Auth tables and roles but do not exercise the full stack. Review live provider/OAuth settings only on an authorized target.
4. **Harden execution and retry behavior.** Add result-byte and expensive-query controls, bound admission/queue time, reconcile the five-second lease with possible longer execution, and test adversarial SQL. Keep final award/purchase idempotency intact.
5. **Profile and improve realistic performance.** Run sustained mixed-ruin workloads and measure the hosted pool/runtime on an explicitly authorized target. Address background polling (~100 RPC/s at 3,000 tabs), serial DB round trips and the 3D render loop while editing. The earlier 17-second p95 did not reproduce; the clean short local 200/s test was 8ms p95. Neither establishes hosted capacity. See [pros, cons and evidence](navigation-and-performance-review.md).
6. **Finish browser/device/network QA.** Test Safari/Firefox, baseline MacBook Air, fullscreen, atlas reduced motion and keyboard navigation, repeated world wrapping, memory growth and campus preload/cache behavior. Chromium/mocked-auth checks are already passing.
7. **Prepare operations and release approval.** Implement/verify retention cleanup, observability and rollback; review exact commit and migration plan. With explicit owner approval only: migrations → judge → web. Keep the ₹0 target. A feature-branch push does not authorize deployment.

## Handoff

[handoff](handoff.md) contains the current implementation baseline, tools, commands, source map, owner decisions, validation limits and authorization boundaries. The question-review ledger is the current collaboration starting point.

The hosted handoff reports an older web build, Ruin 06 judge and Google External / Testing; these remote claims have not been independently rechecked. Do not reset credentials or create replacement projects to continue work. Custom auth-domain branding remains optional under the zero-cost constraint.
