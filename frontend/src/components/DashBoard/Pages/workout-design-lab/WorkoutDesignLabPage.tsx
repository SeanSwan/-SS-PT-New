/**
 * Workout Design Lab v4
 * 25 workout Worlds × 25 promoted Style Lenses with one shared, prototype-only session.
 */
import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Search } from "lucide-react";
import { useStyleLensAppearance } from "../../../../core/style-lens-os";
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
import WorkoutDesignStyleExplorer from "./WorkoutDesignStyleExplorer";
import WorkoutDesignComparePanel from "./WorkoutDesignComparePanel";
import {
  WORKOUT_DESIGN_STYLE_COUNT,
  WORKOUT_DESIGN_STYLE_LENSES,
} from "./workoutDesignStyleCatalog";
import { CombinedStageLabel } from "./WorkoutDesignLabModes.styles";
import {
  HeaderTop,
  Lab,
  LabHeader,
  LiveReceipt,
  Pick,
  Picker,
  SafetyCard,
  Stage,
  Toolbar,
} from "./WorkoutDesignLabShell.styles";
const WorkoutDesignLabPage: React.FC = () => {
  const { state, beginPreview, cancelPreview, commitPreview } =
    useStyleLensAppearance();
  const committedLens = WORKOUT_DESIGN_STYLE_LENSES.find(
    ({ id }) => id === state.committed.styleLensId,
  );
  const [mode, setMode] = useState<WorkoutDesignLabMode>("world");
  const [activeId, setActiveId] = useState(DEFAULT_CONCEPT_ID);
  const [activeLensId, setActiveLensId] = useState(
    committedLens?.id ?? WORKOUT_DESIGN_STYLE_LENSES[0].id,
  );
  const [query, setQuery] = useState("");
  const [receipt, setReceipt] = useState(
    "Choose a World or Style, then try its prototype action.",
  );
  const [model, setModel] = useState(DEFAULT_WORKOUT_VIEW_MODEL);
  const [rolodexOpen, setRolodexOpen] = useState(false);
  const activeIndex = CONCEPT_REGISTRY.findIndex(({ id }) => id === activeId);
  const active = CONCEPT_REGISTRY[activeIndex] ?? CONCEPT_REGISTRY[24];
  const activeLens =
    WORKOUT_DESIGN_STYLE_LENSES.find(({ id }) => id === activeLensId) ??
    WORKOUT_DESIGN_STYLE_LENSES[0];
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
    const lens = WORKOUT_DESIGN_STYLE_LENSES.find((item) => item.id === id);
    if (!lens) return;
    setActiveLensId(id);
    beginPreview({
      ...state.committed,
      styleLensId: id,
      updatedAt: new Date().toISOString(),
    });
    setReceipt(
      `${lens.name} staged for preview · Apply is required to save it.`,
    );
  };
  const applyLens = async () => {
    const applied = await commitPreview();
    setReceipt(
      applied
        ? `${activeLens.name} applied across the dashboard.`
        : `${activeLens.name} was not applied. Your previous appearance is preserved.`,
    );
  };
  const cancelLens = () => {
    cancelPreview();
    const fallback =
      WORKOUT_DESIGN_STYLE_LENSES.find(
        ({ id }) => id === state.committed.styleLensId,
      ) ?? WORKOUT_DESIGN_STYLE_LENSES[0];
    setActiveLensId(fallback.id);
    setReceipt(`Style preview canceled · ${fallback.name} remains active.`);
  };
  const changeMode = (nextMode: WorkoutDesignLabMode) => {
    setMode(nextMode);
    setReceipt(
      nextMode === "world"
        ? "World mode · compare complete workout environments."
        : nextMode === "style"
          ? "Style mode · preview structural systems before applying."
          : "Compare mode · one World plus one Style, bounded to two panels.",
    );
  };
  return (
    <Lab>
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
          <>
            <Toolbar>
              <label>
                <span className="sr-only">Filter workout worlds</span>
                <Search aria-hidden="true" size={18} />
                <input
                  type="search"
                  aria-label="Filter workout worlds"
                  placeholder="Search worlds or environments"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <div>
                <button
                  type="button"
                  aria-label="Previous workout world"
                  onClick={() => selectAt(activeIndex - 1)}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  aria-label="Next workout world"
                  onClick={() => selectAt(activeIndex + 1)}
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  type="button"
                  aria-label="Reset to recommended world"
                  onClick={() => {
                    setActiveId(DEFAULT_CONCEPT_ID);
                    setReceipt(
                      "Reset to Crystalline Swan World · recommended direction",
                    );
                  }}
                >
                  <RotateCcw size={17} /> Reset to recommended
                </button>
              </div>
            </Toolbar>
            <Picker role="listbox" aria-label="Choose a workout world">
              {filtered.map((concept) => (
                <Pick
                  key={concept.id}
                  type="button"
                  role="option"
                  aria-label={concept.name}
                  aria-selected={concept.id === activeId}
                  $active={concept.id === activeId}
                  onClick={() => selectWorld(concept.id)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowRight") {
                      event.preventDefault();
                      selectAt(activeIndex + 1);
                    }
                    if (event.key === "ArrowLeft") {
                      event.preventDefault();
                      selectAt(activeIndex - 1);
                    }
                    if (event.key === "Home") {
                      event.preventDefault();
                      selectAt(0);
                    }
                    if (event.key === "End") {
                      event.preventDefault();
                      selectAt(CONCEPT_REGISTRY.length - 1);
                    }
                  }}
                >
                  <span>
                    {concept.number} · {concept.environmentFamily}
                  </span>
                  {concept.name}
                  {concept.recommended ? <em>Recommended</em> : null}
                </Pick>
              ))}
            </Picker>
          </>
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

        {mode === "compare" ? (
          <WorkoutDesignComparePanel
            worlds={CONCEPT_REGISTRY}
            lenses={WORKOUT_DESIGN_STYLE_LENSES}
            world={active}
            lens={activeLens}
            model={model}
            onWorldChange={selectWorld}
            onLensChange={selectLens}
          />
        ) : null}
      </LabHeader>

      {mode !== "world" ? (
        <CombinedStageLabel>
          Combined live stage · <strong>{active.name}</strong> +{" "}
          <strong>{activeLens.name}</strong>
        </CombinedStageLabel>
      ) : null}
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
