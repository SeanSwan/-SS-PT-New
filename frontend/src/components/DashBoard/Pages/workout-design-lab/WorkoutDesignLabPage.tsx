/**
 * Workout Design Lab v3
 * Exactly 25 independently composed, prototype-only workout worlds.
 */
import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Search } from "lucide-react";
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
  const [activeId, setActiveId] = useState(DEFAULT_CONCEPT_ID);
  const [query, setQuery] = useState("");
  const [receipt, setReceipt] = useState(
    "Choose a world, then try its prototype action.",
  );
  const [model, setModel] = useState(DEFAULT_WORKOUT_VIEW_MODEL);
  const [rolodexOpen, setRolodexOpen] = useState(false);

  const activeIndex = CONCEPT_REGISTRY.findIndex(({ id }) => id === activeId);
  const active = CONCEPT_REGISTRY[activeIndex] ?? CONCEPT_REGISTRY[24];
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

  const selectAt = (index: number) => {
    const count = CONCEPT_REGISTRY.length;
    const concept = CONCEPT_REGISTRY[(index + count) % count];
    setActiveId(concept.id);
    setReceipt(`Viewing ${concept.name} · ${concept.interactionModel}`);
  };

  return (
    <Lab>
      <LabHeader>
        <HeaderTop>
          <div>
            <h1>
              {WORKOUT_DESIGN_CONCEPT_COUNT} workout worlds. One shared session.
            </h1>
            <p>
              Original Swan-native compositions for client, trainer, user, and
              admin workout workflows. Shared exercise truth:
              /api/exercises/library.
            </p>
          </div>
          <SafetyCard>
            <strong>Prototype only — no client data is written.</strong>
            <p>
              World {active.number} of {WORKOUT_DESIGN_CONCEPT_COUNT} ·{" "}
              {active.name} · {active.environmentFamily}
            </p>
          </SafetyCard>
        </HeaderTop>
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
              onClick={() =>
                selectAt(
                  CONCEPT_REGISTRY.findIndex(({ id }) => id === concept.id),
                )
              }
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
      </LabHeader>
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
