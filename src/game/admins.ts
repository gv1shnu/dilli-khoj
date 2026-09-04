// Admin allowlist — the emails that may open the admin / question pages and view
// player progress. Kept in sync with the server-side `game_private.admin_emails`
// table (see supabase/migrations/…_admin_allowlist.sql), which is the authority the
// signup hook and (future) RLS enforce. Admins are also ordinary players.

export const ADMIN_EMAILS: readonly string[] = [
  "former.admin@example.edu",
  "staff.admin@partner.example",
];

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
