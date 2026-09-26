**Common errors**

```ts
type Failure = {
  success: false;
  error: {
    code: string;
    retryable: boolean;
    receiptId?: string;
  };
  message: string;
};
```

Never return internal SQL, stack traces, provider credentials, signed media URLs, or another account’s identity.

**Endpoint contracts**

| Endpoint | Auth and input | Required result |
|---|---|---|
| `POST /api/v2/payments/create-checkout-session` | Authenticated owner; existing `cartId`, fulfillment intent | Existing success envelope plus opaque `receiptId`; `409 CART_CHECKOUT_LOCKED`; `503 CHECKOUT_PREPARING`; malformed input `400`; wrong owner `404`. |
| `POST /api/v2/payments/verify-session` | Owner; `{sessionId:string}` | `200` only when fulfillment is complete; `409 PAYMENT_NOT_COMPLETE`; `409 PAYMENT_REVIEW_REQUIRED`; `503 ALLOCATION_PENDING`; missing/foreign record `404`. |
| `GET /api/v2/payments/activation-status` | Owner; existing session query | Preserve existing activation fields; add authoritative `paymentState`, `fulfillmentState`, `receiptId`. Never infer fulfillment from `orders.status`. |
| `POST /api/webhook/stripe`, `POST /webhooks/stripe/webhook`, `POST /api/cart/webhook` | Provider signature over raw bytes | Same dispatcher. Invalid signature `400`; transient persistence failure `500`; durable applied/review event `200 {received:true}`. |
| Existing cart add/update/remove/clear | Authenticated owner | Same envelopes; mutation and totals share transaction; locked attempt `409`. |
| `POST /api/orders/create-from-cart` | Owner; existing cart input | Idempotent pending order only. Never completes the cart or allocates credits. |
| `POST /api/orders/:id/apply-payment` | Admin; manual method, reference, notes | Shared fulfillment; `200` complete or already complete; `503` pending; invalid provider-payment substitution `409`. |
| `PUT /api/orders/:id` | Admin; allowed operational fields | Cannot synthesize payment, erase allocation evidence, or reverse terminal financial state. Illegal transition `409`. |
| Existing workout session CRUD | Self/admin/current assigned trainer | Reads/writes bind to persisted owner; denied/missing `404`; attempted ownership change `400 IMMUTABLE_OWNER`. |
| Private media aliases | Self/admin/current assigned trainer | Stream only after authorization; denied/missing `404`; `private,no-store`; no bearer token in URL. |
| `POST /api/public/waivers/submit` | Optional authenticated identity | Anonymous: saved but unlinked; authenticated: bind to authenticated identity only; `400` validation, `409` stale version, `429` limited. |
| Provider-backed `/api/free/*` routes | Authentication plus bounded quota | `401` anonymous, `429` quota exhausted, `503` limiter unavailable; no provider call on rejection. |

For anonymous waiver submission, preserve the existing envelope but return `status: "pending_verification"`. Do not expose candidate IDs, confidence scores, or whether an email matches an account.

**Core function contracts**

```ts
prepareCheckout(input: {
  userId: number;
  cartId: number;
  fulfillmentIntent: unknown;
}): Promise<{ attemptId: string; orderId: number }>;

normalizePaymentEvidence(input: unknown): PaymentEvidence;
// Reject malformed, noninteger, nonfinite or unbound evidence.

fulfillPurchase(input: {
  orderId: number;
  sourceKey: string;
  evidence: PaymentEvidence | ManualPaymentEvidence;
}): Promise<
  | { state: "fulfilled"; receiptId: string; sessionsAdded: number }
  | { state: "already_fulfilled"; receiptId: string; sessionsAdded: 0 }
  | { state: "review"; receiptId: string; code: string }
>;

applyRefund(input: {
  eventId: string;
  paymentIntentId: string;
  cumulativeRefundCents: number;
}): Promise<{ state: "applied" | "review"; reversedCredits: number }>;

reserveSessionCredits(input: {
  userId: number;
  sessionId: number;
  credits: number;
  transaction: unknown;
}): Promise<void>;
```

**Immutable line contract**

```ts
type PurchasedLine = {
  storefrontItemId: number;
  productVariantId: number | null;
  itemKind: "training_package" | "physical_product";
  quantity: number;
  unitAmountCents: number;
  sessionCreditsPerUnit: number;
};
```

Validate positive integer quantities; nonnegative integer prices/credits; known item kinds; variant belongs to item. Store no customer names or medical data in these snapshots.

For this rollout, currency is `usd`. A different currency is a review condition. Amounts must fit both the existing monetary columns and JavaScript safe-integer range.

Reconciliation requires:

```text
provider subtotal = sum(snapshot quantity × snapshot unit cents)
provider total = subtotal − provider discount + provider tax + provider shipping
provider identity = attempt/session/payment intent/customer ownership binding
```

No one-cent allowance conceals malformed data. Any rounding is performed once when constructing line-item cents.

**New model definitions**

All tables use explicitly declared names. All user FKs reference canonical `"Users"(id)` with `ON DELETE RESTRICT`. Payment/audit rows are never cascade-deleted.

| Table | Complete column contract |
|---|---|
| `checkout_attempts` | `id UUID PK`; `"cartId" INTEGER NOT NULL FK shopping_carts`; `"orderId" INTEGER NOT NULL UNIQUE FK orders`; `"userId" INTEGER NOT NULL FK "Users"`; `state VARCHAR(16) NOT NULL`; `currency VARCHAR(3) NOT NULL`; `"subtotalCents" BIGINT NOT NULL`; `lines JSONB NOT NULL`; `"stripeSessionId" VARCHAR(255) NULL UNIQUE`; `"paymentIntentId" VARCHAR(255) NULL UNIQUE`; `"reviewCode" VARCHAR(64) NULL`; `"expiresAt" TIMESTAMPTZ NULL`; `"createdAt" TIMESTAMPTZ NOT NULL`; `"updatedAt" TIMESTAMPTZ NOT NULL`. |
| `payment_events` | `id VARCHAR(255) PK`; `"attemptId" UUID NULL FK checkout_attempts`; `kind VARCHAR(64) NOT NULL`; `evidence JSONB NOT NULL`; `state VARCHAR(16) NOT NULL`; `attempts INTEGER NOT NULL DEFAULT 0`; `"lastErrorCode" VARCHAR(64) NULL`; `"nextAttemptAt" TIMESTAMPTZ NULL`; `"receivedAt" TIMESTAMPTZ NOT NULL`; `"processedAt" TIMESTAMPTZ NULL`. |
| `session_credit_grants` | `id UUID PK`; `"orderId" INTEGER NOT NULL UNIQUE FK orders`; `"userId" INTEGER NOT NULL FK "Users"`; `"sourceKey" VARCHAR(255) NOT NULL UNIQUE`; `granted INTEGER NOT NULL`; `consumed INTEGER NOT NULL DEFAULT 0`; `reversed INTEGER NOT NULL DEFAULT 0`; `state VARCHAR(16) NOT NULL`; `"appliedAt" TIMESTAMPTZ NOT NULL`. |
| `session_credit_uses` | `id UUID PK`; `"grantId" UUID NOT NULL FK session_credit_grants`; `"sessionId" INTEGER NOT NULL FK sessions`; `credits INTEGER NOT NULL`; `state VARCHAR(16) NOT NULL`; `"createdAt" TIMESTAMPTZ NOT NULL`; `"updatedAt" TIMESTAMPTZ NOT NULL`; unique `("grantId","sessionId")`. |

Constraints:

- Attempt states: the states in `01-architecture.md`; partial unique index on `"cartId"` for `prepared/open`.
- Event states: `pending/applied/review`; attempts nonnegative.
- Grant states: `active/review/refunded`; all counts nonnegative; `consumed + reversed <= granted`.
- Use states: `reserved/consumed/released`; credits positive.
- JSON snapshot shape validated at write and read boundaries.
- Add nullable unique `"effectKey" VARCHAR(255)` to `financial_transactions`; new writers must set it. Existing null rows require classified reconciliation, not guessed keys.
- Existing model definitions otherwise remain unchanged. The touched-column evidence is in `11-registries.md`.

**Transaction contract**

Lock order: purchase/order → user → grants ordered by ID → credit uses → inventory ordered by item/variant ID.

One allocation transaction commits:

1. Unique grant.
2. Correct user balance increment.
3. Required session records.
4. Inventory changes.
5. Required financial record.
6. Cart/order allocation claims.
7. Event applied state.

Any required failure rolls back all seven. Notification delivery is outside this transaction and must not determine payment truth.
