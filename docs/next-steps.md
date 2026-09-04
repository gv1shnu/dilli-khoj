# Next steps

The gameplay implementation is now on `build/foundation`; no hosted rollout has been performed. See [implementation status](implementation-status.md) for the evidence and [setup](setup.md) to reproduce it.

## Completed locally

1. Shared signup/judge policy accepts the three approved domains and current server admin allowlist.
2. All 20 ruins have generated, versioned server fixtures: visible plus two hidden cases.
3. Server transactions own progression, XP, ordered help purchases and unlocks. Signed-in Run passes never unlock ruins. Drafts and retry identifiers are scoped by account.
4. Each ruin has two different non-scoring revisit objectives; server visit counts choose alternating variants.
5. Completers-only leaderboard ranks XP descending, then **server sign-up-to-completion wall time** ascending. Loading and time away count; revisits do not change completion time. Top 20 and personal rank are available.
6. Protected, audited admin reads expose player progress and question content. Editing remains in the DEV Question Studio and reviewed source pipeline.

## Release work remaining

1. **Full Supabase integration:** run the migration chain and pgTAP/RLS tests on a disposable full stack. Current tests use PGlite and PostgreSQL 17 with minimal Auth tables, real roles and the actual JWT judge. They do not exercise GoTrue, PostgREST, the signup hook or Supavisor. Confirm real OAuth, provider settings, rejected accounts and revocation on an approved test target.
2. **Performance:** run sustained, mixed-query and hosted tests before a classroom release. The earlier roughly 17-second p95 at 200/s did not reproduce: a clean local repeat recorded 8ms p95. Investigate environment sensitivity and measure the hosted pooling/runtime shape on an explicitly authorized target; local success does not establish free-tier capacity. Address background polling, render load and network round trips as described in the [review](navigation-and-performance-review.md). Preserve all three cases while tuning and keep the ₹0 target.
3. **Question review:** have another human solve and review all 20 questions and 40 revisits without reading answers. Expand topic-specific near misses, hard-coded visible answers, NULL/tie/duplicate traps and costly queries where review exposes gaps. Automated fixture checks are not blind review.
4. **Browser coverage:** run Safari and Firefox, a baseline MacBook Air, repeated world wrapping, memory checks and campus download/preload measurements. Chromium tests cover offline practice and mocked signed-in contracts; real two-device sessions still need a full backend test.
5. **Operational controls:** verify bounded execution under adversarial SQL, retention cleanup, monitoring and rollback. A planner-cost ceiling and output-byte limit are not implemented; timeouts and row limits alone need further resource-abuse testing.
6. **Release approval:** review the exact commit, pending migrations, validation evidence and rollback plan with the owner. Apply approved migrations, then judge, then web. Never treat a feature-branch push as deployment approval.

The hosted handoff reports an older web build, Ruin 06 judge and Google External / Testing; these remote claims have not been independently rechecked. Do not reset credentials or create replacement projects to continue work. Custom auth-domain branding remains optional under the zero-cost constraint.
