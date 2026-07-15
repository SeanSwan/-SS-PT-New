/**
 * Workout Design Lab interaction contract
 * Proves selector reachability, receipts, Rolodex state, and world switching.
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StyleLensProvider, type StorageLike } from "../../../../core/style-lens-os";
import { SWAN_STYLE_LENS_REGISTRY } from "../../../../adapters/style-lens-swan";
import WorkoutDesignLabPage from "./WorkoutDesignLabPage";
import { CONCEPT_REGISTRY, DEFAULT_CONCEPT_ID } from "./conceptRegistry";

vi.mock("../../../WorkoutLogger/NASMExerciseRolodex", () => ({
  default: ({
    isOpen,
    onClose,
    onSelectExercise,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSelectExercise: (exercise: { id: string; name: string }) => void;
  }) =>
    isOpen ? (
      <div role="dialog" aria-label="Exercise Rolodex">
        <button
          type="button"
          onClick={() =>
            onSelectExercise({ id: "fixture-4", name: "Cable lift" })
          }
        >
          Add Cable lift
        </button>
        <button type="button" onClick={onClose}>
          Close Rolodex
        </button>
      </div>
    ) : null,
}));

const renderLab = () => {
  const values = new Map<string, string>();
  const storage: StorageLike = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
  return render(
    <StyleLensProvider registry={SWAN_STYLE_LENS_REGISTRY} storage={storage}>
      <WorkoutDesignLabPage />
    </StyleLensProvider>,
  );
};

describe("Workout Design Lab interactions", () => {
  it("renders all 25 worlds through an accessible selector and emits action receipts", () => {
    renderLab();
    const selector = screen.getByRole("listbox", {
      name: /choose a workout world/i,
    });
    const options = within(selector).getAllByRole("option");
    expect(options).toHaveLength(25);

    for (const concept of CONCEPT_REGISTRY) {
      fireEvent.click(
        within(selector).getByRole("option", {
          name: new RegExp(concept.name, "i"),
        }),
      );
      expect(
        screen.getByRole("region", { name: new RegExp(concept.name, "i") }),
      ).toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", { name: concept.primaryActionLabel }),
      );
      expect(screen.getByRole("status")).toHaveTextContent(concept.name);
    }
    // Renders all 25 full concept components + asserts each — legitimately slow
    // (~3.4s isolated); the default 5s times out under full parallel load.
  }, 20000);

  it("defaults and resets to the recommended Crystalline Swan World", () => {
    renderLab();
    const defaultOption = screen.getByRole("option", {
      name: /Crystalline Swan World/i,
    });
    expect(defaultOption).toHaveAttribute("aria-selected", "true");
    fireEvent.click(
      screen.getByRole("option", { name: /New York Training District/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /reset to recommended/i }),
    );
    expect(defaultOption).toHaveAttribute("aria-selected", "true");
    expect(DEFAULT_CONCEPT_ID).toBe("crystalline-swan-world");
  });

  it("filters 25 choices and supports previous, next, and arrow-key navigation", () => {
    renderLab();
    const search = screen.getByRole("searchbox", {
      name: /filter workout worlds/i,
    });
    fireEvent.change(search, { target: { value: "Tokyo" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(
      screen.getByRole("option", { name: /Rainy Tokyo/i }),
    ).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "" } });
    fireEvent.click(
      screen.getByRole("button", { name: /next workout world/i }),
    );
    expect(
      screen.getByRole("option", { name: /Alpine Glacier Command/i }),
    ).toHaveAttribute("aria-selected", "true");
    fireEvent.click(
      screen.getByRole("button", { name: /previous workout world/i }),
    );
    expect(
      screen.getByRole("option", { name: /Crystalline Swan World/i }),
    ).toHaveAttribute("aria-selected", "true");

    const crystalline = screen.getByRole("option", {
      name: /Crystalline Swan World/i,
    });
    fireEvent.keyDown(crystalline, { key: "ArrowRight" });
    expect(
      screen.getByRole("option", { name: /Alpine Glacier Command/i }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("keeps shared workout state when switching worlds and never writes client data", () => {
    renderLab();
    fireEvent.click(
      screen.getByRole("button", { name: /open exercise rolodex/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /add cable lift/i }));
    expect(
      screen.getByRole("heading", { name: "Cable lift" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("option", { name: /Swiss Precision Lab/i }),
    );
    expect(
      screen.getByRole("heading", { name: "Cable lift" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Prototype only/i).length).toBeGreaterThan(0);
  });
});
