# Navigation, maps and performance review

Reviewed 4 September 2026 against `build/foundation`. This describes source and local behavior, not an approved hosted release.

## App paths and navigation

This is a single-page application without a route library. There are no separate `/map`, `/leaderboard`, `/admin` or `/ruins/1` pages.

| Entry | What it opens | Access |
| --- | --- | --- |
| `/` or `/#` | Intro, sign-in and game shell | Approved signed-in players; DEV offline bypass available |
| `/#admin` | Question Studio with the complete geographic atlas, fixtures, answers and local JSON editing/export | DEV build only; excluded from student production assets |
| World map button | Animated geographic atlas modal | Players: cleared regions only. Server-recognized admins: all 20 regions |
| Leaderboard button | Top 20 completers plus personal rank modal | Signed-in approved players |
| Admin button | Complete atlas, player table and question-review modal | Server-allowlisted admins; each protected read is audited |
| Archive arrows/dropdown | First-pass/current archive or a cleared ruin's alternate practice question | Sequential unlock rules; selection is component state, not a URL |
| Fullscreen button | Browser fullscreen for the complete game or DEV studio | Available where the browser supports the Fullscreen API |

Supabase receives `POST /functions/v1/judge-query`. Browser gameplay uses `/rest/v1/rpc/game_state`, `game_action`, `begin_revisit`, `completion_leaderboard`, `admin_players` and `admin_question`. These are Supabase API paths, not pages on the static web host. Google login returns to the web origin.

Cloudflare is configured with SPA fallback: an unknown web path may load the app shell, but it does not create a distinct route. `#admin` is only a DEV authoring switch; it does not grant production administrator access.

## Repository paths

| Folder | Responsibility |
| --- | --- |
| `src/App.tsx`, `src/game/GameEntry.tsx` | Game shell, sign-in, progression and panel orchestration |
| `src/game/` | 3D world, Soldier, maps, intro, gameplay helpers and community panels |
| `src/components/` | Shared controls and result display |
| `src/admin/` | DEV-only Question Studio |
| `src/db/` | Browser PostgreSQL worker and visible fixture setup |
| `src/sql/` | Local SQL policy and result comparison |
| `src/lib/` | Supabase client, RPC calls and submission retry IDs |
| `src/questions/` | Authoring catalog and generated visible/revisit content |
| `scripts/` | Content generators, regression tests, browser checks and disposable database benchmarks |
| `supabase/functions/` | Authenticated judge, AST validation and result comparison |
| `supabase/migrations/`, `supabase/tests/` | Private fixtures, server gameplay, grants/RLS and database checks |
| `public/` | Static assets, including the Soldier model |
| `docs/`, `.github/workflows/` | Team documentation and CI/release workflows |

## Geographic atlas and access

The shared atlas is an original SVG illustration of an imagined Delhi: the Yamuna river, ridge woodland, walled-city streets, connecting roads, ruins, domes, a stepwell and a bridge. River currents, mist, birds and a selected-region beacon animate with CSS. It is compressed fictional geography, not a surveyed map or turn-by-turn navigation.

- **Players:** only cleared ruin regions are revealed. Each of the 20 ruins owns one adjoining geographic parcel; clearing a ruin reveals that parcel, not the entire curriculum district. Unrestored terrain stays under mist and has no marker, name or map link. Even the current unsolved ruin stays fogged on the map; its existing archive controls remain available in the game. A cleared marker opens a non-scoring revisit.
- **Admins:** the World map button shows all 20 parcels based on the server's `isAdmin` result. Selecting any region opens protected question inspection. The production Admin panel and DEV Question Studio also use the complete atlas. Full map inspection does not award XP or bypass first-pass prerequisites.
- **Authority:** signed-in clearance comes from `game_state`, never browser Run results. DEV preview uses its own separate local clears. Geography is public presentation data; fog is a gameplay presentation rule, not encryption or a security boundary. Answers and admin content remain behind the server-authorized RPCs. The production admin atlas appears after successful protected reads and disappears if a subsequent read is denied.
- **Controls:** markers are keyboard-focusable HTML buttons over the SVG. Hover/focus shows the place and curriculum topic; click opens revisit/inspection. Player map dialogs trap Tab focus, close with Escape and restore focus to the opener. A compact-screen toolbar button keeps map access available below 820px.
- **Motion:** Pause map animation stops all atlas effects. The atlas also honors the system's reduced-motion setting. It introduces no new WebGL canvas, JavaScript animation loop, map-tile downloads or paid map API.
- **World relationship:** the infinite tiled 3D world is preserved. The atlas changes archive selection; its landmarks do not teleport the Soldier into twenty new 3D environments. The curriculum still follows its original 1→20 order, independent of map coordinates.
- **Authoring status:** the studio reports generated fixtures/local drafts instead of treating old catalog `live` flags as deployment evidence. Edited questions still need regeneration, tests and human review.

Implementation paths: `src/game/GeographicMap.tsx` draws the shared atlas; `src/game/geography.ts` defines landmark positions and adjoining parcels; `src/game/PlayerMap.tsx` handles player/admin atlas modal access; `src/game/CommunityPanel.tsx` handles protected admin content; `src/admin/WorldMap.tsx` is the DEV editor. These are source paths, not new web routes.

Fullscreen entry and explicit exit work in the game and DEV studio. Unsupported browsers show a disabled control; fullscreen failures show a short explanation.

## How a student's SQL is evaluated

The editor accepts PostgreSQL SQL, not `psql` terminal commands such as `\\dt`, `\\copy` or shell commands.

```mermaid
flowchart LR
  SQL[Student SQL] --> Run[Run]
  Run --> Local[Browser PGlite worker]
  Local --> Visible[Visible fixture result]
  SQL --> Submit[Submit + JWT + request ID]
  Submit --> Identity[Current account and prerequisite checks]
  Identity --> AST[Read-only SQL policy]
  AST --> Cases[Visible + hidden A + hidden B]
  Cases --> Compare[Compare columns, rows, values and order]
  Compare --> Record[Atomic verdict, progress and XP]
```

**Run** loads the selected question's public fixture into browser PostgreSQL and executes a permitted query in a read-only transaction with a 900ms statement timeout. The output is compared with the visible expected result. It is free and unlimited, and never awards official progression. Only DEV offline practice uses a visible pass to advance its local preview.

**Submit** sends SQL, ruin ID, dataset version, `first-pass` variant and a persistent retry UUID with the Supabase JWT. The judge verifies the token, confirmed Google identity, current approved domain/admin policy and sequential prerequisites. It obtains a per-player lease and checks for a cached verdict.

The PostgreSQL AST parser permits one `SELECT`/`WITH … SELECT` and curriculum-safe tables/functions. It rejects writes, multiple statements, forbidden relations/functions and unsafe structures. The database execution identity has only fixture SELECT grants and no progress-writing privilege.

The same SQL executes against three isolated datasets: visible, hidden A and hidden B. The server compares the exact required column names/order, row count, values, duplicate multiplicity, NULLs and required row ordering. Numeric wire values are normalized without decimal precision loss. All three cases must pass. This compares behavior, not similarity to the canonical SQL; equivalent safe queries are accepted. A query that merely hard-codes the visible result should fail changed hidden datasets.

A separate privileged function records the attempt and updates progression atomically. A first solve awards 20 XP (and the one-time 5 XP survey if it was not already recorded), unlocks the next ruin and stamps first completion when all 20 are solved. Wrong answers cost nothing. Repeated request IDs cannot double-award XP, and changing SQL under a used ID is rejected. The browser receives a verdict/count/XP and refreshes its server state; it does not receive hidden rows or canonical answers.

## Performance findings

### Measured

The clean repeat used one local Node judge and disposable PostgreSQL, three seconds per stage, without competing browser/unit tests. All 1,125 submissions were correct:

| Arrival rate | p50 | p95 |
| --- | --- | --- |
| 25/s | 9ms | 34ms |
| 50/s | 6ms | 8ms |
| 100/s | 4ms | 9ms |
| 200/s | 4ms | 8ms |

See [current load evidence](local-load-results.json). The earlier run recorded 16,911ms p95 at 200/s while the laptop was also being used for browser/test work. That slow result did not reproduce in the clean run; contention is a likely contributor, not a proven attribution. The warm later stages can be faster than the first stage. Neither three-second run establishes sustained capacity.

A separate [duration profile](local-profile-results.json) sent 200 first-ruin requests simultaneously: all passed, total elapsed 356ms and p95 345ms. Aggregate PostgreSQL protocol durations were approximately 14ms for authorization, 48ms for preparation, 18ms for student SQL, 11ms for transaction setup/commit and 70ms for recording. These are aggregate server times across 200 submissions, not per-request latencies. End-to-end time also includes Node queueing, network/protocol work and processing. Recording/preparation consumed more server time than these tiny student queries.

Run `pnpm test:profile` to reproduce the duration diagnostic. It enables statement-duration logging only in the disposable local cluster and writes aggregate measurements; it never profiles the hosted database or copies raw SQL logs into the repository.

Both workloads exercise first-ruin load, not a realistic mix of expensive later queries, and exclude hosted HTTP, Edge isolates and Supavisor. No cloud capacity conclusion follows from these local numbers.

### Performance pros and cons

Compared with the preceding fullscreen build, the geographic atlas update adds about 8.1KB of main JavaScript (3.1KB gzip) and 1.4KB CSS (0.45KB gzip), measured from Vite production output. No new image, map-tile or font asset is fetched. These bundle figures do not measure animation frame cost.

| Choice | Pros | Cons / limits |
| --- | --- | --- |
| Local PostgreSQL Run | Unlimited practice stays off the server; worker separates SQL execution from the UI thread | Large WASM/data download, startup and browser memory cost; expensive results can still tax the device |
| Server Submit with three fixtures | Hidden cases reject visible-answer shortcuts; one consistent authority owns grades | Three executions and serial protocol exchanges per submission; heavier later queries still need sustained load testing |
| One executor/progress connection per isolate | Constrains connection pressure on the zero-cost database target | Requests share queues; network delay compounds across awaited commands; connection limits must be tuned against hosted evidence |
| Fixed server RPCs and profile locks | Prevent double awards/purchases and concurrent-account inconsistencies | Repeated identity/manifest reads and locking add work; high per-account contention can queue |
| Thirty-second progress polling | Simple cross-tab/device refresh and recovery from missed updates | About 100 background RPCs/s at 3,000 tabs, even before grading; needs visibility-aware backoff/jitter |
| Shared SVG atlas | Small code-defined artwork; no tile service, external image fetch, extra WebGL context or animation loop | CSS animation still uses rendering resources; all public geographic metadata ships to the browser; fog is presentation only |
| Cleared-only map rendering | Only visible region controls/parcels are rendered; up to 20 regions, with precomputed parcel geometry | The static terrain drawing is still present under the SVG clip; this is not lazy loading geographic data |
| CSS motion controls | Users can pause effects; reduced-motion preferences disable them | The existing 3D background still renders while the atlas is open; atlas pause does not pause that scene |
| Infinite instanced world | Reuses geometry and avoids downloading twenty separate environments | Grass, shadows, bloom and high pixel ratio create GPU load; fullscreen can increase pixel work |
| Static hosting and immutable assets | Cacheable delivery fits the zero-cost goal; no web server per player | First cohort download can saturate campus Wi-Fi; actual transfer/caching behavior remains unmeasured |

### Structural bottlenecks and next actions

1. **Judge connection queue.** One executor connection and one progress connection are allowed per warm judge instance. Every submission runs three case transactions. Each case separately awaits BEGIN, three SET commands, a describe step, cursor execution and COMMIT. Concurrent submissions queue behind this work, as the simultaneous-burst profile shows, but the clean local 200/s run did not saturate it. Real network latency would add to the many serial exchanges. Reduce redundant round trips and instrument queue time before considering bounded concurrency; raising connections blindly can overwhelm the free database.
2. **Lease versus queue duration.** The lease expires after five seconds. The contended run exceeded sixteen seconds, even though the clean repeat was much faster. A retry after expiry can duplicate expensive work, even though final recording still prevents duplicate XP. Add bounded admission/queue time and a lease strategy consistent with actual execution time.
3. **Background progress traffic.** Every signed-in tab polls the full `game_state` every 30 seconds, including while idle. At 3,000 open tabs that is about 100 RPC calls/second before any submissions, with synchronized bursts possible. Refresh on meaningful events/focus, pause hidden tabs and add backoff/jitter or a carefully budgeted synchronization mechanism.
4. **Browser render load.** Movement pauses while editing, but the full animation/shadow/bloom render loop continues. The world has 81,000 instanced grass blades, nine repeated tiles, 2× maximum pixel ratio and a 2048² shadow map. Fullscreen can increase pixel work further. Keep the infinite world, but reduce render frequency when overlays are open and profile adaptive pixel ratio/shadow quality and tile-level culling. This is a code-derived GPU hypothesis, not a measured frame-time attribution.
5. **First download and startup.** The current build contains roughly 10.1MB PGlite WASM, 6.3MB PostgreSQL data, 1.21MB main JS and a 2.16MB Soldier GLB before compression. Local gzip estimates for these four files total about 7.3MB, excluding the worker/other assets; actual hosted encoding/cache behavior is unmeasured. At cohort scale this can bottleneck campus Wi-Fi. Measure actual transferred bytes/cache hits and preload before the start; keep PostgreSQL work off the main thread.
6. **Costly SQL/result growth.** Statement and row limits help but do not bound all memory/output costs. There is no planner-cost ceiling or result-byte cap, and local Run fetches the whole result. Test adversarial joins, recursion/aggregates and large values; bound output and admission before expanding concurrency.
7. **Smaller avoidable work.** Manifest JSON is rebuilt/fetched for every submit; leaderboard ranking is recomputed on reads; the admin panel refetches players and the question together when either page or ruin changes. Cache immutable versioned manifests, benchmark leaderboard queries and separate admin fetch dependencies after the primary queueing/render issues.

The authoritative `latency_ms` field starts after initial authorization and is captured before verdict recording. It is not end-to-end latency; operational dashboards should measure total request time and separate queue, policy, execution and recording phases.
