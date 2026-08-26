# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/TASTE-BRAIN-ROUND6-PANEL-PACKET-2026-08-26.md
**Tokens (Ollama):** 63554 in / 1149 out | **Wall:** 45.8s | **done_reason:** stop

---
## VERDICT
REVISE — The "dry" claim is false: the `appendEvent` deduplication check is bypassable via JSON key reordering, allowing an attacker (or a buggy client) to inject duplicate evidence into a partner's memory, and the `unkeepFor` function is vulnerable to a `replace`-based deletion bug that can corrupt the kept-prompt file.

## BLOCKERS
1. **P0: `appendEvent` deduplication is bypassable via JSON key reordering.**
   - **Failure Scenario:** An attacker (or a buggy client) sends a valid `grid-selection` event to a partner memory. The event is written to disk. The attacker then sends the *same* event but with the keys in a different order (e.g., `sessionId` before `eventType` instead of after). `eventIdFor(e)` produces the same hash because it uses specific fields, but the dedup check in `appendEvent` (line 227) uses `fs.readFileSync(file, 'utf8').includes(`"eventId":"${eventId}"`)`. Since `JSON.stringify` preserves key order, the serialized line on disk has a different key order than the new request's `JSON.stringify(e)`, so the `includes` check fails. The event is appended again, creating duplicate evidence.
   - **Evidence:** `prompter/lib/events.mjs:227` (`if (fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes(`"eventId":"${eventId}"`))`). The `eventId` is computed from a subset of fields (`sessionId`, `eventType`, `ids`, `presentedAt`), but the check relies on the exact string representation of the entire object.
   - **Fix:** Compare `eventId` by parsing the existing lines and checking for a matching `eventId` field, or store `eventId` as a separate field in the JSON line and check for its presence.

2. **P1: `unkeepFor` is vulnerable to a `replace`-based deletion bug.**
   - **Failure Scenario:** A partner memory has a kept prompt: `a calm ocean scene`. The user tries to unkeep a prompt: `a calm ocean scene with waves`. The `unkeepFor` function (line 152) uses `md.split(/\r?\n/).filter((l) => l.replace(/^\s*[-*]\s+/, '').replace(/^`|`$/g, '').trim() !== text)`. The `text` is `a calm ocean scene with waves`. The line `a calm ocean scene` does not match, so it is kept. However, if the user tries to unkeep `a calm ocean`, the line `a calm ocean scene` does not match, so it is kept. But if the user tries to unkeep `a calm ocean scene`, the line matches and is removed. The bug is that `unkeepFor` does not check if the `text` is a *prefix* of a kept prompt, which could lead to unexpected behavior if the user expects to remove a partial match. More critically, if the `text` contains special regex characters, the `replace` calls could behave unexpectedly.
   - **Evidence:** `prompter/lib/taste-namespace.mjs:152` (`const out = md.split(/\r?\n/).filter((l) => l.replace(/^\s*[-*]\s+/, '').replace(/^`|`$/g, '').trim() !== text).join('\n');`).
   - **Fix:** Use a strict equality check after normalizing whitespace, and ensure that the `text` is not a substring of any other kept prompt.

## ATTACKS
- **Correctness:** The `appendEvent` deduplication bug (P0) is a correctness issue that allows duplicate evidence. The `unkeepFor` bug (P1) is a correctness issue that could lead to unexpected behavior.
- **Security:** The `appendEvent` deduplication bug (P0) is a security issue because it allows an attacker to inject duplicate evidence into a partner's memory, which could be used to manipulate the taste profile.
- **Data-truth / schema drift:** The `appendEvent` deduplication bug (P0) is a data-truth issue because it allows duplicate evidence to be written to disk, which could lead to a corrupted taste profile.

## HIGHEST RISK
The `appendEvent` deduplication bug (P0) is the highest risk because it allows an attacker to inject duplicate evidence into a partner's memory, which could be used to manipulate the taste profile. The cheapest concrete way to de-risk it before ship is to fix the deduplication check in `appendEvent` to compare `eventId` by parsing the existing lines and checking for a matching `eventId` field, or store `eventId` as a separate field in the JSON line and check for its presence.

## CONFIDENCE
I could not verify the behavior of the `appendEvent` deduplication bug (P0) from the document alone because I did not have access to the test suite. The evidence that would settle it is a test case that sends a valid `grid-selection` event to a partner memory, then sends the same event with the keys in a different order, and asserts that the second event is not appended. I am confident that the `unkeepFor` bug (P1) is real because I could reproduce it by reading the code.
