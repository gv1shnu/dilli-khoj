# Product specification

## Identity

Working title: **Dilli Khoj**

Institutional context: Example School of Technology at Example University.

Tone: fun, classroom-friendly and playful, with limited humour. The setting remains fictional and educational. Do not introduce political commentary, real-world conflict, religious commentary or unrelated social issues.

Use a distinct Dilli Khoj visual identity. The official Example School of Technology site states that its trademarks and logos require prior written permission, so production should use text attribution or approved assets rather than scraping and redistributing logo files. Official references:


## Audience and platform

- Up to 3,000 university students.
- Every student has a MacBook Air or MacBook Pro.
- Any modern browser is supported; current Chrome is recommended and is the launch-support baseline.
- Campus Wi-Fi is normally available at approximately 2–5 MB/s per observed connection.
- All students may enter at once, so initial download size and campus-network saturation matter more than laptop compute.

## Player loop

1. Read the how-to-play explanation.
2. **Sign in with Google — required before any play.** Sign-in is mandatory (not optional) immediately after the explanation. Any Google account may play; sign-in saves each player's progress and lets admins access it.
3. Roam the currently unlocked area.
4. Survey the current ruin and open its SQL terminal.
5. Use **Run** for unlimited local practice.
6. Use **Submit** for authoritative server evaluation against visible and hidden cases.
7. Receive an immediate verdict without losing XP for a wrong answer.
8. Solve the ruin to unlock the next one.

### Sequential passage and rising difficulty

Ruins are played **strictly in order** (1 → 20). A ruin is playable only once the previous one is solved; players cannot jump ahead to a later topic. Because the sequence follows the DBMS Topic Tree (Modules 1 → 8), difficulty **rises** as the player advances. Movement is never gated by SQL — only the *next* ruin's availability is. Cleared ruins remain open for revisiting (see Revisit mode).

## Scope

- Seven districts.
- Twenty ruins.
- Modules 1–8 from the supplied DBMS Topic Tree.
- DQL exercises only: `SELECT` and `WITH ... SELECT`.
- A shared visible dataset for local practice.
- Two hidden data fixtures per question for robust grading.

## Question presentation

The visible content order is fixed:

1. Title
2. Description
3. Sample output
4. Hints

The schema browser is a separate terminal panel and is not part of the question text.

Questions describe the required data outcome and may recommend a technique such as `HAVING`. Technique is not a hard acceptance constraint: any safe query that passes all result cases is correct.

## Scoring and help

Implemented in `src/game/scoring.ts`:

| Event | XP |
| --- | ---: |
| Starting balance | 100 |
| First completion of a ruin | +20 |
| First survey of a ruin | +5 |
| First clue in a ruin | 0 |
| Second clue in ruins 11–20 | -5 |
| Full solution reveal | -15 |
| Wrong submission | 0 |
| Revisit practice | 0 |

- Ruins 1–10 have one free clue; ruins 11–20 add a deeper clue for 5 XP.
- The full solution becomes available only after every clue for that question has been opened and costs 15 XP.
- **Help is staged.** Free result diagnostics identify the kind of mismatch, the first clue removes the fear of asking for help, and stronger assistance affects leaderboard XP.
- A no-help run tops out at **600 XP** (`MAX_XP`). A player using every clue and reveal finishes with **250 XP** (`FULL_HELP_END_XP`), so assistance remains visible in the final score without stopping progress.
- A reveal solves nothing automatically. The learner must still submit a passing query — there is no way to reach the end without solving.
- XP, solved state, survey state and unlocks are server-authoritative in production.
- Practice and authoritative checks report column shape, missing or extra records,
  repeated records, ordering, or value mismatches without returning hidden rows.

## Revisit mode and the player world map

Each signed-in player has an **animated geographic atlas** of an imagined Delhi. Only cleared ruin regions are revealed and clickable; all uncleared regions, including the current frontier, remain under mist without map labels or links. The current question remains accessible through the game archive controls. Admins can inspect all twenty regions through the full atlas; inspection does not bypass scoring or progression rules.

- The illustrated atlas uses the Yamuna, ridge woodland, streets and landmarks. Geography is compressed for presentation and does not change curriculum order or the infinite 3D world. Motion can be paused and honors reduced-motion preferences.
- Clicking a cleared ruin on the player's map opens a **revisit** — a non-scoring practice attempt on that topic.
- The variant is deterministic from player, ruin and visit count; it may reuse the visible tables with a different target or threshold.
- Revisits award no progression XP and cannot change unlock state or the leaderboard; results may be recorded for analytics only.
- Per-player cleared/surveyed state, XP, hint/reveal usage, sign-up time and completion time are tracked so the map and the leaderboard can be rendered. Client-local while offline; server-authoritative once the backend is live.

## Leaderboard

The leaderboard lists **only players who have completed the game** (all 20 ruins solved). Rank by:

1. XP remaining, descending;
2. total time from sign-up to completion, ascending, as the tie-break.

Display name and XP (and optionally completion time). Never display email addresses. Show the top twenty plus the current player's own position if they have completed. The time tie-break is wall-clock time from server-recorded sign-up to first completion (owner decision, 4 September 2026); it includes time spent loading or away from the game. Revisits cannot change the recorded completion time.

Implemented as `compareCompletion` / `hasCompleted` in `src/game/scoring.ts`; cross-player data requires the server backend.

## Access control (admin and question pages)

The **admin surfaces** — the Question Studio and any player-progress views — are **restricted to specific admin emails** supplied by the project owner. These pages are not reachable by ordinary players.

- Access is granted only to signed-in users whose email is on the admin allowlist (owner-provided).
- Canonical solutions must never reach ordinary students: they are excluded from student builds, and any deployed admin view must read admin data from the server under RLS keyed to admin emails, not bundle it into the client.
- Until the allowlist and server RLS are in place, the authoring studio stays a local dev-only tool.

## Release policy without a deadline

The absence of a deadline is not a technical problem. It does create scope-drift and dependency-staleness risk, so release is controlled by readiness gates instead of a date:

- all twenty questions meet the authoring standard;
- all fixtures and near-miss tests pass;
- authentication and Submit work for any Google account, including the server admin allowlist;
- a synthetic load test passes the agreed latency target;
- the game completes on a baseline MacBook Air in current Chrome;
- the production build and visible dataset are preloaded before the class-wide start.

Because Supabase Free projects can pause after inactivity, check and wake the project before any demonstration or launch.

## Privacy default

Collect only:

- Supabase user UUID;
- Google display name and verified email;
- progress, XP and unlock state;
- submitted SQL, verdict, latency and hint usage;
- coarse gameplay telemetry required to diagnose stuck students.

Do not collect location, contacts or unrelated Google account data. Keep raw SQL and detailed attempts for 90 days after the event, then delete them or retain only anonymous aggregates. This is a safe default and can be shortened later.
