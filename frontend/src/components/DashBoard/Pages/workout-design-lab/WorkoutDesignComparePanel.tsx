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
import React, { useMemo, useState } from "react";
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
import { compileRecipe } from "../../../../core/style-lens-os/v2/compileRecipe";
import {
  changedAxisCount,
  whatChanged,
} from "../../../../core/style-lens-os/v2/whatChanged";
import {
  CANDY_GLASS_ARCADE_RECIPE,
  LAB_HOST_MANIFEST,
  PRISM_TERMINAL_RECIPE,
} from "../../../../adapters/style-lens-swan/v2/labRecipes";

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
  const [engine, setEngine] = useState<"v1" | "v2">("v1");
  const goldenPair = useMemo(() => {
    const a = compileRecipe(CANDY_GLASS_ARCADE_RECIPE, LAB_HOST_MANIFEST);
    const b = compileRecipe(PRISM_TERMINAL_RECIPE, LAB_HOST_MANIFEST);
    if (!a.ok || !b.ok) return null;
    const changes = whatChanged(a.plan, b.plan);
    return { changes, axes: changedAxisCount(changes) };
  }, []);
  const panes: Array<{
    key: "A" | "B";
    lens: StyleLensManifest;
    onChange: (id: string) => void;
  }> = [
    { key: "A", lens: lensA, onChange: onLensAChange },
    { key: "B", lens: lensB, onChange: onLensBChange },
  ];
  const v2Panes = [
    { key: "A" as const, recipe: CANDY_GLASS_ARCADE_RECIPE, name: "Candy Glass Arcade v2" },
    { key: "B" as const, recipe: PRISM_TERMINAL_RECIPE, name: "Prism Terminal v2" },
  ];

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
        <label>
          Engine
          <select
            aria-label="Compare engine"
            value={engine}
            onChange={(event) => setEngine(event.target.value as "v1" | "v2")}
          >
            <option value="v1">v1 lenses (25 chrome systems)</option>
            <option value="v2">v2 Golden Pair (repaints the World)</option>
          </select>
        </label>
        {engine === "v1"
          ? panes.map(({ key, lens, onChange }) => (
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
            ))
          : null}
      </CompareSelectors>
      <CompareStageGrid role="region" aria-label="Live World and Style comparison">
        {engine === "v2"
          ? v2Panes.map(({ key, recipe, name }) => (
              <ComparePane key={key} data-testid="comparison-panel">
                <ComparePaneCaption>
                  <LensDot aria-hidden="true" $canvas="#10203a" $accent="#60c0f0" />
                  <strong>
                    {key} · {name}
                  </strong>
                  <span>
                    Recipe v2 — {goldenPair ? `${goldenPair.axes} axes differ` : "compile failed"}
                  </span>
                </ComparePaneCaption>
                <LensPlanFrame
                  recipe={recipe}
                  aria-label={`${world.name} rendered by ${name}`}
                >
                  <World
                    model={model}
                    conceptName={world.name}
                    primaryActionLabel={world.primaryActionLabel}
                    onAction={() => onAction(`${name} (${key})`)}
                    onOpenRolodex={onOpenRolodex}
                  />
                </LensPlanFrame>
              </ComparePane>
            ))
          : null}
        {engine === "v1" && panes.map(({ key, lens }) => {
          const visual = lensVisual(lens.id);
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
                <span>{visual?.signatureMoment ?? lens.layoutSignature}</span>
              </ComparePaneCaption>
              <ScopedLensFrame
                styleLensId={lens.id}
                aria-label={`${world.name} rendered in ${lens.name}`}
              >
                <World
                  model={model}
                  conceptName={world.name}
                  primaryActionLabel={world.primaryActionLabel}
                  onAction={() => onAction(`${lens.name} (${key})`)}
                  onOpenRolodex={onOpenRolodex}
                />
              </ScopedLensFrame>
            </ComparePane>
          );
        })}
      </CompareStageGrid>
    </>
  );
};

export default WorkoutDesignComparePanel;
