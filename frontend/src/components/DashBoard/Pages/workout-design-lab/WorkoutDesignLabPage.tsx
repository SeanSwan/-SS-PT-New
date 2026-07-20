/**
 * ============================================================================
 * WORKOUT DESIGN LAB v5 — the transforming vision, made visible
 * ============================================================================
 * BLUEPRINT: 25 Worlds × the full Style Lens catalog (growing; count is
 * derived from WORKOUT_DESIGN_STYLE_COUNT) with one shared prototype session.
 * v5 makes the lens axis REAL: the stage below is always wrapped in a
 * ScopedLensFrame wearing the currently browsed lens (instant preview on
 * click — no Apply needed to SEE), Compare renders two live stages side by
 * side, and a JWST-nebula atmosphere sits under translucent surfaces so a
 * committed lens visibly recolors the whole Lab. Apply remains the only
 * write path (validation → transition → persist, unchanged).
 * ============================================================================
 */
import React, { useEffect, useMemo, useState } from "react";
import { useStyleLensAppearance } from "../../../../core/style-lens-os";
import { ScopedLensFrame } from "../../../../core/style-lens-os";
import {
  CONCEPT_REGISTRY,
  DEFAULT_CONCEPT_ID,
  WORKOUT_DESIGN_CONCEPT_COUNT,
} from "./conceptRegistry";
import {
  DEFAULT_WORKOUT_VIEW_MODEL,
  addRolodexExercise,
} from "./workoutDesignViewModel";
import WorkoutDesignRolodex from "./WorkoutDesignRolodex";
import WorkoutDesignLabModes, {
  type WorkoutDesignLabMode,
} from "./WorkoutDesignLabModes";
import WorkoutDesignWorldExplorer from "./WorkoutDesignWorldExplorer";
import WorkoutDesignStyleExplorer from "./WorkoutDesignStyleExplorer";
import WorkoutDesignComparePanel from "./WorkoutDesignComparePanel";
import LabConfirmationChip from "./LabConfirmationChip";
import { V2_RECIPE_BY_CATALOG_ID } from "../../../../adapters/style-lens-swan/v2/catalogV2Map";
import {
  WORKOUT_DESIGN_STYLE_COUNT,
  WORKOUT_DESIGN_STYLE_LENSES,
} from "./workoutDesignStyleCatalog";
import { CombinedStageLabel } from "./WorkoutDesignLabModes.styles";
import {
  NebulaField,
  StageFrame,
} from "./WorkoutDesignLabAtmosphere.styles";
import {
  HeaderTop,
  Lab,
  LabHeader,
  LiveReceipt,
  SafetyCard,
  Stage,
} from "./WorkoutDesignLabShell.styles";

const findLens = (id: string) =>
  WORKOUT_DESIGN_STYLE_LENSES.find((lens) => lens.id === id);

/** §4.3: the FALLBACK initial selection is the v2-capable flagship — a
 *  committed catalog lens ALWAYS wins over this, exactly as before. */
const LAB_DEFAULT_LENS_ID = "candy-glass-arcade";
const LAB_DEFAULT_LENS =
  findLens(LAB_DEFAULT_LENS_ID) ?? WORKOUT_DESIGN_STYLE_LENSES[0];

const WorkoutDesignLabPage: React.FC = () => {
  const { state, beginPreview, cancelPreview, commitPreview } =
    useStyleLensAppearance();
  const committedLens = findLens(state.committed.styleLensId);
  const [mode, setMode] = useState<WorkoutDesignLabMode>("world");
  const [activeId, setActiveId] = useState(DEFAULT_CONCEPT_ID);
  const [activeLensId, setActiveLensId] = useState(
    committedLens?.id ?? LAB_DEFAULT_LENS.id,
  );
  const [compareLensAId, setCompareLensAId] = useState(
    committedLens?.id ?? LAB_DEFAULT_LENS.id,
  );
  const [query, setQuery] = useState("");
  const [receipt, setReceipt] = useState(
    "Choose a World or Style, then try its prototype action.",
  );
  const [model, setModel] = useState(DEFAULT_WORKOUT_VIEW_MODEL);
  const [confirmation, setConfirmation] = useState<{
    message: string;
    token: number;
  } | null>(null);
  const [rolodexOpen, setRolodexOpen] = useState(false);
  // Chip auto-dismiss (Fable ratification of the builder's open flag): the
  // applied chip clears after 5s — aria-live has already announced it, and a
  // permanent floating pill contradicts the pack's calm/precise feel.
  useEffect(() => {
    if (!confirmation) return;
    const timer = setTimeout(() => setConfirmation(null), 5000);
    return () => clearTimeout(timer);
  }, [confirmation]);
  const activeIndex = CONCEPT_REGISTRY.findIndex(({ id }) => id === activeId);
  const active = CONCEPT_REGISTRY[activeIndex] ?? CONCEPT_REGISTRY[24];
  const activeLens = findLens(activeLensId) ?? LAB_DEFAULT_LENS;
  const compareLensA = findLens(compareLensAId) ?? activeLens;
  const ActiveConcept = active.component;
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return CONCEPT_REGISTRY;
    return CONCEPT_REGISTRY.filter((concept) =>
      `${concept.name} ${concept.environmentFamily} ${concept.interactionModel}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [query]);
  useEffect(() => () => cancelPreview(), [cancelPreview]);
  const selectAt = (index: number) => {
    const count = CONCEPT_REGISTRY.length;
    const concept = CONCEPT_REGISTRY[(index + count) % count];
    setActiveId(concept.id);
    setReceipt(`Viewing ${concept.name} · ${concept.interactionModel}`);
  };
  const selectWorld = (id: string) => {
    const index = CONCEPT_REGISTRY.findIndex((concept) => concept.id === id);
    if (index >= 0) selectAt(index);
  };
  const selectLens = (id: string) => {
    const lens = findLens(id);
    if (!lens) return;
    setActiveLensId(id);
    beginPreview({
      ...state.committed,
      styleLensId: id,
      updatedAt: new Date().toISOString(),
    });
    setReceipt(
      `${lens.name} is live on the stage below · Apply to keep it everywhere.`,
    );
  };
  const applyLens = async () => {
    const applied = await commitPreview();
    // §4.3 Apply honesty: a chrome-less v2 style must not claim dashboard-wide
    // wear today (dashboardChrome=false); the two originals keep shipped copy.
    const mapEntry = V2_RECIPE_BY_CATALOG_ID[activeLens.id];
    const appliedCopy =
      mapEntry && !mapEntry.dashboardChrome
        ? `${activeLens.name} applied — full restyle shows in the Lab; dashboard-wide wear arrives with the v2 rollout.`
        : `${activeLens.name} applied across the dashboard.`;
    setReceipt(
      applied
        ? appliedCopy
        : `${activeLens.name} was not applied. Your previous appearance is preserved.`,
    );
    if (applied) {
      setConfirmation((current) => ({
        message: appliedCopy,
        token: (current?.token ?? 0) + 1,
      }));
    }
  };
  const cancelLens = () => {
    cancelPreview();
    const fallback =
      findLens(state.committed.styleLensId) ?? LAB_DEFAULT_LENS;
    setActiveLensId(fallback.id);
    setReceipt(`Style preview canceled · ${fallback.name} remains active.`);
  };
  const changeMode = (nextMode: WorkoutDesignLabMode) => {
    setMode(nextMode);
    setReceipt(
      nextMode === "world"
        ? "World mode · compare complete workout environments."
        : nextMode === "style"
          ? "Style mode · click a lens and watch the stage transform."
          : "Compare mode · two live stages, two lenses, one shared session.",
    );
  };
  return (
    <Lab data-lab-safety="page">
      <NebulaField aria-hidden="true" />
      <LabHeader>
        <HeaderTop>
          <div>
            <h1>
              {WORKOUT_DESIGN_CONCEPT_COUNT} Worlds ×{" "}
              {WORKOUT_DESIGN_STYLE_COUNT} Styles. One session.
            </h1>
            <p>
              Combine Swan-native workout atmospheres with whole-dashboard
              structural systems. Shared exercise truth remains read-only from
              /api/exercises/library.
            </p>
          </div>
          <SafetyCard>
            <strong>Prototype only — no client data is written.</strong>
            <p>
              World {active.number} · {active.name}
              <br />
              Style · {activeLens.name}
            </p>
          </SafetyCard>
        </HeaderTop>
        <WorkoutDesignLabModes mode={mode} onChange={changeMode} />

        {mode === "world" ? (
          <WorkoutDesignWorldExplorer
            concepts={CONCEPT_REGISTRY}
            filtered={filtered}
            activeId={activeId}
            activeIndex={activeIndex}
            query={query}
            onQueryChange={setQuery}
            onSelectAt={selectAt}
            onSelectWorld={selectWorld}
            onReset={() => {
              setActiveId(DEFAULT_CONCEPT_ID);
              setReceipt(
                "Reset to Crystalline Swan World · recommended direction",
              );
            }}
          />
        ) : null}

        {mode === "style" ? (
          <WorkoutDesignStyleExplorer
            lenses={WORKOUT_DESIGN_STYLE_LENSES}
            selectedId={activeLens.id}
            committedId={state.committed.styleLensId}
            phase={state.phase}
            onSelect={selectLens}
            onApply={applyLens}
            onCancel={cancelLens}
          />
        ) : null}
      </LabHeader>

      {mode === "compare" ? (
        <WorkoutDesignComparePanel
          worlds={CONCEPT_REGISTRY}
          lenses={WORKOUT_DESIGN_STYLE_LENSES}
          world={active}
          lensA={compareLensA}
          lensB={activeLens}
          model={model}
          onWorldChange={selectWorld}
          onLensAChange={setCompareLensAId}
          onLensBChange={setActiveLensId}
          onAction={(paneLabel) =>
            setReceipt(
              `${active.name}: ${active.primaryActionLabel} staged in ${paneLabel} · prototype only`,
            )
          }
          onOpenRolodex={() => setRolodexOpen(true)}
        />
      ) : (
        <>
          {mode === "style" ? (
            <CombinedStageLabel>
              Live stage · <strong>{active.name}</strong> wearing{" "}
              <strong>{activeLens.name}</strong>
            </CombinedStageLabel>
          ) : null}
          <StageFrame>
            <ScopedLensFrame
              styleLensId={activeLens.id}
              aria-label={`${active.name} rendered in ${activeLens.name}`}
            >
              <Stage>
                <ActiveConcept
                  model={model}
                  conceptName={active.name}
                  primaryActionLabel={active.primaryActionLabel}
                  onAction={() =>
                    setReceipt(
                      `${active.name}: ${active.primaryActionLabel} staged · prototype only`,
                    )
                  }
                  onOpenRolodex={() => setRolodexOpen(true)}
                />
              </Stage>
            </ScopedLensFrame>
          </StageFrame>
        </>
      )}
      <WorkoutDesignRolodex
        isOpen={rolodexOpen}
        onClose={() => setRolodexOpen(false)}
        onSelect={(exercise) => {
          setModel((current) => addRolodexExercise(current, exercise));
          setReceipt(
            `${exercise.name} added from the shared Rolodex · prototype only`,
          );
        }}
      />
      <LabConfirmationChip confirmation={confirmation} />
      <LiveReceipt
        role="status"
        aria-label="Workout design action receipt"
        aria-live="polite"
      >
        {receipt}
      </LiveReceipt>
    </Lab>
  );
};

export default WorkoutDesignLabPage;
