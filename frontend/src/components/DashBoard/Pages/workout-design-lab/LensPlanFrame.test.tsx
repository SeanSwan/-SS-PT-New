/**
 * Golden Pair render-boundary contract: the SAME child renders under both
 * production recipes with divergent painted tokens (--world-*) and
 * representation attributes — computed-signature truth at the DOM level,
 * plus fail-closed receipt rendering for an invalid recipe.
 */
import { render, screen } from "@testing-library/react";

import { describe, expect, it } from "vitest";
import LensPlanFrame from "./LensPlanFrame";
import {
  CANDY_GLASS_ARCADE_RECIPE,
  PRISM_TERMINAL_RECIPE,
} from "../../../../adapters/style-lens-swan/v2/labRecipes";

const frameOf = (container: HTMLElement) =>
  container.querySelector("[data-lens2-plan]") as HTMLElement;

describe("LensPlanFrame (Golden Pair render boundary)", () => {
  it("paints divergent --world-* tokens and representation attributes", () => {
    const a = render(
      <LensPlanFrame recipe={CANDY_GLASS_ARCADE_RECIPE}>
        <p>same child</p>
      </LensPlanFrame>,
    );
    const b = render(
      <LensPlanFrame recipe={PRISM_TERMINAL_RECIPE}>
        <p>same child</p>
      </LensPlanFrame>,
    );
    const candy = frameOf(a.container);
    const prism = frameOf(b.container);
    const candyStyle = window.getComputedStyle(candy);
    const prismStyle = window.getComputedStyle(prism);

    expect(candyStyle.getPropertyValue("--world-panel-radius")).toBe("26px");
    expect(prismStyle.getPropertyValue("--world-panel-radius")).toBe("4px");
    expect(candyStyle.getPropertyValue("--world-title-font")).toContain("Sora");
    expect(prismStyle.getPropertyValue("--world-title-font")).toContain("Fira Code");

    expect(candy.getAttribute("data-lens2-collection")).toBe("arcade-cards");
    expect(prism.getAttribute("data-lens2-collection")).toBe("command-rows");
    expect(candy.getAttribute("data-lens2-action")).toBe("glass-dock");
    expect(prism.getAttribute("data-lens2-action")).toBe("command-rail");
    expect(candy.getAttribute("data-lens2-template")).toBe("playfield-stack");
    expect(prism.getAttribute("data-lens2-template")).toBe("operator-grid");
  });

  it("fails closed: an invalid recipe renders children with a visible receipt", () => {
    const broken = {
      ...CANDY_GLASS_ARCADE_RECIPE,
      tokens: { "world-bg": "url(https://evil.example/x)" },
    };
    render(
      <LensPlanFrame recipe={broken}>
        <p>host defaults child</p>
      </LensPlanFrame>,
    );
    expect(screen.getByRole("status").textContent).toMatch(/failed compilation/);
    expect(screen.getByText("host defaults child")).toBeInTheDocument();
  });
});

/** FUSION F0 — the atmosphere layer (static-only in product; firewall H1). */
describe("LensPlanFrame atmosphere", () => {
  const withAtmosphere = {
    ...CANDY_GLASS_ARCADE_RECIPE,
    atmosphere: {
      layers: [
        { kind: "gradient" as const, assetId: "aurora-band", opacity: 0.08 },
        { kind: "grain" as const, assetId: "grain-03", opacity: 0.03 },
      ],
      stillPoster: { assetId: "ridge-mist" },
    },
  };

  const mockReducedMotion = (matches: boolean) => {
    window.matchMedia = ((query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? matches : false,
      media: query, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {},
      addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  };

  it("renders ONE aria-hidden static atmosphere el with the catalog layers", () => {
    mockReducedMotion(false);
    const { container } = render(
      <LensPlanFrame recipe={withAtmosphere}>
        <div>atmo child</div>
      </LensPlanFrame>,
    );
    const atmo = container.querySelector("[data-atmo-mode]") as HTMLElement;
    expect(atmo).not.toBeNull();
    expect(atmo.getAttribute("data-atmo-mode")).toBe("static");
    expect(atmo.getAttribute("aria-hidden")).toBe("true");
    // both known layers resolve from the catalog (distinguishing substrings)
    expect(atmo.style.backgroundImage).toContain("radial-gradient(120% 55%"); // aurora-band
    expect(atmo.style.backgroundImage).toContain("data:image/svg+xml");       // grain-03
  });

  it("reduced motion forces the stillPoster ONLY (data-atmo-mode=still)", () => {
    mockReducedMotion(true);
    const { container } = render(
      <LensPlanFrame recipe={withAtmosphere}>
        <div>atmo child</div>
      </LensPlanFrame>,
    );
    const atmo = container.querySelector("[data-atmo-mode]") as HTMLElement;
    expect(atmo.getAttribute("data-atmo-mode")).toBe("still");
    // stillPoster (ridge-mist) ONLY — the browsing layers are gone
    expect(atmo.style.backgroundImage).toContain("linear-gradient(180deg");
    expect(atmo.style.backgroundImage).not.toContain("radial-gradient(120% 55%");
    expect(atmo.style.backgroundImage).not.toContain("data:image/svg+xml");
  });

  it("unknown assetId layers are skipped fail-closed; no atmosphere -> no el", () => {
    mockReducedMotion(false);
    const { container } = render(
      <LensPlanFrame
        recipe={{
          ...withAtmosphere,
          atmosphere: {
            layers: [{ kind: "gradient" as const, assetId: "not-in-catalog", opacity: 0.08 }],
            stillPoster: { assetId: "aurora-band" },
          },
        }}
      >
        <div>atmo child</div>
      </LensPlanFrame>,
    );
    const atmo = container.querySelector("[data-atmo-mode]") as HTMLElement;
    expect(atmo.style.backgroundImage).toBe("");

    const bare = render(
      <LensPlanFrame recipe={CANDY_GLASS_ARCADE_RECIPE}>
        <div>no atmo</div>
      </LensPlanFrame>,
    );
    expect(bare.container.querySelector("[data-atmo-mode]")).toBeNull();
  });
});
