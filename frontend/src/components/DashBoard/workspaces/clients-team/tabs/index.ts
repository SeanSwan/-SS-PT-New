/**
 * ============================================================================
 * FILE: index.ts
 * PURPOSE: Barrel export for all Client Detail View tab content components
 * AUTHOR: Claude Opus 4.6 (CEO) | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Re-exports all 4 tab content components used by
 * ClientDetailView so consumers can import from a single path.
 *
 * HOW IT FITS IN THE APP: ClientDetailView imports tab components from here.
 */

export { default as TrainingTabContent } from './TrainingTabContent';
export { default as ProgressTabContent } from './ProgressTabContent';
export { default as NutritionTabContent } from './NutritionTabContent';
export { default as BiometricsTabContent } from './BiometricsTabContent';
export { default as OverviewTabContent } from './OverviewTabContent';
export { default as SettingsTabContent } from './SettingsTabContent';
