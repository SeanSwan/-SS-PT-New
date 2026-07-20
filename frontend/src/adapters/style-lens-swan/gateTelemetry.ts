/**
 * gateTelemetry — fail-closed event emitter for the Swan Lens surface gates (Kimi roadmap #4).
 *
 * Every `*Gate.tsx` (Home/About/Video/Contact/Store/Dashboard/Gallery) fails CLOSED on three axes: flag
 * off/unresolved, lazy-chunk error (GateBoundary), or a failed world-contract check (ContractCheck). Those
 * fallbacks are SILENT today — we cannot tell "flag off" from "V-next mounted" from "V-next crashed and rolled
 * back" in production. This helper makes each gate emit one structured event at its decision point so the
 * Flag-Flip Runbook can watch dwell time + fallback (abort) rate during a staged flag-on, and so a spike in
 * `contract_fail`/`boundary_error` after a flip is an observable rollback signal, not a user-reported mystery.
 *
 * Contract (wire at each gate's decision points — a one-line add per gate, deferred to the wiring slice):
 *   emitGateEvent({ surface: 'home', outcome: 'mounted'  })   // V-next rendered, contract satisfied
 *   emitGateEvent({ surface: 'home', outcome: 'contract_fail' }) // ContractCheck.onFail → fail closed to V-prev
 *   emitGateEvent({ surface: 'home', outcome: 'boundary_error' }) // GateBoundary caught a lazy-chunk/runtime error
 *   emitGateEvent({ surface: 'home', outcome: 'flag_off' })    // flag unresolved or off → V-prev (optional/sampled)
 *
 * PRIVACY (Rule 8): surface + outcome + a coarse viewport bucket only. NEVER user id, route params, or PII.
 * TRANSPORT: best-effort, non-blocking, swallow all errors — telemetry must NEVER affect the fail-closed path
 * or throw into a gate's render. No network dependency in this file: it emits a `CustomEvent` on `window` that
 * an app-level listener (or a future `/api/telemetry/gate` beacon) forwards. Absent a listener it is a no-op.
 */

export type GateSurface =
  | 'home'
  | 'about'
  | 'video'
  | 'contact'
  | 'store'
  | 'dashboard'
  | 'gallery';

export type GateOutcome = 'mounted' | 'contract_fail' | 'boundary_error' | 'flag_off';

export interface GateEvent {
  surface: GateSurface;
  outcome: GateOutcome;
  /** Coarse viewport bucket for blast-radius reading. Non-identifying. */
  vw?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Client ms timestamp (event ordering only; not persisted as identity). */
  ts?: number;
}

/** The window CustomEvent name an app-level forwarder listens on. */
export const GATE_EVENT_NAME = 'swan:gate-event';

function viewportBucket(): GateEvent['vw'] {
  if (typeof window === 'undefined') return undefined;
  const w = window.innerWidth || 0;
  if (w < 480) return 'xs';
  if (w < 768) return 'sm';
  if (w < 1280) return 'md';
  if (w < 1920) return 'lg';
  return 'xl';
}

/**
 * Emit one gate decision event. Best-effort and fully swallowed — a telemetry failure can never break a gate.
 * Fires a `window` CustomEvent (detail = GateEvent); an app-level listener may beacon it onward. No-op on SSR.
 */
export function emitGateEvent(evt: Pick<GateEvent, 'surface' | 'outcome'>): void {
  try {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
    // DESTRUCTURED, never spread. TypeScript's excess-property check only applies to object LITERALS, so
    // `emitGateEvent(someObjectWithUserId)` compiles fine — and a spread would copy `userId`/`email` straight
    // into the dispatched event, breaking the zero-PII guarantee this file's header promises (Rule 8).
    // Listing the fields explicitly makes that guarantee structural instead of advisory.
    const detail: GateEvent = {
      surface: evt.surface,
      outcome: evt.outcome,
      vw: viewportBucket(),
      ts: Date.now(),
    };
    window.dispatchEvent(new CustomEvent<GateEvent>(GATE_EVENT_NAME, { detail }));
  } catch {
    /* telemetry is expendable — never surface an error into a fail-closed gate */
  }
}
