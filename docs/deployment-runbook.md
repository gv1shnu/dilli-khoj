# Deployment and release

The existing Supabase project and Cloudflare site are already provisioned. Local setup is in [setup.md](setup.md); do not recreate resources to onboard a teammate.

## Existing targets

| Service | Target |
| --- | --- |
| GitHub | `gv1shnu/treasure-hunt` |
| Supabase | `your-project-ref` |
| Web | `https://dilli-khoj.example.workers.dev` |
| Cloudflare Worker | `dilli-khoj`; account pinned in `wrangler.jsonc` |

The hosted build and database may lag this branch. Read [implementation status](implementation-status.md) and compare migration history before planning a release.

## Before requesting approval

1. Pass typecheck, tests, build, Deno check and production content-leak checks.
2. Apply all migrations to a disposable local Supabase stack and pass RLS/role/transaction tests.
3. Verify approved/rejected accounts, server unlocks, purchases, retry behavior and completion end to end.
4. Complete blind question review and browser coverage; measure load at 25, 50, 100 and 200 submissions/second on an authorized test target.
5. Review the exact release commit, pending migrations, environment configuration and rollback plan with the owner.

No deployment or live migration is authorized merely by committing or pushing a feature branch.

## Approved backend rollout

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

Apply database migrations **before** deploying code that calls new functions. The authorization update requires `20260904110000_shared_identity_policy.sql`; its judge returns 503 if the authorization lookup is unavailable.

The judge uses two existing Supavisor transaction-pooler secrets on port 6543: `JUDGE_EXECUTOR_DATABASE_URL` and `JUDGE_PROGRESS_DATABASE_URL`. The executor reads fixtures; the progress role calls fixed functions. Never replace either with the database owner identity. Passwords and connection URLs stay server-side.

Verify Google provider, Before User Created hook, approved domains/admins, redirects, and disabled Email/Anonymous providers. See [auth configuration](setup-supabase-google.md). Google audience must accommodate both institutions; confirm current console requirements before changing its rollout status.

## Approved web rollout

Build with the existing Supabase URL and browser publishable key. Confirm the authenticated Cloudflare account matches `wrangler.jsonc`, then:

```bash
pnpm deploy
```

Verify production sign-in, each protected API, model/WASM downloads and the release version. Retain the prior web release for rollback. Database rollback requires a separately reviewed forward migration or restore plan; do not delete migration history.

## GitHub Actions

- `ci.yml`: typecheck, tests, production build and Deno judge check on branch pushes/PRs.
- `deploy-web.yml`: web deploy on `main` pushes or manual dispatch, using the `production` environment.
- `deploy-supabase.yml`: manual backend workflow.

Required Actions configuration:

| Kind | Name |
| --- | --- |
| Secrets | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY` |
| Variables | `VITE_SUPABASE_URL`, `SUPABASE_PROJECT_REF` |
| Backend workflow secrets | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` |

Do not put OAuth secrets or judge-role passwords in browser configuration. Keep raw attempts for no longer than the agreed retention period; release is also subject to the ₹0 operating target.
