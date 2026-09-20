# PART A — Hostile Review (Astra Pro)

> Review first, per the Forge: findings carry file:line evidence and a fix.
> A finding without a fix is not a finding.

---

**Verdict: REVISE.** The package below corrects the planning defects; it does not certify the implementation or authorize engine changes.

[VERIFIED] Inspected checkout: `creator-brains-engine-r2-20260915`, HEAD `6065985dd5b20045360f0fa0b97ff98edd4b6cae`, dirty shared tree. The console and packet directories are untracked. The on-disk input packet SHA-256 is `798b015cf2e8d483dcd42b118367be0b2b6281b5ed91d61b5779a4206a72d160`.

[VERIFIED] Archive query returned one unrelated Aftertaste review whose scope expressly excludes the Creator Brains engine. Supplied historical console reviews were considered. No suites, browser probes, migrations, or provider calls were run in this pass. Historical test counts below remain historical evidence.

**A1 — Existing-package findings**

Evidence paths beginning `console/` resolve under `scripts/creator-brains/`. Numbered document references identify the supplied packet documents.

| ID | Severity / confidence | Finding and evidence | Concrete correction |
|---|---|---|---|
| A1-01 | High [VERIFIED] | **The permitted installation layout breaks the additive gate.** `01-requirements.md#Business rules`, item 4 permits dependencies beneath the engine; `16-s1-hostile-review.md#S1-H14` records the engine walker collecting them. | Recommend D7 relocation outside the engine tree. Require Sean’s location decision, byte preservation, import/launcher repairs, and fresh engine results. Do not claim relocation fixes the independent HR14f failure. |
| A1-02 | Medium [VERIFIED] | **Readiness and pending decisions contradict later receipts.** `README.md#Sean decisions pending` retains the 300-line decision; `16#19` closes it. `07-traceability.md` labels everything PLANNED; `14#4` records S1 implementation. `02#6` retains viewport-triggered loading despite `14#3`. | Replace present-tense status with the state ledger below; preserve historical receipts unchanged. Close the cap decision and CD3 choice. Carry the later loading contract forward. |
| A1-03 | High [VERIFIED] | **The canonical adapter contract lost implementation corrections.** `05-contracts.md#1` declares numeric creator counts, omits brain generation, and narrows canary provenance. Actual `console/web/src/adapters/types.ts#CreatorRow` permits null counts; `console/lib/health.mjs#healthReading` permits unknown provenance and null timestamps. | Publish corrected types, validate every newly consumed response, and prohibit fabricated zero counts. |
| A1-04 | High [VERIFIED] | **The drawer has no claims and its identifier is misdescribed.** `console/lib/brains.mjs:135` returns `claims: []`. `lib/render.mjs:13`, `:89`, and `:147–149` establish channel-ID namespaces. `03-wireframes.md#Brain drawer` promises claims; `05#1` calls the identifier a slug. | Use channel ID as the public brain key. Implement claims from the same pinned published generation as the markdown. Add a nonempty production-shaped fixture and mixed-generation test. |
| A1-05 | High [VERIFIED] | **Run acceptance and completion lack executable correlation.** `05#2b` promises immediate `{runId}` from spawning `run-daily.mjs`; that script does not accept a caller-provided run ID. `04-flows.md#F1` checks journal `ok`, while `lib/store.mjs:254` writes `completed` or `failed`. | Return a console request ID with `runId:null` at acceptance. Correlate the child PID to an engine journal, then use the corresponding engine run record. Never interpret process exit or lock disappearance as success. |
| A1-06 | High [VERIFIED] | **A console mutex cannot protect the shared journal from external runners.** `lib/run.mjs:107` writes the journal before attempting the engine lock at `:154`. `09#H1` calls the lock a sufficient backstop. | Gate S4 on a two-process journal-preservation test. If it fails, hand the defect to the engine owner; no console patch to engine files. |
| A1-07 | High [VERIFIED] | **Repair is not the documented operation.** `run-commands.mjs:156–163` runs reconciliation, build, and export, then returns an exit code. It does not return `{requeued}`. `05#2b` and T-B10 assume otherwise. | Invoke the same `runDaily` configuration through a console wrapper and return a projected engine result with `repaired`, `built`, and `emptied`; share the run-operation exclusion gate. |
| A1-08 | High [VERIFIED] | **Backup contradicts the strongest privacy invariant.** `01#Business rules`, item 1 bans exporting raw transcript JSON through any console surface. `backup-command.mjs:46–59` copies the durable set, including transcripts. Optional browser-supplied `dest` has no containment contract. | Keep Backup visible but blocked, with no endpoint, until Sean explicitly decides whether an engine-only private backup is an allowed exception. Never substitute a derived-only copy and call it a full backup. |
| A1-09 | High [VERIFIED source; LIKELY browser exploit] | **Host validation does not specify cross-origin write protection.** `console/server.mjs:97–130` checks Host; `console/lib/http.mjs:151–162` parses bodies without an Origin or JSON media-type gate. The packet equates loopback plus Host checking with the complete trust boundary. | Require same-origin browser writes, JSON media type, and a fixed custom request header; retain no CORS permission. Test a foreign page sending a simple `text/plain` request to the loopback URL. |
| A1-10 | Medium [VERIFIED] | **Caching reduces blocking frequency, not blocking duration.** `console/lib/health.mjs:122` still calls `probe()` synchronously. `13#3.5` declares the blocking class closed; `16#14` acknowledges cold-cache stalls. | Measure cold and expired-cache behavior separately from warm p95. Move the probe to a console-owned worker while retaining TTL, history, and provenance semantics. |
| A1-11 | High [VERIFIED omission; HYPOTHESIS until tested] | **Containment evidence does not cover poisoned pointers or filesystem links.** `console/lib/brains.mjs:106–121` joins the pointer’s generation into a path; `lib/render.mjs:58–59` reads a pointer without validating its namespace. Supplied probes mostly use nonexistent hostile names. | Validate channel ID, generation component, canonical containment, and link policy before reading. Test an existing malicious pointer and a junction/symlink escape, with a positive published-brain control. |
| A1-12 | Medium [VERIFIED] | **Re-adding is incorrectly documented as always disabled.** `lib/registry.mjs:91–94` expressly preserves existing consent; `console/lib/creators.mjs#addCreatorRow` returns zero counts regardless of existing state. | New creators start disabled; existing creators retain enabled state. Return measured or null counts. Test re-add of an enabled creator with fetched videos. |
| A1-13 | High [VERIFIED] | **“Non-2xx means nothing changed” is too broad.** `16#S1-H9` correctly prohibits a post-write application refusal, but cannot prove no mutation after a lost response or unexpected failure. | Separate confirmed pre-write refusal from uncertain outcome. Never automatically retry a mutation after timeout/disconnect; reconcile with authoritative reads. |
| A1-14 | Medium [VERIFIED] | **Tests and visual contracts leave material gaps.** `06#Commands` uses a glob that does not actually exclude `live.test.mjs`; `03` has 414px but no 375px drawing; `<5% visual energy` is not measurable; `07` claims almost no mocks despite fake fetch/WebGL/browser stubs. | Explicitly enumerate non-live tests. Supply 375px layouts, measurable motion limits, and a boundary-specific evidence matrix. |
| A1-15 | Medium [VERIFIED] | **Malformed UTF-8 coverage overclaims its guarantee.** `console/lib/http.mjs:162` decodes with replacement characters before JSON parsing. `16#17` assumes replacement necessarily makes JSON invalid; replacement inside a quoted string need not do so. | Decode with fatal UTF-8 validation. Add invalid bytes inside a JSON string, not only outside JSON syntax. |
| A1-16 | Low [VERIFIED] | **Attribution and cost claims disagree inside the packet.** `12#Attribution` corrects the alleged HY4 attribution; README still certifies HY4. `10#1` says approximately 75k tokens while `10#3` estimates 16–20k. | Preserve receipts, mark served identity unverified where appropriate, and remove predictive subscription-usage claims. This review makes no claim about remaining allowance. |

**D1–D9 adjudication**

| Decision | Verdict | Binding result |
|---|---|---|
| D1 | **ACCEPT** | Raw `three`, one lazy chunk. The asserted r3f weight comparison is not established by this review and is unnecessary to the decision. |
| D2 | **ACCEPT** | Zero-dependency `node:http` bridge. Console-owned Node workers are permitted; npm dependencies remain web-only. |
| D3 | **AMEND** | One polling coordinator: active 2 seconds, active beyond 10 minutes 5 seconds, idle 5 seconds, hidden 15 seconds; immediate refresh on visibility return. Amend `02#5`, `08#S4`, and polling contracts. |
| D4 | **AMEND** | All ten menu actions remain product scope. Restore/rollback/authorize remain excluded. Backup remains blocked by the unresolved privacy contradiction, not silently removed from scope. Amend `01#R8`, `05#2b`, `08#S3`. |
| D5 | **ACCEPT** | Closed Crystalline Swan tokens. Warning/staleness uses gold; red is reserved for errors/destructive semantics. |
| D6 | **ACCEPT** | `.cmd` → bind loopback → open browser. No Electron. |
| D7 | **AMEND — owner decision required** | Recommend **OVERTURN to `packages/creator-brains-console/`**, but do not execute the move without Sean’s decision expressly reserved in `15#3-D7`. Amend `02#2`, `05#1`, `08#S0–S6`, launcher, import roots, source walker, README pointer, and direct-entry detection. S0/S1 re-enter relocation verification. |
| D8 | **ACCEPT** | React component plus adapter prop. S7 transfers UI, not an implicitly network-exposed loopback bridge. |
| D9 | **AMEND** | Replace “<5% visual energy” with numeric motion limits below. Preserve static reduced-motion, one entry dolly, and hidden/offscreen pause. Amend `02#5–6`, motion contract, T-T2/T-E3. |

**A2 — One review of the draft package**

These draft defects were found and corrected in the emitted Part B.

| ID | Draft defect | Correction reflected below |
|---|---|---|
| A2-01 | Moving the whole `addCreator` operation to a worker would extend the registry read/write race. | Worker resolves only. Parent calls engine `addCreator` afterward with a synchronous resolved-value hook, so the engine re-reads the registry at commit time. |
| A2-02 | Reading drawer claims through a second `loadHits()` call could observe a newer pointer than the markdown. | Pin one pointer and generation; read all four allowlisted derived files from that generation. |
| A2-03 | A request ID could be mistaken for an engine run ID after bridge restart. | Separate identifiers, make launch metadata ephemeral, and show uncertainty after restart unless engine evidence establishes identity. |
| A2-04 | Proposed cancellation could imply rollback of an already dispatched write. | Cancel closes only an unsubmitted form. Submitted mutations continue; disconnect means uncertain outcome, never cancellation success. |
| A2-05 | A relocation receipt based only on Git would omit these untracked sources. | Require a per-file source manifest and verified preserved copy, including untracked owned files. |
| A2-06 | A cold health worker failure could be displayed as healthy history without saying the current probe failed. | Require provenance, age, and failure note together; cached history never establishes current health. |

[UNKNOWN] Runtime exploitability, fresh suite outcomes, real GPU performance, launcher behavior after relocation, archive filing, and production-shaped browser completion remain unproven.

**Filing limitation:** [VERIFIED] This session is read-only. The [archive skill](~/Desktop/@Everything/quick-pt/SS-PT/.claude/skills/hostile-review-archive/SKILL.md) requires: “Every hostile-review pass leaves exactly one file in `Z:\HostileReviews`.” This response is therefore **unfiled review output**, not an archive-complete review. No source document or historical review was overwritten.
