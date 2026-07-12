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

    expect(routes).toContain("25 read-only workout worlds");
    expect(tabs).toContain("Compare 25 unified workout interface worlds");
    expect(page).toContain("{WORKOUT_DESIGN_CONCEPT_COUNT} workout worlds");
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
