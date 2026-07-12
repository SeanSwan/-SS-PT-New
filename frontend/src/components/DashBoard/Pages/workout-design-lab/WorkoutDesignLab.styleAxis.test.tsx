/**
 * Workout Design Lab 25+25 contract
 * Locks the independent World and Style axes plus bounded comparison behavior.
 */
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WorkoutDesignLabPage from "./WorkoutDesignLabPage";
import {
  WORKOUT_DESIGN_STYLE_COUNT,
  WORKOUT_DESIGN_STYLE_LENSES,
} from "./workoutDesignStyleCatalog";

const beginPreview = vi.fn();
const cancelPreview = vi.fn();
const commitPreview = vi.fn(async () => true);

vi.mock("../../../../core/style-lens-os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../core/style-lens-os")>();
  return {
    ...actual,
    useStyleLensAppearance: () => ({
      state: {
        phase: "idle",
        committed: {
          profileSchemaVersion: 1,
          paletteThemeId: "crystalline-dark",
          styleLensId: "quiet-meridian",
          motionMode: "auto",
          density: "comfortable",
          updatedAt: "2026-07-11T00:00:00.000Z",
        },
        preview: null,
        rollbackProfile: null,
        error: null,
      },
      registry: { available: vi.fn(), get: vi.fn(), resolve: vi.fn(), issues: vi.fn() },
      persistenceSuppressed: false,
      beginPreview,
      cancelPreview,
      commitPreview,
      setPersistenceSuppressed: vi.fn(),
    }),
  };
});

vi.mock("../../../WorkoutLogger/NASMExerciseRolodex", () => ({
  default: () => null,
}));

describe("Workout Design Lab Style axis", () => {
  beforeEach(() => {
    beginPreview.mockClear();
    cancelPreview.mockClear();
    commitPreview.mockClear();
  });

  it("exposes exactly 25 promoted, unique Style Lenses", () => {
    expect(WORKOUT_DESIGN_STYLE_COUNT).toBe(25);
    expect(WORKOUT_DESIGN_STYLE_LENSES).toHaveLength(25);
    expect(new Set(WORKOUT_DESIGN_STYLE_LENSES.map(({ id }) => id))).toHaveLength(25);
  });

  it("switches between World, Style, and Compare without duplicating the catalog", () => {
    render(<WorkoutDesignLabPage />);
    const modes = screen.getByRole("tablist", { name: /lab view mode/i });
    expect(within(modes).getAllByRole("tab")).toHaveLength(3);

    fireEvent.click(within(modes).getByRole("tab", { name: /^style$/i }));
    expect(screen.getAllByRole("option", { name: /style lens/i })).toHaveLength(25);

    fireEvent.click(within(modes).getByRole("tab", { name: /^compare$/i }));
    const comparison = screen.getByRole("region", { name: /world and style comparison/i });
    expect(within(comparison).getAllByTestId("comparison-panel")).toHaveLength(2);
  });

  it("stages and applies a Style Lens only through explicit controls", async () => {
    render(<WorkoutDesignLabPage />);
    fireEvent.click(screen.getByRole("tab", { name: /^style$/i }));
    fireEvent.click(screen.getByRole("option", { name: /Blueprint Fold style lens/i }));

    expect(beginPreview).toHaveBeenCalledWith(
      expect.objectContaining({ styleLensId: "blueprint-fold" }),
    );
    expect(commitPreview).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /apply blueprint fold/i }));
    });
    expect(commitPreview).toHaveBeenCalledTimes(1);
  });
});
