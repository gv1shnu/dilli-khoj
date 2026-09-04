# Supabase and Google setup

Project URL: `https://your-project-ref.supabase.co`

Project reference: `your-project-ref`

Approved domains:

- `example.edu`
- `students.example.edu`
- `partner.example`

## Current setup snapshot

The 4 September maintainer handoff reports the publishable key, Google provider/redirects, migrations and judge deployment configured, and Google sign-in tested successfully. Google is reported External / Testing; hook enablement and disabling unused Email signup still need confirmation. The guide below is a reference for checking or recreating setup, not a requirement to redo it on another laptop. The judge's separate domain check has not yet been updated for `partner.example`; see [next steps](next-steps.md).

## Values needed on a new laptop

- A Supabase publishable key for browser configuration. Retrieve it from **Connect** or **Settings → API Keys**. Prefer `sb_publishable_...`; legacy `anon` keys are being deprecated.
- Google OAuth configured in the dashboard. Keep its client secret out of chat and Git.

Confirmed production origin: `https://dilli-khoj.example.workers.dev`

The university domains share one Google Workspace organization, but `partner.example` is a separate organization. Because that domain is allowed, the Google app must use an **External** audience (Internal would block `partner.example` accounts), and it must be **published** to production so it is not capped at 100 test users. The requested scopes (`openid`, `email`, `profile`) are non-sensitive, so publishing an External app does not trigger Google's security review.

## Supabase project preparation

1. Open the project dashboard.
2. Go to **Settings → API Keys**.
3. Create or copy the publishable key for the browser.
4. Do not copy a secret key into browser variables or source control.
5. Go to **Authentication → URL Configuration**.
6. Set **Site URL** to `https://dilli-khoj.example.workers.dev`.
7. Add redirect URLs for:
   - `https://dilli-khoj.example.workers.dev/**`;
   - a Cloudflare preview URL only when preview sign-in is intentionally enabled;
   - `http://localhost:5173/**` for development.
8. Go to **Authentication → Providers → Google**. Leave this page open; it displays the Supabase callback URL needed by Google.
9. After Google setup, paste the Google Client ID and Client Secret here and enable the provider.
10. Disable authentication methods the game does not use, especially anonymous and password sign-up.
11. Verify the **Before User Created** hook allows the three approved domains or server-allowlisted admin emails, and only Google-created accounts.
12. Create the profile trigger that copies Google display name and email into the game profile while using the Supabase user UUID as the permanent identifier.
13. Run the database migrations, RLS tests and judge-role attack tests before adding production content.

Official references:

- API keys: https://supabase.com/docs/guides/getting-started/api-keys
- Redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
- Google provider: https://supabase.com/docs/guides/auth/social-login/auth-google
- Domain restriction hook: https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook
- User profile trigger: https://supabase.com/docs/guides/auth/managing-user-data

## Exact Google OAuth setup

1. Open Google Cloud Console and create or select a project such as `Dilli Khoj`.
2. Open **Google Auth Platform**.
3. Configure app branding:
   - App name: `Dilli Khoj`.
   - User support email: an account you monitor.
   - Developer contact: your email.
4. Choose the **External** audience (a `partner.example` account is a different Workspace org, which Internal would reject), then **publish** the app to production.
5. Request only `openid`, `email` and `profile` scopes. The game does not need Google Drive, Calendar or contacts.
6. Create a client with application type **Web application**.
7. Add authorized JavaScript origins:
   - `https://dilli-khoj.example.workers.dev`;
   - `http://localhost:5173` for development.
8. Add this exact authorized redirect URI:

   `https://your-project-ref.supabase.co/auth/v1/callback`

9. Create the client.
10. Copy its Client ID and Client Secret directly into **Supabase → Authentication → Providers → Google**.
11. Test all three approved domains and a non-approved Gmail account.
12. Confirm that Google returns display name and email and that the non-approved account is rejected by the server-side hook.

Google states that email alone should not be treated as the permanent account identifier. Use the Supabase UUID/Google subject for identity and verify the hosted-domain claim when restricting Workspace membership:

- https://developers.google.com/identity/openid-connect/reference

## Domain gate

Do not rely on a client-side email suffix check. The server-side creation hook should require:

- OAuth provider is Google;
- email is verified;
- normalized domain is exactly `example.edu`, `students.example.edu` or `partner.example`, **or** the email is in `game_private.admin_emails` (the admin allowlist);
- where available, Google's hosted-domain claim agrees with the approved organization.

The UI may provide a friendly error, but database and judge authorization must independently reject other accounts.

Approved domains are `example.edu`, `students.example.edu`, and `partner.example` (in `hook_restrict_dilli_khoj_signup`). The `game_private.admin_emails` table additionally lets specific admin emails in regardless of domain. Google's audience applies first: because `partner.example` is a different Workspace org, the OAuth app **must be External and published**, or those accounts are blocked before the hook runs.

## Local and deployment linkage

Once the authenticated repository checkout exists:

```bash
supabase start
supabase test db
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

Enter the database password only in the CLI prompt or secure credential store. Do not put it in shell history, chat or Git. Edge Function environment secrets can be added through the dashboard or `supabase secrets set`.

### Judge role and function setup

The migrations create two login roles without passwords:

- `dilli_judge_executor` — read-only access to fixture tables;
- `dilli_judge_progress` — execute access only to fixed private judge functions.

After `supabase db push`, connect as the project database owner with `psql` and run the interactive commands below. `\password` prompts without echoing or placing the new password in shell history.

```text
\password dilli_judge_executor
\password dilli_judge_progress
```

In the Supabase **Connect** panel, copy the transaction-pooler host and use port `6543`. Build one URL for each custom role; the pooler username normally has the form `ROLE.PROJECT_REF`. Put the URLs in a local ignored file such as `.env.judge`:

```dotenv
JUDGE_EXECUTOR_DATABASE_URL=postgresql://dilli_judge_executor.your-project-ref:URL_ENCODED_PASSWORD@POOLER_HOST:6543/postgres
JUDGE_PROGRESS_DATABASE_URL=postgresql://dilli_judge_progress.your-project-ref:URL_ENCODED_PASSWORD@POOLER_HOST:6543/postgres
```

Then upload the secrets and deploy the function:

```bash
supabase secrets set --env-file .env.judge
supabase functions deploy judge-query
```

Do not use the owner/postgres URL for either variable. Verify the actual custom-role username format in the Connect panel or with a test connection before deployment.

Official references:

- CLI linking: https://supabase.com/docs/reference/cli/supabase-projects
- Edge Function secrets: https://supabase.com/docs/guides/functions/secrets

## Repository access

The development checkout is at `/Users/YOUR_NAME/Dev/treasure-hunt` with remote `https://github.com/gv1shnu/treasure-hunt.git`. Commits use the repository owner's configured Git identity. Never paste a personal access token into chat or store it in the repository.
