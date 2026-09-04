# Decisions and open items

## Settled decisions

| Area | Decision |
| --- | --- |
| Curriculum source | Supplied `NST DBMS 2026.xlsx`, Modules 1–8 |
| Email domains | `example.edu` and `students.example.edu` |
| Identity fields | Fetch Google display name and email; use Supabase UUID as primary identity |
| Supabase | Project `your-project-ref` |
| Repository | Private GitHub repository `gv1shnu/treasure-hunt` |
| Static hosting | Cloudflare Workers Static Assets at `dilli-khoj.example.workers.dev` |
| Cloudflare account | Owner-confirmed `a34c3ecff69a697ae99c602e883ddb53`; pinned in `wrangler.jsonc` |
| Google Workspace | Both approved domains belong to the same Workspace organization |
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
| Revisits | Allowed via each player's personal world map (click a cleared ruin); non-scoring variant |
| Leaderboard | Completers only (all 20 solved), ranked by XP then time from sign-up to completion; no email displayed |
| Browser | Modern browsers supported; Chrome recommended and used as support baseline |
| Budget | ₹0 operating target; degrade hidden runtime cases before adding paid infrastructure |
| Institutional identity | Example School of Technology at Example University |
| Setting | Fictional post-collapse Delhi approved |
| Tone | Playful, classroom-friendly, limited humour |
| Content boundaries | Stay on educational game development; no unrelated issues |
| Question structure | Title → description → sample output → hints |
| Academic approval | Team discussion; no single external approver named |
| Admin allowlist | `former.admin@example.edu`, `staff.admin@partner.example` (`game_private.admin_emails` + `src/game/admins.ts`). Admins are also players |
| Player domains | Only `example.edu` and `students.example.edu`. `partner.example` is **not** added as a general domain (broadens audience; Google Internal-audience would block it anyway) — specific admin emails are allowed through the hook instead |
| Release cohort | All students at once |
| Network | Campus Wi-Fi, approximately 2–5 MB/s observed |
| Launch owner | Project owner/user |

## Defaults selected for unresolved items

| Area | Default |
| --- | --- |
| XP | Start 100; solve +20; survey +5; hint -10; reveal -30; wrong 0 |
| Leaderboard order | Solved count, then XP, then active solve time |
| Data collection | Minimum identity, progress, submissions, verdicts, latency and hint usage |
| Retention | Delete raw SQL and detailed attempts after 90 days; retain anonymous aggregates |
| Hidden grading | One visible plus two hidden fixtures; one hidden runtime fixture fallback if free-tier load fails |
| Logo use | Use approved assets only; otherwise use text attribution and an original Dilli Khoj identity |
| No-deadline maintenance | Review dependencies and wake Supabase before demos/releases |

## Owner actions still open

1. ~~Copy the Supabase publishable key into `.env.local`~~ — done.
2. Change the Cloudflare account's `workers.dev` subdomain to `example` so the URL resolves (see the deployment runbook, Part F).
3. Complete the Google OAuth client using the setup guide.
4. Configure the Supabase Google provider, URL allowlist and Before User Created hook.
5. Link the Supabase CLI and apply the reviewed migrations; deploy the judge.
6. ~~Provide the admin allowlist emails~~ — done (`game_private.admin_emails`). Apply the `admin_allowlist` migration with `supabase db push`.
7. Obtain written permission for institutional logo files if they will appear in the shipped game.
8. Decide whether the 90-day raw-attempt retention default should be shorter.

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
