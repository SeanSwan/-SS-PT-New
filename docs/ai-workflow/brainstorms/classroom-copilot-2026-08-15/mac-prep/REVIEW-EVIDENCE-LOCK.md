# Review Evidence Lock

## Frozen inputs and receipts

- Panel packet: `CLASSROOM-HERMES-RADAR-PANEL-PACKET-2026-08-21.md`
- Packet SHA-256:
  `FF09857BBDD5D86563AC1FA13CBB4ADA26C1DE04E1B16C43F7F1C31855061AE5`
- Kimi K3: `moonshotai/kimi-k3`, finish `stop`, $0.0638, verdict REVISE.
- GLM 5.3: `glm-5.3`, complete, one Z.ai plan credit, verdict REVISE.
- Grok 4.6: `x-ai/grok-4.6`, finish `stop`, $0.0958, verdict REVISE.
- GPT-5.6 Sol Pro: `openai/gpt-5.6-sol-pro`, complete tokens/wall-time receipt,
  $0.8319, verdict REVISE. Its seat header does not record `finish_reason`; do
  not upgrade that missing field into a direct receipt.
- Fable 5: in-session synthesis, $0 incremental.
- OpenRouter sum: $0.9915; failed Codex attempt remains UNPROVEN and excluded.
- Final: 4/4 REVISE; Fable ruling **REVISE BEFORE MAC**.

## Ledger-count correction

The table itself contains 30 decisions: **22 ADOPT, 2 REJECT, 2 DEFER, and 4
NEEDS PROBE**. A prose recap reported a different roll-up. The deterministic gate
uses the 30 table rows, not the recap. D-01 and D-02 are panel-run decisions and
are both explicitly classified ADOPT in the ledger.

No inherited review artifact was edited to hide that discrepancy.

## Adopted locks checked by code

- no daily deal;
- deterministic local allergy check;
- Qwen 3.8 27B is not the Mac default;
- SwanGuard physically lacks child-capable fields;
- pseudonymous child narratives remain child records;
- child-specific content is never external-provider eligible;
- broker status remains BLOCKED/UNPROVEN.

## Reproduction

```powershell
node scripts/classroom-hermes/review-evidence.mjs
```

The verifier reads the original packet, four seat files, synthesis, decision
ledger, and blueprint; it emits a machine-readable receipt and exits nonzero on
drift. It makes no network or model call.
