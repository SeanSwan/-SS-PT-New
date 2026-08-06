/**
 * ============================================================================
 * FILE: adminWaivers.styles.ts
 * PURPOSE: Barrel for the admin waiver surface styles.
 * AUTHOR: Claude Opus 5 | LAST MODIFIED: 2026-08-05
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Re-exports the four style modules this surface was
 * split into on 2026-08-05. The original single file had grown to 489 lines
 * (rule 4 caps files at 300) and carried ~60 raw hex/rgba literals with no
 * theme tokens (rule 6). Splitting behind this barrel kept every existing
 * `from './adminWaivers.styles'` import working unchanged.
 *
 *   adminWaivers.styles.base.ts    shell, filters, pagination, list states
 *   adminWaivers.styles.table.ts   table + <=768px stacked cards, badges, buttons
 *   adminWaivers.styles.modal.ts   detail + manual-link modal internals
 *   adminWaivers.styles.alerts.ts  inline dismissible failure banners
 */

export * from './adminWaivers.styles.base';
export * from './adminWaivers.styles.table';
export * from './adminWaivers.styles.modal';
export * from './adminWaivers.styles.alerts';
