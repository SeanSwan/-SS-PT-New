/**
 * PrismCapture — barrel. The mount seam imports ONLY `PrismCapture`; it gates itself (flag off → null), so a
 * host can render `<PrismCapture />` unconditionally in the hero. Sub-parts are exported for tests/storybook.
 */
export { PrismCapture, default } from './PrismCapture';
export { usePrismCaptureFlag } from './flags';
export { usePrismCapture } from './usePrismCapture';
export type { PrismState, PrismIntent } from './usePrismCapture';
