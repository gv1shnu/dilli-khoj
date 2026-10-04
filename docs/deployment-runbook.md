# Deployment and release

Local setup is in [setup.md](setup.md). This runbook covers standing up (or refreshing) the hosted game.

## Targets

| Service | Target |
| --- | --- |
| GitHub | `gv1shnu/dilli-khoj` (public) |
| Web | `https://www.vishnugandarapu.in/dilli-khoj/` — GitHub Pages project site under the `gv1shnu.github.io` custom domain |
| Supabase | `your-project-ref` (Auth, Postgres, `judge-query` Edge Function) |

Production builds use Vite `base: "/dilli-khoj/"`; `pnpm dev` stays at `/`. Links in `public/*.html` are relative and React code uses `import.meta.env.BASE_URL`, so never reintroduce root-absolute (`/…`) asset or page links.

The hosted build and database may lag this branch. Read [implementation status](implementation-status.md) and compare migration history before planning a release.

## Before requesting approval

1. Pass typecheck, tests, build, Deno check and production content-leak checks.
2. Apply all migrations to a disposable local Supabase stack and pass RLS/role/transaction tests.
3. Verify approved/rejected accounts, server unlocks, purchases, retry behavior and completion end to end.
4. Complete blind question review and browser coverage; measure load at 25, 50, 100 and 200 submissions/second on an authorized test target.
5. Review the exact release commit, pending migrations, environment configuration and rollback plan with the owner.

No deployment or live migration is authorized merely by committing or pushing a feature branch.

## Backend rollout

Use existing maintainer authentication. Never reset credentials just because a local session is missing.

```bash
supabase link --project-ref your-project-ref
supabase migration list
supabase db push --dry-run
```

After approval of the migration list:

```bash
supabase db push
supabase functions deploy judge-query
```

Apply database migrations **before** deploying code that calls new functions. The judge fails closed if authorization lookup is absent, and the signed-in web app requires the gameplay RPCs. Deploy migrations, then judge, then web; do not release the web ahead of its backend.

The judge uses two Supavisor transaction-pooler secrets on port 6543: `JUDGE_EXECUTOR_DATABASE_URL` and `JUDGE_PROGRESS_DATABASE_URL`. The executor reads fixtures; the progress role calls fixed functions. Never replace either with the database owner identity. Passwords and connection URLs stay server-side.

The migrations seed a placeholder admin (`admin@example.com`). Add the real admin email to `game_private.admin_emails` from the SQL editor rather than in a migration, so it stays out of the public repository.

Verify Google provider, Before User Created hook (admits any Google account), redirects, and disabled Email/Anonymous providers. See [auth configuration](setup-supabase-google.md). The Google audience must be External + published so any Google account can sign in.

## Web rollout

1. One-time: in **Settings → Pages**, set **Source** to **GitHub Actions**. No custom domain is set on this repository; it inherits the user site's domain.
2. Run the **Deploy web (GitHub Pages)** workflow from the Actions tab. It builds with the Supabase URL and publishable key, checks student assets and publishes `dist/`.

Verify production sign-in, each protected API, model/WASM downloads and the release version. Roll back by re-running the workflow on the previous commit. Database rollback requires a separately reviewed forward migration or restore plan; do not delete migration history.

GitHub Pages cannot set custom response headers and serves `robots.txt` only from the domain root, so `/dilli-khoj/robots.txt` is advisory. Routing is hash-based (`#admin`, `#walkthrough`), so no SPA fallback is needed.

## GitHub Actions

- `ci.yml`: typecheck, tests, production build and Deno judge check on branch pushes/PRs.
- `deploy-web.yml`: manual web deploy to GitHub Pages.
- `deploy-supabase.yml`: manual backend workflow.

Required Actions configuration:

| Kind | Name |
| --- | --- |
| Secrets | `VITE_SUPABASE_PUBLISHABLE_KEY` |
| Variables | `VITE_SUPABASE_URL`, `SUPABASE_PROJECT_REF` |
| Backend workflow secrets | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` |

Do not put OAuth secrets or judge-role passwords in browser configuration. Keep raw attempts for no longer than the agreed retention period; release is also subject to the ₹0 operating target.
