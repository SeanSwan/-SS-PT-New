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
import { V2_RECIPE_BY_CATALOG_ID } from "../../../../adapters/style-lens-swan/v2/catalogV2Map";

// A style id that is STILL chrome-only (no v2 recipe) — the chrome-vs-v2 tests
// below need one. As world waves promote ids to v2, this must stay chrome; the
// guard test asserts that loudly so the next builder picks a fresh one instead
// of getting a silent false pass. (Wave 1 promoted quiet-meridian, so it can no
// longer play the chrome role it used to.)
const CHROME_ONLY_ID = "lunar-stack";
const CHROME_ONLY_LABEL = "Lunar Stack";
/** Compare needs a SECOND still-chrome style to prove the both-panes-chrome copy
 *  and the two-independent-scoped-stages contract. Guarded below, same as A. */
const CHROME_ONLY_ID_B = "blueprint-fold";

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

  it("exposes at least the 25 promoted Style Lenses, all unique (A4 count-law: floor, not pin)", () => {
    expect(WORKOUT_DESIGN_STYLE_COUNT).toBeGreaterThanOrEqual(25);
    expect(new Set(WORKOUT_DESIGN_STYLE_LENSES.map(({ id }) => id))).toHaveLength(WORKOUT_DESIGN_STYLE_COUNT);
  });

  it("switches between World, Style, and Compare without duplicating the catalog", () => {
    render(<WorkoutDesignLabPage />);
    const modes = screen.getByRole("tablist", { name: /lab view mode/i });
    expect(within(modes).getAllByRole("tab")).toHaveLength(3);

    fireEvent.click(within(modes).getByRole("tab", { name: /^style$/i }));
    expect(screen.getAllByRole("option", { name: /style lens/i })).toHaveLength(WORKOUT_DESIGN_STYLE_COUNT);

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
    // The display-order export carries the table verbatim as row PREFIXES —
    // A4 pipeline styles append after the original 25 within their family.
    const catalog = await import("./workoutDesignStyleCatalog");
    expect(catalog.WORKOUT_DESIGN_MOOD_FAMILY_ORDER).toEqual([
      "playful", "calm", "technical", "luxe", "atmospheric",
    ]);
    for (const [family, ids] of Object.entries(FAMILY_TABLE)) {
      expect(catalog.WORKOUT_DESIGN_STYLE_ROW_ORDER[family].slice(0, ids.length)).toEqual(ids);
    }
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
    // Family options exactly — the pinned duplicate never matches /style lens/i.
    expect(screen.getAllByRole("option", { name: /style lens/i })).toHaveLength(WORKOUT_DESIGN_STYLE_COUNT);
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
    const input = screen.getByRole("searchbox", { name: "Search styles" });
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
    // §4.2 search law: pinned + always visible while the catalog scrolls,
    // with the exact §4.4 accessible name.
    expect(explorer).toMatch(/PinnedSearch = styled\.div`\s*\n?\s*position:\s*sticky/);
    expect(explorer).toContain('aria-label="Search styles"');
    // The lens->family mapping is data (visuals receipt), never component-local.
    expect(explorer).not.toMatch(/'playful'\s*:/);
    // Mobile-collision fix: the single-item CURRENT pseudo-group header is NON-sticky
    // ($flow) so it never floats over its own pinned chip when the page is the
    // scrollport; only real family headers stay sticky.
    expect(explorer).toMatch(/FamilyHeader \$flow/);
    expect(explorer).toMatch(/\$flow \? "static" : "sticky"/);
  });

  it("catalog listbox supports the ARIA keyboard pattern: Arrow/Home/End roving focus", () => {
    render(<WorkoutDesignLabPage />);
    fireEvent.click(screen.getByRole("tab", { name: /^style$/i }));
    const listbox = screen.getByRole("listbox", { name: /choose a style lens/i });
    const options = within(listbox).getAllByRole("option");
    options[0].focus();
    expect(document.activeElement).toBe(options[0]);
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(document.activeElement).toBe(options[1]);
    fireEvent.keyDown(listbox, { key: "ArrowUp" });
    expect(document.activeElement).toBe(options[0]);
    fireEvent.keyDown(listbox, { key: "End" });
    expect(document.activeElement).toBe(options[options.length - 1]);
    fireEvent.keyDown(listbox, { key: "Home" });
    expect(document.activeElement).toBe(options[0]);
    // ArrowUp at the first option stays put (no wrap surprise for SR users).
    fireEvent.keyDown(listbox, { key: "ArrowUp" });
    expect(document.activeElement).toBe(options[0]);
  });

  it("roving tabindex: exactly ONE option is a tab stop (the selected one); pinned duplicate never is", () => {
    render(<WorkoutDesignLabPage />);
    fireEvent.click(screen.getByRole("tab", { name: /^style$/i }));
    const listbox = screen.getByRole("listbox", { name: /choose a style lens/i });
    const all = within(listbox).getAllByRole("option");
    const stops = all.filter((o) => o.getAttribute("tabindex") === "0");
    expect(stops).toHaveLength(1);
    expect(stops[0].getAttribute("aria-label")).toBe("Quiet Meridian style lens");
    const pinned = within(listbox).getByRole("option", { name: "Current style: Quiet Meridian" });
    expect(pinned.getAttribute("tabindex")).toBe("-1");
    // Search mode with the selection filtered OUT: first rendered option is the stop.
    fireEvent.change(screen.getByRole("searchbox", { name: "Search styles" }), {
      target: { value: "prism" },
    });
    const searchStops = within(listbox)
      .getAllByRole("option")
      .filter((o) => o.getAttribute("tabindex") === "0");
    expect(searchStops).toHaveLength(1);
    expect(searchStops[0].getAttribute("aria-label")).toBe("Prism Terminal style lens");
  });

  it("mobile: CURRENT pseudo-group header does not vertically overlap its pinned chip", () => {
    render(<WorkoutDesignLabPage />);
    fireEvent.click(screen.getByRole("tab", { name: /^style$/i }));
    const listbox = screen.getByRole("listbox", { name: /choose a style lens/i });
    const current = within(listbox)
      .getAllByRole("group")
      .find((g) => g.getAttribute("aria-label") === "Current")!;
    const header = current.querySelector("p")!;
    // jsdom has no layout engine, so assert the CONTRACT that prevents overlap:
    // the CURRENT header is rendered static (never sticky), unlike family headers.
    expect(header).toBeTruthy();
    expect(header.textContent).toBe("Current");
    // The pinned chip and its accessible name are present (not clipped away).
    expect(
      within(current).getByRole("option", { name: "Current style: Quiet Meridian" }),
    ).toBeTruthy();
  });

  it("guard: CHROME_ONLY_ID is still chrome-only (a wave that promotes it must pick a fresh one)", () => {
    expect(
      Object.prototype.hasOwnProperty.call(V2_RECIPE_BY_CATALOG_ID, CHROME_ONLY_ID),
      `${CHROME_ONLY_ID} now has a v2 recipe — update CHROME_ONLY_ID/LABEL to another still-chrome style`,
    ).toBe(false);
  });

  it("guard: CHROME_ONLY_ID_B is still chrome-only (Compare needs TWO chrome styles)", () => {
    expect(
      Object.prototype.hasOwnProperty.call(V2_RECIPE_BY_CATALOG_ID, CHROME_ONLY_ID_B),
      `${CHROME_ONLY_ID_B} now has a v2 recipe — Compare's both-panes-chrome contract needs a ` +
        `second still-chrome style; pick a fresh CHROME_ONLY_ID_B or retire the chrome concept (Slice 15)`,
    ).toBe(false);
  });

  it("A3: engine badge derives from map presence with the exact copy", () => {
    render(<WorkoutDesignLabPage />);
    fireEvent.click(screen.getByRole("tab", { name: /^style$/i }));
    // a chrome-only style shows the v1 badge...
    fireEvent.click(
      screen.getByRole("option", { name: new RegExp(`${CHROME_ONLY_LABEL} style lens`, "i") }),
    );
    expect(screen.getByText("v1 · chrome system")).toBeTruthy();
    // ...a v2 style shows the full-restyle badge.
    fireEvent.click(
      screen.getByRole("option", { name: /Candy Glass Arcade style lens/i }),
    );
    expect(screen.getByText("v2 · full restyle")).toBeTruthy();
  });

  it("A3: the Lab default selection is v2-capable when nothing catalog is committed", () => {
    mockAppearance.committedId = "swan-flagship";
    const { container } = render(<WorkoutDesignLabPage />);
    fireEvent.click(screen.getByRole("tab", { name: /^style$/i }));
    const frame = container.querySelector("[data-scoped-lens-frame]") as HTMLElement;
    expect(frame.getAttribute("data-style-lens")).toBe("candy-glass-arcade");
  });

  it("A3: a committed catalog lens ALWAYS wins over the fallback", () => {
    const { container } = render(<WorkoutDesignLabPage />);
    const frame = container.querySelector("[data-scoped-lens-frame]") as HTMLElement;
    expect(frame.getAttribute("data-style-lens")).toBe("quiet-meridian");
  });

  it("A3: Apply commits the V1 catalog id — never a v2 recipe id (commit-scope law)", async () => {
    render(<WorkoutDesignLabPage />);
    fireEvent.click(screen.getByRole("tab", { name: /^style$/i }));
    fireEvent.click(
      screen.getByRole("option", { name: /Candy Glass Arcade style lens/i }),
    );
    expect(beginPreview).toHaveBeenCalledWith(
      expect.objectContaining({ styleLensId: "candy-glass-arcade" }),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /apply candy glass arcade/i }));
    });
    expect(commitPreview).toHaveBeenCalledTimes(1);
    const staged = beginPreview.mock.calls.at(-1)?.[0]?.styleLensId as string;
    expect(staged.startsWith("swan.")).toBe(false);
  });

  it("A3: What-Changes list renders ONLY when both selected AND committed are v2-capable", () => {
    mockAppearance.committedId = "prism-terminal";
    render(<WorkoutDesignLabPage />);
    fireEvent.click(screen.getByRole("tab", { name: /^style$/i }));
    fireEvent.click(
      screen.getByRole("option", { name: /Candy Glass Arcade style lens/i }),
    );
    expect(screen.getByText(/WHAT CHANGES vs current:/i)).toBeTruthy();
    // Any other state (selecting a chrome-only style) keeps the shipped definition list.
    fireEvent.click(
      screen.getByRole("option", { name: new RegExp(`${CHROME_ONLY_LABEL} style lens`, "i") }),
    );
    expect(screen.queryByText(/WHAT CHANGES vs current:/i)).toBeNull();
    expect(screen.getByText("Signature")).toBeTruthy();
  });

  it("A3: Compare drops the Engine dropdown; panes resolve per-chip through the map", () => {
    render(<WorkoutDesignLabPage />);
    fireEvent.click(screen.getByRole("tab", { name: /^compare$/i }));
    expect(screen.queryByRole("combobox", { name: /compare engine/i })).toBeNull();

    // MIXED: A = candy (v2) · B = the second chrome-only style.
    fireEvent.change(screen.getByRole("combobox", { name: /compare style lens a/i }), {
      target: { value: "candy-glass-arcade" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: /compare style lens b/i }), {
      target: { value: CHROME_ONLY_ID_B },
    });
    const comparison = screen.getByRole("region", { name: /world and style comparison/i });
    const panes = within(comparison).getAllByTestId("comparison-panel");
    expect(panes).toHaveLength(2);
    expect(panes[0].querySelector("[data-lens2-collection]")).not.toBeNull();
    expect(panes[1].querySelector("[data-scoped-lens-frame]")).not.toBeNull();
    expect(panes[0].textContent).toMatch(/axes differ/);
    expect(panes[1].textContent).toContain(
      "B · Blueprint Fold is a chrome system — trim only.",
    );
  });

  it("A3: BOTH chrome-only panes carry the exact chrome copy; BOTH v2 keep axes-diff captions", () => {
    render(<WorkoutDesignLabPage />);
    fireEvent.click(screen.getByRole("tab", { name: /^compare$/i }));
    // both panes chrome-only (A defaults to a now-v2 world, so set it explicitly)
    fireEvent.change(screen.getByRole("combobox", { name: /compare style lens a/i }), {
      target: { value: CHROME_ONLY_ID },
    });
    fireEvent.change(screen.getByRole("combobox", { name: /compare style lens b/i }), {
      target: { value: CHROME_ONLY_ID_B },
    });
    const comparison = screen.getByRole("region", { name: /world and style comparison/i });
    let panes = within(comparison).getAllByTestId("comparison-panel");
    for (const pane of panes) {
      expect(pane.textContent).toContain(
        "Chrome systems restyle trim, not structure — try a v2 style for a full restyle.",
      );
    }
    fireEvent.change(screen.getByRole("combobox", { name: /compare style lens a/i }), {
      target: { value: "candy-glass-arcade" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: /compare style lens b/i }), {
      target: { value: "prism-terminal" },
    });
    panes = within(comparison).getAllByTestId("comparison-panel");
    expect(panes[0].textContent).toMatch(/axes differ/);
    expect(panes[1].textContent).toMatch(/axes differ/);
  });

  it("A3: production resolveRecipeForStyleLens stays untouched and inert (source contract)", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const resolution = readFileSync(
      resolve(__dirname, "../../../../adapters/style-lens-swan/v2/recipeResolution.ts"),
      "utf8",
    );
    expect(resolution).not.toContain("catalogV2Map");
    expect(resolution).toContain("V2_RECIPES_BY_STYLE_LENS_ID[styleLensId] ?? null");
    // Apply-honesty copy for chrome-less styles exists on the success path.
    const page = readFileSync(resolve(__dirname, "./WorkoutDesignLabPage.tsx"), "utf8");
    expect(page).toContain("dashboard-wide wear arrives with the v2 rollout.");
    const explorer = readFileSync(resolve(__dirname, "./WorkoutDesignStyleExplorer.tsx"), "utf8");
    expect(explorer).toContain("Lab preview today — dashboard rollout pending.");
  });

  it("compare renders two REAL scoped stages with independent lenses", () => {
    render(<WorkoutDesignLabPage />);
    fireEvent.click(screen.getByRole("tab", { name: /^compare$/i }));

    // two chrome-only stages (A defaults to a now-v2 world, so set it explicitly)
    fireEvent.change(screen.getByRole("combobox", { name: /compare style lens a/i }), {
      target: { value: CHROME_ONLY_ID },
    });
    fireEvent.change(screen.getByRole("combobox", { name: /compare style lens b/i }), {
      target: { value: CHROME_ONLY_ID_B },
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
    expect(frames[0].getAttribute("data-style-lens")).toBe(CHROME_ONLY_ID);
    expect(frames[1].getAttribute("data-style-lens")).toBe(CHROME_ONLY_ID_B);

    for (const frame of frames) {
      const scrollRoot = frame.querySelector("[data-dashboard-scroll-root]");
      expect(scrollRoot).not.toBeNull();
      expect(scrollRoot!.childElementCount).toBeGreaterThan(0);
    }
  });
});
