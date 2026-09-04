import { useEffect, useState, type ReactNode } from "react";
import { supabase, signInWithGoogle } from "../lib/supabase";
import { IntroOverlay } from "./IntroOverlay";
import { SignInGate } from "./SignInGate";
import { RuinScene } from "./RuinScene";
export interface PlayerIdentity {
  id: string;
  name: string;
}
export function GameEntry({
  children,
}: {
  children: (player: PlayerIdentity | null, onExit: () => void) => ReactNode;
}) {
  const [player, setPlayer] = useState<PlayerIdentity | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [bypass, setBypass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intro, setIntro] = useState(() => {
    try {
      return localStorage.getItem("dk_intro_seen_v1") !== "1";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setBypass(false);
      setLoading(false);
      const u = session?.user;
      setPlayer(
        u
          ? {
              id: u.id,
              name: String(u.user_metadata.full_name ?? u.email ?? "Explorer"),
            }
          : null,
      );
    });
    return () => data.subscription.unsubscribe();
  }, []);
  const signIn = () => {
    setError(null);
    void signInWithGoogle().catch((e) => setError(e.message));
  };
  const exit = () => {
    if (bypass) {
      setBypass(false);
      return;
    }
    if (supabase)
      void supabase.auth
        .signOut()
        .then(({ error }) => {
          if (error) setError(error.message);
        })
        .catch((e) => setError(e.message));
  };
  if (intro)
    return (
      <main>
        <RuinScene onProximityChange={() => {}} inputPaused />
        <IntroOverlay
          onClose={() => {
            setIntro(false);
            try {
              localStorage.setItem("dk_intro_seen_v1", "1");
            } catch {
              /* session only */
            }
          }}
        />
      </main>
    );
  if (loading)
    return (
      <main className="gate-backdrop">
        <p>Checking sign-in…</p>
      </main>
    );
  if (!player && !(import.meta.env.DEV && (bypass || !supabase)))
    return (
      <SignInGate
        onSignIn={signIn}
        error={error}
        onDevBypass={import.meta.env.DEV ? () => setBypass(true) : undefined}
      />
    );
  return children(player, exit);
}
