/**
 * Workout Design Lab Style explorer.
 * Selection only stages a validated preview; persistence requires explicit Apply.
 */
import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { AppearancePhase, StyleLensManifest } from "../../../../core/style-lens-os";
import { SWAN_STYLE_LENS_VISUALS } from "../../../../adapters/style-lens-swan";
import {
  LensGlyph,
  StyleActions,
  StyleCatalog,
  StyleDetail,
  StyleExplorer,
  StylePick,
  StylePicker,
} from "./WorkoutDesignLabModes.styles";

interface WorkoutDesignStyleExplorerProps {
  lenses: readonly StyleLensManifest[];
  selectedId: string;
  committedId: string;
  phase: AppearancePhase;
  onSelect: (id: string) => void;
  onApply: () => Promise<void>;
  onCancel: () => void;
}

const WorkoutDesignStyleExplorer: React.FC<WorkoutDesignStyleExplorerProps> = ({
  lenses,
  selectedId,
  committedId,
  phase,
  onSelect,
  onApply,
  onCancel,
}) => {
  const [query, setQuery] = useState("");
  const selected = lenses.find(({ id }) => id === selectedId) ?? lenses[0];
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return lenses;
    return lenses.filter((lens) =>
      `${lens.name} ${lens.description} ${lens.emotionalJob} ${lens.layoutSignature}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [lenses, query]);
  const visual = SWAN_STYLE_LENS_VISUALS[selected.id];
  const busy = ["validating", "committing", "transitioning", "persisting", "rollback"].includes(phase);

  return (
    <StyleExplorer aria-label="Style Lens explorer">
      <StyleCatalog>
        <label>
          <span className="sr-only">Filter Style Lenses</span>
          <Search aria-hidden="true" size={18} />
          <input
            type="search"
            aria-label="Filter Style Lenses"
            placeholder="Search mood, layout, or lens"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <StylePicker role="listbox" aria-label="Choose a Style Lens">
          {filtered.map((lens, index) => (
            <StylePick
              key={lens.id}
              type="button"
              role="option"
              aria-label={`${lens.name} style lens`}
              aria-selected={lens.id === selected.id}
              $active={lens.id === selected.id}
              onClick={() => onSelect(lens.id)}
            >
              <span>{String(index + 1).padStart(2, "0")} | {lens.emotionalJob}</span>
              {lens.name}
            </StylePick>
          ))}
        </StylePicker>
      </StyleCatalog>
      <StyleDetail aria-label={`${selected.name} Style Lens details`}>
        <LensGlyph aria-hidden="true" />
        <h2>{selected.name}</h2>
        <p>{selected.description}</p>
        <dl>
          <div><dt>Signature</dt><dd>{visual?.signatureMoment ?? selected.layoutSignature}</dd></div>
          <div><dt>Layout</dt><dd>{selected.layoutSignature.replace(/-/g, " ")}</dd></div>
          <div><dt>Motion budget</dt><dd>{selected.motionBudget.mobileMs}ms mobile | {selected.motionBudget.desktopMs}ms desktop</dd></div>
          <div><dt>Accessibility</dt><dd>{selected.accessibilityReceipt.minimumTouchTargetPx}px targets | AA contrast</dd></div>
        </dl>
        <StyleActions>
          <button
            type="button"
            aria-label={`Apply ${selected.name}`}
            disabled={busy || selected.id === committedId}
            onClick={() => void onApply()}
          >
            {selected.id === committedId ? "Active across dashboard" : `Apply ${selected.name}`}
          </button>
          <button type="button" disabled={busy} onClick={onCancel}>Cancel preview</button>
        </StyleActions>
      </StyleDetail>
    </StyleExplorer>
  );
};

export default WorkoutDesignStyleExplorer;
