/**
 * EquipmentIQ barrel (Slice S8) — the orchestrator integrates from here.
 */
export { default as EquipmentIQPanel } from './EquipmentIQPanel';
export type { EquipmentIQPanelProps } from './EquipmentIQPanel';
export { default as EquipmentIQRadial } from './EquipmentIQRadial';
export type { EquipmentIQRadialProps, RadialPatternInput } from './EquipmentIQRadial';
export { default as useEquipmentGapReport } from './useEquipmentGapReport';
export type {
  EquipmentGapReport,
  GapReportPattern,
  GapReportSuggestion,
  UseEquipmentGapReportResult,
} from './useEquipmentGapReport';
export {
  computeArcGauge,
  computeSpokePoints,
  coveragePercent,
  findWeakestPattern,
  polygonPath,
} from './equipmentIQGeometry';
export type {
  ArcGaugeLayout,
  ArcSegment,
  PatternCoverageInput,
  SpokePoint,
} from './equipmentIQGeometry';
