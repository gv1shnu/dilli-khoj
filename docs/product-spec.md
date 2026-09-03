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

1. Sign in with Google.
2. Roam the currently unlocked district.
3. Survey a ruin and open its SQL terminal.
4. Use **Run** for unlimited local practice.
5. Use **Submit** for authoritative server evaluation against visible and hidden cases.
6. Receive an immediate verdict without losing XP for a wrong answer.
7. Solve every ruin in the district to open the next checkpoint.

Movement is never gated by SQL inside an open district. SQL clears ruins and opens district checkpoints.

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

Recommended rules:

| Event | XP |
| --- | ---: |
| Starting balance | 100 |
| First completion of a ruin | +20 |
| First survey of a ruin | +5 |
| Hint | -10 |
| Full solution reveal | -30 |
| Wrong submission | 0 |
| Revisit practice | 0 |

- Ruins 1–10 have one hint; ruins 11–20 have two.
- The full solution becomes available only after all hints for that question have been opened.
- XP may go negative; debt never blocks learning.
- XP, solved state, survey state and unlocks are server-authoritative.
- A reveal solves nothing automatically. The learner must still submit a passing query.

## Revisit mode

Solved ruins remain physically accessible. Revisiting a ruin starts a non-scoring practice attempt with a different question variant for the same topic.

- The variant is deterministic from player, ruin and visit count.
- It awards no additional progression XP and cannot change district state.
- It may use the same visible tables with a different target or threshold.
- Revisit results may be recorded for learning analytics but never affect the leaderboard.

## Leaderboard

The final leaderboard is visible to students. Rank by:

1. number of first-time ruins solved;
2. XP remaining;
3. total active solving time, ascending, as a tie-break only.

Display name, solved count and XP. Never display email addresses. Show the top twenty plus the current player's own position. Pauses, loading time and revisit practice do not count toward active solving time.

## Release policy without a deadline

The absence of a deadline is not a technical problem. It does create scope-drift and dependency-staleness risk, so release is controlled by readiness gates instead of a date:

- all twenty questions meet the authoring standard;
- all fixtures and near-miss tests pass;
- authentication works for both approved domains;
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

