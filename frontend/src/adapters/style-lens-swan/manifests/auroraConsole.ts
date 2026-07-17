import { createSwanManifest } from '../manifestFactory';

/**
 * Aurora Console — the reusable OPERATOR-CONSOLE skin (v2 redesign, Sean-picked
 * direction 3, 2026-07-17). Contributes the `--console-*` token family
 * (composed from THEME variables, so every theme recolors it) plus a
 * state-reactive aurora atmosphere: the console's presence reads as weather.
 * Any console surface adopts it by consuming `--console-*` tokens and
 * mounting `ConsoleAtmosphere` (src/components/ConsoleOS/).
 */
export const AURORA_CONSOLE_MANIFEST = createSwanManifest({
  id: 'aurora-console', name: 'Aurora Console',
  description: 'Frost-glass console panels under a slow, state-reactive aurora — presence rendered as weather.',
  emotionalJob: 'calm operator confidence', layoutSignature: 'aurora-weather-console',
  navigationRenderer: 'aurora-console-navigation', shellRenderer: 'aurora-console-shell',
  recipe: 'aurora-console-recipe', profileOffsets: [2, 5, 8], ambient: true,
});
