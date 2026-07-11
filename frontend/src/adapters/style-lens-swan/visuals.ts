export interface SwanStyleLensVisualReceipt {
  signatureMoment: string;
  assetTier: "static-css";
  primaryActionMinHeight: number;
  textContrast: number;
  foregroundToken: string;
  backgroundToken: string;
  foregroundFallback: string;
  backgroundFallback: string;
  blueButtonGlowToken: "wing-purple";
  purpleButtonGlowToken: "ice-wing";
  accentFallback?: string;
  accentBackgroundFallback?: string;
  accentContrast?: number;
  accentUsage?: "decorative" | "text";
}

export const SWAN_STYLE_LENS_VISUALS: Record<
  string,
  SwanStyleLensVisualReceipt
> = {
  "quiet-meridian": {
    signatureMoment:
      "A luminous meridian line aligns the active decision path.",
    assetTier: "static-css",
    primaryActionMinHeight: 48,
    textContrast: 14.57,
    foregroundToken: "frost-white",
    backgroundToken: "quiet-meridian-canvas",
    foregroundFallback: "#e0ecf4",
    backgroundFallback: "#06183a",
    blueButtonGlowToken: "wing-purple",
    purpleButtonGlowToken: "ice-wing",
  },
  "blueprint-fold": {
    signatureMoment:
      "Drafting planes fold from navigation into the working canvas.",
    assetTier: "static-css",
    primaryActionMinHeight: 48,
    textContrast: 12.7,
    foregroundToken: "frost-white",
    backgroundToken: "midnight-sapphire",
    foregroundFallback: "#e0ecf4",
    backgroundFallback: "#002060",
    blueButtonGlowToken: "wing-purple",
    purpleButtonGlowToken: "ice-wing",
  },
  "kintsugi-circuit": {
    signatureMoment: "A gilded circuit seam joins asymmetric working regions.",
    assetTier: "static-css",
    primaryActionMinHeight: 48,
    textContrast: 10.07,
    foregroundToken: "frost-white",
    backgroundToken: "royal-depth",
    foregroundFallback: "#e0ecf4",
    backgroundFallback: "#003080",
    blueButtonGlowToken: "wing-purple",
    purpleButtonGlowToken: "ice-wing",
    accentFallback: "#c6a84b",
    accentBackgroundFallback: "#003080",
    accentContrast: 5.25,
    accentUsage: "decorative",
  },
  "analog-flight-recorder": {
    signatureMoment:
      "A recorder status band turns the dashboard into an instrument.",
    assetTier: "static-css",
    primaryActionMinHeight: 48,
    textContrast: 15.28,
    foregroundToken: "frost-white",
    backgroundToken: "carbon",
    foregroundFallback: "#e0ecf4",
    backgroundFallback: "#141419",
    blueButtonGlowToken: "wing-purple",
    purpleButtonGlowToken: "ice-wing",
    accentFallback: "#c6a84b",
    accentBackgroundFallback: "#141419",
    accentContrast: 7.96,
    accentUsage: "decorative",
  },
  "candy-glass-arcade": {
    signatureMoment:
      "A responsive glass action dock frames the next best move.",
    assetTier: "static-css",
    primaryActionMinHeight: 48,
    textContrast: 12.01,
    foregroundToken: "frost-white",
    backgroundToken: "candy-glass-composite",
    foregroundFallback: "#e0ecf4",
    backgroundFallback: "#2e2152",
    blueButtonGlowToken: "wing-purple",
    purpleButtonGlowToken: "ice-wing",
  },
};
