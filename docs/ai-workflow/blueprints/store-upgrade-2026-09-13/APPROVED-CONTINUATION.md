# Approved continuation

Sean answered "Yes, you have full approval. Please continue." to the pending
requests to finish tested implementation followed by combined Astra review,
deferring further GLM passes, and use one existing free Codex reset if needed.

The original README, readiness receipt, source preservation and all schema-3
reviews remain intact. This addendum supersedes their per-slice review timing.
Astra owns architecture, adjudication and repairs; Luna owns bounded builds.
All actual tests and traceability remain required. Current reviews and three
open Astra findings remain evidence, not completed repair approvals.

Migrate through supported schema 4, retaining all four admissions and a cap of
twelve. Test S1 repairs, then build S2; combine for final Astra review/repair.
No paid API, reset without actual need, commit, push or deployment.

S1 repair contracts:
- Probe the variant table again after a ten-second negative-cache interval. Keep a
  successful availability cache. An absent optional table still degrades to
  an empty variant include; a later migration/recovery can restore it.
- Emit null priceDetails unless both monthly schedule values are positive
  integers. Complete schedules retain their current wording.
- Reject price, totalCost, displayPrice and pricePerSession sorting with HTTP
  400 and code UNSUPPORTED_PRICE_SORT, before model reads. Ordering is otherwise
  unchanged. This avoids false global order, partial-page sorting and hidden
  training-price inference. No mounted caller requests money sorting.

S2 uses original requirements and s2-build-brief.md. Scope adds the actual
AscensionPage/components/VaultCard.tsx plus a compatibility entry at the previously
planned AscensionPage/VaultCard.tsx. No unrelated historical component rewrite.
Partial build evidence remains distinct from final approval/deployment.
