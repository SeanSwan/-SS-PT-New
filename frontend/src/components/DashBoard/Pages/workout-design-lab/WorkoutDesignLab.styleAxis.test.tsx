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
const mockAppearance = vi.hoisted(() => ({ committedId: "quiet-meridian" }));

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
          styleLensId: mockAppearance.committedId,
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
    mockAppearance.committedId = "quiet-meridian";
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

  it("every catalog lens carries the verbatim §4.2 moodFamily", async () => {
    const { SWAN_STYLE_LENS_VISUALS } = await import(
      "../../../../adapters/style-lens-swan"
    );
    const FAMILY_TABLE: Record<string, readonly string[]> = {
      playful: [
        "candy-glass-arcade", "kinetic-kanban", "signal-garden", "tempo-forge",
        "orbit-atlas", "modular-harbor", "kintsugi-circuit",
      ],
      calm: ["quiet-meridian", "recovery-cloister", "monastic-grid", "lunar-stack"],
      technical: [
        "prism-terminal", "blueprint-fold", "analog-flight-recorder",
        "chronograph-board", "terrain-console", "coach-ledger",
      ],
      luxe: ["crystalline-cathedral", "carbon-atelier", "meridian-magazine", "glass-rail"],
      atmospheric: ["aurora-index", "tidal-columns", "split-horizon", "cedar-workshop"],
    };
    const allIds = Object.values(FAMILY_TABLE).flat();
    expect(allIds).toHaveLength(25);
    for (const [family, ids] of Object.entries(FAMILY_TABLE)) {
      for (const id of ids) {
        expect(SWAN_STYLE_LENS_VISUALS[id]?.moodFamily, id).toBe(family);
      }
    }
    // The display-order export mirrors the same table verbatim.
    const catalog = await import("./workoutDesignStyleCatalog");
    expect(catalog.WORKOUT_DESIGN_MOOD_FAMILY_ORDER).toEqual([
      "playful", "calm", "technical", "luxe", "atmospheric",
    ]);
    expect(catalog.WORKOUT_DESIGN_STYLE_ROW_ORDER).toEqual(FAMILY_TABLE);
  });

  it("groups the catalog by mood family in table order, chips in row order", () => {
    render(<WorkoutDesignLabPage />);
    fireEvent.click(screen.getByRole("tab", { name: /^style$/i }));
    const listbox = screen.getByRole("listbox", { name: /choose a style lens/i });
    const groups = within(listbox).getAllByRole("group");
    expect(groups.map((g) => g.getAttribute("aria-label"))).toEqual([
      "Current", "PLAYFUL", "CALM", "TECHNICAL", "LUXE", "ATMOSPHERIC",
    ]);
    const playful = groups[1];
    const names = within(playful)
      .getAllByRole("option")
      .map((o) => o.getAttribute("aria-label"));
    expect(names).toEqual([
      "Candy Glass Arcade style lens", "Kinetic Kanban style lens",
      "Signal Garden style lens", "Tempo Forge style lens",
      "Orbit Atlas style lens", "Modular Harbor style lens",
      "Kintsugi Circuit style lens",
    ]);
  });

  it("pins the committed catalog lens first WITHOUT selection state; family instance keeps it", () => {
    render(<WorkoutDesignLabPage />);
    fireEvent.click(screen.getByRole("tab", { name: /^style$/i }));
    const pinned = screen.getByRole("option", { name: "Current style: Quiet Meridian" });
    expect(pinned.getAttribute("aria-selected")).not.toBe("true");
    // 25 family options exactly — the pinned duplicate never matches /style lens/i.
    expect(screen.getAllByRole("option", { name: /style lens/i })).toHaveLength(25);
    // Activating the pinned instance behaves like the family instance.
    fireEvent.click(pinned);
    expect(beginPreview).toHaveBeenCalledWith(
      expect.objectContaining({ styleLensId: "quiet-meridian" }),
    );
  });

  it("pins NOTHING for a non-catalog committed lens and renders the neutral line", () => {
    mockAppearance.committedId = "swan-flagship";
    render(<WorkoutDesignLabPage />);
    fireEvent.click(screen.getByRole("tab", { name: /^style$/i }));
    expect(screen.queryByRole("option", { name: /^Current style:/ })).toBeNull();
    expect(screen.queryByRole("group", { name: "Current" })).toBeNull();
    expect(screen.getByText("Current: Swan Flagship (system)")).toBeTruthy();
  });

  it("an active search REPLACES groups with a flat list; clearing restores groups and the pin", () => {
    render(<WorkoutDesignLabPage />);
    fireEvent.click(screen.getByRole("tab", { name: /^style$/i }));
    const input = screen.getByRole("searchbox", { name: /filter style lenses/i });
    fireEvent.change(input, { target: { value: "prism" } });
    expect(screen.queryAllByRole("group")).toHaveLength(0);
    expect(screen.queryByRole("option", { name: /^Current style:/ })).toBeNull();
    expect(screen.getAllByRole("option", { name: /style lens/i })).toHaveLength(1);
    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getAllByRole("group").length).toBeGreaterThanOrEqual(6);
    expect(screen.getByRole("option", { name: "Current style: Quiet Meridian" })).toBeTruthy();
  });

  it("catalog a11y + layout source contract: hidden headers, sticky families, safe-area padding, receipt-driven grouping", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const explorer = readFileSync(
      resolve(__dirname, "./WorkoutDesignStyleExplorer.tsx"),
      "utf8",
    );
    expect(explorer).toContain("moodFamily");
    expect(explorer).toMatch(/aria-hidden="true"[\s\S]{0,120}family/i);
    expect(explorer).toMatch(/position:\s*sticky/);
    expect(explorer).toContain("env(safe-area-inset-bottom, 16px)");
    // The lens->family mapping is data (visuals receipt), never component-local.
    expect(explorer).not.toMatch(/'playful'\s*:/);
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
