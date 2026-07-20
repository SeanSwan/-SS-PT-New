/**
 * WORKOUT DESIGN LAB — STYLE EXPLORER (live-identity catalog, Lab v6)
 * BLUEPRINT: selection stages a validated preview AND repaints the live
 * stage instantly. Catalog v6 (A-PACK §4.2): mood-family groups INSIDE the
 * listbox (listbox -> group -> option), pinned CURRENT duplicate, pinned
 * search, search-query flat list. Engine honesty (§4.3): badge + mini-tag
 * from V2_RECIPE_BY_CATALOG_ID; What-Changes list only when selected AND
 * committed are both v2-capable. Apply is still the only write path.
 */
import React, { useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import { Search } from "lucide-react";
import type { AppearancePhase, StyleLensManifest } from "../../../../core/style-lens-os";
import { SWAN_STYLE_LENS_VISUALS } from "../../../../adapters/style-lens-swan";
import { V2_RECIPE_BY_CATALOG_ID } from "../../../../adapters/style-lens-swan/v2/catalogV2Map";
import { LAB_HOST_MANIFEST } from "../../../../adapters/style-lens-swan/v2/labRecipes";
import { compileRecipe } from "../../../../core/style-lens-os/v2/compileRecipe";
import { whatChanged, type AxisChange } from "../../../../core/style-lens-os/v2/whatChanged";
import { StyleActions, StyleCatalog, StyleDetail, StyleExplorer, StylePick, StylePicker } from "./WorkoutDesignLabModes.styles";
import { LensDot, LensIdentityGlyph } from "./WorkoutDesignLabAtmosphere.styles";
import { WORKOUT_DESIGN_MOOD_FAMILY_ORDER, WORKOUT_DESIGN_STYLE_ROW_ORDER } from "./workoutDesignStyleCatalog";

/** §4.2: visible headers are aria-hidden — group aria-label carries semantics. */
const FamilyGroup = styled.div`grid-column: 1 / -1;`;

/** $flow = single-item CURRENT group: non-sticky so its header never floats over its own pinned chip when the page is the scrollport (≤460px fix). */
const FamilyHeader = styled.p<{ $flow?: boolean }>`
  position: ${({ $flow }) => ($flow ? "static" : "sticky")}; top: 0; z-index: 1;
  margin: 0 0 8px; padding: 6px 2px;
  background: var(--bg-base, #030712); color: var(--accent-primary, #60c0f0);
  font: 800 0.68rem/1.2 "Fira Code", monospace; letter-spacing: 0.12em; text-transform: uppercase;
  ${({ $flow }) => ($flow ? "" : "@media (max-width: 460px) { top: 62px; }")} /* page scrollport — sit below pinned search */
`;

const FamilyChipGrid = styled.div`
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;
  margin-bottom: 12px; @media (max-width: 460px) { grid-template-columns: 1fr; }
`;

const NeutralCurrentLine = styled.p`
  grid-column: 1 / -1; margin: 0 0 10px;
  color: var(--text-muted, rgba(224, 236, 244, 0.4)); font: 650 12px/1.4 "Sora", sans-serif;
`;

/** §4.2: the last chips must never hide behind notched-device insets. */
const CatalogList = styled(StylePicker)`padding-bottom: env(safe-area-inset-bottom, 16px);`;

/** §4.2: search stays PINNED and always visible while the catalog scrolls. */
const PinnedSearch = styled.div`
  position: sticky; top: 0; z-index: 2; padding-bottom: 2px; background: var(--bg-base, #030712);
`;

/** §4.3 engine honesty: v2 gold, v1 muted; exact copy, never reworded. */
const EngineBadge = styled.span<{ $v2: boolean }>`
  color: ${({ $v2 }) => ($v2 ? "var(--accent-gold, #C6A84B)" : "var(--text-muted, rgba(224, 236, 244, 0.4))")};
  font: 800 0.68rem/1.2 "Fira Code", monospace; letter-spacing: 0.1em; text-transform: uppercase; align-self: center; margin-right: auto;
`;

const V2MiniTag = styled.i`
  margin-left: auto; font: 800 9px/1 "Fira Code", monospace; font-style: normal; color: var(--accent-gold, #C6A84B);
`;

const WhatChangesList = styled.div`
  position: relative; margin: 22px 0; color: var(--text-primary, #e0ecf4);
  p { margin: 0 0 6px; color: var(--accent-primary, #60c0f0); font: 650 9px/1 "Fira Code", monospace; text-transform: uppercase; }
  ul { margin: 0; padding-left: 18px; font: 600 13px/1.7 "Sora", sans-serif; }
`;

const AXIS_LABELS: Record<AxisChange["axis"], string> = {
  typography: "Type", composition: "Layout", surface: "Cards", collection: "Exercises", action: "Action", chart: "Charts",
};

/** §4.1 glyph fix: 8px minimum inset from the panel edge at EVERY width. */
const DetailGlyph = styled(LensIdentityGlyph)`
  width: clamp(110px, 18vw, 190px); height: clamp(110px, 18vw, 190px);
  right: clamp(8px, 3vw, 28px); top: clamp(8px, 3vw, 28px);
  &::before { inset: 12%; } &::after { inset: 27%; }
`;

/** §3.4 Apply beat: scale 1 -> 0.95 -> 1; inert under reduced motion. */
const applyBeat = keyframes`0% { transform: scale(1); } 50% { transform: scale(0.95); } 100% { transform: scale(1); }`;

const ApplyBeatButton = styled.button`
  &[data-beat="true"] { animation: ${applyBeat} 200ms ease-out; }
  @media (prefers-reduced-motion: reduce) {
    &[data-beat="true"] { animation: none; }
  }
`;

/** §4.1 footer strip: fills the dead space below the detail list. */
const DetailFooterStrip = styled.footer`
  position: relative; margin-top: 18px; padding-top: 14px; border-top: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 22%, transparent);
`;

interface WorkoutDesignStyleExplorerProps {
  lenses: readonly StyleLensManifest[];
  selectedId: string; committedId: string; phase: AppearancePhase;
  onSelect: (id: string) => void; onApply: () => Promise<void>; onCancel: () => void;
}

const WorkoutDesignStyleExplorer: React.FC<WorkoutDesignStyleExplorerProps> = ({
  lenses, selectedId, committedId, phase, onSelect, onApply, onCancel,
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
  const isSearching = query.trim().length > 0;
  const committedLens = lenses.find(({ id }) => id === committedId) ?? null;
  const selectedEntry = V2_RECIPE_BY_CATALOG_ID[selected.id];
  // §4.1 ruling: needs TWO compiled plans (selected + committed both v2); else the shipped dl stays.
  const whatChanges = useMemo(() => {
    const committedEntry = V2_RECIPE_BY_CATALOG_ID[committedId];
    const selEntry = V2_RECIPE_BY_CATALOG_ID[selected.id];
    if (!committedEntry || !selEntry || committedId === selected.id) return null;
    const from = compileRecipe(committedEntry.recipe, LAB_HOST_MANIFEST);
    const to = compileRecipe(selEntry.recipe, LAB_HOST_MANIFEST);
    return from.ok && to.ok ? whatChanged(from.plan, to.plan) : null;
  }, [committedId, selected.id]);
  const renderChip = (lens: StyleLensManifest, pinned = false) => {
    const rowVisual = SWAN_STYLE_LENS_VISUALS[lens.id];
    const catalogIndex = lenses.findIndex(({ id }) => id === lens.id);
    return (
      <StylePick
        key={pinned ? `current-${lens.id}` : lens.id}
        type="button"
        role="option"
        aria-label={pinned ? `Current style: ${lens.name}` : `${lens.name} style lens`}
        {...(pinned ? {} : { "aria-selected": lens.id === selected.id })}
        $active={!pinned && lens.id === selected.id}
        onClick={() => onSelect(lens.id)}
      >
        <span>
          <LensDot aria-hidden="true" $canvas={rowVisual?.backgroundFallback ?? "#0a0a0f"} $accent={rowVisual?.accentFallback ?? "#60c0f0"} />
          {String(catalogIndex + 1).padStart(2, "0")} | {lens.emotionalJob}
          {V2_RECIPE_BY_CATALOG_ID[lens.id] ? <V2MiniTag>v2</V2MiniTag> : null}
        </span>
        {lens.name}
      </StylePick>
    );
  };
  // §4.2 row order; A4 pipeline additions append at their family's end.
  const rowIndex = (family: string, id: string) => {
    const index = WORKOUT_DESIGN_STYLE_ROW_ORDER[family]?.indexOf(id) ?? -1;
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  const familyChips = (family: string) =>
    lenses
      .filter(({ id }) => SWAN_STYLE_LENS_VISUALS[id]?.moodFamily === family)
      .sort((a, b) => rowIndex(family, a.id) - rowIndex(family, b.id))
      .map((lens) => renderChip(lens));
  // ARIA listbox keyboard pattern: Arrow/Home/End move focus among options
  // (roving focus; Enter/Space activate natively — options are buttons).
  const onCatalogKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key)) return;
    const options = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="option"]'),
    );
    if (options.length === 0) return;
    const current = options.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === "Home" ? 0
      : event.key === "End" ? options.length - 1
      : event.key === "ArrowDown" ? Math.min(current + 1, options.length - 1)
      : Math.max(current - 1, 0);
    event.preventDefault();
    options[next]?.focus();
  };

  return (
    <StyleExplorer aria-label="Style Lens explorer">
      <StyleCatalog>
        <PinnedSearch>
          <label>
            <span className="sr-only">Search styles</span>
            <Search aria-hidden="true" size={18} />
            <input
              type="search"
              aria-label="Search styles"
              placeholder="Search mood, layout, or lens"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </PinnedSearch>
        {/* Pinning law; outside the listbox (ARIA: option/group children only) */}
        {!isSearching && !committedLens && <NeutralCurrentLine>Current: Swan Flagship (system)</NeutralCurrentLine>}
        <CatalogList role="listbox" aria-label="Choose a Style Lens" onKeyDown={onCatalogKeyDown}>
          {isSearching ? (
            /* Search law: an active query REPLACES groups — flat list, no pin. */
            filtered.map((lens) => renderChip(lens))
          ) : (
            <>
              {committedLens ? (
                <FamilyGroup role="group" aria-label="Current">
                  <FamilyHeader $flow aria-hidden="true">Current</FamilyHeader>
                  <FamilyChipGrid>{renderChip(committedLens, true)}</FamilyChipGrid>
                </FamilyGroup>
              ) : null}
              {WORKOUT_DESIGN_MOOD_FAMILY_ORDER.map((family) => (
                <FamilyGroup key={family} role="group" aria-label={family.toUpperCase()}>
                  <FamilyHeader aria-hidden="true">{family}</FamilyHeader>
                  <FamilyChipGrid>{familyChips(family)}</FamilyChipGrid>
                </FamilyGroup>
              ))}
            </>
          )}
        </CatalogList>
      </StyleCatalog>
      <StyleDetail aria-label={`${selected.name} Style Lens details`}>
        <DetailGlyph aria-hidden="true" $canvas={visual?.backgroundFallback ?? "#0a0a0f"} $accent={visual?.accentFallback ?? "#60c0f0"} />
        <h2>{selected.name}</h2>
        <p>{selected.description}</p>
        {whatChanges ? (
          <WhatChangesList>
            <p>WHAT CHANGES vs current:</p>
            <ul>
              {whatChanges.map(({ axis, from, to }) => (
                <li key={`${axis}:${from}:${to}`}>
                  {AXIS_LABELS[axis]}: {from.replace(/-/g, " ")} → {to.replace(/-/g, " ")}
                </li>
              ))}
            </ul>
          </WhatChangesList>
        ) : (
          <dl>
            <div><dt>Signature</dt><dd>{visual?.signatureMoment ?? selected.layoutSignature}</dd></div>
            <div><dt>Layout</dt><dd>{selected.layoutSignature.replace(/-/g, " ")}</dd></div>
            <div><dt>Motion budget</dt><dd>{selected.motionBudget.mobileMs}ms mobile | {selected.motionBudget.desktopMs}ms desktop</dd></div>
            <div><dt>Accessibility</dt><dd>{selected.accessibilityReceipt.minimumTouchTargetPx}px targets | AA contrast</dd></div>
          </dl>
        )}
        <p aria-live="polite" className="stage-hint">
          The stage below is already wearing {selected.name} — scroll to judge
          it live, then Apply to keep it across the dashboard.
        </p>
        <DetailFooterStrip>
          {selectedEntry && !selectedEntry.dashboardChrome ? (
            <NeutralCurrentLine as="p">Lab preview today — dashboard rollout pending.</NeutralCurrentLine>
          ) : null}
          <StyleActions>
            <EngineBadge $v2={Boolean(selectedEntry)}>
              ENGINE: <span>{selectedEntry ? "v2 · full restyle" : "v1 · chrome system"}</span>
            </EngineBadge>
            <ApplyBeatButton
              type="button"
              aria-label={`Apply ${selected.name}`}
              disabled={busy || selected.id === committedId}
              data-beat={beating}
              onAnimationEnd={() => setBeating(false)}
              onClick={() => {
                setBeating(true);
                window.setTimeout(() => setBeating(false), 250); // reduced motion never fires animationend
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
