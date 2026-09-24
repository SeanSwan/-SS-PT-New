**Candidate r3 — 2026-09-24. Owner: Astra document repair. Design contract only; implementation and product tests NOT RUN.**

Mandatory companion to [03-contracts.md](03-contracts.md); same scope, bindings, and pending approvals.

**Video contract**

All paths begin `/api/video-assessments/v1`.

| Method/path | Request | Success |
|---|---|---|
| GET `/sessions` | Cursor optional | 200 authorized session list |
| POST `/sessions` | `{clientUserId}` | 201 `{id,status:"ready",version:1}` |
| POST `/sessions/:id/consents` | `{granted,textVersion:"live-v1"}` | 201 consent receipt |
| POST `/sessions/:id/join` | `{consentId}` | 200 `{credential,serverUrl,expiresAt}` |
| PUT `/sessions/:id/notes` | `{expectedVersion,privateNotes,clientSummary}` | 200 versioned notes |
| POST `/sessions/:id/end` | `{expectedVersion}` | 200 `{id,status:"ended",version}` |

Only trainers/admins with the client relationship may create a session or save notes. Clients may list/join their own sessions. Ending everyone’s session is trainer/admin-only; local leave does not end the session for others.

Join credentials expire after 60 seconds for initial connection and are scoped to one participant and one room. Reconnection obtains a new credential after fresh authorization. Revocation stops local tracks immediately and invokes server-side removal; do not rely solely on token expiration.

Notes: maximum 4,000 characters per field; no HTML; optimistic version required. The client response omits `privateNotes` entirely. Proposed notes retention is 365 days, pending B-05.

```ts
interface VideoTransport {
  connect(input: JoinCredential): Promise<void>;
  setCamera(enabled: boolean): Promise<void>;
  setMicrophone(enabled: boolean): Promise<void>;
  disconnect(): Promise<void>;
  onState(listener: (state: VideoConnectionState) => void): () => void;
}

interface VideoTransportServer {
  issueJoin(input: AuthorizedJoin): Promise<JoinCredential>;
  removeParticipant(sessionId: Id, participantId: UserId): Promise<void>;
  closeRoom(sessionId: Id): Promise<void>;
}
```

**Earnings contract**

- New subledger; no execution of payouts.
- Commissionable base: authoritative captured service principal, excluding separately identified tax and tips.
- Recognition requires the agreed service-completion trigger and an effective approved policy.
- `trainerBps + platformBps = 10000`.
- No default value for either percentage.
- Trainer share: round half up once on the eligible base; platform share receives the exact remainder.
- Refund share: compute share of cumulative refunded principal, subtract prior posted refund share. Bind each refund to its original accrual event and immutable original policy/basis points, not the currently effective policy. Serialize concurrent refunds against cumulative refunded principal and cap reversal at the original eligible accrual; out-of-order events stay unreconciled until prerequisites exist.
- Processing fees are separate events with an approved allocation policy; never infer the missing 3%.
- Currency amounts serialize as integer strings and use integer arithmetic internally.
- Each event’s debit total equals credit total for its currency.
- Unique source event key prevents replay. Corrections use reversal/adjustment events.
- No cross-currency totals.
- Verified payout status is `pending`, `paid`, `failed`, or `reversed`. Missing, stale, or conflicting source reconciliation yields explicit `unknown`; it never defaults to `pending` or `paid`.
- Missing reconciliation is displayed explicitly; never label an unconfirmed transfer paid.

```ts
type EarningsPolicy = {
  id: Id; trainerUserId: UserId; currency: string;
  trainerBps: number; platformBps: number;
  effectiveAt: ISOTime; status: 'draft' | 'approved' | 'retired';
};

type JournalLine = {
  id: Id; eventId: Id; currency: string;
  account: 'service_clearing' | 'trainer_payable' |
    'platform_revenue' | 'payout_clearing' | 'adjustment_clearing';
  debitMinor: Minor; creditMinor: Minor;
};

export function computeShares(
  baseMinor: bigint, trainerBps: number
): { trainerMinor: bigint; platformMinor: bigint };

export function refundDelta(
  cumulativeRefundMinor: bigint, trainerBps: number,
  previouslyReversedTrainerMinor: bigint
): bigint;

export function postEarningsEvent(
  event: AuthorizedEarningsEvent
): Promise<{ eventId: Id; replayed: boolean }>;
```

| Method/path | Auth/request | Success |
|---|---|---|
| GET `/api/trainer-earnings/v1/statement?period=YYYY-MM&currency=CCC&cursor={cursor}` | Trainer self; no trainer ID override | 200 `{period,currency,policyStatus,earnedMinor,availableMinor,paidMinor,reconciliation,asOf,entries,nextCursor}` |
| GET `/api/trainer-earnings/v1/payouts?cursor={cursor}` | Trainer self | 200 `PageResult<Payout>` |

When `policyStatus:"pending"`, monetary totals are `null`, not `"0"`. The statement period uses the business timezone supplied under B-04; the UI labels it.


**Unknown earnings and statement consistency**

```ts
type PayoutStatus = 'unknown' | 'pending' | 'paid' | 'failed' | 'reversed';
type Reconciliation = {
  state: 'verified' | 'unknown' | 'stale' | 'conflict';
  checkedAt: ISOTime | null; reasonCode: string | null;
};
```

Do not invent a terminal financial state from missing source data. Unverified availability or paid reconciliation makes the corresponding total null with a reason, while independently verified earned amounts may remain visible. B-04 must define when funds become available and the reconciliation freshness rule; a balanced journal alone proves neither availability nor payment. A pending payout is a positively verified pending source event.

Statement cursors bind trainer, period, currency, ordered entry position and asOf snapshot; reauthorize every page. Totals cover the full snapshot, not the returned page. Reject a cursor reused for another scope. Entry calculation data must identify authoritative source, immutable policy version, eligible base, fee/refund adjustments and rounding; expose it only within trainer-self scope.

Video join-operation replay is valid only while its credential remains usable. Reconnect starts a new authorized join operation and cannot replay an expired token. Authorization/consent revocation also blocks cached replay responses. B-03 must prove removal and room closure on the actual selected transport; token expiry alone is insufficient.
