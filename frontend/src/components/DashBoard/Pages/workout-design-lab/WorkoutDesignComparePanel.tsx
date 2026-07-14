/**
 * ============================================================================
 * WORKOUT DESIGN LAB — COMPARE MODE (real A/B, not text cards)
 * ============================================================================
 * BLUEPRINT: one World, two Style Lenses, both RENDERED. Each pane hosts a
 * ScopedLensFrame so the full lens runtime (canvas, radius, edges, button
 * tones) applies inside that pane only — a genuine visual A/B with zero
 * global side effects. Panes stack below 940px; captions carry the lens
 * identity chip + signature moment so the difference is named, not just
 * shown. Shared workout model flows into both stages (one session truth).
 * ============================================================================
 */
import React, { useMemo } from "react";
import type { StyleLensManifest } from "../../../../core/style-lens-os";
import { ScopedLensFrame } from "../../../../core/style-lens-os";
import { SWAN_STYLE_LENS_VISUALS } from "../../../../adapters/style-lens-swan";
import type { ConceptRegistryItem } from "./conceptRegistry";
import type { WorkoutDesignViewModel } from "./workoutDesignViewModel";
import { CompareSelectors } from "./WorkoutDesignLabModes.styles";
import {
  ComparePane,
  ComparePaneCaption,
  CompareStageGrid,
  LensDot,
} from "./WorkoutDesignLabAtmosphere.styles";
import LensPlanFrame from "./LensPlanFrame";
import {
  compileRecipe,
  type ResolvedLensPlan,
} from "../../../../core/style-lens-os/v2/compileRecipe";
import {
  changedAxisCount,
  whatChanged,
} from "../../../../core/style-lens-os/v2/whatChanged";
import { LAB_HOST_MANIFEST } from "../../../../adapters/style-lens-swan/v2/labRecipes";
import { V2_RECIPE_BY_CATALOG_ID } from "../../../../adapters/style-lens-swan/v2/catalogV2Map";

/** §4.3 exact copy strings — never reworded. */
const BOTH_CHROME_COPY =
  "Chrome systems restyle trim, not structure — try a v2 style for a full restyle.";
const mixedChromeCopy = (paneKey: string, lensName: string) =>
  `${paneKey} · ${lensName} is a chrome system — trim only.`;

/** A chrome pane wears host defaults; diffing a lone v2 plan against this
 *  keeps the MIXED-state axes-diff caption honest to what is on screen. */
const HOST_DEFAULT_PLAN = {
  lensId: "host-default",
  lensVersion: "0.0.0",
  hostId: LAB_HOST_MANIFEST.hostId,
  cssVariables: {},
  templates: { "mobile-minimal": "default", tablet: "default", "desktop-enhanced": "default" },
  variants: {},
  chartFamiliarity: "conservative",
  degradations: [],
} as unknown as ResolvedLensPlan;

interface WorkoutDesignComparePanelProps {
  worlds: readonly ConceptRegistryItem[];
  lenses: readonly StyleLensManifest[];
  world: ConceptRegistryItem;
  lensA: StyleLensManifest;
  lensB: StyleLensManifest;
  model: WorkoutDesignViewModel;
  onWorldChange: (id: string) => void;
  onLensAChange: (id: string) => void;
  onLensBChange: (id: string) => void;
  onAction: (paneLabel: string) => void;
  onOpenRolodex: () => void;
}

const lensVisual = (id: string) => SWAN_STYLE_LENS_VISUALS[id];

const WorkoutDesignComparePanel: React.FC<WorkoutDesignComparePanelProps> = ({
  worlds,
  lenses,
  world,
  lensA,
  lensB,
  model,
  onWorldChange,
  onLensAChange,
  onLensBChange,
  onAction,
  onOpenRolodex,
}) => {
  const World = world.component;
  const panes: Array<{
    key: "A" | "B";
    lens: StyleLensManifest;
    onChange: (id: string) => void;
  }> = [
    { key: "A", lens: lensA, onChange: onLensAChange },
    { key: "B", lens: lensB, onChange: onLensBChange },
  ];
  // Each pane independently resolves its chip through the catalog map
  // (§4.3 — replaces the removed Engine dropdown + golden-pair pick).
  const resolved = useMemo(() => {
    const compiled = panes.map(({ lens }) => {
      const entry = V2_RECIPE_BY_CATALOG_ID[lens.id];
      if (!entry) return { kind: "chrome" as const };
      const result = compileRecipe(entry.recipe, LAB_HOST_MANIFEST);
      return result.ok
        ? { kind: "v2" as const, recipe: entry.recipe, plan: result.plan }
        : { kind: "failed" as const, recipe: entry.recipe };
    });
    const axesFor = (index: 0 | 1): number | null => {
      const own = compiled[index];
      if (own.kind !== "v2") return null;
      const other = compiled[index === 0 ? 1 : 0];
      const comparand = other.kind === "v2" ? other.plan : HOST_DEFAULT_PLAN;
      return changedAxisCount(whatChanged(comparand, own.plan));
    };
    return { compiled, axes: [axesFor(0), axesFor(1)] as const };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lensA.id, lensB.id]);

  return (
    <>
      <CompareSelectors>
        <label>
          World environment
          <select
            aria-label="Compare workout world"
            value={world.id}
            onChange={(event) => onWorldChange(event.target.value)}
          >
            {worlds.map((item) => (
              <option key={item.id} value={item.id}>
                {item.number} | {item.name}
              </option>
            ))}
          </select>
        </label>
        {panes.map(({ key, lens, onChange }) => (
          <label key={key}>
            Style Lens {key}
            <select
              aria-label={`Compare Style Lens ${key}`}
              value={lens.id}
              onChange={(event) => onChange(event.target.value)}
            >
              {lenses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        ))}
      </CompareSelectors>
      <CompareStageGrid role="region" aria-label="Live World and Style comparison">
        {panes.map(({ key, lens }, index) => {
          const visual = lensVisual(lens.id);
          const own = resolved.compiled[index];
          const other = resolved.compiled[index === 0 ? 1 : 0];
          const axes = resolved.axes[index];
          // §4.3 caption states (complete — no other states exist):
          const caption =
            own.kind === "failed"
              ? "Recipe v2 — compile failed"
              : own.kind === "v2"
                ? `Recipe v2 — ${axes} axes differ`
                : other.kind === "chrome"
                  ? BOTH_CHROME_COPY
                  : mixedChromeCopy(key, lens.name);
          const stage = (
            <World
              model={model}
              conceptName={world.name}
              primaryActionLabel={world.primaryActionLabel}
              onAction={() => onAction(`${lens.name} (${key})`)}
              onOpenRolodex={onOpenRolodex}
            />
          );
          return (
            <ComparePane key={key} data-testid="comparison-panel">
              <ComparePaneCaption>
                <LensDot
                  aria-hidden="true"
                  $canvas={visual?.backgroundFallback ?? "#0a0a0f"}
                  $accent={visual?.accentFallback ?? "#60c0f0"}
                />
                <strong>
                  {key} · {lens.name}
                </strong>
                <span>{caption}</span>
              </ComparePaneCaption>
              {own.kind === "chrome" ? (
                <ScopedLensFrame
                  styleLensId={lens.id}
                  aria-label={`${world.name} rendered in ${lens.name}`}
                >
                  {stage}
                </ScopedLensFrame>
              ) : (
                <LensPlanFrame
                  recipe={own.recipe}
                  aria-label={`${world.name} rendered by ${lens.name} v2`}
                >
                  {stage}
                </LensPlanFrame>
              )}
            </ComparePane>
          );
        })}
      </CompareStageGrid>
    </>
  );
};

export default WorkoutDesignComparePanel;
