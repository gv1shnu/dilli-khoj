# Dilli Khoj — Game Design Document

_A PostgreSQL learning game set in a fictional, overgrown Delhi._

Version: 2026-09-05 · Branch: `open-world` · Status: development preview (not yet deployed)

---

## 1. High concept

**Dilli Khoj** ("the search for Delhi") is a single-player, browser-based 3D
exploration game that teaches the practical SQL curriculum of a DBMS course. The
player walks the ruins of an imagined, long-abandoned Shahjahanabad and wakes its
sealed **archives** one at a time. Each archive is a real SQL question graded
against hidden data. Waking an archive restores light to that part of the city and
opens the gate to the next.

The fantasy is _quiet restoration_, not competition or combat: you bring a dead
city's records back to life by asking the right questions of them. Learning SQL is
the literal mechanic by which the world heals.

> One line: **Walk a broken city; write SQL to wake its archives; the map lights up
> as you learn.**

---

## 2. Design pillars

1. **The curriculum is the map.** The twenty questions follow Modules 1–8 of the
   course in a fixed order, and that order is literally laid out as a route through
   the city. Progression through the world _is_ progression through the syllabus.
2. **Experiment freely, commit deliberately.** Practising a query is unlimited and
   free (local Postgres in the browser). Only the authoritative _Submit_ touches
   the hidden grader. Curiosity is never taxed.
3. **Debt rations shortcuts, never learning.** Hints and full reveals cost XP and
   are gated by balance. Solving is always free and always available — so a player
   can never be blocked from _finishing_, only from _skipping_.
4. **No dead ends, no failure states.** A wrong submission costs nothing. There is
   no timer, no health, no losing. The only way forward is understanding.
5. **Plain language over jargon.** Questions and hints describe the _data outcome_
   in everyday words and name the exact columns to use. Technique (e.g. `HAVING`)
   is suggested, never required — any safe query that returns the right rows passes.

---

## 3. Audience and learning goals

- **Audience:** up to ~3,000 students of an introductory DBMS course, on modern Mac
  browsers. Operating-cost target: ₹0 (free-tier infrastructure).
- **Prerequisite:** none beyond the course itself; the game is a practice surface,
  not a lecture.
- **Learning goal:** fluent read-only SQL — `SELECT` and `WITH … SELECT` covering
  filtering, pattern matching, ordering/paging, string/numeric/date/null functions,
  aggregation, grouping and group-filtering, `CASE`, window functions, subqueries,
  and joins with a set operation.
- **Scope guard:** the game is entirely **read-only DQL**. Even the topics that are
  "about" writes (DDL/DML/TCL/DCL, Modules 1–2) are taught through _evidence tables_
  — catalog, audit, change-log and grant tables — so the concept is exercised with
  `SELECT` alone, with no writes or privilege changes anywhere in the game.

---

## 4. World and narrative

Long after the noise faded, old Delhi went still. Its records — who lived where,
what moved through the bazaars, how the wards were run — were sealed in scattered
archives and slowly overgrown. The player walks the ruins of Shahjahanabad to wake
those archives, one question at a time.

The story is intentionally **open-ended**: the onboarding never mentions "winning"
or "finishing." The world is framed as a place to explore and restore. There is no
antagonist and no cutscene ending — the endgame is simply that every region has been
brought back to light.

### Places and districts

The twenty ruins map onto **real Delhi landmarks**, grouped into **seven districts**
that unlock in sequence. Each district holds one band of the curriculum:

| District | Name                  | Ruins | Curriculum band                                      |
| -------- | --------------------- | ----: | ---------------------------------------------------- |
| 1        | Yamuna Gates          |   1–3 | Module 1 — schema, keys, constraints                 |
| 2        | The Records Quarter   |   4–5 | Module 2 — SQL command families (read-only evidence) |
| 3        | Chandni Chowk Bazaars |  6–10 | Module 3 — SELECT, filtering, LIKE/IN/EXISTS, LIMIT  |
| 4        | Kitchens & Conduits   | 11–13 | Module 4 — string, numeric, date, null functions     |
| 5        | The Outer Yards       | 14–16 | Module 5 — GROUP BY, HAVING, CASE                    |
| 6        | The Ridge Lines       | 17–18 | Module 6 — window functions                          |
| 7        | Deep Foundations      | 19–20 | Module 7 (subqueries) & Module 8 (joins / set ops)   |

---

## 5. Core gameplay loop

1. **Run** through the current ruin (WASD / arrows, drag to look, Shift to walk). The
   amber trail points directly to that ruin's archive.
2. **Arrive** at a ruin — a broken place with a glowing **amber** (the sealed
   archive) rising from it. Press **E** to open it.
3. **Read** what the archive asks for: a plain-language description, the exact rows
   and columns wanted, and a sample output. A separate **schema browser** panel
   shows the tables and their columns.
4. **Run** queries freely against a local copy of the records — unlimited, free,
   and offline-capable. Experiment as much as you like.
5. **Submit** when confident. The archive checks the query for real against hidden
   records you can't see. A wrong answer costs nothing.
6. **Restore** on success: the ruin wakes, its lights return, the region is revealed
   on your map, and its exit gate opens. The trail immediately turns toward the gate.
7. **Cross** the open gate to enter the next ruin. The trail then turns toward the
   new ruin's amber. The world map remains available for revisiting restored places.

Optional at any archive: **open a hint** (small XP cost) or, once all hints are
opened, **reveal the full solution** (larger XP cost). Both are opt-in shortcuts.

---

## 6. World traversal and navigation

The world is a sequence of **physical open spaces**, rather than a level menu. Each
ruin feels expansive while preserving a clear learning boundary.

- **One ruin at a time.** Only the ruin the player has entered is rendered. No future
  geometry, archive, or mist volume appears beyond its edges.
- **Mirrored horizon.** The current 120-unit ruin repeats in a 3×3 field around the
  player. Crossing an ordinary edge wraps into another copy of the same place, so the
  horizon continues while exploration always returns to the same archive.
- **Physical gating.** Every ruin has one visible exit gate behind its arrival point.
  Its luminous bars remain sealed until that ruin's archive is restored. Walking
  through the open gate moves the player to the next ruin.
- **Contextual amber trail.** Before a solve, floating arrows point only to the
  nearest repeated copy of the current ruin's amber. After the solve, they point only
  to its open exit. On arrival in the next ruin, they switch to that ruin's amber.
- **Per-level kits.** Each of the twenty locations is hand-authored with its own
  props, terrain and landmark silhouette (a stepwell descent, a cable bridge, a
  ridge ascent, market lanes, etc.), giving each ruin a recognisable identity.
- **Sequential player map.** All twenty numbered stops remain visible in a gray
  bottom-to-top zig-zag: 01 begins at the bottom and 20 ends at the top. Restored
  stops become travel points; future stops remain gray and sealed. Admins retain a
  separate full geographic atlas that never bypasses scoring.

---

## 7. The archives: question design

Every archive presents four things, in this order: **title**, **description**,
**sample output**, and **hints** (help, opened on demand). The schema browser is a
separate panel, not part of the prompt.

- **Descriptions** state the required data outcome in plain language and name the
  exact columns and ordering to return — 12–35 words. They recommend a technique
  where useful but never _require_ it.
- **Sample output** shows fictional, clearly-fake rows (e.g. `sample_col_a`) so it
  can never be confused with the real answer.
- **Hints** are short, concrete, and jargon-free. Ruins 1–10 have one hint; 11–20
  have two. The full solution can be revealed only after every hint is opened.
- **Acceptance is by result, not by form.** Each question has a canonical solution
  plus structurally different **accepted variants** (e.g. `LEFT JOIN` vs
  `UNION`/`NOT EXISTS`, `HAVING` vs a subquery filter). Any safe query returning the
  correct result set passes.

### Reading Modules 1–2 with `SELECT` only

Modules 1–2 are about schema, keys, constraints and the SQL command families —
topics that normally imply writes and grants. Dilli Khoj teaches them through
**evidence tables** the player only reads:

- `catalog_columns` — one row per column of some table (`entity`, `attribute`,
  `data_type`, `is_key`).
- `column_keys` — how each column can identify a row (`key_kind`:
  primary / candidate / unique / none).
- `foreign_keys` — columns that point from a child table to a parent.
- `change_log` — audit of edits, tagged `DDL` (structure) vs `DML` (contents).
- `access_grants` — who may do what to each table.

This is why the questions and hints for these ruins name real columns like `entity`
and `attribute`: those are the actual identifiers the player sees in the schema
browser and types into the query, not abstract theory terms.

---

## 8. Progression and unlocks

- **Strictly sequential.** Ruins are cleared in order; a ruin unlocks only when the
  previous one is cleared. The frontier is the first ruin not yet cleared.
- **Cleared ruins stay open** for revisiting (non-scoring practice).
- **Server-authoritative in production.** Solved state, XP, hint/reveal usage,
  survey state, unlocks and completion time are owned by the server, not the client.
  Offline/local play keeps the same shape but is a non-scoring practice proxy.

---

## 9. Economy: XP, hints, reveals

Scoring lives in `src/game/scoring.ts`. The economy is a single, closing budget:

| Event                      |      XP |
| -------------------------- | ------: |
| Starting balance           | **100** |
| First completion of a ruin | **+20** |
| First survey of a ruin     |  **+5** |
| Open a hint                | **−10** |
| Reveal the full solution   | **−20** |
| Wrong submission           |       0 |
| Revisit practice           |       0 |

Design consequences, by intent:

- **A no-help run tops out at `MAX_XP` = 600.** (100 start + 20×20 solves + surveys.)
- **Help is a purchase gated by balance.** You cannot open a hint or reveal you
  can't afford. A player taking maximum help on every level runs out of affordable
  help around **level 13 of 20** (`EXHAUSTS_AROUND`) and must solve the rest unaided
  — there is no way to buy your way to the finish.
- **Solving is always free and always available.** Debt never blocks _learning_;
  only _shortcuts_ are rationed.
- **A reveal solves nothing automatically.** Even after revealing, the learner must
  submit a passing query themselves. There is no path to the end without solving.
- **Wrong answers are free**, so _Submit_ is safe to use as a probe.

---

## 10. Grading and integrity

Two distinct execution surfaces keep practice cheap and grading trustworthy:

- **Run (practice):** the player's query runs in **PGlite** — Postgres compiled to
  WebAssembly, in a Web Worker in the browser — against a _visible_ dataset. Free,
  unlimited, offline, and never scored.
- **Submit (authoritative):** the query is sent to a **Supabase Edge Function judge**
  that parses it with `libpg-query`, enforces a read-only allow-list of tables and a
  statement timeout, runs it against **hidden** datasets the player never sees, and
  compares the result set (ordered or unordered per question) to precomputed
  expected rows.

Integrity properties:

- **Three fixtures per question** — one visible (for practice) and two hidden (for
  grading) — so memorising the visible answer does not pass.
- **Expected rows are computed, never hand-written** — the canonical solution is run
  against each fixture by real Postgres during content generation.
- **Result-based acceptance** with near-miss tests: known-wrong queries (e.g. the
  starter query, a `LIMIT 0`, a doubled `UNION ALL`) must _fail_, and every accepted
  variant must _pass_.
- **Least privilege:** the judge executes as a role that can only `SELECT` from the
  fixture schemas; private answer/help tables are unreadable by players and by the
  judge's executor role.

---

## 11. Revisits and replayability

- Any cleared ruin can be reopened from the player's map as a **revisit** — a
  non-scoring practice attempt.
- Revisit variants are **deterministic** from (player, ruin, visit count): they may
  reuse the visible tables with a different target or threshold, so the topic can be
  drilled without ever affecting XP, unlocks, or the leaderboard.
- Revisits may be recorded for analytics only.

---

## 12. Leaderboard and endgame

- The leaderboard lists **only players who have completed all twenty ruins.**
- **Ranking:** XP remaining (descending), then completion time (ascending) — where
  completion time is wall-clock from server-recorded sign-up to first completion.
- **Displayed:** name and XP (optionally completion time). **Never** email addresses.
  Top twenty plus the current player's own position if they have completed.
- **Endgame:** restoring the twentieth archive (Signature Bridge) lights the whole
  city. There is no forced ending screen; the open world remains to wander and
  revisit.

---

## 13. Interface and UX

- **Onboarding overlay** (reopenable via "?") explains movement, ruins & ambers, and
  the Run/Submit loop — deliberately saying nothing about "finishing."
- **Controls:** WASD/arrows to run, drag to look, Shift to walk, **E** to open an
  archive, **M** to mute/unmute ambience.
- **Archive panel:** prompt + sample output on one side, a SQL editor with **Run**
  and **Submit** on the other, and a separate schema browser.
- **Maps:** the player's numbered bottom-to-top journey (restored stops are travel
  points) and the admin geographic atlas (all regions, inspection-only).
- **Accessibility:** motion can be paused and honors reduced-motion preferences;
  dialogs trap focus and restore it on close; keyboard navigation throughout.

---

## 14. Audio and art direction

- **Per-ruin soundscapes.** Every ruin has a distinct generated mix, filter color,
  pitch pattern and event cadence — river wind at the water gates, insects and birds
  on the wooded ridge, water drops in the stepwell, rail resonance at the station,
  and so on. Audio is procedural through the Web Audio API and toggled with **M**.
- **Art direction** is low-poly, quiet, and overgrown, with an animated character
  and hand-placed landmark silhouettes per ruin. Inspiration credited to _Exceletia_
  by edusatyaki; shipped assets are listed in `CREDITS.md`.

---

## 15. Technical architecture

- **Client:** Vite + React 19 + TypeScript, 3D via Three.js. Hosted as static assets
  on **Cloudflare Workers**.
- **Local practice DB:** PGlite (Postgres in WebAssembly) in a Web Worker.
- **Backend:** Supabase — Google auth (approved-domain allow-list), Postgres for
  authoritative state, and an **Edge Function judge**. Game state and grading are
  exposed only through RPCs; answer/help/fixture data is server-private.
- **CI/CD:** GitHub Actions; `main` auto-deploys. Timezone is pinned to
  `Asia/Kolkata` across content and test scripts for deterministic timestamps.

---

## 16. Content pipeline

`src/questions/catalog.ts` is the single **authoring source of truth** for all
twenty questions (title, description, sample, hints, schema, starter SQL, canonical
solution, accepted variants). Generators derive everything else from it:

- `content:generate` → `practice.generated.json`, the client bundle. **Hint text and
  answers are stripped**; the client ships only a `hintCount` and the visible fixture.
- `content:judge` → the fixtures migration (`…_all_ruin_fixtures.sql`): hidden
  schemas, private help/answers, and expected rows _computed by real Postgres_.
- `generate-question-copy.mjs` → a forward-only migration that updates player-facing
  title, description and hints in the live database's private help table.

A reproducibility test asserts the committed fixtures migration is byte-identical to
what the generator produces from the catalog, so authoring, the client bundle, and
the grader can never silently drift apart.

Authoring is also editable through a DEV-only **Question Studio** (`#admin`) and
**World Studio** (`#world-studio`), both tree-shaken out of production builds.

---

## 17. The twenty archives

|   # | Place                       | Module | Learning target                             | Hints |
| --: | --------------------------- | -----: | ------------------------------------------- | ----: |
|   1 | Purana Qila quarantine gate |      1 | Entity, attribute and schema                |     1 |
|   2 | Kashmere Gate ISBT          |      1 | Primary, candidate, unique & not-null keys  |     1 |
|   3 | Nigambodh Ghat register     |      1 | Foreign keys & referential integrity        |     1 |
|   4 | Old Delhi records room      |      2 | DDL/DML evidence via catalog & audit tables |     1 |
|   5 | Kotwali vault               |      2 | TCL/DCL outcomes via logs & grants          |     1 |
|   6 | Chandni Chowk               |      3 | SELECT and WHERE                            |     1 |
|   7 | Fatehpuri Masjid steps      |      3 | DISTINCT                                    |     1 |
|   8 | Chawri Bazaar lanes         |      3 | LIKE, ILIKE and wildcards                   |     1 |
|   9 | Dariba Kalan                |      3 | IN, EXISTS and logical operators            |     1 |
|  10 | Chor Bazaar                 |      3 | ORDER BY, LIMIT and OFFSET                  |     1 |
|  11 | Karim's, Jama Masjid        |      4 | String functions                            |     2 |
|  12 | Wazirabad water works       |      4 | Numeric functions & null handling           |     2 |
|  13 | Old Delhi station clock     |      4 | Date functions & aggregation                |     2 |
|  14 | Azadpur Mandi               |      5 | GROUP BY and aggregates                     |     2 |
|  15 | Ghazipur landfill           |      5 | Group filtering (HAVING)                    |     2 |
|  16 | Tihar sorting yard          |      5 | CASE with grouping & aggregates             |     2 |
|  17 | Rajiv Chowk interchange     |      6 | ROW_NUMBER, RANK, DENSE_RANK                |     2 |
|  18 | Ridge signal tower          |      6 | LAG, LEAD & rolling comparison              |     2 |
|  19 | Agrasen ki Baoli            |      7 | Nested & correlated subqueries              |     2 |
|  20 | Signature Bridge            |      8 | Multi-table joins & a set operation         |     2 |

---

## 18. Non-goals and open items

- **No writes.** No `INSERT`/`UPDATE`/`DELETE`/DDL/DCL is ever executed by a player;
  write-family topics are taught read-only by design.
- **No multiplayer, combat, or timers.** The only competitive surface is the
  completers-only leaderboard.
- **Not yet deployed.** This branch implements all twenty server-graded questions and
  trusted progression; the current hosted build still reports an older Ruin-06-only
  judge. Shipping requires pushing the new migrations and redeploying the judge.
- **Blind human review** of each drafted question remains a production step before a
  classroom-wide release.

---

_Sources: `src/game/ruins.ts`, `src/game/progression.ts`, `src/questions/catalog.ts`,
`src/game/world/`, `docs/product-spec.md`, `docs/curriculum-map.md`, and the content
generation scripts. This document consolidates them into one reference._
