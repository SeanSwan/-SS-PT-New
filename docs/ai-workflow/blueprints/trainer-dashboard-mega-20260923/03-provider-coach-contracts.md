**Candidate r3 — 2026-09-24. Owner: Astra document repair. Design contract only; implementation and product tests NOT RUN.**

Mandatory companion to [03-contracts.md](03-contracts.md); same scope, bindings, and pending approvals.

**Provider and Coach interfaces**

```ts
interface ProviderAdapter {
  provider: string;
  normalize(input: unknown, context: ImportContext): Promise<NormalizedBatch>;
  beginAuthorization?(context: AuthorizationContext): Promise<AuthorizationStart>;
  exchangeCallback?(input: CallbackInput): Promise<ProtectedConnection>;
  fetchSince?(connectionId: Id, cursor: string | null): Promise<ProviderBatch>;
  revoke?(connectionId: Id): Promise<void>;
}

export function dedupeKey(observation: Observation): string;
export function selectSourceSeries(
  readings: Observation[], preference: SourcePreference
): Observation[];
export function createCoachSnapshot(
  input: ApprovedSnapshotInput, context: AuthorizedContext
): Promise<CoachSnapshot>;
```

Provider SDK signatures, scope strings, webhook verification, refresh semantics, and parser input formats are B-03 certification work. No provider is displayed as connected or supported until that record exists.


**Exact Coach review and approval contract**

```ts
type CoachSummaryItem = Measurement & {
  observedStart: ISOTime; observedEnd: ISOTime;
  sourceLabel: string;
}; // Runtime decoder preserves the discriminated metric/unit pair.
type CoachPreview = {
  id: Id; content: { schemaVersion: 'health-summary-v1'; items: CoachSummaryItem[] };
  summaryHash: string; expiresAt: ISOTime;
};
type CoachSnapshot = { id: Id; contentHash: string; createdAt: ISOTime };
```

The server derives a deterministic minimized preview from exact eligible observation IDs; it does not ask a model to summarize. Summary items preserve the metric/unit pair and explicit interval; values are copied from selected observations in v1, not inferred clinical scores. Identity, free text, provider record/device keys, credentials, raw exports, and filenames are forbidden content fields. Source labels must come from certified safe labels, not arbitrary provider text. The UI renders this exact content, then submits its returned hash.

Persist the preview's canonical serialized content and SHA-256, actor/subject authorization scope, observation IDs/revisions, source-selection version, consent version/purpose, subject generation, and expiry. The hash covers schema version and exact content bytes. Approval must match the stored hash and recheck every dependency. An expired, revised, superseded, quarantined, deleted, or unauthorized source returns 409 or the applicable denied error and requires a fresh review; never silently regenerate approved content.

Consent IDs are server-issued and bound to subject, purpose, text version, grantor, and current grant state. An assigned trainer relationship alone cannot create client consent. B-05 must establish any legitimate delegated-consent authority before it is enabled; default is the subject's own grant. Approval checks ingestion access and separate coach_handoff consent. Entitlement loss preserves read/delete/disconnect/privacy controls and blocks only the new processing explicitly gated by approved entitlement policy.

Snapshot creation freezes approved content only. The existing Coach adapter must send those exact approved bytes through the existing reviewed boundary; it may not substitute a recomputed summary or trigger a model automatically on preview/import. Consumption rechecks current access, consent and deletion status. B-01 must name that caller and its acknowledgement contract before S7 integration; provider certification cannot substitute for it. A lost snapshot-create response is reconciled through the idempotent original operation, with no duplicate handoff.

Source selection is per subject, metric, and explicit time window. Its input excludes ineligible revisions before dedupe/overlap handling. B-03 supplies certified normalization and B-01 binds the versioned SourcePreference representation; until bound, no guessed aggregation or automatic cross-source sum is permitted.
