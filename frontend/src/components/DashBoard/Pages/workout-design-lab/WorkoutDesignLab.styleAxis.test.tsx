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

  it("dresses the live stage in the browsed lens instantly — before any Apply", () => {
    const { container } = render(<WorkoutDesignLabPage />);
    const stageFrame = () =>
      container.querySelector("[data-scoped-lens-frame]") as HTMLElement;

    expect(stageFrame().getAttribute("data-style-lens")).toBe("quiet-meridian");

    fireEvent.click(screen.getByRole("tab", { name: /^style$/i }));
    fireEvent.click(
      screen.getByRole("option", { name: /Candy Glass Arcade style lens/i }),
    );

    expect(stageFrame().getAttribute("data-style-lens")).toBe(
      "candy-glass-arcade",
    );
    expect(commitPreview).not.toHaveBeenCalled();
  });

  it("fires the confirmation chip only on the successful apply path", async () => {
    render(<WorkoutDesignLabPage />);
    fireEvent.click(screen.getByRole("tab", { name: /^style$/i }));
    fireEvent.click(
      screen.getByRole("option", { name: /Blueprint Fold style lens/i }),
    );

    const lane = screen.getByTestId("lab-confirmation-chip-lane");
    expect(lane.getAttribute("aria-live")).toBe("assertive");
    expect(lane.textContent).toBe("");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /apply blueprint fold/i }));
    });
    expect(lane.textContent).toMatch(/Blueprint Fold applied/);
  });

  it("a failed apply never fires the chip (nothing lies)", async () => {
    commitPreview.mockResolvedValueOnce(false);
    render(<WorkoutDesignLabPage />);
    fireEvent.click(screen.getByRole("tab", { name: /^style$/i }));
    fireEvent.click(
      screen.getByRole("option", { name: /Blueprint Fold style lens/i }),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /apply blueprint fold/i }));
    });
    expect(screen.getByTestId("lab-confirmation-chip-lane").textContent).toBe("");
  });

  it("the Lab root suppresses concept-level prototype notes via the page-level attr", () => {
    const { container } = render(<WorkoutDesignLabPage />);
    const root = container.querySelector("[data-lab-safety='page']");
    expect(root).not.toBeNull();
    expect(root!.tagName.toLowerCase()).toBe("main");
  });

  it("compare renders two REAL scoped stages with independent lenses", () => {
    render(<WorkoutDesignLabPage />);
    fireEvent.click(screen.getByRole("tab", { name: /^compare$/i }));

    fireEvent.change(screen.getByRole("combobox", { name: /compare style lens b/i }), {
      target: { value: "blueprint-fold" },
    });

    const comparison = screen.getByRole("region", {
      name: /world and style comparison/i,
    });
    const panes = within(comparison).getAllByTestId("comparison-panel");
    expect(panes).toHaveLength(2);

    const frames = panes.map((pane) =>
      pane.querySelector("[data-scoped-lens-frame]") as HTMLElement,
    );
    expect(frames[0]).not.toBeNull();
    expect(frames[1]).not.toBeNull();
    expect(frames[0].getAttribute("data-style-lens")).toBe("quiet-meridian");
    expect(frames[1].getAttribute("data-style-lens")).toBe("blueprint-fold");

    for (const frame of frames) {
      const scrollRoot = frame.querySelector("[data-dashboard-scroll-root]");
      expect(scrollRoot).not.toBeNull();
      expect(scrollRoot!.childElementCount).toBeGreaterThan(0);
    }
  });
});
