# Performance statistics

Last consolidated 5 September 2026 from branch `open-world`. This is the canonical
index for current performance evidence. Raw benchmark output remains in the linked
JSON files so later runs can replace measurements without rewriting their meaning.

## Test environment

- Host: MacBook Pro `Mac17,6`, Apple M5 Max, 18 CPU cores, 40 GPU cores and 48 GB RAM.
- Operating system: macOS 26.6.2 on ARM64.
- Browser engines: installed Google Chrome and Playwright WebKit 26.0.
- Database benchmark: local PostgreSQL 17 with one Node judge instance and direct
  database connections.
- Browser measurements use the local Vite development server. Backend measurements
  omit hosted HTTP, Edge isolate and Supavisor overhead.

## Browser scene

The current repeatable 1440×900 Chrome guardrail is recorded in
[browser-performance-results.json](browser-performance-results.json).

| Measurement                                       | Before lazy world construction | Current |        Guardrail |
| ------------------------------------------------- | -----------------------------: | ------: | ---------------: |
| Canvas ready                                      |         approximately 1,058 ms |  867 ms | at most 2,500 ms |
| Active exploration                                |                         60 FPS |  60 FPS |  at least 45 FPS |
| Initial JavaScript heap                           |           approximately 122 MB | 36.3 MB |    at most 80 MB |
| Browser transfer                                  |                        17.3 MB | 17.3 MB | observation only |
| Main-thread tasks during 3 seconds of active play |                   not recorded |  181 ms | observation only |
| Main-thread tasks during 3 seconds with map open  |                   not recorded |  109 ms | observation only |

Lazy construction reduced the sampled initial heap by about 70%. Keeping the 3D scene
available at 12 FPS beneath overlays reduced sampled main-thread task time by about
40% in the current run. Ready time varies between runs; the most recent earlier sample
was 840 ms with 41.1 MB heap and 179/109 ms active/covered task time.

## MacBook display and engine matrix

All profiles use device scale factor 2. Chrome Air profiles use four-times CPU
slowdown to provide a conservative older-Air CPU condition. **The FPS column is measured
on the host M5 Max GPU and capped by the host's ≈60 Hz display; only the viewport, scale
factor and CPU are emulated, not the Air's GPU — so these numbers show "did not drop below
the host vsync", not a frame rate the oldest Air will reach.** Full details and caveats
are in the [MacBook compatibility report](macbook-compatibility.md) and
[raw results](macbook-compatibility-results.json).

| Profile           | Engine      |  Viewport | Drawing buffer | CPU slowdown |    Ready | FPS (host GPU) |
| ----------------- | ----------- | --------: | -------------: | -----------: | -------: | --: |
| Older 13-inch Air | Chrome      |  1280×800 |      2560×1600 |           4× | 1,418 ms |  60 |
| 13.6-inch Air     | Chrome      |  1470×956 |      2940×1912 |           4× | 1,418 ms |  60 |
| 14-inch Pro       | Chrome      |  1512×982 |      3024×1964 |           1× |   845 ms |  60 |
| 16-inch Pro       | Chrome      | 1728×1117 |      3456×2234 |           1× |   841 ms |  60 |
| 13-inch Air       | WebKit 26.0 |  1280×800 |      2560×1600 |           1× |   980 ms |  60 |
| 14-inch Pro       | WebKit 26.0 |  1512×982 |      3024×1964 |           1× |   959 ms |  60 |

The matrix checks WebGL, Retina buffers, overflow and clipping, map focus, fullscreen,
reduced motion, movement keys, Web Audio startup and the archive terminal. Playwright
WebKit is a Safari-engine proxy. Physical thermal behavior, installed Safari, audible
quality and the oldest student Air GPU remain classroom checks.

## Local judge rate-shaped load

[local-load-results.json](local-load-results.json) contains four three-second stages.
Submissions rotate evenly through all twenty current first-solve queries. All 1,125
requests returned status 200.

|   Arrival rate | Requests |  p50 |  p95 |  p99 |
| -------------: | -------: | ---: | ---: | ---: |
|  25 requests/s |       75 | 5 ms | 6 ms | 6 ms |
|  50 requests/s |      150 | 4 ms | 5 ms | 6 ms |
| 100 requests/s |      300 | 4 ms | 4 ms | 5 ms |
| 200 requests/s |      600 | 3 ms | 3 ms | 5 ms |

The falling latency in later stages reflects a warm local process and database, not a
claim that heavier traffic improves production performance. An earlier contended run
recorded 16,911 ms p95 at 200 requests/s while browser and test work competed for the
laptop. It did not reproduce in the isolated mixed-ruin run and remains a warning about
resource contention.

## Local judge simultaneous burst

[local-profile-results.json](local-profile-results.json) records 200 simultaneous
submissions rotating through all twenty ruins:

- 200 of 200 correct.
- 285 ms total wall time.
- 243 ms p50 and 277 ms p95 end-to-end local handler latency.

Aggregated PostgreSQL protocol timing during the burst:

| Stage                        | Events |    Total |     Mean |  Maximum |
| ---------------------------- | -----: | -------: | -------: | -------: |
| Authorization                |    600 |  8.55 ms | 0.014 ms | 0.107 ms |
| Fixture preparation          |    600 | 28.53 ms | 0.048 ms | 0.432 ms |
| Transaction setup and commit |  4,200 |  7.36 ms | 0.002 ms | 0.063 ms |
| Student-query protocol       |  2,400 | 21.02 ms | 0.009 ms | 0.116 ms |
| Verdict recording            |    600 | 48.74 ms | 0.081 ms | 0.571 ms |

Protocol totals exclude time waiting in the Node connection queue. The burst is not
comparable to the rate-shaped test and neither test proves sustained or hosted capacity
for 3,000 students.

## Production asset sizes

Measured from the current `pnpm build`. Gzip sizes use level-9 local compression and
may differ slightly from the hosting provider.

| Asset                                |       Raw |     Gzip |
| ------------------------------------ | --------: | -------: |
| Main application JavaScript          |  1.265 MB | 0.343 MB |
| Application CSS                      |  0.027 MB | 0.007 MB |
| PGlite main WebAssembly              | 10.088 MB | 3.390 MB |
| PGlite PostgreSQL data               |  6.295 MB | 1.860 MB |
| PGlite worker JavaScript             |  0.611 MB | 0.140 MB |
| PGlite initialization WebAssembly    |  0.395 MB | 0.145 MB |
| Soldier model                        |  2.160 MB | 1.365 MB |
| All listed build assets plus Soldier | 20.854 MB | 7.252 MB |

The current compressed asset set exceeds the aspirational 5 MB initial-payload target.
The development browser observed 17.3 MB transferred. Hosted compression, cache hits,
preloading and simultaneous campus downloads remain unmeasured.

## Runtime limits that protect performance

These are configured limits, not benchmark results:

| Area                          | Limit or behavior                                                |
| ----------------------------- | ---------------------------------------------------------------- |
| WebGL pixel ratio             | Capped at 2×                                                     |
| Covered 3D scene              | 12 FPS beneath maps, terminals and dialogs                       |
| Visible progress polling      | Every 30–35 seconds with jitter                                  |
| Hidden-tab polling            | Paused                                                           |
| Browser practice statement    | 900 ms timeout                                                   |
| Browser practice output       | 100 rows and 64 KiB display ceiling                              |
| Judge input                   | 10 KiB query-text ceiling                                        |
| Judge execution               | 250–500 ms statement timeout per fixture and 100 ms lock timeout |
| Judge output                  | 64 KiB result ceiling per fixture                                |
| Judge fixtures                | Three sequential cases per first solve                           |
| Judge lease and click control | Five-second private lease and 300 ms per-player cooldown         |

The expected 3,000-student course workload is approximately 75,000 judge submissions
over 90–120 minutes: roughly 10–14 submissions/s on average and 30–42 fixture
executions/s before bursts and retries. Hosted queue time, planner cost, sustained load
and campus-network behavior remain release gates.

## Development command timings

The latest local verification snapshot completed 152 tests in 3.47 seconds and the
Vite production bundle in 287 ms. The six-profile MacBook matrix took about 44 seconds;
the complete twenty-archive WebKit smoke took about 104 seconds. These timings describe
the development harness and are not player-facing performance targets.

Reproduce the current measurements beside `pnpm dev`:

```bash
pnpm test:browser:performance
pnpm test:browser:macbook
pnpm test:load
pnpm test:profile
pnpm build
```

Run the browser, PGlite and load commands sequentially. Concurrent runs distort the
measurements and previously produced the large latency outlier above.
