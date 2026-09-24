**Candidate r3 — 2026-09-24. Owner: Astra document repair. Design contract only; implementation and product tests NOT RUN.**

Supersedes the r2 text only in this candidate. Hash-verified originals remain in the review preservation set.

**Contract status**

All contracts below are **new target contracts** unless explicitly marked existing. Backend integration and physical schemas remain blocked by B-01. Existing route responses must be adapted, not silently changed to resemble these models.

**Common types**

```ts
type UserId = string;       // Opaque wire representation; never assume SQL UUID.
type SubjectId = string;
type Id = string;
type ISOTime = string;      // RFC3339 UTC, with original offset retained where relevant.
type Minor = string;        // Base-10 integer; no decimal point or exponent.
type Role = 'admin' | 'trainer' | 'client';
type Mode = Role;
type Cursor = string | null;

type ApiErrorCode =
  | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND'
  | 'VALIDATION_FAILED' | 'CONFLICT' | 'POLICY_PENDING'
  | 'CONSENT_REQUIRED' | 'ENTITLEMENT_REQUIRED'
  | 'PROVIDER_UNAVAILABLE' | 'RATE_LIMITED' | 'INTERNAL_ERROR';

type ApiReply<T> =
  | { data: T; requestId: string }
  | { error: { code: ApiErrorCode; message: string;
      fields?: Record<string, string> }; requestId: string };

type PageResult<T> = { items: T[]; nextCursor: Cursor };
```

**Common API rules**

- Existing authentication transport and CSRF protections must be bound through B-01. No replacement authentication scheme.
- Server derives actor identity. Client-supplied `subjectId` is a requested scope, never authorization.
- All new APIs return `Cache-Control: no-store` for sensitive responses.
- Validation rejects unknown mutation fields.
- Mutation operation keys use the `Idempotency-Key` header and bind actor, method, path, and canonical payload hash. Authenticate and reauthorize before every execution or replay response; a stored result never bypasses current access.
- Repeating the same key and payload returns the original result; a changed payload returns `409 CONFLICT`.
- Accepted asynchronous jobs are created transactionally with an outbox record.
- Authorization is rechecked at commit time, not only upload time.
- Application errors use the envelope above. Network timeout or aborted fetch is a client transport error, not a fabricated HTTP result.
- No raw provider response, stack trace, access token, client name, or measurement payload in logs.

**Common errors and rendering**

| HTTP | Code | Exact UI message/action |
|---|---|---|
| 401 | UNAUTHENTICATED | “Your session has expired.” → existing sign-in flow |
| 403 | FORBIDDEN | Screen-specific denied state |
| 403 | CONSENT_REQUIRED | “Consent is required to continue.” → consent panel |
| 403 | ENTITLEMENT_REQUIRED | “Your plan does not include new intake processing.” → preserve existing records/privacy controls |
| 404 | NOT_FOUND | “This item is no longer available.” → parent destination |
| 409 | CONFLICT | “This information changed. Review the latest version.” |
| 409 | POLICY_PENDING | “Earnings terms are being configured.” |
| 422 | VALIDATION_FAILED | Field errors plus “Check the highlighted fields.” |
| 429 | RATE_LIMITED | “Please wait before trying again.” |
| 503 | PROVIDER_UNAVAILABLE | “The connection is temporarily unavailable.” |
| 500 | INTERNAL_ERROR | Screen-specific failure plus Retry |

**Quality controller**

```ts
type QualityTier = 'static' | 'balanced' | 'enhanced';
type QualityPreference = 'auto' | 'reduced' | 'off';

type QualityState = {
  tier: QualityTier;
  preference: QualityPreference;
  reducedMotion: boolean;
  visible: boolean;
  videoActive: boolean;
  downgradedThisSession: boolean;
};

type QualityEvent =
  | { type: 'preferences'; preference: QualityPreference; reducedMotion: boolean }
  | { type: 'visibility'; visible: boolean }
  | { type: 'video'; active: boolean }
  | { type: 'sample'; interactive: boolean; frames: number;
      p95Ms: number; over32MsRatio: number; longTaskOver100Ms: boolean }
  | { type: 'context-lost' };

export function reduceQuality(
  state: QualityState, event: QualityEvent
): QualityState;
```

Normative behavior:

1. Start `static`; never enable an effect during SSR or initial hydration.
2. Reduced motion or `off` forces `static`. `reduced` permits static glow/focus only.
3. Hidden document or active assessment suspends decorative work and resets to `static`.
4. Auto may enter `balanced` after initialization; balanced permits 120ms opacity transitions, no pointer tracking.
5. Enhanced promotion requires 120 visible interaction frames with p95 ≤20ms, no >100ms long task, and ≤5% frames above 32ms.
6. In enhanced, a 60-frame interaction window with >10% frames above 32ms downgrades to balanced. p95 >50ms forces static.
7. Downgrade is sticky for the session. No oscillating automatic promotion.
8. Pointer effects require a fine pointer and hover capability. Touch receives equivalent static emphasis.
9. At most one card tracks the pointer. No React state update per pointer frame.
10. Remove listeners and scheduled work on leave, unmount, suspension, or downgrade.

Hardware hints may lower the initial ceiling; missing hints must never be interpreted as powerful hardware.

The optional Home ornament uses one lazy graphics module, one canvas, at most two draw calls, backing resolution ≤600×300, and a single ≤1.2s entrance. It freezes afterward. No animation library or graphics SDK is loaded on clients, equipment, intake, earnings, or video pages for decoration.

**Shared client contract**

```ts
type ClientCardVm = {
  id: SubjectId;
  displayName: string;             // UI only; never forwarded to model input.
  avatarUrl: string | null;
  status: 'active' | 'inactive' | 'pending';
  lastWorkoutAt: ISOTime | null;
  sessionsRemaining: number | null;
  progress: { label: string; value: string; period: string } | null;
  updatedAt: ISOTime;
  capabilities: {
    logWorkout: boolean; viewClient: boolean;
    message: boolean; manageAssignment: boolean;
  };
};
```

Display names resolve only within the authorized product UI. Capabilities control affordances; the corresponding backend must independently authorize each action.

**Existing-data adapter boundary**

```ts
interface ExistingWorkspacePorts {
  loadHome(signal: AbortSignal): Promise<HomeVm>;
  loadClients(input: ClientQuery, signal: AbortSignal):
    Promise<PageResult<ClientCardVm>>;
  loadEquipment(input: EquipmentQuery, signal: AbortSignal):
    Promise<EquipmentWorkspaceVm>;
  saveEquipment(input: EquipmentEdit, operationKey: string):
    Promise<EquipmentItemVm>;
  loadSprints(signal: AbortSignal): Promise<PageResult<SprintSummaryVm>>;
  loadSprint(id: Id, signal: AbortSignal): Promise<SprintDetailVm>;
  generateSprint(id: Id, operationKey: string): Promise<JobVm>;
  reconcileSprintJob(id: Id, signal: AbortSignal): Promise<JobVm>;
}
```

`HomeVm`, equipment fields, sprint fields, existing mutation payloads, and audio contracts require actual response samples and schemas under B-01. **N/A — scope-bounded consult, no repository API definitions in scope.** The builder must not fabricate those types from superseded plans. The wireframes define desired presentation; unbound fields remain explicitly unavailable.

**Mandatory domain contracts**

- [Health observations, imports, deletion and endpoints](03-health-contracts.md).
- [Provider adapter and exact Coach preview/approval boundary](03-provider-coach-contracts.md).
- [Video and earnings](03-video-earnings-contracts.md).

All domain APIs inherit the common rules in this entry. Undefined existing adapter types remain B-01 blockers; companion types are new target contracts.

**Model definitions**

The wire models define new logical records. R3 inspects the existing User INTEGER key and legacy VideoSession wearable JSONB field; see `15-current-bindings.md`. Full ORM associations, transaction helpers, migration conventions and restoration behavior remain INCOMPLETE under B-01. No physical migration is authorized from this partial inventory.
