# Next steps

The twenty-ruin game is implemented on `main` and deployed as a hosted preview: the
full twenty-question judge, the game migrations and the web build are live on the
authorized backend, replacing the earlier Ruin-06-only judge. A classroom-wide
rollout has not been performed — the remaining validation below still gates it. See
[implementation status](implementation-status.md) for verification evidence and
[setup](setup.md) to reproduce it locally.

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
- The current automated baseline is **157 passing tests**, with typecheck, production
  build, browser smoke and mocked authentication contracts also passing.
- Ruins are constructed on first entry, cutting the latest measured Ruin 01 development
  heap from about 122 MB to 36.3 MB while active play remained at 60 FPS. Covered scenes
  render at 12 FPS, and hidden signed-in tabs no longer poll the backend.
- The slow physical walkthrough now covers Ruins 01–20, all nineteen sequential gates,
  the final state and completed-map revisits. See
  [walkthrough notes](walkthrough-notes.md).
- Six common MacBook Air/Pro Retina profiles pass in Chrome and WebKit at 60 FPS. The
  two Chrome Air profiles use four-times CPU slowdown; see the
  [MacBook compatibility report](macbook-compatibility.md).

## Remaining work, in order

1. **Measure the remaining classroom performance risks.** The automated Retina matrix
   passes Air and Pro viewports, including throttled Air CPU profiles. Run long-session
   memory, thermals and fullscreen GPU checks on the oldest physical classroom
   MacBook, then measure the hosted backend and real campus-network cache/preload
   behavior.
2. **Finish browser, device and accessibility QA.** Full Chrome and WebKit interaction
   smoke passes; the MacBook matrix covers Retina layout, fullscreen, reduced motion,
   map focus, movement keys, audio startup and the smallest terminal layout. Complete
   installed Safari and Firefox passes after the owner enables automation or
   supervises them, including audible sound and refresh recovery.
3. **Run full local Supabase integration.** Exercise Auth, PostgREST, signup hooks,
   row-level security, RPC grants, denied and revoked admin access, retries, concurrent
   purchases and judge isolation on a disposable stack. This requires the owner to
   provide a running Docker-compatible container daemon.
4. **Verify authenticated economy and progression in the UI.** With two real approved
   accounts, confirm survey and solve gains, hint and reveal deductions, player-anchored
   green/red animations, sequential unlocking, account switching, two-device behavior
   and refresh recovery.
5. **Finish grading hardening.** The judge now has row, time, query-size and 64 KiB
   result limits. Add a planner-cost gate, bound admission/queue time, reconcile the
   grading lease with the longest permitted execution, and repeat the mixed-query
   profile on the authorized hosted target.
6. **Finish question and fixture acceptance as the later content phase.** Review all
   twenty first-pass objectives and forty revisits. Keep every question description
   free of SQL keywords, clauses, operators and query fragments; put technique
   guidance in hints. Repair the known
   false-positive fixtures for Ruins 01, 06 and 19, clarify null and tie behavior, add
   targeted wrong-answer regressions, strengthen hidden data, and obtain blind human
   solves. Regenerate versioned client, judge and revisit artifacts afterward. Track
   decisions in [question review](question-review.md).
7. **Prepare operations and the release candidate.** Verify retention cleanup,
   observability, alerting and rollback. Freeze the exact commit and migration set,
   then obtain owner approval for the production release. Follow the documented order:
   migrations → judge → web, followed by a signed-in production smoke test. See the
   [deployment runbook](deployment-runbook.md).

The owner-dependent work is maintained separately in
[owner actions](owner-actions.md). Question rewriting remains postponed until the
physical world and performance pass is complete.

## Development completion criteria

Development is complete when the 1–20 walkthrough and content review have no open
severity-one or progression-blocking findings, real local Supabase behavior matches the
automated contracts, the target classroom hardware/network stays inside the agreed
performance budget, required browsers and accessibility paths pass, and a reversible,
observable release candidate is ready for owner approval.
