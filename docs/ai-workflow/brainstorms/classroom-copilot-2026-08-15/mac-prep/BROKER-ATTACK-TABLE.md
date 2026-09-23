# Privacy Broker Attack Table — Future Gate, Not Current Proof

The privacy broker remains P0 BLOCKED/UNPROVEN. These 24 rows define future
evidence; they do not authorize external child content. Even after all pass,
child-specific narratives remain categorically local-only.

Receipts must HMAC approved low-sensitivity metadata with a secret held outside
the logs. Raw content and low-entropy unkeyed hashes are forbidden.

| # | Attack path | Required test | Pass evidence |
|---:|---|---|---|
| 1 | direct provider SDK | instrument every client constructor | broker-only caller graph |
| 2 | HTTP library bypass | attempt raw HTTPS POST | blocked before DNS/connect |
| 3 | DNS tunnel | encode canary in lookup | zero resolver observation |
| 4 | IPv6 bypass | call provider IPv6 address | outbound denied |
| 5 | QUIC/HTTP3 bypass | UDP/443 attempt | outbound denied |
| 6 | proxy env vars | set HTTP(S)_PROXY | request still broker-gated |
| 7 | custom base URL | point provider to canary sink | configuration rejected |
| 8 | streaming race | sensitive token after allowed prefix | no partial body transmitted |
| 9 | retry path | provider timeout after classification | no unreviewed automatic retry |
| 10 | fallback model | primary unavailable | no cloud fallback selected |
| 11 | tool callback | malicious tool returns narrative | classification blocks callback |
| 12 | browser automation | page instructs exfiltration | no planner execution authority |
| 13 | raw HTML/email | injection in merchant content | normalized card only |
| 14 | attachment/OCR | canary in image/PDF | route absent or local-only |
| 15 | voice/transcription | ambient synthetic speech | feature absent |
| 16 | clipboard/Handoff | synthetic canary copied | not read or transmitted |
| 17 | session history | prior local canary in memory | excluded from outbound context |
| 18 | logs/telemetry | error contains canary | no body in log/analytics |
| 19 | crash dump | synthetic secret during crash | no content in diagnostic bundle |
| 20 | backup/restore | restore old unsafe config | gate defaults remain deny |
| 21 | updater drift | update adds provider/tool | acceptance gate fails closed |
| 22 | second process | two writers share profile home | second writer denied |
| 23 | insider attribution | two adult identities act | individual audit/revocation receipt |
| 24 | receipt guessing | dictionary attack on metadata | keyed HMAC resists verification |

## Variance-reduction loop

1. Freeze exact code/config bytes and caller inventory.
2. Run all rows with public synthetic canaries and packet capture.
3. Repair validated findings.
4. Run a fresh-vantage review with reordered payloads and a new canary family.
5. Require two consecutive clean rounds after the last repair.
6. Bind the verdict to artifact hashes, tool/model versions, tester, timestamp,
   network configuration, and HMAC receipt key ID—not the key.

Any missing route inventory, failed capture, ambiguous output, model/tool drift,
or unavailable reviewer yields UNPROVEN/BLOCKED, never “safe.”

