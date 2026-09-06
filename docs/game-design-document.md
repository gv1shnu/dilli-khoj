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
3. **Help unfolds in stages, learning stays free.** The first clue on every archive
   is free; a deeper clue and the full solution cost a little XP. Solving is always
   free and always available, and a reveal never solves for you — so help is a gentle
   nudge, never a wall, and no one can skip the learning.
4. **No dead ends, no failure states.** A wrong submission costs nothing. There is
   no timer, no health, no losing. The only way forward is understanding.
5. **Plain language over jargon.** Question descriptions describe the _data
   outcome_ in everyday words and stay free of SQL keywords and query syntax.
   Column and table identifiers may be named when the learner needs them. SQL
   techniques belong in optional hints, the schema browser, and the editor. Any
   safe query that returns the right rows passes.
6. **Every ruin is a place.** A new archive must introduce a physically distinct
   space, silhouette, traversal rhythm, prop family, light treatment, and ambience.
   Recoloring or rearranging the previous ruin is not enough.

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

1. **Run** through the current ruin (WASD / arrows, drag to look). Running is the
   default pace; hold Shift for careful walking. The amber trail initially points
   directly to that ruin's archive.
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
   on your map, and its exit gate opens. A green `+20 XP` change rises over the
   player's screen position, a ruin-specific restoration event unfolds in the 3D
   world, and the trail defaults to the gate.
7. **Cross** the open gate to enter the next ruin. The trail then turns toward the
   new ruin's amber. The world map remains available for revisiting restored places.

Optional at any archive: open the first **clue** for free, then a deeper clue for a
small XP cost where available. Once all clues are open, the player may reveal the
full solution for a larger cost. Deductions rise over the player in red; gains use
green.

Every restoration has its own physical payoff: watchfires, a working departure
signal, river ripples, ordered pages, vault rings, market lanterns, courtyard lamps,
brass machinery, a jewel constellation, clocks, a hearth, pumps, a rail signal,
harvest baskets, a living tree, a sorting line, luminous interchange routes, a ridge
transmission, rising stepwell water, and the final bridge lights. These set pieces use
merged procedural geometry and are built lazily with their ruin.

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
- **Player-directed amber trail.** The mission card offers **Current amber** and
  **Next gate**. Before restoration, the gate choice is disabled and the arrows lead
  to the reachable amber inside the active ruin. Restoration enables the gate and
  selects it by default. Entering a new ruin resets the trail to its amber; travelling
  to a restored ruin from the map also defaults to its amber for a revisit. Ruin 20
  has no onward gate choice.
- **Per-level kits.** Each of the twenty locations is hand-authored with its own
  props, terrain and landmark silhouette (a stepwell descent, a cable bridge, a
  ridge ascent, market lanes, etc.), giving each ruin a recognisable identity.
- **Sequential player map.** The field-atlas illustration shows the ridge, old city,
  Yamuna, streets and vegetation behind an uneven bottom-to-top journey. Ruin 01
  begins at the bottom and Ruin 20 ends at the top; gray route segments zig-zag
  between them. Every ruin uses a different landmark icon silhouette. Restored stops
  become travel points, the frontier is identified, and future stops remain gray and
  sealed. The old redundant numbered strip is absent. Admins retain a separate full
  geographic atlas that never bypasses scoring.

---

## 7. The archives: question design

Every archive presents four things, in this order: **title**, **description**,
**sample output**, and **hints** (help, opened on demand). The schema browser is a
separate panel, not part of the prompt.

- **Descriptions** state the required data outcome in plain language and name the
  exact columns and ordering to return — 12–35 words. They do not use SQL keywords,
  clauses, operators, or query fragments. A useful technique may be explained in a
  hint, but is never a required form of the answer.
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
**evidence tables** the player only reads, and — crucially — those tables use
**plain, everyday column names** rather than formal database vocabulary, so a
beginner meets the concept before the jargon:

- `record_fields` — one row per field of some record-book (`book`, `field`,
  `stores`, `is_key`).
- `id_tags` — whether a field can pick out one record alone (`tag`:
  `main` / `spare` / `none`).
- `links` — fields that point from one book to another (`from_book`, `from_field`,
  `to_book`, `to_field`).
- `change_log` — a log of edits, each tagged `structure` vs `contents` (`edit`,
  `target`, `change_type`, `changed_at`).
- `permissions` — who is `allowed` to `read` or `write` each `record_book`.

The formal terms (entity, attribute, foreign key, DDL/DML, grant) are the module's
*learning targets*, but the questions never make the student parse them — the story
and the plain column names carry the concept; the vocabulary is introduced in class
and hints.

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
| Open the first clue        |   **0** |
| Open a deeper clue         |  **−5** |
| Reveal the full solution   | **−15** |
| Wrong submission           |       0 |
| Revisit practice           |       0 |

Design consequences, by intent:

- **A no-help run tops out at `MAX_XP` = 600.** (100 start + 20×20 solves + surveys.)
- **Help is staged rather than punitive.** The first clue is free. Stronger help
  remains a score tradeoff, and taking every clue and reveal produces a final balance
  of `FULL_HELP_END_XP` = 250.
- **Solving is always free and always available.** Debt never blocks _learning_;
  heavier help simply trims a little of your score.
- **A reveal solves nothing automatically.** Even after revealing, the learner must
  submit a passing query themselves. There is no path to the end without solving.
- **Wrong answers are free**, so _Submit_ is safe to use as a probe.
- **Wrong-result feedback is diagnostic.** It identifies output shape, missing or
  extra records, repeated records, ordering, or value mismatches without exposing
  hidden expected values.
- **Feedback is spatial.** Positive XP changes animate in green and deductions in
  red at the avatar's projected screen position. The development practice preview
  can replay the green solve animation for review, but never changes official XP.

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
- **Mission card:** place, restoration count, current objective, amber-trail
  direction control, archive action, and world-map action remain together.
- **Archive panel:** prompt + sample output on one side, a SQL editor with **Run**
  and **Submit** on the other, and a separate schema browser.
- **Maps:** the player's numbered bottom-to-top journey (restored stops are travel
  points) and the admin geographic atlas (all regions, inspection-only).
- **Accessibility:** motion can be paused and honors reduced-motion preferences;
  dialogs trap focus and restore it on close; keyboard navigation throughout.

---

## 14. Audio and art direction

- **Per-ruin soundscapes.** All twenty ruins have distinct generated mixes, filter
  colors, pitch patterns, seeded detail cues, and event cadences — river wind at the
  water gates, insects and birds on the wooded ridge, water drops in the stepwell,
  rail resonance at the station, and so on. Profiles switch on ruin entry. Audio is
  procedural through the Web Audio API and toggled with **M**.
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

## 18. Current implementation snapshot

The `open-world` branch now contains the complete physical framework for the
twenty-ruin journey:

- twenty individually built ruin environments, joined by sequential gates;
- a repeating visual field around each active ruin so every direction feels open
  while progression still returns the player to the current archive;
- a player-controlled amber trail that can target the current archive or, after a
  solve, the next gate;
- an illustrated bottom-to-top journey map with an uneven zig-zag route and a
  different landmark icon for every ruin;
- twenty distinct procedural ambience profiles, run-first movement with
  **Shift-to-walk**, and spatial green/red XP feedback over the player; and
- twenty first-pass objectives plus forty alternating, non-scoring revisit
  objectives.

The 152-test automated suite, typecheck, production build, browser smoke tests and
mocked authentication contracts pass in the development preview. The slow physical
walkthrough covers all twenty archives, nineteen sequential gates, map revisits and
the final state. Ruins are constructed on first entry, covered scenes render at 12 FPS,
and hidden signed-in tabs stop polling the backend. Six common MacBook Air/Pro Retina
profiles pass at 60 FPS in Chrome and WebKit, including four-times CPU-throttled Air
profiles; installed Safari and the oldest physical classroom laptop remain final
release checks.

---

## 19. Completion plan

1. **Establish the target performance envelope.** The automated Air/Pro Retina matrix
   passes. Profile long sessions and fullscreen on the oldest physical classroom
   MacBook, then measure the authorized hosted backend and real campus-network
   download/cache behavior.
2. **Finish native-browser and accessibility QA.** Complete Safari and Firefox
   interaction passes, keyboard-only play, reduced motion, audio recovery, focus and
   refresh boundaries after the owner enables the required macOS controls.
3. **Exercise the real backend locally.** Use a disposable Supabase stack to verify
   Google authentication, signup hooks, RPC grants, row-level security, account
   switching, retry idempotency, help purchases, progression and judge isolation for
   all twenty ruins.
4. **Finish execution hardening.** The judge has query-size, row, time and result-byte
   limits. Add a planner-cost gate, bound queue time, reconcile execution limits with
   the grading lease, and test adversarial read-only submissions.
5. **Complete the later content acceptance review.** Review all twenty first-pass
   objectives and forty revisits; keep descriptions free of SQL keywords and query
   syntax; close the known fixture loopholes in Ruins 01, 06 and 19; make null and tie
   behavior explicit; and obtain blind human solves.
6. **Prepare release operations.** Verify retention cleanup, monitoring, alerting and
   rollback, then review the exact commit and migration order. After owner approval,
   release migrations, judge and web in that order and run a signed-in production
   smoke test.

The maintained, task-level checklist is in [next steps](next-steps.md).

---

## 20. Non-goals and open items

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
