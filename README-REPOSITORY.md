# Dilli Khoj repository guide

This README is a map for contributors working in the `open-world` codebase. Start with
the root [README](README.md) for the product overview and [local setup](docs/setup.md)
for installation. Use this file to find the source of a behavior and the checks that
protect it.

## Repository at a glance

```text
src/                         Browser application
  App.tsx                    Player shell, archive flow, XP and maps
  game/                      3D scene, movement, ambience, progression and UI
    world/                   World assembly, atlas and twenty level definitions
  db/                        Browser PGlite worker and practice execution
  questions/                 Authored catalog and generated public content
  sql/                       Browser-side query and result policies
  lib/                       Supabase client, game RPCs and judge calls
  admin/                     Development-only Question Studio
  components/                Shared interface components
scripts/                     Generators, browser checks and local judge harnesses
supabase/
  functions/judge-query/     Authoritative grading Edge Function
  functions/_shared/         Shared judge policies and result comparison
  migrations/                Ordered database schema, fixtures and RPCs
  tests/                     SQL authorization and judge-contract tests
public/                      Static files copied to the production build
docs/                        Specifications, evidence, plans and runbooks
.github/workflows/           CI and deployment workflows
```

`dist/`, `node_modules/`, `.wrangler/` and `supabase/.temp/` are local or generated
state. Do not treat them as authored source.

## Follow the player runtime

1. [src/main.tsx](src/main.tsx) mounts React and loads global styles.
2. [src/App.tsx](src/App.tsx) selects the player, admin or walkthrough route and owns
   archive selection, local practice, submission feedback and top-level dialogs.
3. [src/game/GameEntry.tsx](src/game/GameEntry.tsx) handles authentication, the intro
   and the development-only local bypass.
4. [src/game/RuinScene.tsx](src/game/RuinScene.tsx) owns WebGL, movement, the character,
   collision, portals, guidance, audio lifecycle and rendering cadence.
5. [src/game/world/city.ts](src/game/world/city.ts) lazily builds and caches the current
   ruin and its repeating 3×3 visual field.
6. `src/game/world/levels/level01.ts` through `level20.ts` define the physical places.
   [src/game/world/kit.ts](src/game/world/kit.ts) supplies the reusable construction
   pieces; [src/game/world/layout.ts](src/game/world/layout.ts) supplies pathfinding.
7. [src/game/ambience.ts](src/game/ambience.ts),
   [src/game/character.ts](src/game/character.ts) and
   [src/game/guide.ts](src/game/guide.ts) own regional sound, animation and the amber
   trail.
8. [src/game/progression.ts](src/game/progression.ts) defines sequential unlocking.
   [src/game/PlayerMap.tsx](src/game/PlayerMap.tsx) and
   [src/game/world/WorldAtlas.tsx](src/game/world/WorldAtlas.tsx) implement player map
   travel. [src/game/GeographicMap.tsx](src/game/GeographicMap.tsx) is the full admin
   atlas.

The main URL is `/`. Development helpers use `/#walkthrough` for slow automatic travel
and `/#admin` for Question Studio. Hashes choose local views; they do not grant server
permissions.

## Follow a practice run and official submission

The archive panel in [src/App.tsx](src/App.tsx) sends **Run** through
[src/db/practice-db.ts](src/db/practice-db.ts) to
[src/db/pglite.worker.ts](src/db/pglite.worker.ts). This uses visible browser fixtures,
never awards official progress and is disposable.

Official **Submit** calls [src/lib/judge.ts](src/lib/judge.ts), which reaches
[supabase/functions/judge-query/index.ts](supabase/functions/judge-query/index.ts).
The Edge Function authenticates the player, applies the shared query policy, executes
three private fixtures with a restricted database role, compares results and records
progress through server RPCs. [src/lib/game.ts](src/lib/game.ts) reads authoritative XP,
unlocks, help purchases, revisits, leaderboard and admin data.

Shared judge safeguards live in `supabase/functions/_shared/`. Database authority lives
in chronological files under `supabase/migrations/`. Never edit an applied migration;
add a reviewed forward migration.

## Find and change levels

- Curriculum order and player-facing place metadata:
  [src/game/ruins.ts](src/game/ruins.ts).
- Level registry: [src/game/world/levels/index.ts](src/game/world/levels/index.ts).
- Individual geometry: `src/game/world/levels/levelNN.ts`.
- Reusable low-poly primitives and collision: [src/game/world/kit.ts](src/game/world/kit.ts).
- World transitions and lazy construction: [src/game/world/city.ts](src/game/world/city.ts).
- Environmental audio profiles: [src/game/ambience.ts](src/game/ambience.ts) and the
  `sound` field in each level definition.
- Player map icons and uneven route: [src/game/world/WorldAtlas.tsx](src/game/world/WorldAtlas.tsx).
- Global visual and responsive rules: [src/styles.css](src/styles.css).

After a physical-level change, run the world layout, connection, guide, gameplay,
browser and MacBook checks. Test a gate transition in both directions and revisit the
level from the completed map.

## Find and change question content

Question revision is currently a later owner-led phase. When it resumes:

- Authored primary catalog: [src/questions/catalog.ts](src/questions/catalog.ts).
- Authoring fixture helpers: [scripts/practice-fixtures.mjs](scripts/practice-fixtures.mjs).
- Authored revisit content: [scripts/revisit-content.mjs](scripts/revisit-content.mjs).
- Public generated practice artifact: `src/questions/practice.generated.json`.
- Public generated revisits: `src/questions/revisits.generated.json`.
- Generated private server fixtures: the versioned all-ruin migration under
  `supabase/migrations/`.

Read [question authoring](docs/question-authoring.md) and the current
[question review](docs/question-review.md) before editing. Descriptions must stay in
plain language without SQL keywords or query fragments. Regenerate artifacts through
the package scripts instead of hand-editing computed outputs:

```bash
pnpm content:generate
pnpm content:judge
pnpm content:revisits
pnpm test
pnpm test:assets
```

Before regenerating a migration, verify whether it has been applied anywhere. Released
content requires a new version and forward migration. Canonical answers, paid help and
hidden fixtures must remain absent from student production assets.

## Test map

| Command                         | What it protects                                        | Extra dependency          |
| ------------------------------- | ------------------------------------------------------- | ------------------------- |
| `pnpm typecheck`                | TypeScript contracts                                    | None after install        |
| `pnpm test`                     | 152 unit, content, policy and migration tests           | None                      |
| `pnpm build`                    | Production browser bundle                               | None                      |
| `pnpm test:assets`              | Model presence and exclusion of private/DEV content     | Built `dist/`             |
| `pnpm test:browser`             | All 20 local archives and player interactions in Chrome | `pnpm dev`, Chrome        |
| `pnpm test:browser:auth`        | Mocked signed-in UI and server-authority contracts      | `pnpm dev`, Chrome        |
| `pnpm test:browser:performance` | 1440×900 FPS, heap and readiness guardrail              | `pnpm dev`, Chrome        |
| `pnpm test:browser:macbook`     | Six Retina Air/Pro Chrome and WebKit profiles           | `pnpm dev`, WebKit bundle |
| `pnpm test:browser:webkit`      | All 20 archives in WebKit                               | `pnpm dev`, WebKit bundle |
| `pnpm test:integration`         | All migrations and authenticated judge behavior         | PostgreSQL 17             |
| `pnpm test:load`                | Mixed-ruin rate-shaped local load                       | PostgreSQL 17             |
| `pnpm test:profile`             | Mixed-ruin simultaneous burst and DB stages             | PostgreSQL 17             |

Install the Playwright WebKit bundle once with `pnpm exec playwright install webkit`.
Run browser, PGlite and load suites sequentially so they do not distort one another.

## Documentation map

| Document                                                                   | Use it for                                             |
| -------------------------------------------------------------------------- | ------------------------------------------------------ |
| [Game design](docs/game-design-document.md)                                | Complete intended player experience                    |
| [Product specification](docs/product-spec.md)                              | Product rules, cohort and platform assumptions         |
| [Implementation status](docs/implementation-status.md)                     | What is verified and what remains blocked              |
| [Performance statistics](docs/performance-stats.md)                        | Consolidated measurements, budgets and caveats         |
| [MacBook compatibility](docs/macbook-compatibility.md)                     | Retina Air/Pro browser evidence                        |
| [Walkthrough notes](docs/walkthrough-notes.md)                             | Ruin-by-ruin physical walkthrough record               |
| [Next steps](docs/next-steps.md)                                           | Ordered engineering work                               |
| [Owner actions](docs/owner-actions.md)                                     | Accounts, hardware and approvals needed from the owner |
| [Submission architecture](docs/submission-architecture.md)                 | Judge design and trust boundaries                      |
| [Navigation/performance review](docs/navigation-and-performance-review.md) | UI routes, maps and engineering tradeoffs              |
| [Deployment runbook](docs/deployment-runbook.md)                           | Release order, rollback and approval boundary          |
| [Review handoff](docs/review-handoff.md)                            | Copy-ready independent review prompt and exact range   |

Generated HTML in `docs/artifacts/` and `docs/deck/` is presentation output. Edit its
documented source or template and rebuild it rather than using it as the product source
of truth.

## Safe working sequence

1. Confirm `git branch --show-current` and inspect `git status --short`.
2. Read the relevant specification, implementation status and nearby tests.
3. Change the smallest owning source file. Avoid editing generated or local-state
   directories.
4. Run the focused test, then the relevant browser or database contract.
5. Run typecheck, the 152-test suite, production build and asset check before review.
6. Update the affected documentation and performance evidence.
7. Review `git diff --check` and the staged diff before committing.

No live migration, Edge Function deployment or web deployment follows merely from a
local pass. Production order is migrations, judge, then web, after owner approval. The
exact release boundary is maintained in the [deployment runbook](docs/deployment-runbook.md).
