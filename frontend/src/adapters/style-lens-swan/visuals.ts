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
  "recovery-cloister": {
    signatureMoment: "A quiet readiness ring anchors the lower-action sanctuary.",
    assetTier: "static-css", primaryActionMinHeight: 48, textContrast: 13.2,
    foregroundToken: "frost-white", backgroundToken: "recovery-cloister-canvas",
    foregroundFallback: "#e0ecf4", backgroundFallback: "#08243a",
    blueButtonGlowToken: "wing-purple", purpleButtonGlowToken: "ice-wing",
  },
  "tempo-forge": {
    signatureMoment: "Cadence bands preserve a tempo-safe working zone.",
    assetTier: "static-css", primaryActionMinHeight: 48, textContrast: 15.28,
    foregroundToken: "frost-white", backgroundToken: "carbon",
    foregroundFallback: "#e0ecf4", backgroundFallback: "#141419",
    blueButtonGlowToken: "wing-purple", purpleButtonGlowToken: "ice-wing",
  },
  "coach-ledger": {
    signatureMoment: "A gilded annotation margin turns coaching history into an index.",
    assetTier: "static-css", primaryActionMinHeight: 48, textContrast: 14.36,
    foregroundToken: "frost-white", backgroundToken: "graphite",
    foregroundFallback: "#e0ecf4", backgroundFallback: "#1a1a24",
    blueButtonGlowToken: "wing-purple", purpleButtonGlowToken: "ice-wing",
  },
  "signal-garden": {
    signatureMoment: "A branching progress rail grows toward the next best action.",
    assetTier: "static-css", primaryActionMinHeight: 48, textContrast: 11.97,
    foregroundToken: "frost-white", backgroundToken: "signal-garden-canvas",
    foregroundFallback: "#e0ecf4", backgroundFallback: "#062e3a",
    blueButtonGlowToken: "wing-purple", purpleButtonGlowToken: "ice-wing",
  },
  "split-horizon": {
    signatureMoment: "A luminous horizon separates live work from decision insight.",
    assetTier: "static-css", primaryActionMinHeight: 48, textContrast: 13.59,
    foregroundToken: "frost-white", backgroundToken: "split-horizon-canvas",
    foregroundFallback: "#e0ecf4", backgroundFallback: "#101d46",
    blueButtonGlowToken: "wing-purple", purpleButtonGlowToken: "ice-wing",
  },  "prism-terminal": { signatureMoment: "A faceted command plane refracts status into action.", assetTier: "static-css", primaryActionMinHeight: 48, textContrast: 13.55, foregroundToken: "frost-white", backgroundToken: "prism-terminal-canvas", foregroundFallback: "#e0ecf4", backgroundFallback: "#10203a", blueButtonGlowToken: "wing-purple", purpleButtonGlowToken: "ice-wing" },
  "tidal-columns": { signatureMoment: "Three offset currents carry orientation, work, and insight.", assetTier: "static-css", primaryActionMinHeight: 48, textContrast: 12.33, foregroundToken: "frost-white", backgroundToken: "tidal-columns-canvas", foregroundFallback: "#e0ecf4", backgroundFallback: "#062a42", blueButtonGlowToken: "wing-purple", purpleButtonGlowToken: "ice-wing" },
  "monastic-grid": { signatureMoment: "Measured cells let the working facts become the atmosphere.", assetTier: "static-css", primaryActionMinHeight: 48, textContrast: 14.47, foregroundToken: "frost-white", backgroundToken: "monastic-grid-canvas", foregroundFallback: "#e0ecf4", backgroundFallback: "#181a20", blueButtonGlowToken: "wing-purple", purpleButtonGlowToken: "ice-wing" },
  "orbit-atlas": { signatureMoment: "Concentric planning paths reveal the longer training horizon.", assetTier: "static-css", primaryActionMinHeight: 48, textContrast: 14.68, foregroundToken: "frost-white", backgroundToken: "orbit-atlas-canvas", foregroundFallback: "#e0ecf4", backgroundFallback: "#0e1638", blueButtonGlowToken: "wing-purple", purpleButtonGlowToken: "ice-wing" },
  "carbon-atelier": { signatureMoment: "A tactile tool rail opens onto a generous craft canvas.", assetTier: "static-css", primaryActionMinHeight: 48, textContrast: 14.87, foregroundToken: "frost-white", backgroundToken: "carbon-atelier-canvas", foregroundFallback: "#e0ecf4", backgroundFallback: "#17171b", blueButtonGlowToken: "wing-purple", purpleButtonGlowToken: "ice-wing" },};
