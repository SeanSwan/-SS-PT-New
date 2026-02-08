export interface ConceptFonts {
  display: string;
  body: string;
  googleImportUrl: string;
}

export interface ConceptColors {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textSecondary: string;
  textOnPrimary: string;
}

export interface ConceptGradients {
  hero: string;
  card: string;
  cta: string;
}

export interface ConceptTheme {
  id: number;
  name: string;
  tagline: string;
  fonts: ConceptFonts;
  colors: ConceptColors;
  gradients: ConceptGradients;
  borderRadius: string;
  memorableMoment: string;
  rationale: string;
  interactionLanguage: string;
}
