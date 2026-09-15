# H07 decision brief (Sean's call) + the schedule census slice plan

Layered on receipts 19–25. Still no commit; base c0cbe538d, working-tree only.

## H07 — the severe-pain 422 gate (bootcampGenerator.mjs:765)

Behavior today: when ANY client on the trainer's active roster has a pain alert with severity >= 7
(unmapped region or flagged exercise), EVERY class that trainer generates throws
`422 BOOTCAMP_PAIN_REVIEW_REQUIRED` — even classes for other clients, even when pain-aware gating
already swapped the flagged exercise to a joint-friendly alternative. Fail-closed by design; the
question is whether the DESIGN is right. Options:

- **A. Keep as-is** (strongest safety; one injured client blocks the whole roster's generation).
- **B. RECOMMENDED — scope to the class's own audience.** The gate fires only when the severe-pain
  alerts belong to clients actually assigned to THIS class (or when the class has no assignment:
  fall back to today's behavior). Gating already swaps flagged exercises; the 422 becomes the
  backstop for unswappable cases. Needs a product word from Sean + a RED test
  (generate with a severe-pain client NOT assigned to the class → 200; assigned → 422).
- **C. Downgrade to a warning**: generate + attach a `painReviewRequired` explanation block for the
  trainer to acknowledge. Weakest; changes the contract's fail-closed promise.

Sean's one-word reply (A / B / C) next session is enough; B has the RED test sketched above.

## Schedule census slice (ready to execute, one word)

Register items (receipt 25): `UniversalMasterSchedule` — SessionCard.tsx:89, ScheduleStats.tsx:117,
WeekViewGhostLayer.tsx:60, WeekView.tsx:198/231/256, DayViewStacked.tsx:151. Same treatment as the
planner surface: read styled base → `styled.div` → `styled.button` (+ resets) → delete
role/tabIndex/shim → `type="button"` → rewrite any shim-pinning tests → browser census on the
mounted schedule route (extend the a11y spec pattern; stub `/api/sessions/**` like the protected
smokes). Then `tsc` + the affected suites + Playwright run, receipt 27.
