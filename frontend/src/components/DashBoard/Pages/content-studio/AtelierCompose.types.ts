/**
 * AtelierCompose.types.ts — the shapes the Compose surface exchanges with the server.
 *
 * Split from the API client when it crossed the 300-line cap. Types only: nothing here
 * imports React or axios, so the words file and the client can both depend on it without
 * a cycle. The client re-exports everything, so existing imports keep working.
 */

export type Lane = 'auto' | 'local' | 'hosted';
export type PromptSource = 'brief' | 'taste';
export type LawProfile = 'full' | 'universal';

export interface LocalLaneView {
  provider: string;
  status: 'claimed' | 'probed';
  ready: boolean;
  /** FALSE means the UI must not promise this lane. The server decides, not the pixels. */
  advertisable: boolean;
  problems: string[];
  probeEnvKey: string;
  unitUsd: number;
}

export interface HostedLaneView {
  enabled: boolean;
  spendEnvKey: string;
  limits: { maxRunsDaily: number; maxSpendUsdDaily: number };
}

export interface BrandKitView {
  id: string;
  name: string;
  lawProfile: LawProfile;
  aspectDefault: string;
  isDefault: boolean;
}

export interface LimitsView {
  maxStills: number;
  lanes: { local: LocalLaneView; hosted: HostedLaneView };
  /** Which sites the studio can render for. Ids and names only — the art direction
   *  itself is prompt material and never leaves the server. */
  brandKits: BrandKitView[];
  usage: { runs: number; spendUsd: number };
  ledger: string;
  enabled: boolean;
  note: string;
}

export interface CostView {
  count: number; model: string; unitUsd: number; totalUsd: number; chargedUsd?: number; lane?: Lane;
}

/**
 * What Motion actually binds to: an asset id and the hash of its bytes.
 *
 * Narrower than StillView on purpose. `startMotion` only ever read these two fields, and
 * typing it as a whole StillView invited callers to synthesise a fake one — an object with
 * a real assetId and an invented `image`, `seed` and `provider` that nothing checks and
 * everything downstream could believe. A frame reused from the Assets library has no
 * `image` of the shape a freshly-composed still has, and pretending otherwise would be a
 * lie the type system endorsed. StillView satisfies this structurally, so nothing changes
 * for existing callers.
 */
export interface MotionTarget {
  assetId?: string | null;
  sha256?: string | null;
}

/**
 * A frame carried into Compose from the Assets library.
 *
 * `assetId` and `sha256` are the load-bearing pair — everything else exists so the operator
 * can SEE what Motion is about to animate. A bind target you cannot look at is a button
 * that claims to know which picture you meant.
 */
export interface ReusedFrame extends MotionTarget {
  assetId: string;
  sha256: string;
  prompt: string | null;
  previewUrl: string | null;
}

export interface StillView {
  index: number;
  lane: 'local' | 'hosted';
  image: { kind: 'b64'; data: string } | { kind: 'path'; path: string; mime: string };
  seed: number;
  promptHash: string;
  promptText: string;
  provider: string;
  sha256?: string;
  bytes?: number;
  /** Set when the still became a MediaAsset — the id the Motion rung will bind to. */
  assetId?: string | null;
  persist?: { ok: true; created: boolean } | { ok: false; code: string; message: string };
}

export interface StillFailure { index: number; code: string; message: string }

export interface PersistenceView { ok: boolean; persisted: number; total?: number; code?: string; message?: string }

export interface ComposeResult {
  lane: 'local' | 'hosted';
  promptSource: PromptSource;
  stills: StillView[];
  failures: StillFailure[];
  partial: boolean;
  replayed: boolean;
  cost: CostView;
  model: string;
  idempotencyKey: string;
  admission: { host: string; freeMb: number; neededMb: number } | null;
  persistence?: PersistenceView;
  tasteSeed?: number | null;
  lawRejected?: number;
  lawProfile?: LawProfile;
  clampedFrom?: number;
}

/** A local batch accepted for background rendering. Poll `statusUrl` until `terminal`. */
export interface BatchAccepted {
  accepted: true; batchId: string; status: string; lane: 'local'; promptSource: PromptSource; count: number;
  cost: CostView; admission: { host: string; freeMb: number; neededMb: number } | null; statusUrl: string; replayed: boolean;
}

export interface BatchSnapshot {
  batchId: string; lane: 'local'; status: 'queued' | 'running' | 'done' | 'partial' | 'failed'; count: number;
  promptSource: PromptSource; model: string; stills: StillView[]; failures: StillFailure[];
  persistence: PersistenceView | null; rendered: number; error: { code: string; message: string } | null;
  startedAt: number; finishedAt: number | null; terminal: boolean;
}

export interface ComposeRequest {
  /** Which site's art direction to render under. Distinct from workspaceId, which is a
   *  free-text filing label — art direction is a curated allowlist, filing is not. */
  brandKit?: string;
  brief: { text: string; intent?: string; aspect?: string };
  promptSource: PromptSource;
  lane: Lane;
  count: number;
  aspect?: string;
  lawProfile: LawProfile;
  cinematic?: boolean;
  seed?: number;
}

/** A refusal, with everything the server attached so the UI can say the real reason. */
export interface ComposeRefusal {
  code: string;
  message: string;
  status: number | null;
  retryAfterSec?: number;
  freeMb?: number;
  neededMb?: number;
}

export type LaneTone = 'ready' | 'unproven' | 'off';

export interface MotionStart {
  jobId: string; status: string; replayed: boolean; provider: string; attribution: string | null;
  bound: { assetId: string; sha256: string };
  startable: boolean; workerState: string | null; message: string; statusUrl: string;
}

/** Mirrors GET /api/content-studio/render-job/:id — the same shape the Render Queue polls. */
export interface MotionJobView {
  jobId: string; status: string; progress: number | null; errorCode: string | null; errorMessage: string | null;
  r2Key: string | null; attribution?: string | null; startable: boolean; workerState: string | null;
}

export type ApprovalStatus = 'draft' | 'approved' | 'published';

export interface AssetReference {
  id: string; status: ApprovalStatus; r2Key: string; mime: string; width: number | null; height: number | null;
  sha256: string | null; attribution: string | null; attributionRequired: boolean; licence: string | null;
  blockers: string[]; readUrl: string | null; permalink?: string | null; snippet: string | null; withheld: string | null;
}

export interface PublishDeclaration { consentConfirmed: boolean; intendedUse: 'commercial' | 'personal'; note?: string }
