# Curriculum map

Source: `NST DBMS 2026.xlsx`, `Topic Tree`, Modules 1–8. Spelling is normalized in this document; subject order is preserved.

## Workbook sequence

| Module | Workbook coverage | Game emphasis |
| ---: | --- | --- |
| 1 | Relational databases; entity, attribute, relation; schema; keys and constraints; datatypes | Read schemas and identify entities, attributes, keys and references |
| 2 | SQL command families: DDL, DML, TCL and DCL | Read catalog and audit evidence using DQL; do not execute writes or grants |
| 3 | `SELECT`, `DISTINCT`, `WHERE`, `IN`, `LIKE`, `EXISTS`, wildcards, logical operators, `LIMIT`, `OFFSET` | Retrieval and filtering |
| 4 | Numeric, date, string, null-handling and aggregate functions | Transform and summarize values |
| 5 | `GROUP BY`, aggregates, multi-column grouping, `HAVING`, `WHERE` versus `HAVING`, `CASE` | Grouped reasoning |
| 6 | Window concepts, `ROW_NUMBER`, `RANK`, `DENSE_RANK`, `LAG`, `LEAD`, moving/rolling metrics, execution order | Analytics without collapsing rows |
| 7 | Scalar, `FROM` and `WHERE` subqueries; correlated subqueries | Nested reasoning |
| 8 | Join need and conditions; inner/outer/self joins; cartesian mistakes; `ON` versus `WHERE`; multi-table joins; set operations | Combining relations and result sets |

## Twenty-ruin mapping

| # | Ruin | Module | Learning target |
| ---: | --- | ---: | --- |
| 1 | Purana Qila quarantine gate | 1 | Entity, attribute and schema |
| 2 | Kashmere Gate ISBT | 1 | Primary, candidate, unique and not-null keys |
| 3 | Nigambodh Ghat register | 1 | Foreign keys and referential integrity |
| 4 | Old Delhi records room | 2 | DDL and DML evidence through catalog and audit tables |
| 5 | Kotwali vault | 2 | TCL outcomes and DCL permissions through logs and grants metadata |
| 6 | Chandni Chowk | 3 | `SELECT` and `WHERE` |
| 7 | Fatehpuri Masjid steps | 3 | `DISTINCT` |
| 8 | Chawri Bazaar lanes | 3 | `LIKE`, `ILIKE` and wildcards |
| 9 | Dariba Kalan | 3 | `IN`, `EXISTS` and logical operators |
| 10 | Chor Bazaar | 3 | `ORDER BY`, `LIMIT` and `OFFSET` |
| 11 | Karim's, Jama Masjid | 4 | String functions |
| 12 | Wazirabad water works | 4 | Numeric functions and null handling |
| 13 | Old Delhi station clock | 4 | Date functions and aggregation |
| 14 | Azadpur Mandi | 5 | `GROUP BY` and aggregates |
| 15 | Ghazipur landfill | 5 | Group filtering; question encourages `HAVING` but equivalent passing queries are accepted |
| 16 | Tihar sorting yard | 5 | `CASE` with grouping and aggregates |
| 17 | Rajiv Chowk interchange | 6 | `ROW_NUMBER`, `RANK` and `DENSE_RANK` |
| 18 | Ridge signal tower | 6 | `LAG`, `LEAD` and rolling comparison |
| 19 | Agrasen ki Baoli | 7 | Nested and correlated subqueries |
| 20 | Signature Bridge | 8 | Multi-table joins, join conditions, outer-join reasoning and a set operation |

## Districts

The 20 ruins are grouped into 7 districts (contiguous ranges that unlock in order). Encoded in `src/game/ruins.ts`.

| # | District | Ruins | Modules |
| ---: | --- | --- | --- |
| 1 | Yamuna Gates | 1–3 | 1 |
| 2 | The Records Quarter | 4–5 | 2 |
| 3 | Chandni Chowk Bazaars | 6–10 | 3 |
| 4 | Kitchens & Conduits | 11–13 | 4 |
| 5 | The Outer Yards | 14–16 | 5 |
| 6 | The Ridge Lines | 17–18 | 6 |
| 7 | Deep Foundations | 19–20 | 7–8 |

## Coverage notes

- Modules 1 and 2 are taught through read-only artefacts because the game permits DQL only.
- Ruin 15 is worded to teach `HAVING`, but the judge grades semantics across fixtures rather than enforcing one syntax tree.
- Ruin 20 includes a set operation so Module 8 is not reduced to joins alone.
- Every question variant must remain inside the assigned module even when a revisit changes its target data.

