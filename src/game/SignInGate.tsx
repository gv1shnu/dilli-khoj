interface SignInGateProps {
  onSignIn: () => void;
  error?: string | null;
  /** Present only in development builds: continue without a real sign-in for testing. */
  onDevBypass?: () => void;
}

// Mandatory sign-in wall shown right after the how-to-play explanation. Google
// sign-in is required to play: it keeps the world to legitimate approved-domain
// users, saves each player's progress, and lets admins see it.
export function SignInGate({ onSignIn, error, onDevBypass }: SignInGateProps) {
  return (
    <div
      className="gate-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to play"
    >
      <div className="gate-card">
        <img className="gate-mark" src="/favicon.svg" alt="Dilli Khoj helm logo" />
        <p className="eyebrow">DILLI KHOJ</p>
        <h2 className="gate-title">Sign in to enter the ruins</h2>
        <p className="gate-lead">
          The city only opens to signed-in explorers. Sign in with your approved
          Google account — it keeps your progress, and it is required to play.
        </p>
        <ul className="gate-points">
          <li>Only approved college accounts can enter.</li>
          <li>Your restored ruins and XP are saved to your account.</li>
          <li>No passwords — Google handles sign-in.</li>
        </ul>
        {error && <p className="gate-error">{error}</p>}
        <button className="primary-button gate-button" onClick={onSignIn}>
          Sign in with Google
        </button>
        {import.meta.env.DEV && onDevBypass && (
          <button className="hint-button gate-dev" onClick={onDevBypass}>
            Continue for local development
          </button>
        )}
        <p className="gate-credit">Developed by Vishnu Gandarapu</p>
      </div>
    </div>
  );
}
