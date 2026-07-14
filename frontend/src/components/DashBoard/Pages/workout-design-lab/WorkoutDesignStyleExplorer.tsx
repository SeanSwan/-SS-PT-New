/**
 * ============================================================================
 * WORKOUT DESIGN LAB — STYLE EXPLORER (live-identity catalog)
 * ============================================================================
 * BLUEPRINT: selection stages a validated preview AND repaints the live
 * stage below instantly (the Lab wraps its Stage in a ScopedLensFrame fed
 * by this selection). Every catalog row carries the lens's real canvas
 * swatch; the detail card renders a per-lens identity glyph — no two of
 * the 25 lenses present the same face. Persistence still requires the
 * explicit Apply (commit) — browsing never writes.
 * ============================================================================
 */
import React, { useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import { Search } from "lucide-react";
import type { AppearancePhase, StyleLensManifest } from "../../../../core/style-lens-os";
import { SWAN_STYLE_LENS_VISUALS } from "../../../../adapters/style-lens-swan";
import {
  StyleActions,
  StyleCatalog,
  StyleDetail,
  StyleExplorer,
  StylePick,
  StylePicker,
} from "./WorkoutDesignLabModes.styles";
import { LensDot, LensIdentityGlyph } from "./WorkoutDesignLabAtmosphere.styles";

/** Glyph collision fix (A-PACK §4.1): the sigil keeps an 8px minimum inset
 *  from the panel edge at EVERY width and scales down so it never collides
 *  with the lens title on narrow cards. */
const DetailGlyph = styled(LensIdentityGlyph)`
  width: clamp(110px, 18vw, 190px);
  height: clamp(110px, 18vw, 190px);
  right: clamp(8px, 3vw, 28px);
  top: clamp(8px, 3vw, 28px);
  &::before {
    inset: 12%;
  }
  &::after {
    inset: 27%;
  }
`;

/** Apply beat (A-PACK §3.4): 200ms scale 1 -> 0.95 -> 1 on tap; inert under
 *  reduced motion (no substitute animation). */
const applyBeat = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(0.95); }
  100% { transform: scale(1); }
`;

const ApplyBeatButton = styled.button`
  &[data-beat="true"] {
    animation: ${applyBeat} 200ms ease-out;
  }
  @media (prefers-reduced-motion: reduce) {
    &[data-beat="true"] {
      animation: none;
    }
  }
`;

/** Footer strip (A-PACK §4.1): fills the dead space below the detail list —
 *  divider-topped row that carries the Apply/Cancel actions (the engine badge
 *  + honesty label join it in Phase A3). */
const DetailFooterStrip = styled.footer`
  position: relative;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid
    color-mix(in srgb, var(--accent-primary, #60c0f0) 22%, transparent);
`;

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
  const [beating, setBeating] = useState(false);

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
          {filtered.map((lens, index) => {
            const rowVisual = SWAN_STYLE_LENS_VISUALS[lens.id];
            return (
              <StylePick
                key={lens.id}
                type="button"
                role="option"
                aria-label={`${lens.name} style lens`}
                aria-selected={lens.id === selected.id}
                $active={lens.id === selected.id}
                onClick={() => onSelect(lens.id)}
              >
                <span>
                  <LensDot
                    aria-hidden="true"
                    $canvas={rowVisual?.backgroundFallback ?? "#0a0a0f"}
                    $accent={rowVisual?.accentFallback ?? "#60c0f0"}
                  />
                  {String(index + 1).padStart(2, "0")} | {lens.emotionalJob}
                </span>
                {lens.name}
              </StylePick>
            );
          })}
        </StylePicker>
      </StyleCatalog>
      <StyleDetail aria-label={`${selected.name} Style Lens details`}>
        <DetailGlyph
          aria-hidden="true"
          $canvas={visual?.backgroundFallback ?? "#0a0a0f"}
          $accent={visual?.accentFallback ?? "#60c0f0"}
        />
        <h2>{selected.name}</h2>
        <p>{selected.description}</p>
        <dl>
          <div><dt>Signature</dt><dd>{visual?.signatureMoment ?? selected.layoutSignature}</dd></div>
          <div><dt>Layout</dt><dd>{selected.layoutSignature.replace(/-/g, " ")}</dd></div>
          <div><dt>Motion budget</dt><dd>{selected.motionBudget.mobileMs}ms mobile | {selected.motionBudget.desktopMs}ms desktop</dd></div>
          <div><dt>Accessibility</dt><dd>{selected.accessibilityReceipt.minimumTouchTargetPx}px targets | AA contrast</dd></div>
        </dl>
        <p aria-live="polite" className="stage-hint">
          The stage below is already wearing {selected.name} — scroll to judge
          it live, then Apply to keep it across the dashboard.
        </p>
        <DetailFooterStrip>
          <StyleActions>
            <ApplyBeatButton
              type="button"
              aria-label={`Apply ${selected.name}`}
              disabled={busy || selected.id === committedId}
              data-beat={beating}
              onAnimationEnd={() => setBeating(false)}
              onClick={() => {
                setBeating(true);
                void onApply();
              }}
            >
              {selected.id === committedId ? "Active across dashboard" : `Apply ${selected.name}`}
            </ApplyBeatButton>
            <button type="button" disabled={busy} onClick={onCancel}>Cancel preview</button>
          </StyleActions>
        </DetailFooterStrip>
      </StyleDetail>
    </StyleExplorer>
  );
};

export default WorkoutDesignStyleExplorer;
