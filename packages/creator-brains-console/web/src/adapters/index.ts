/*
 * The single import surface for data access (05-contracts.md §1).
 * UI code imports from here — never from a concrete adapter, never from the engine.
 */

export type {
  BrainDoc,
  CanaryReading,
  ConsoleDataAdapter,
  CreatorRow,
  DamageReport,
  HealthReading,
  HealthSource,
  QueryHit,
  QueryResult,
  RunState,
  StatusInstrument,
  Tier,
} from './types';

export { ConsoleApiError, describeError, mapBridgeError, mapTransportError } from './errors';
export type { ErrorCode } from './errors';

export { parseStatusInstrument } from './validate';

export { LocalEngineAdapter } from './LocalEngineAdapter';
export type { LocalEngineAdapterOptions } from './LocalEngineAdapter';

export { MockAdapter } from './MockAdapter';
export type { MockAdapterOptions, MockFault } from './MockAdapter';
