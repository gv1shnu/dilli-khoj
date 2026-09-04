# Decisions and open items

## Settled decisions

| Area | Decision |
| --- | --- |
| Curriculum source | Supplied `NST DBMS 2026.xlsx`, Modules 1–8 |
| Email domains | `example.edu`, `students.example.edu`, `partner.example` |
| Identity fields | Fetch Google display name and email; use Supabase UUID as primary identity |
| Supabase | Project `your-project-ref` |
| Repository | Private GitHub repository `gv1shnu/treasure-hunt` |
| Static hosting | Cloudflare Workers Static Assets at `dilli-khoj.example.workers.dev` |
| Cloudflare account | Owner-confirmed `a34c3ecff69a697ae99c602e883ddb53`; pinned in `wrangler.jsonc` |
| Google Workspace | The two university domains share an organization; `partner.example` requires External Google OAuth |
| Development access | Local repository write access granted; use the owner's Git identity |
| Deadline | No date; release by readiness gate |
| Content size | Twenty ruins |
| Districts | Seven, contiguous ruin ranges, named in `ruins.ts` (Yamuna Gates → Deep Foundations) |
| Sign-in | Google sign-in is **required** before play, right after the how-to-play explanation (reduce traffic, legitimate users only, admin progress access) |
| Sequential passage | Ruins play strictly in order (1→20); no jumping ahead. Difficulty rises with the module sequence |
| XP economy | `scoring.ts`: start 100, survey +5, solve +20, hint −10, reveal −20. Help is affordability-gated (anti-bypass); solving is always free. Full-help exhausts ~level 13/20; max 600 |
| Access control | Admin + question pages restricted to owner-supplied admin emails; solutions never ship to students |
| Worker/project name | Cloudflare Worker `dilli-khoj`; URL `dilli-khoj.example.workers.dev` |
| Question authoring | Dev-only Question Studio at `#admin`; canonical solutions excluded from production builds |
| Grading | Any safe query passing all result fixtures is accepted; intended syntax is not a hard gate |
| Scoring | Wrong submissions cost nothing; hints and reveals cost XP |
| Geographic atlas | Animated fictional Delhi; players see only cleared ruin parcels, admins inspect all 20; no paid map API or new grade bypass |
| Revisits | Allowed via each player's personal world map (click a cleared ruin); non-scoring variant |
| Leaderboard | Completers only (all 20 solved), ranked by XP then time from sign-up to completion; no email displayed |
| Browser | Modern browsers supported; Chrome recommended and used as support baseline |
| Budget | ₹0 operating target; degrade hidden runtime cases before adding paid infrastructure |
| Institutional identity | Example School of Technology at Example University |
| Setting | Fictional post-collapse Delhi approved |
| Tone | Playful, classroom-friendly, limited humour |
| Content boundaries | Stay on educational game development; no unrelated issues |
| Question structure | Title → description → sample output → schema with sample rows → hints |
| Academic approval | Team discussion; no single external approver named |
| Admin allowlist | `former.admin@example.edu`, `staff.admin@partner.example` (`game_private.admin_emails` + `src/game/admins.ts`). Admins are also players |
| Player domains | `example.edu`, `students.example.edu`, and `partner.example` (added 2026-09-04, owner decision). Allowing `partner.example` **requires the Google OAuth app to be External + published** (Internal blocks its different-org accounts) |
| Release cohort | All students at once |
| Network | Campus Wi-Fi, approximately 2–5 MB/s observed |
| Launch owner | Project owner/user |

## Defaults selected for unresolved items

| Area | Default |
| --- | --- |
| XP | Start 100; solve +20; survey +5; hint -10; reveal -20; wrong 0; help affordability-gated |
| Leaderboard order | Completers only, then XP descending and completion time ascending; server-recorded sign-up-to-completion wall time |
| Data collection | Minimum identity, progress, submissions, verdicts, latency and hint usage |
| Retention | Delete raw SQL and detailed attempts after 90 days; retain anonymous aggregates |
| Hidden grading | One visible plus two hidden fixtures; one hidden runtime fixture fallback if free-tier load fails |
| Logo use | Use approved assets only; otherwise use text attribution and an original Dilli Khoj identity |
| No-deadline maintenance | Review dependencies and wake Supabase before demos/releases |

## Owner actions still open

1. ~~Copy the Supabase publishable key into `.env.local`~~ — done.
2. Export any browser-only Question Studio edits before changing laptops; see [setup](setup.md).
3. Handoff reports Cloudflare live, Google OAuth/provider/redirects working, migrations applied and judge deployed. Do not recreate these resources; confirm current state before release.
4. Confirm Before User Created hook enablement, disable unused Email/Anonymous providers, and complete the Google External production rollout when ready. The handoff reports External / Testing today.
5. Authorize deployment of a reviewed current build when ready; the hosted site reportedly predates recent gameplay changes.
6. ~~Provide the admin allowlist emails and apply the migration~~ — reported done. Server-protected admin reads are implemented locally; rollout and real-session validation remain pending.
7. Obtain written permission for institutional logo files if they will appear in the shipped game.
8. Decide whether the 90-day raw-attempt retention default should be shorter.
9. Completion timing resolved: server-recorded sign-up-to-completion wall time (owner decision, 4 September 2026).
10. Decide whether to retain the default Supabase domain on Google consent. Custom branding must not introduce spending without explicit budget approval.

## Feasibility watchlist

### Zero-cost infrastructure

The invocation quota is likely sufficient, but free shared database compute is the principal risk. Hidden fixtures multiply query work. Keep the one-hidden-case runtime fallback available and never send local practice traffic to the server.

### Simultaneous release

Three thousand initial downloads can saturate campus networking even when Cloudflare is healthy. Pre-open the landing page, cache static assets and lazy-load later districts.

### Browser breadth

Supporting every browser increases QA. Chrome is the guaranteed support path; Safari and Firefox are best-effort until their PGlite, IndexedDB and Three.js tests pass.

### Question equivalence

Accepting any passing SQL is fairer and avoids optimizer-dependent method gates. It requires better hidden fixtures, especially for `HAVING`, joins, ordering, duplicate handling and `NULL` behavior.

### No fixed date

This is feasible, but decisions can drift. Treat this folder as authoritative and record any change in the settled-decision table before implementation changes.
