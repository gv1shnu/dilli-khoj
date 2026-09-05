# Next steps

The twenty-ruin game is implemented on `open-world` as a development preview. No
hosted rollout has been performed. See [implementation status](implementation-status.md)
for verification evidence and [setup](setup.md) to reproduce it.

## Current baseline

- Twenty physically distinct 3D ruins, sequential gates and repeating visual fields
  are implemented.
- The player controls whether the amber trail points to the current archive or the
  next unlocked gate.
- The illustrated journey map runs from Ruin 01 at the bottom to Ruin 20 at the top,
  with uneven spacing, gray zig-zag paths and distinct landmark icons.
- All ruins have individual procedural soundscapes. Running is the default movement;
  holding **Shift** walks.
- Solve rewards rise over the player in green. Hint and reveal deductions rise in red.
  Practice can replay the solve animation without awarding official XP.
- All twenty first-pass objectives and forty alternating revisit objectives are wired
  to the generated client and server content pipeline.
- The current automated baseline is **150 passing tests**, with typecheck, production
  build, browser smoke and mocked authentication contracts also passing.

## Remaining work, in order

1. **Complete and record a slow Ruin 01–20 walkthrough.** The formal log currently
   covers Ruins 01–06. Inspect every route, gate transition, wrap boundary, collision,
   camera angle, trail target, map revisit, soundscape transition and the final-ruin
   state. Add each finding to [walkthrough notes](walkthrough-notes.md) before fixing
   it so the acceptance record remains complete.
2. **Finish question and fixture acceptance.** Review all twenty first-pass objectives
   and forty revisits. Keep every question description free of SQL keywords, clauses,
   operators and query fragments; put technique guidance in hints. Repair the known
   false-positive fixtures for Ruins 01, 06 and 19, clarify null and tie behavior, add
   targeted wrong-answer regressions, strengthen hidden data, and obtain blind human
   solves. Regenerate versioned client, judge and revisit artifacts afterward. Track
   decisions in [question review](question-review.md).
3. **Verify authenticated economy and progression in the UI.** With real local
   accounts, confirm survey and solve gains, hint and reveal deductions, player-anchored
   green/red animations, sequential unlocking, gate state, map state, refresh recovery,
   account switching, two-device behavior and the final completion state.
4. **Run full local Supabase integration.** Exercise Auth, PostgREST, signup hooks,
   row-level security, RPC grants, denied and revoked admin access, retries, concurrent
   purchases and judge isolation on a disposable stack. The PostgreSQL and mocked-auth
   suites do not replace this gate.
5. **Harden grading execution.** Add result-byte and planner-cost controls, bound
   admission and queue time, reconcile the grading lease with the longest permitted
   execution, and test adversarial read-only submissions while preserving award and
   purchase idempotency.
6. **Measure and improve classroom performance.** Run sustained mixed-ruin workloads
   locally and on an explicitly authorized hosted target. Measure background polling,
   serial database round trips, PGlite payload/cache behavior, memory growth, GPU use
   and campus-network preload behavior. Use the evidence in
   [navigation and performance review](navigation-and-performance-review.md) as the
   starting baseline.
7. **Finish browser, device and accessibility QA.** Cover Chrome, Safari and Firefox
   on baseline classroom hardware; keyboard-only play; fullscreen enter/exit; reduced
   motion; audio toggle and context recovery; dialog focus; compact layouts; and pause
   behavior when the editor or map is open.
8. **Prepare operations and the release candidate.** Verify retention cleanup,
   observability, alerting and rollback. Freeze the exact commit and migration set,
   then obtain owner approval for the production release. Follow the documented order:
   migrations → judge → web, followed by a signed-in production smoke test. See the
   [deployment runbook](deployment-runbook.md).

## Development completion criteria

Development is complete when the 1–20 walkthrough and content review have no open
severity-one or progression-blocking findings, real local Supabase behavior matches the
automated contracts, the target classroom hardware/network stays inside the agreed
performance budget, required browsers and accessibility paths pass, and a reversible,
observable release candidate is ready for owner approval.
