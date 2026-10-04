# Slow-network / first-load plan

## The problem

The production bundle's dominant cost is the browser PostgreSQL engine (PGlite):

| Asset | Raw | Gzip |
| --- | ---: | ---: |
| PGlite WebAssembly | 10.09 MB | 3.47 MB |
| PGlite data (extensions/FS) | 6.30 MB | ~1.86 MB |
| App JS | 1.27 MB | 0.35 MB |
| Soldier model | ~2.16 MB | ~1.37 MB |

A cold load is **~10 MB gzip**. For ~3,000 students hitting a campus network together,
the risk is not host bandwidth (GitHub Pages serves static assets from a CDN) — it is
**time-to-play on the slowest client**, especially if the 10 MB PGlite payload competes
with the world's assets during the first seconds.

Key fact: **the 3D world does not need PGlite.** Only the archive terminal's Run/Submit
needs it, and a player must walk to an archive first (several seconds).

## Implemented in this change

1. **Idle warm-up, not eager load.** The PGlite worker no longer starts downloading at
   mount. `warmPracticeDatabase()` (in `src/db/practice-db.ts`) is kicked off from
   `requestIdleCallback` (4 s timeout fallback) in `App.tsx`, so the world's critical
   assets (JS, model, textures) claim bandwidth first; PGlite streams in afterwards.
2. **Prep on proximity, not on mount.** The per-archive schema preparation now runs only
   when the player is `nearTerminal` or has the terminal open, instead of at mount — so a
   player who never opens an archive never pays for it, and the first archive is usually
   ready because the idle warm-up ran while they walked.

Net effect: the world becomes interactive on the lighter ~1.6 MB path, and the heavy
engine loads in the background during the walk to the first archive. No change to grading
or the server.

## Further options, ranked (not yet done)

1. **Download progress + graceful pending state (low effort, high UX).** On a genuinely
   slow link, show a small "Preparing practice database…" progress affordance when the
   player opens an archive before the warm-up finished, instead of a bare spinner. PGlite
   exposes load progress via the worker; surface it in the terminal panel.
2. **Service-worker precache (medium effort).** Cache the hashed PGlite assets in a service
   worker so a returning student (day 2 of a course) pays zero. Browser HTTP cache already
   covers most of this because filenames are content-hashed and immutable; a service worker
   mainly helps offline reloads and flaky networks. Verify `Cache-Control: immutable` is set
   on the hashed assets at the edge first — that is the cheapest win of all.
3. **Trim the PGlite data payload (medium effort, needs care).** The 6.3 MB `.data` bundles
   Postgres extensions/contrib the game may not use. If PGlite's build options allow dropping
   unused extensions, the cold load shrinks. Requires re-verifying every fixture and the
   practice/judge parity — schedule as its own task, not a quick change.
4. **Preconnect / resource hints (trivial).** Add `<link rel="preload">` for the model and a
   `modulepreload` for the worker so the browser schedules them optimally; keep PGlite off the
   preload list so it stays deprioritised until idle.

## What to measure before sign-off

- First-interactive time of the **world** on a throttled "Slow 3G/4G" profile, with and
  without the deferral, on the oldest target MacBook Air.
- Time from "reach first archive" to "terminal ready" on the same throttled profile — this is
  the number that must stay comfortable, since the deferral trades a little of it for a faster
  world start.
