# Player profile

Implemented as the player profile panel. Open from the signed-in name in the header
(or **Profile** on mobile). The fullscreen field journal uses an account-derived
palette, explorer alias and procedural emblem, stable across devices. No identity
or scores are inferred from the decorative alias.

The profile shows identity, join date, XP, first unsolved level, solved count,
completion leaderboard rank, first-solve help categories, submission/incorrect
attempt counts, surveyed ruins, revisit starts and revealed-but-unsolved ruins.
The twenty-ruin ledger links cleared archives to the existing revisit chooser.

`player_profile()` derives identity from the authenticated caller. It accepts no
player ID and exposes neither canonical answers nor another player's records.
`solve_help` is frozen when `solved_at` is first set. Categories are independent,
first hint only, second hint used, solution revealed and unknown historic help.
The first four categories plus unknown sum to total solved. Help opened afterward
never reclassifies a solve. Historic classification uses retained help requests;
insufficient evidence is marked unknown. Attempt counters are updated on unique
submission insertion and survive raw-attempt retention cleanup. Backfill can count
only retained submissions; records already removed before this migration cannot
be reconstructed. Revisits are starts, not verified completions.

## Account deletion

The bottom-left Delete account button opens a confirmation screen requiring exact
`DELETE`. `delete_player_account(confirmation)` is a fixed SECURITY DEFINER RPC
with an empty search path and authenticated-only execution. The identity comes
from `auth.uid()`; the client cannot choose a target. The transaction locks the
profile, deletes the caller's admin audit records and deletes their Auth account.
Foreign keys cascade to profile, progress, submission attempts, leases, game
requests and revisit requests. A failure rolls back the transaction; repetition is
safe. This avoids a service-role key in either the browser or a new Edge Function.
The administrative email allowlist is configuration, not a personal profile, and
is not modified by account deletion.

After success, the browser removes only this player's `dk_` storage records,
signs out locally and returns to the entry screen. Other browser sessions cannot
read protected gameplay once the Auth user is gone, even if an old JWT has not
expired. Google itself is not deleted. A subsequent approved sign-in creates a
fresh game account.

## Rollout and validation

Apply `20260906160000_player_profile.sql` before publishing the web build.
No live migration or deployment was performed as part of this implementation.
The existing revisit chooser work remains in the working tree; its own migration
is independently required for explicit variant selection.

Checks:

- `pnpm test`: 161 tests pass, including server access isolation, category freezing, retry deduplication,
  durable counters, self-deletion, rollback on failure, cleanup, completion rank and the existing suite.
- `pnpm test:integration`: real PostgreSQL judge and progression with the migration.
- `pnpm build` and `pnpm test:assets`: types and student content isolation.
- `pnpm test:browser:profile` against `pnpm dev`: desktop/mobile layout, distinct
  identities, load retry, keyboard focus restoration, exact confirmation, deletion
  retry and local storage isolation; every backend call mocked. Both Chrome and WebKit passed at 1440px and 390px widths.

Full Supabase Auth/PostgREST deletion must still be smoke-tested on a disposable
Supabase stack. The local harness models Auth and cannot prove the hosted Auth
service's session behavior. Do not use a real player's account as a deletion test.
