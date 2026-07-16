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
