# Question authoring and tests

## Required visible format

### Title

- Two to six words.
- Name the in-world objective, not the SQL feature alone.

### Description

- One or two sentences.
- Target: 12–25 words; hard maximum: 35 words.
- State exactly what rows and columns to return.
- May encourage a technique, but must not imply that equivalent SQL will be rejected.

### Sample output

- Show the expected column names and at most three fictional example rows.
- Use values that cannot be confused with the real answer.
- State when order matters.

### Hints

- Maximum 20 words each.
- Hint 1 names the relevant idea.
- Hint 2, where available, points at the required relationship without giving the query.
- The paid solution is stored only in the server vault.

The schema browser separately lists available tables, columns, types and key relationships.

## Example

### Heaps Above the Line

**Description:** Return `heap_no` for disposal heaps whose total recovered metal exceeds 800 kg. Sort by `heap_no`.

**Sample output:**

| heap_no |
| --- |
| H-02 |
| H-09 |

**Hint:** Filter after the rows have been grouped.

`HAVING` is the intended lesson. A safe subquery that produces the same correct results on every case is also accepted.

## Runtime test cases

Each first-time question has three data fixtures with identical table and column names:

1. **Visible case:** the shared dataset installed in PGlite.
2. **Hidden edge case A:** changes row values and includes a common trap such as duplicates, ties or `NULL`.
3. **Hidden edge case B:** changes row distribution so a hard-coded answer or accidental result fails.

The prompt parameters remain valid in every fixture, but the correct result changes with the data. Students therefore solve the data condition rather than memorize an answer.

Server schemas are isolated by fixture and selected with `search_path`. Student-facing SQL uses unqualified table names. Schema-qualified table references are rejected as an execution rule so the same query can run against each fixture; this does not restrict SQL technique.

The judge returns only:

- `ok` when every case passes;
- `wrong_result` with a count such as “Passed 2 of 3 cases”;
- `sql_error` for invalid SQL;
- `timeout`, `locked`, `rate_limited` or `dataset_outdated` where applicable.

Hidden rows and expected hidden answers are never returned to the browser.

## Result comparison

Each question declares:

- ordered or unordered comparison;
- required output column count;
- whether column names matter;
- exact or tolerant numeric comparison;
- maximum result rows;
- whether duplicates are significant.

For unordered results, canonicalize and sort rows before comparison while preserving duplicates. For ordered results, compare row position exactly. `NULL`, empty string and zero are distinct.

## Authoring acceptance matrix

Every question must include:

- one canonical solution;
- at least three structurally different accepted solutions;
- every supported seeded target;
- a hard-coded answer that must fail a hidden fixture;
- missing-row and extra-row near misses;
- wrong-column and wrong-order near misses where relevant;
- duplicate, tie and `NULL` edge cases where relevant;
- a cartesian or over-broad query for multi-table questions;
- timeout and excessive-cost cases;
- non-SELECT and multiple-statement rejection cases.

## Definition of done

A question ships only when:

1. Every accepted query passes all fixtures and seeds.
2. Every named near miss receives the intended verdict.
3. At least one reviewer solves it from the description without seeing the solution.
4. The description is 35 words or fewer.
5. The error copy helps without revealing a hidden answer.
6. The production query completes within the per-case budget on the smallest supported database tier.

## Free-tier feasibility fallback

Three executions per submission are more robust but triple authoritative query work. If load testing shows that the free database cannot sustain it, keep all three fixtures in CI and execute the visible case plus one randomly selected hidden case during gameplay. Do not silently remove hidden evaluation altogether.

