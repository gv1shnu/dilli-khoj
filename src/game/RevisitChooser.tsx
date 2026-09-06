interface RevisitOption {
  variant: number;
  title: string;
  description: string;
}

interface RevisitChooserProps {
  options: RevisitOption[];
  onChoose: (variant: number) => void;
  onClose: () => void;
}

// Shown when a player re-enters a restored ruin. Revisits are practice only, so
// the player simply picks which of the ruin's alternate objectives to attempt.
export function RevisitChooser({
  options,
  onChoose,
  onClose,
}: RevisitChooserProps) {
  const sorted = [...options].sort((a, b) => a.variant - b.variant);
  return (
    <div
      className="intro-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Choose a revisit"
    >
      <div className="intro-card">
        <button
          className="icon-button intro-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <p className="eyebrow">REVISIT · NO SCORE</p>
        <h2 className="intro-title">Choose an objective</h2>
        <p className="intro-lead">
          Revisits are practice only — they never change XP, completion time or
          unlocks. Pick which question to attempt.
        </p>
        <div className="revisit-choices">
          {sorted.map((option, index) => (
            <button
              key={option.variant}
              className="revisit-choice"
              onClick={() => onChoose(option.variant)}
            >
              <span className="revisit-choice-title">
                {option.title ?? `Revisit ${index + 1}`}
              </span>
              <span className="revisit-choice-desc">{option.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
