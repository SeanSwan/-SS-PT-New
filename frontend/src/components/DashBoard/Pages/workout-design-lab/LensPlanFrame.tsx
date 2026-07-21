/**
 * ============================================================================
 * LENS PLAN FRAME — Recipe v2's trusted renderer boundary (Golden Pair)
 * ============================================================================
 * BLUEPRINT: compiles a RecipeV2 against the Lab host manifest and paints
 * the ResolvedLensPlan onto the worlds' existing `--world-*` variable
 * contract (tokens) + data-lens2-* attributes (representation switches
 * consumed by lensRepresentationStyles). Recipes stay pure data; this
 * frame is the only place plan -> DOM happens. Compilation is memoized
 * per recipe id+version; a recipe that fails to compile renders the
 * children UNSTYLED with a visible receipt (fail-closed, never guesses).
 * ============================================================================
 */
import React, { useMemo, useSyncExternalStore, type ReactNode } from "react";
import styled, { type RuleSet } from "styled-components";
import { compileRecipe } from "../../../../core/style-lens-os/v2/compileRecipe";
import type { HostCapabilityManifest } from "../../../../core/style-lens-os/v2/hostCapabilityManifest";
import type { RecipeV2 } from "../../../../core/style-lens-os/v2/recipeV2";
import { LAB_HOST_MANIFEST } from "../../../../adapters/style-lens-swan/v2/labRecipes";
import { ATMOSPHERE_ASSET_CATALOG } from "../../../../adapters/style-lens-swan/v2/atmosphereCatalog";
import { lensRepresentationStyles } from "./lensRepresentationStyles";
import { StyledBox } from '@/components/ui/StyledBox';

const FrameRoot = styled.div<{ $representation?: RuleSet<object> }>`
  display: block;
  min-width: 0;
  container-type: inline-size;
  ${({ $representation }) => $representation ?? lensRepresentationStyles};
`;

/* F0 atmosphere layer: decorative, STATIC (firewall H1 — product never
 * animates atmosphere), never intercepts input, never owns meaning. */
const AtmosphereLayer = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  contain: paint;
`;

const AtmosphereContent = styled.div`
  position: relative;
  z-index: 1;
`;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const canQueryMotion = () => typeof window !== "undefined" && typeof window.matchMedia === "function";
const subscribeReducedMotion = (onChange: () => void) => {
  if (!canQueryMotion()) return () => {};
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener?.("change", onChange);
  // Also watch the provider's global motion kill attr so the snapshot can
  // never go stale outside a React commit (review LOW-5).
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
  return () => {
    mql.removeEventListener?.("change", onChange);
    observer.disconnect();
  };
};
const useStillMode = (): boolean =>
  useSyncExternalStore(
    subscribeReducedMotion,
    () =>
      (canQueryMotion() && window.matchMedia(REDUCED_MOTION_QUERY).matches) ||
      document.documentElement.getAttribute("data-motion") === "off",
    () => true,
  );

const CompileReceipt = styled.p`
  margin: 8px 0;
  padding: 10px 14px;
  border: 1px solid var(--error, #ff6d85);
  border-radius: 12px;
  color: var(--error, #ff6d85);
  font: 650 13px/1.4 "Fira Code", monospace;
`;

interface LensPlanFrameProps {
  /**
   * null = "no lens worn": the frame stays MOUNTED and paints nothing, so
   * committing/clearing a lens never remounts the host surface (rest
   * timers, logged marks, and input state survive the switch).
   */
  recipe: RecipeV2 | null;
  children: ReactNode;
  /** Host/surface manifest to compile against. Defaults to the Lab host. */
  manifest?: HostCapabilityManifest;
  /**
   * Host-owned representation mapping (a styled-components `css` block
   * keyed off data-lens2-* attrs). Defaults to the Lab world styles.
   * LensPlanFrame remains the ONLY recipe→DOM boundary; hosts supply how
   * their own primitives interpret the resolved variants.
   */
  representationStyles?: RuleSet<object>;
  "aria-label"?: string;
}

export const LensPlanFrame: React.FC<LensPlanFrameProps> = ({
  recipe,
  children,
  manifest = LAB_HOST_MANIFEST,
  representationStyles,
  "aria-label": ariaLabel,
}) => {
  const result = useMemo(
    () => (recipe ? compileRecipe(recipe, manifest) : null),
    [recipe, manifest],
  );
  const stillMode = useStillMode();

  if (!recipe || !result) {
    return (
      <FrameRoot aria-label={ariaLabel} $representation={representationStyles}>
        {children}
      </FrameRoot>
    );
  }

  if (!result.ok) {
    return (
      <FrameRoot aria-label={ariaLabel} $representation={representationStyles}>
        <CompileReceipt role="status">
          Lens “{recipe.id}” failed compilation ({result.issues.length}{" "}
          issue{result.issues.length === 1 ? "" : "s"}) — rendering host
          defaults.
        </CompileReceipt>
        {children}
      </FrameRoot>
    );
  }

  const { plan } = result;
  const style: Record<string, string> = {};
  for (const [name, value] of Object.entries(plan.cssVariables)) {
    // lens2-world-x -> --world-x (the worlds' existing contract)
    style[`--${name.replace(/^lens2-/, "")}`] = value;
  }

  // F0 atmosphere: catalog-resolved STATIC background stack; still/off mode
  // renders the stillPoster only; unknown assetIds skip fail-closed.
  const atmo = plan.atmosphere;
  // Still mode inherits the LOUDEST browsing layer's opacity, never more —
  // reduced-motion users must not get amplified atmosphere (review F0-2);
  // the stillPoster stays inside the recipe's own 0.01–0.12 envelope.
  const stillOpacity = atmo
    ? Math.max(0.01, ...atmo.layers.map((layer) => layer.opacity))
    : 0.01;
  const atmoLayers = atmo
    ? (stillMode ? [{ assetId: atmo.stillPoster.assetId, opacity: stillOpacity }] : atmo.layers)
        .map((layer) => ({ asset: ATMOSPHERE_ASSET_CATALOG[layer.assetId], opacity: layer.opacity }))
        .filter((entry) => Boolean(entry.asset))
    : [];
  const atmoStyle: React.CSSProperties | undefined = atmo
    ? {
        backgroundImage: atmoLayers.map(({ asset }) => asset!.css).join(", "),
        opacity: atmoLayers.length
          ? Math.min(1, Math.max(...atmoLayers.map(({ opacity }) => opacity)) * 4)
          : 0,
      }
    : undefined;

  return (
    <StyledBox as={FrameRoot}
      aria-label={ariaLabel}
      $representation={representationStyles}
      data-lens2-plan={plan.lensId}
      data-lens2-template={plan.templates["desktop-enhanced"]}
      data-lens2-display={plan.variants["text.display"]}
      data-lens2-surface={plan.variants["surface.card"]}
      data-lens2-collection={plan.variants["collection.exercise"]}
      data-lens2-action={plan.variants["action.primary"]}
      data-lens2-chart={plan.variants["chart.progress"]}
      $style={{ ...(style as React.CSSProperties), ...(atmo ? { position: "relative" as const } : {}) }}
    >
      {atmo ? (
        <AtmosphereLayer
          aria-hidden="true"
          data-atmo-mode={stillMode ? "still" : "static"}
          style={atmoStyle}
        />
      ) : null}
      {atmo ? <AtmosphereContent>{children}</AtmosphereContent> : children}
    </StyledBox>
  );
};

export default LensPlanFrame;
