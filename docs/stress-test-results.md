# Stress test — 6 September 2026

**Verified local baseline: 600 canonical grading submissions per second for five
minutes, confirmed by a separate one-minute replay. Production capacity remains
unmeasured.** This is a measured passing rate, not the exact maximum. Rates between
600 and 787/sec have not received equivalent sustained tests, and the failing
787/sec run followed earlier overload in the same database.

## Environment and workload

- Application baseline: `a9f4647`, with a new local stress harness; no application
  or database performance changes made for this test.
- Apple M5 Max, 18 physical CPU cores, 48 GiB RAM; Node 26.8.1; PostgreSQL 17.11.
- Disposable local PostgreSQL, real judge handler loaded through Vite, signed test
  JWTs and the production restricted database roles. One Node judge instance,
  with one executor connection and one progress connection.
- 3,000 simulated approved accounts, evenly assigned across all twenty ruins.
  Prerequisite solves are seeded before measurement. Each account repeatedly
  submits its assigned canonical answer, with a new submission UUID each time.
  The first submission solves the target; subsequent requests grade the same
  already-solved ruin and record another attempt without awarding XP.
- Thus these results measure canonical grading and submission persistence, not
  exclusively new first solves, expensive or wrong queries, or a realistic mix of
  hints, profiles and progress reads. Accounts do not walk through all twenty
  ruins during this stress workload.
- Requests invoke the real handler in-process. HTTP, TLS, GoTrue, PostgREST,
  Supavisor, Edge scaling, asset downloads, browser rendering and campus Wi-Fi are
  excluded. These numbers cannot be translated directly into hosted student capacity.

Latency includes delay from scheduled dispatch to completion, including the
handler's connection queue. The pass targets are p95 at most 2,000 ms, unexpected
response fraction below 1%, and no stop at the harness's 2,000 outstanding-request
limit. That limit is a test safeguard, not an application admission limit.

## Results

| Test | Submitted | p95 | p99 | Outcome |
| --- | ---: | ---: | ---: | --- |
| 600/sec for 300 seconds, fresh database | 180,000 | 3 ms | 19 ms | Pass; peak outstanding 72, max 126 ms |
| 600/sec for 60 seconds, separate fresh database | 36,000 | 7 ms | 25 ms | Pass; peak outstanding 67, max 110 ms |
| 787/sec, attempted 300 seconds after prior overload | 26,133 | 2,472 ms | 2,526 ms | Stopped dispatch after 33.2 seconds at backlog limit |
| 1,125/sec for 30 seconds | 33,750 | 5 ms | 14 ms | Short run passed |
| 1,125/sec, subsequent attempted 300 seconds | 17,230 | 2,007 ms | 2,068 ms | Stopped dispatch after 15.3 seconds at backlog limit |
| 1,250/sec, first attempt | 24,978 | 1,558 ms | 1,617 ms | Backlog limit reached; target rate not sustainable for requested duration |
| 1,250/sec, repeated after other overload | 3,277 | 2,011 ms | 2,020 ms | Backlog limit reproduced |
| 1,500/sec | 5,502 | 1,514 ms | 1,526 ms | Backlog limit reached |
| 500 simultaneous requests, three runs | 500 each | 692–708 ms | 699–715 ms | All pass |
| 2,000 simultaneous requests, three runs | 2,000 each | 2,693–2,950 ms | 2,724–2,985 ms | All fail latency target; all eventually correct |
| 100/sec after bursts, three runs | 1,500 each | 5–6 ms | 6 ms | Normal traffic passes after backlog drains |

The 100–1,000/sec ramp stages passed their 15-second windows. These short passes
do not establish sustained capacity. Failure here means unacceptable queue growth
or latency, not an observed crash. No submitted request in the three completed
runs returned an incorrect result or unexpected error. Unsent work after a
safeguard stop is not counted as successful work.

Recovery tests started after outstanding requests drained. They establish that
the handler remained usable without a restart; they do not measure normal-traffic
latency while overload was still draining. The 2,000-request bursts drained in
2.73–2.99 seconds. Increasing latency during the ramp is consistent with queue
saturation, but the exact contribution of database growth, maintenance, host
contention and connection serialization was not isolated.

## Validation

Three completed runs total **382,370 requests**:

| Run | Requests | Database audit |
| --- | ---: | --- |
| Ramp/boundary/overload | 155,370 | All matched persisted attempts; 3,000 target solves; no wrong balances |
| Five-minute confirmation plus bursts/recovery | 185,500 | Same checks pass |
| One-minute replay plus bursts/recovery | 41,500 | Same checks pass |

Each fresh database awarded exactly 60,000 XP: 20 once per simulated player. Every
player ended at 120 XP and had its target marked solved. Status totals, successful
counts and database attempt counts reconcile. The replay retained per-request
latency samples; p50, p95, p99 and maximum were independently recalculated and
matched the report. Earlier runs retain aggregate measurements only. An initial
setup error and an interrupted preliminary ramp are excluded from these totals.

Primary evidence in the workspace:

- [Ramp results](../output/stress/2026-09-06T12-44-44.544Z/results.json)
- [Ramp integrity](../output/stress/2026-09-06T12-44-44.544Z/integrity.json)
- [Five-minute confirmation](../output/stress/2026-09-06T12-48-33.860Z/results.json)
- [Confirmation integrity](../output/stress/2026-09-06T12-48-33.860Z/integrity.json)
- [Replay results](../output/stress/2026-09-06T12-54-12.290Z/results.json)
- [Replay integrity](../output/stress/2026-09-06T12-54-12.290Z/integrity.json)
- [Replay latency samples](../output/stress/2026-09-06T12-54-12.290Z/confirmation-600-samples.json)

The evidence under `output/` is included with this report in version control.
The interrupted preliminary ramp is retained separately and excluded from the
validated totals above.

## Reproduce and interpret

```sh
pnpm test:stress
STRESS_CONFIRM_RATE=600 pnpm test:stress
STRESS_CONFIRM_RATE=600 STRESS_HOLD_SECONDS=60 pnpm test:stress
```

The harness writes timestamped results under `output/stress/`. Its exit code checks
data integrity; individual performance stages can intentionally fail while the
process exits successfully. Read each stage's `pass` and backlog-stop fields.

Use **600/sec as the verified local canonical-workload baseline**. Do not advertise
it as a production limit or a guarantee for 3,000 simultaneously active students.
Next capacity work should test a bounded hosted staging target through HTTP with
mixed query complexity and gameplay actions, and investigate admission deadlines
and backpressure. No hosted traffic or deployment was performed during the stress
test. Publishing these artifacts does not establish hosted capacity.
