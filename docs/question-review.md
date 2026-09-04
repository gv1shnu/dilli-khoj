# Coding question review

Started 4 September 2026. **Owner review is in progress; no question is marked human-approved.** This is a code/fixture audit with access to solutions, not a blind solve. Keep this owner-facing document outside student assets.

## Findings before approval

1. All 20 descriptions are within the 35-word cap (12–27 words in the current catalog). Each has the expected hint count, one canonical solution and **two** additional accepted variants. The authoring standard calls for **at least three structurally different accepted solutions**. The catalog has three queries including the canonical, but aliases, positional ORDER BY and case-insensitive substitutions do not establish three genuinely distinct correct approaches. Audit structural diversity rather than assuming the raw count satisfies the rule.
2. Hidden fixtures largely reuse the same relationships and numeric values while changing labels/IDs, reversing insertion order and removing one row. Different expected rows defeat literal output copying, but do not prove the intended data condition is tested.
3. Confirmed wrong-condition examples passing all three current generated fixtures are recorded below. These need explicit rejection regressions and targeted data changes before release.
4. Early Module 1/2 questions require SELECT/WHERE/ORDER BY before those techniques' Module 3 place in the curriculum. Decide whether this is a SQL revision exercise or an introduction needing starter scaffolding. Do not reorder the curriculum to hide this decision.
5. Several questions need explicit NULL/tie semantics. Pure result agreement against today's small datasets is insufficient to establish prompt clarity.

## Confirmed fixture loopholes

| Ruin | Wrong-condition probe | Why it is wrong | Current result |
| --- | --- | --- | --- |
| 01 | Select non-null entities other than `shelter` | Would include unrelated entities such as `clinic`; does not specifically select `resident` | Matches canonical results in visible, hidden A and hidden B |
| 06 | Filter only `daily_rations > 20` | Ignores the required ward and open status | Matches canonical results in visible, hidden A and hidden B |
| 19 | Filter only `depth_m > 30` | Uses a fixed threshold instead of the dataset's average | Matches canonical results in visible, hidden A and hidden B |

Reproduced directly in PGlite using `fixtureSql(question, 0..2)` and comparing with executed canonical results. These are generated content used by the new all-ruin judge; do not confuse them with the older dedicated Ruin 06 hidden fixtures.

Proposed repairs: add unrelated non-null entities for 01; vary rations independently of ward/status and include an open K-7 zero-ration row for 06; change depth distributions enough that qualifying depths cross fixed thresholds for 19. Run concrete wrong SQL through the judge acceptance path, not merely altered expected-result arrays.

## Review queue

| # | Current title | Review focus |
| --- | --- | --- |
| 01 | Reading the Resident Schema | Keep as a gentle schema-reading warm-up? Stronger entity distractors and genuinely different variants |
| 02 | Keys to the Bus Bay | Explicitly say `entity = 'bus'`; explain nullable UNIQUE versus candidate keys without making it mere label copying |
| 03 | Tracing the Family Links | Multiple child references and stable ordering; parent-versus-child distractors; avoid treating ILIKE as automatically equivalent |
| 04 | Evidence of the Rebuild | Define timestamp NULL handling/tie order before adding those cases; check DDL/DML coverage |
| 05 | Who Holds the Keys | Clear DCL exercise; advertised TCL learning target is not exercised by this first-pass prompt—check revisit coverage or narrow claims |
| 06 | The Last Open Stalls | Preserve filter warm-up; add independent ward/status/rations traps |
| 07 | Every Ward Represented | Explicitly include or exclude the NULL ward (canonical currently includes it once) |
| 08 | The Paper Traders | Clarify substring match includes `wastepaper`; case-insensitive examples and NULL trade |
| 09 | Unsealed in the Silver Lane | False versus NULL semantics; verify EXISTS coverage beyond this IN-based first pass |
| 10 | The Three Richest Finds | Deterministic ties already specified; verify OFFSET coverage elsewhere and define missing values if introduced |
| 11 | Karim's Recipe Cards | Character length versus byte length; NULL note length versus zero; mixed-case sorting |
| 12 | Total Flow at Wazirabad | Specify rounding to whole units; missing backup becomes zero, missing primary flow currently stays NULL |
| 13 | Departures by Day | Clarify count of departure rows versus non-null train labels; canonical includes a NULL-date group |
| 14 | Crates at Azadpur Mandi | SUM of all-NULL group is NULL, not zero; duplicate lots and negative adjustments |
| 15 | Heaps Above the Line | Strictly greater than 800, group total versus individual rows; keep equivalent SQL accepted |
| 16 | Heavy Parcels per Bin | Include bins with zero heavy parcels; NULL weights are not heavy; boundary exactly 20 |
| 17 | Ranking the Rush | RANK gaps versus DENSE_RANK/ROW_NUMBER; verify the broader window coverage in revisits |
| 18 | The Previous Signal | Previous row, not `hour - 1`; missing hours and preceding NULL signal |
| 19 | Deeper than Average | Vary averages/qualifying values; discuss whether correlated subquery coverage is fulfilled in revisits |
| 20 | Spans and Their Towers | Unoccupied towers, unanchored/orphan spans, duplicates and join direction; equivalent LEFT JOIN accepted |

These are review questions, not all confirmed defects. Review the 40 revisit objectives after approving their first-pass counterparts; this initial ledger does not claim a completed revisit audit.

## Current discussion: Ruin 01

**Place:** Purana Qila quarantine gate. **Target:** entity, attribute and schema.

Current prompt:

> The gate catalog lists every attribute of each entity. Return `attribute` and `data_type` for the `resident` entity, sorted by `attribute`.

Available table: `catalog_columns(entity text, attribute text, data_type text, is_key boolean)`.

Suggested wording (pending owner review):

> From `catalog_columns`, return `attribute` and `data_type` where `entity` is `resident`. Sort by `attribute` ascending.

Initial assessment: suitable as a short warm-up, but it tests reading catalog rows using filtering rather than inferring a schema from a story. Keep the learning objective modest, strengthen hidden entity distractors and replace superficial solution variants. No content change is approved/applied by this ledger.

**Decision needed:** retain this gentle schema-reading warm-up, or make the opening task require more inference? Record the owner's choice here before revising the catalog.

## Approval record

| Ruin | Owner wording/objective decision | Fixture/variant repair | Blind solve | Release approval |
| --- | --- | --- | --- | --- |
| 01 | Awaiting discussion | Pending | Not done | Not approved |
| 02–20 | Not reviewed together yet | Pending audit | Not done | Not approved |
