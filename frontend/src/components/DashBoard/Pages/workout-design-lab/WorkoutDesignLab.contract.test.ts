/**
 * Workout Design Lab 25-view contract
 * Locks registry completeness, route copy, prototype safety, and composition ownership.
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONCEPT_REGISTRY,
  DEFAULT_CONCEPT_ID,
  WORKOUT_DESIGN_CONCEPT_COUNT,
} from "./conceptRegistry";

const read = (name: string) => readFileSync(resolve(__dirname, name), "utf8");

const EXPECTED_NAMES = [
  "Alpine Glacier Command",
  "Evergreen Rainforest Training",
  "Underground Ocean City",
  "South Pole Expedition",
  "Southern California Coast",
  "New York Training District",
  "Canada Boreal Performance",
  "James Webb Nebula Observatory",
  "Solar System Mission Control",
  "Comet Velocity Lab",
  "Gas Cloud Strength Studio",
  "Aurora Borealis Recovery",
  "Volcanic Core Training",
  "Desert Observatory",
  "Redwood Titan Studio",
  "Tropical Storm Performance Deck",
  "Coral Reef Movement Lab",
  "Moonbase Coach Console",
  "Rainy Tokyo Training Night",
  "London Athletic Archive",
  "Mediterranean Training Villa",
  "Swiss Precision Lab",
  "Caribbean Sunrise Energy",
  "Deep-Ocean Trench Observatory",
  "Crystalline Swan World",
];

describe("Workout Design Lab 25-view contract", () => {
  it("registers exactly 25 unique, complete, independently composed worlds", () => {
    expect(WORKOUT_DESIGN_CONCEPT_COUNT).toBe(25);
    expect(CONCEPT_REGISTRY).toHaveLength(25);
    expect(CONCEPT_REGISTRY.map(({ name }) => name)).toEqual(EXPECTED_NAMES);
    expect(new Set(CONCEPT_REGISTRY.map(({ id }) => id))).toHaveLength(25);
    expect(new Set(CONCEPT_REGISTRY.map(({ name }) => name))).toHaveLength(25);

    for (const concept of CONCEPT_REGISTRY) {
      expect(concept.component).toBeTypeOf("function");
      expect(concept.environmentFamily).toBeTruthy();
      expect(concept.interactionModel).toBeTruthy();
      expect(concept.backgroundStrategy).toBeTruthy();
      expect(concept.typographyDirection).toBeTruthy();
      expect(concept.paletteTokens.length).toBeGreaterThanOrEqual(4);
      expect(concept.primaryActionLabel).toBeTruthy();
      expect(concept.writeCapability).toBe("prototype-only");
      expect(["static", "reduced"]).toContain(concept.reducedMotion);
    }

    expect(DEFAULT_CONCEPT_ID).toBe("crystalline-swan-world");
  });

  it("owns one composition module per world and does not reintroduce legacy concepts", () => {
    const conceptFiles = readdirSync(resolve(__dirname, "concepts")).filter(
      (name) => name.endsWith(".tsx") && !name.startsWith("concept"),
    );
    expect(conceptFiles).toHaveLength(25);

    const compositionSources = conceptFiles.map((name) =>
      read(`./concepts/${name}`),
    );
    const desktopGeometries = compositionSources.map(
      (source) => source.match(/grid-template-areas:([^;]+)/)?.[1],
    );
    const compositionModels = compositionSources.map(
      (source) => source.match(/data-composition="([^"]+)"/)?.[1],
    );
    expect(desktopGeometries.every(Boolean)).toBe(true);
    expect(compositionModels.every(Boolean)).toBe(true);
    expect(new Set(desktopGeometries)).toHaveLength(25);
    expect(new Set(compositionModels)).toHaveLength(25);
    for (const source of compositionSources) {
      expect(source).toContain("--world-title-font");
      expect(source).toContain("--world-dial-radius");
      expect(source).toContain("--world-row-columns");
    }

    const registry = read("./conceptRegistry.ts");
    for (const legacy of [
      "Alpine Precision",
      "Velocity Poster",
      "After Dark Stories",
      "Command Terminal",
      "Atelier Editorial",
      "Console Mission",
      "Spatial Studio",
      "Pit Wall",
      "Bento Motion",
      "Field Manual",
    ]) {
      expect(registry).not.toContain(legacy);
    }
  });

  it("keeps route descriptions and selector count synchronized at 25", () => {
    const routes = read("../../UniversalDashboardLayout.routes.tsx");
    const tabs = read("../../../../config/dashboard-tabs.ts");
    const page = read("./WorkoutDesignLabPage.tsx");

    expect(routes).toContain("25 workout Worlds plus the full Style Lens catalog");
    // Style count is a growing catalog (26+); nav copy stays count-proof.
    expect(tabs).toContain("Explore 25 workout Worlds and the full Style Lens catalog");
    expect(page).toContain("{WORKOUT_DESIGN_CONCEPT_COUNT} Worlds");
    expect(page).toContain("{WORKOUT_DESIGN_STYLE_COUNT} Styles");
    expect(page).toContain("WORKOUT_DESIGN_CONCEPT_COUNT");
  });

  it("uses the canonical read-only Rolodex contract without adding write paths", () => {
    const page = read("./WorkoutDesignLabPage.tsx");
    const rolodex = read("./WorkoutDesignRolodex.tsx");
    const searchHook = read("../../../WorkoutLogger/useExerciseSearch.ts");
    const labSources = [
      page,
      rolodex,
      read("./workoutDesignViewModel.ts"),
      read("./concepts/conceptShared.tsx"),
    ].join("\n");

    expect(rolodex).toContain("NASMExerciseRolodex");
    expect(searchHook).toContain("api.get('/api/exercises/library')");
    expect(labSources).not.toMatch(/api\.(post|put|patch|delete)\(/);
    expect(labSources).toContain("Prototype only");
  });
});

describe("Lab A1 polish contract (safety-note dedup + apply moment)", () => {
  it("LabPage root carries the suppression attr and PrototypeNote carries the matching rule", () => {
    const page = read("./WorkoutDesignLabPage.tsx");
    expect(page).toContain('data-lab-safety="page"');

    const shared = read("./concepts/conceptShared.styles.ts");
    expect(shared).toMatch(/\[data-lab-safety='page'\]\s*&\s*\{\s*display:\s*none;/);
  });

  it("confirmation chip: bottom-center fixed lane, assertive announcement, 300ms slide-up killed under reduced motion", () => {
    const chip = read("./LabConfirmationChip.tsx");
    expect(chip).toContain('aria-live="assertive"');
    expect(chip).toMatch(/position:\s*fixed/);
    expect(chip).toMatch(/left:\s*50%/);
    expect(chip).toMatch(/translate\(-50%/);
    expect(chip).toMatch(/300ms\s+ease-out/);
    expect(chip).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(chip).toMatch(/animation:\s*none/);
    // The chip is fired by LabPage's applyLens success path — never by Explorer.
    const page = read("./WorkoutDesignLabPage.tsx");
    expect(page).toContain("LabConfirmationChip");
    const explorer = read("./WorkoutDesignStyleExplorer.tsx");
    expect(explorer).not.toContain("LabConfirmationChip");
  });

  it("apply beat: 200ms scale 1 -> 0.95 -> 1 on the Apply control, inert under reduced motion", () => {
    const explorer = read("./WorkoutDesignStyleExplorer.tsx");
    expect(explorer).toMatch(/scale\(0\.95\)/);
    expect(explorer).toMatch(/200ms\s+ease-out/);
    expect(explorer).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(explorer).toMatch(/animation:\s*none/);
  });
});
