# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/debate-swa200-blueprint-2026-08-23/R6-PACKET.md
**Tokens:** 7951 in / 3720 out (reasoning: 3289) | total 11671
**Wall:** 56.7s

---

**Not clean. The streak is six. DeepSeek's try/catch fix reintroduced the exact `entry-broken` defect class under a new name.**

**`outcome:"unknown"` has no shape in 7.1 and no branch in the mermaid.**

- 7.1 defines five shapes. Shape 5 covers `"outcome":"incomplete"` only. A deploy that emits `POST-MIGRATE-ATTESTATION {"pendingAfter":"unknown","outcome":"unknown",...}` matches nothing.
- The mermaid's A3 node branches on `POST outcome:incomplete`, `verified twice`, PRE/POST presence — never on `unknown`. The flow has nowhere to route it.
- It breaks shape 5's exhaustiveness claim. A1's contract says "a failed migration is POST-present with `outcome:"incomplete"`" — no longer true. A failed migration whose post-check query throws is POST-present with `outcome:"unknown"`, exit code propagated, build red. That is section-9 territory (possible partial migration), and section 9 step 3 keys off shape 5. Nothing routes an operator there.

This is GLM's round-5 finding verbatim — "no shape, no branch" — recreated by the fix that deleted its predecessor. The irony is that your question 2 named the exact mechanism.

**Fix (minimal):** add a sixth shape and one A3 branch: `POST present, "outcome":"unknown"` → post-check query threw; **read the build color** — green means migration succeeded, verification lost, re-run the pending-set query manually; red means treat as shape 5 → section 9. One shape, one edge, one sentence in shape 5 conceding it is no longer the only failed-migration signature.

Everything else checks out: no dangling `entryImports` reference outside the DO-NOT-ADD block, the shadow-workflow pointer is consistent, `fatalInWarn:true` in the 7.1 sample matches the computed form, shape 1 and 3.5 footnotes are in place.
