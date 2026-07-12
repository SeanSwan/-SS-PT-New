/**
 * ============================================================================
 * WORKOUT DESIGN LAB — WORLD EXPLORER (extracted from the Lab page)
 * ============================================================================
 * BLUEPRINT: World-mode toolbar + 25-world picker. Pure presentational —
 * selection/navigation state lives in the Lab page; this component only
 * renders the search field, prev/next/reset controls (44px+), and the
 * roving listbox with arrow/Home/End keyboard support.
 * ============================================================================
 */
import React from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Search } from "lucide-react";
import type { ConceptRegistryItem } from "./conceptRegistry";
import { Pick, Picker, Toolbar } from "./WorkoutDesignLabShell.styles";

interface WorkoutDesignWorldExplorerProps {
  concepts: readonly ConceptRegistryItem[];
  filtered: readonly ConceptRegistryItem[];
  activeId: string;
  activeIndex: number;
  query: string;
  onQueryChange: (query: string) => void;
  onSelectAt: (index: number) => void;
  onSelectWorld: (id: string) => void;
  onReset: () => void;
}

const WorkoutDesignWorldExplorer: React.FC<WorkoutDesignWorldExplorerProps> = ({
  concepts,
  filtered,
  activeId,
  activeIndex,
  query,
  onQueryChange,
  onSelectAt,
  onSelectWorld,
  onReset,
}) => (
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
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      <div>
        <button
          type="button"
          aria-label="Previous workout world"
          onClick={() => onSelectAt(activeIndex - 1)}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          aria-label="Next workout world"
          onClick={() => onSelectAt(activeIndex + 1)}
        >
          <ChevronRight size={18} />
        </button>
        <button type="button" aria-label="Reset to recommended world" onClick={onReset}>
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
          onClick={() => onSelectWorld(concept.id)}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              onSelectAt(activeIndex + 1);
            }
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              onSelectAt(activeIndex - 1);
            }
            if (event.key === "Home") {
              event.preventDefault();
              onSelectAt(0);
            }
            if (event.key === "End") {
              event.preventDefault();
              onSelectAt(concepts.length - 1);
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
);

export default WorkoutDesignWorldExplorer;
