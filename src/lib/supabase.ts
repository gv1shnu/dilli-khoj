import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const supabase: SupabaseClient | null =
  supabaseUrl && publishableKey && !publishableKey.includes("replace_me")
    ? createClient(supabaseUrl, publishableKey, {
        auth: {
          flowType: "pkce",
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error("Add the Supabase publishable key to .env.local first.");

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: new URL(import.meta.env.BASE_URL, window.location.origin).href,
      scopes: "openid email profile",
    },
  });

  if (error) throw error;
}
