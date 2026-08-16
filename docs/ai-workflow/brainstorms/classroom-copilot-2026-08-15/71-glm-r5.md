# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/70-PACKET-R5-REVIEW.md
**Tokens:** 12455 in / 31092 out (reasoning: 21609) | total 43547
**Wall:** 523.3s

---

# ROUND 5 — Hostile + Security Review of the Orchestrator's Decisions

**Declared strongest angle: data-model / systems correctness** — the strike mechanism, the event log, the expiry guard, the spec-to-build contract. Security is my second angle and gets near-equal depth; product, legal, interaction, and strategy are covered throughout.

---

## 1. THE THREE FINDINGS I WOULD DEFEND HARDEST

**F1 — The blueprint now contradicts itself in three places, and a builder following Part 3 will build the rejected rules.**
The three decisions were "adopted provisionally into the blueprint," but Part 3 was never updated:

- B3 step 6 still says *"two cumulative → local flag disables model extraction for family-note paths permanently"* — the **old** kill criterion the orchestrator just rejected.
- B6 cross-cutting kill criterion 3 still says *"Two occurrences kills the model path for family notes permanently; rules-only forever."*
- B3 step 9 and the B2 `expires_at_ut` note still say **"+30d, O-managed setting"** — the default decision ② just replaced with school-year + one term.
- B1's transfer diagram says *"USB / home Wi-Fi"* while the new wording locks *"same-room"* — and the home-Wi-Fi channel is **unbuildable without the INTERNET permission** (see B3 attack).

Nobody has reviewed the orchestrator's propagation, and this is why: the least-reviewed material is where the contradictions live. A slice contractor reading B3 will implement permanent death and 30-day expiry. **Severity: critical · Likelihood: near-certain · Cost-to-fix-later: high (it's the thing that gets built).**

**F2 — The "no new field needed" strike derivation is wrong as stated. The unrecoverable risk is not a column; it is the event-emission contract, which is worse than a column.**
The claim fails on ordering (wall clock is not monotonic), on granularity (the spec literally logs `handed_off(child_id)` into a table that has no `child_id` and is keyed by `record_id`), on ties, on correction round-trips, and on the copy-then-dismiss path. Full demolition and corrected design in Part A. **Severity: critical · Likelihood: certain if built as written · Cost-to-fix-later: unrecoverable — mis-emitted event history cannot be retrofitted.**

**F3 — The security floor regressed between Round 4 and this blueprint, and the weakest period is the first weeks of real data.**
Round 4's fix list included SQLCipher + Keystore (Kimi). B1 now says *"copilot.db — expo-sqlite DB; OS file-based encryption at rest."* That is a **silent downgrade to FBE**, which decrypts after first unlock and yields to forensic tooling on a powered-on lost phone. Meanwhile app-lock, `FLAG_SECURE`, and biometric gating arrive only in **S12** — meaning S1 through S11, the period when she's entering real data and the app is least trusted, is the period of plaintext DB, app-switcher snapshots of child records, and no app lock. Add: `allowBackup=false` alone is **insufficient on Android 12+** — `dataExtractionRules` must also exclude cloud backup and device transfer, or Auto Backup/D2D can still move the sandbox. **Severity: critical · Likelihood: high (lost phone over a school year is a base-rate event) · Cost-to-fix-later: high (a plaintext-then-migrate path means a real exposure window).**

---

## 2. PART A — THE STRIKE-DERIVATION CLAIM, IN DETAIL

**The claim:** *a `child_corrected` whose `at_ut` is later than a `handed_off` on the same `record_id` = a strike; earlier = not a strike; derivable from the v1 schema with no new field.*

**Verdict: wrong as stated. Half-salvageable. No new column is strictly required, but the assertion as written is false in four independent ways, and the thing that must be frozen in v1 is not a column at all — it's the emission contract.**

### A1. Ordering: `at_ut` is wall clock, and wall clock is not causal order

- **DST / timezone travel:** immaterial — epoch UTC is offset-invariant. This part of the claim survives.
- **NTP hard step-back and manual clock changes:** fatal. If the clock steps backwards between the handoff write and the correction write, the correction's `at_ut` is *numerically earlier* than the handoff's despite happening *after* it. The strike rule silently inverts — exactly in the direction that under-counts. Android usually slews time smoothly, but hard steps happen (manual set, NTP correction after offline periods — and this teacher's phone may spend all day in a building with poor signal).
- **Same millisecond:** `child_corrected.at_ut > handed_off.at_ut` is false on ties. Ties are not exotic — both writes can occur inside one review pass.
- **`id` is a UUID** — random, no ordering. There is currently **no authoritative causal ordering anywhere in RECORD_EVENT.**

**Fix:** the authoritative ordering is **rowid** (SQLite autoincrement = write order = causal order on a single-device, single-writer database). Rule: *event ordering is always by rowid; `at_ut` is human-readable metadata only; no safety logic ever compares two `at_ut` values.* Document this in the schema comment; it costs nothing and it is the difference between a counter and a random number generator.

### A2. Granularity: `handed_off` doesn't fit the table it's supposed to live in

B3 step 8: *"Each copy logs `handed_off(child_id)`."* RECORD_EVENT has `record_id FK`, `from_value`, `to_value` — **no `child_id`**. So the spec's own logging sentence is unimplementable as written. Three possible readings:

1. One `handed_off` row **per record included in the copied note** (correct, but unstated — and a 6-record note logs 6 events);
2. One row per copy with a null/garbage `record_id` (breaks the FK semantics and makes the orchestrator's "same `record_id`" comparison impossible);
3. `child_id` smuggled into `from_value` (works, but is a convention nobody wrote down).

A family note is assembled from multiple accepted `obs`/`parent` records and copied **as one blob**. The only correct granularity is **per-record membership in a copy action**, which requires an emission contract: *on [Copy note], in one transaction, write one `handed_off` event per included record, with `to_value` = the child_id as-at-copy, all sharing one `group_id`.*

That leads to the one field I would actually add: **`RECORD_EVENT.group_id TEXT NULL`** — a UUID per copy action. It is strictly derivable-by-reconstruction without it (group by transaction), but reconstruction code is code that never gets written, and `group_id` makes the recall surface (see E1) a one-line query instead of an archaeology project. By the project's own "unrecoverable if missing" bar it is optional; by the "will anyone actually build the reconstruction" bar it is cheap insurance.

### A3. The re-copy / dismissal paths

- **Copy → correct → re-copy (the amends case):** works under per-record semantics. `handed_off@14:00`, `child_corrected@14:30` → strike (correct — the wrong name reached a family at 14:00), `handed_off@14:35` under the right child. Fine.
- **Copy then dismiss:** she copies the note, pastes it, later realises record X belonged to another child — and **dismisses** it instead of correcting. `dismissed` ≠ `child_corrected`. **No strike fires. The wrong attribution reached a parent and the counter never knows.** This is a real path: dismissal is the natural gesture for "that shouldn't have been in the note." Fix: log it, surface it in the O-diagnostics counts as *ambiguous-after-handoff*, don't auto-strike (she may be dismissing for content reasons) — but do fire the recall alert (E1), because the harm is identical regardless of her gesture.
- **Edited but never handed off:** correctly not a strike.
- **Handed off but never accepted:** impossible by construction (drafts build from accepted records only) — but this creates the sibling defect in A4.

### A4. "She corrected it" ≠ "the model was wrong"

- **Mind changes and late information:** the model attributed A; new information at pickup says B. The model wasn't wrong at the time. Counting every `child_corrected` on a `attribution_src='model'` record as model fault over-counts.
- **Mis-tap round trips:** correct A→B in the correction sheet, realise the tap was wrong, correct B→A. Under a naive event count that's two corrections — and under the *old* locked criterion, two "wrong_child" events would have killed the model path off **her own fumble**. Over-counting is as dangerous as under-counting; a kill criterion that can be triggered by two mis-taps in the bottom-sheet is a hair trigger.
- **Record splitting:** "A and B built together" attributed to A, then she splits it. Splitting isn't in the event vocabulary at all (separate defect, D-list).

**Fix — compute strikes from net state across the handoff boundary, never from event counts:**

> A strike exists for record R iff (a) R has ≥1 `handed_off` event H, (b) R's *final settled* child_id ≠ the child_id snapshotted at H, (c) ≥1 `child_corrected` event exists after H's rowid, and (d) the attribution at H was `attribution_src='model'`.

Round-trips cancel automatically (final == snapshot → no strike). Mind-changes still count — acceptable residual over-count, symmetric, and bounded.

Related cleanup: the spec currently has **both** `child_corrected` and `wrong_child` in the event enum, and step 6 says model-attributed corrections "log a `wrong_child` event." Two sources of truth for one concept will drift. **Make `wrong_child` a derived query, never a stored event.** Emit only raw facts (`child_corrected` with from/to); compute strikes.

### A5. The concession question: is "the counter under-reports" sufficient?

**No — not for the decision as adopted, because the decision makes the counter load-bearing in a way the concession disclaims.** The orchestrator's own honest-weakness paragraph says the real defence is the confirmation tap and the counter is a lagging indicator — and then the adopted ladder makes the confirmation tap a **punishment that only exists after strike 1**, i.e., contingent on the lagging indicator. That is internally inconsistent. Between the error and its (retrospective, maybe-never) detection, the model continues pre-filling at full trust, and bulk-accept exists in the loop.

The criterion is **sound as a lagging quality metric** and **unsound as a safety mechanism**. To make the whole decision coherent:

1. **Day-one posture = model proposes, never pre-fills; a confirmation tap is required for any model-attributed child on any record entering a note draft.** Scope the tap to low-confidence and pronoun-resolved attributions so rule/name matches still flow frictionlessly. This is *cheaper* than building pre-fill and reworking it after strike 1.
2. **The strike counter exists for O's diagnostics and the S1 acceptance test** (where she reviews every record in a 20-sample window, so detection is near-complete there — the gate remains measurable).
3. **The response to a detected strike must be family-facing, not only model-facing** — see E1. The harm already reached a parent; degrading the model doesn't fix that, and nothing in decision ① addresses it.

### A6. Corrected design, in full

- Order events by **rowid**; `at_ut` never used for causality.
- **Emission contract (freeze in v1):** one `handed_off` per included record per copy action, single transaction, `to_value` = child-at-copy, shared `group_id`. Log **before** `Clipboard.setStringAsync` — a clipboard failure then over-logs handoffs (safe direction), never misses one.
- **Strike = derived** per A4's rule; `wrong_child` removed from the emitted enum.
- Add `RECORD_EVENT.group_id TEXT NULL` (recommended) and `RECORD.model_ref TEXT NULL` (the model file version/hash — see D3).
- Handle `dismissed`-after-handoff as an uncounted-but-alerted case.

So: the orchestrator's *conclusion* ("no new column strictly required") is defensible; the orchestrator's *reasoning* ("derivable from `at_ut` comparisons on the same record_id") is not, and if it's implemented as written the strike history is garbage from day one — which, per the project's own framing, is the true unrecoverable.

---

## 3. PART B — THE THREE PROVISIONAL DECISIONS

### B1. Wrong-child response: uncorrected-only count + graduated degradation

- **Product:** the direction is right (I'd have voted with Kimi+HY3), but the ladder is mounted backwards — rung 1 is the *defence* and should be the *default* (A5). Strike 2's claim that type-classification carries "none of the risk" is an overclaim: types gate what enters notes (`obs`/`parent` only), so a model mis-type **into** `obs`/`parent` is a wrong-audience error of the same family as wrong-child. Small blast radius, but not zero; exclude model-typed records below a confidence threshold from note drafts.
- **Legal:** no new exposure vs the old rule; both keep everything local. The graduated rule is actually *better* legally because it keeps the system in a state she can correct.
- **Security:** unchanged attack surface; the strike state should be **computed from events, never stored as a bare SETTING** — a stored counter can drift from the events and cannot be audited.
- **Implementation:** the decision says it's reversible. It is not, in one direction: **mis-emitted event history is unrecoverable** (A2), and building pre-fill-then-taps costs more than taps-from-day-one. The "reversible" label on this decision in the log is wrong.
- **Missing entirely:** no forgiveness/reset semantics. Strikes are computed over all time; when O imports a *new model file* (modelImport exists; B7 #18 mandates pinned versions), the ladder cannot reset because **no record carries which model made which attribution** — you cannot distinguish "the new model is clean" from "the old model's strikes still count." This is a concrete schema gap (`RECORD.model_ref`), not a nicety.

### B2. Retention: school-year + one term, incidents exempt, opt-in scratch, view-not-delete

- **The arithmetic is wrong by roughly 10×, though the conclusion survives.** ~140 B/record counts only `body`. Real cost per note: 3 UUIDs ≈ 108 B alone, plus row overhead, plus the retained `CAPTURE.raw_text` (the same content again, unstructured), plus 2–4 RECORD_EVENT rows per record, plus 2–3× index amplification. Realistic all-in ≈ 1–2 KB/record → **~8–15 MB/year, ~40–75 MB over five years** — still ~2–3% of the model file, so "storage is a false argument" *survives*, but the "0.2%" rhetoric in the decision log is wrong and will be quoted. Recompute before it hardens.
- **The decision forgot CAPTURE.** "Bounded, school-year-aligned retention" applies to RECORDs; `CAPTURE.raw_text` is "retained always" — and raw dumps are the **most** sensitive artifact in the system (messy, context-laden, full of asides about parents and other children; the exact subpoena nightmare). Data minimisation that deletes typed fragments while retaining the unstructured source forever is not data minimisation. **Fix: a capture is purge-eligible when it is past the window AND no live/exempt record or incident references it** (`records(capture_id)` index is currently missing — D-list). This also preserves re-extraction for exactly as long as the records it supports — the only period it has value.
- **"Scratch" does not exist in the schema.** The decision was adopted; B2/B3 contain no scratch field, no scratch status, no scratch event. Same propagation failure as F1. Add `RECORD.scratch INTEGER 0/1 DEFAULT 0`; scratch marks expire in 48h with the same +7d grace; scratch-marking is per-record only (no bulk), visually distinct.
- **The retention pass runs at rollover — and no slice builds rollover.** B6 has S5 (weekly reset) and nothing yearly. The single highest-blast-radius operation in the app (a batch hard-delete) is scheduled to run for the first time at the most chaotic moment of the year, via a mechanism nobody has specced. Fix: continuous rolling purge (any app-open can purge anything past grace) + a rollover *dry-run report* ("will delete N records, oldest X, newest Y, M exempt") that a human confirms before the first real purge. Also note: DELETE doesn't shrink the file without VACUUM — irrelevant at 15 MB/year, but say it so nobody "fixes" it with a dangerous auto-vacuum.
- **Window adequacy:** "year + one term" covers in-year disputes and spring conferences. It does **not** cover the age-3 transition dispute (child moves to a new setting; a pattern question surfaces 12–15 months later). The cost of one more year is ~11 MB — effectively free. I'd set the default at **end of the *next* school year** and let the employer's answer shorten it. This is a genuine open sub-decision, cheap now.
- **Legal:** retention bounded on a personal device is the right posture; incidents exempt-forever is correct *because they're protective* — but see C for the corollary (the most legally exposed class held the longest on the weakest hardware must have the strongest at-rest protection and the most reliable backup — currently both arrive late or weakly).
- **"Nightly encrypted backup to T's own cloud" (S12) is unbuildable as written.** The app has no INTERNET and no background execution rights under Doze; a foreground-only app cannot do *nightly* anything. The real mechanism — SAF-persisted URI into the Drive documents provider, written on app-open when the last backup is >20h stale — works without permissions but is flaky in practice with Google's Drive provider over SAF. Specify "on-open backup when stale," test the Drive SAF write-path explicitly, and keep the USB fallback.

### B3. Sync wording

- **The wording contradicts the diagram:** "same-room" vs B1's *"USB / home Wi-Fi."* And **home Wi-Fi is unbuildable under the v1 boundary**: on Android, the INTERNET permission governs *all* sockets, including LAN. An app without it cannot open a listener or connect over Wi-Fi. The only permission-free channels are: (a) the app writes the `.ccbak` via SAF to a user-visible location, and she moves it by USB/MTP; (b) share-sheet → her Drive (ciphertext through the OS, consistent with the backup posture). Lock the *properties*, not geography: *no relay, no server intermediary, no automatic reconciliation, app never opens a socket, teacher initiates every movement.*
- **"V1 needs no transfer at all" is conditionally true** — true iff `llama.rn` + Qwen3-4B actually works on her S24 within the 8s budget. That integration is flagged as the known risk, which means the no-transfer claim rests on the project's biggest unvalidated assumption. Also, S6 (conference binder, Mac-side) arrives within the ~43–46-day build, so "build later" means "by slice 6."
- **The actual decide-now item is the `.ccbak` format**, because S1's backup already produces it and the Briefcase Studio consumes it. Same artifact, one format, frozen in S1 — the decision deferral is fine *only* because this is already true. State it.
- **Legal/security:** no new exposure. One leak to close (Part C): Briefcase Studio is a *localhost web app in her everyday browser* → every browser extension on that machine can read rendered child data, and browsers cache localhost page content to disk. Serve it in a dedicated no-extension context (dedicated Chrome profile launched by script, or a Tauri/Electron shell), decrypt in memory, never persist the decrypted snapshot; her Mac runs FileVault.

**Verdicts:** ① adopt **with** the A5/B1 corrections (day-one taps, derived strikes, model_ref, family-facing response). ② adopt **with** capture-level purge, scratch field, rolling purge + dry-run, and the window question re-opened to year+full-year. ③ adopt the wording **minus "same-room,"** plus the socket-free channel constraint and the Studio browser-context fix.

---

## 4. PART C — SECURITY REVIEW OF THE ABSENCE-BASED POSTURE

The posture is strong — the empty socket is genuinely the best control in the system, and `aapt dump` verifying no INTERNET also subsumes OTA-updates (`expo-updates` can't fetch without it), analytics SDKs, and poisoned-dependency egress. Now attack it anyway.

**C1 · Lost phone, powered on (the base-rate event).** FBE decrypts credential-encrypted storage after first unlock; a powered-on lost phone yields the sandbox to forensic tooling, and a phone snatched mid-use is fully live. With the SQLCipher regression (F3), the DB is plaintext-in-sandbox. **Fix: op-sqlite + SQLCipher (works in Expo dev builds), DB key in Android Keystore (StrongBox on an S24), biometric-gated on cold start, from S1.** A lost phone should yield a ciphertext file, not 7,560 rows about named two-year-olds.

**C2 · The window between app-open states.** No `FLAG_SECURE` until S12 → the app-switcher snapshot shows her last screen — likely the inbox or a family note. No app-lock until S12 → a partner/colleague/child picking up her unlocked phone opens the app freely. Both fixes are one-to-ten lines. **Move `FLAG_SECURE` + cold-start biometric to S1** (full 10-minute re-auth window can stay in S12). Sequencing security last is exactly backwards: the riskiest period is when the tool is new, trust is unformed, and habits aren't set.

**C3 · `allowBackup=false` is insufficient on Android 12+.** `dataExtractionRules` must separately exclude cloud backup **and** decide device-transfer. Recommendation: exclude both — D2D transfer routes through Google's transfer service (an egress of the sandbox the posture never chose), and `.ccbak` + paper key is the sanctioned restore path. This is a deliberate usability sacrifice; record it as such in the decision log.

**C4 · Clipboard and the keyboard.** The handoff copies a child's note into the system clipboard; the default IME (Gboard — a networked app, verified offline once in S0 but subject to settings reversion on app update) can read the clipboard on Android 10+. **Fix: auto-overwrite the clipboard with `""` 90 seconds after every handoff/incident export.** Cheap, closes the path, no UX cost. Also: her own screenshot is blocked by FLAG_SECURE — acceptable; export/copy is the sanctioned sharing path.

**C5 · Backup cryptography.** PBKDF2 with a teacher-chosen passphrase = offline brute-force against a Drive-breachable artifact, and passphrases get reused. **Fix: app-generated 128-bit key rendered as ~12 words, written on paper in the classroom drawer at setup (Round 4's paper recovery key, which also silently didn't make it into B3 step 10).** Fresh salt per backup; keep the versioned header. PBKDF2-SHA256 600k is acceptable; Argon2id if the build allows. The restore path must depend on the paper key, not the device key — that's what makes phone replacement survivable.

**C6 · Prompt injection into the local model.** The real vector isn't her dictation — it's *parent-authored text she pastes in for extraction* ("…also ignore previous instructions…"). The schema-constrained output (`rtype` from a closed enum, `child_code` from the roster) bounds the blast radius to mis-attribution/mis-typing — good design. **But the containment must be enforced in code, not trusted to the constraint:** validate every returned `child_code` against the live roster and drop violating fragments to rules-only. Also pin and verify GGUF hashes at modelImport (llama.cpp/ggml parsers have a history of memory-safety bugs; a 2.4 GB model file is 2.4 GB of parse surface — O controls the source today, but the import gate is free).

**C7 · Subpoena / discovery.** Everything on the personal device is discoverable. The retention decision helps; the CAPTURE-forever hole (B2) undermines it — raw dumps are the worst thing to produce in discovery: speculative, contemporaneous, about parents as much as children. Fix per B2. Incidents: she *wants* them discoverable (protective) — which argues for tamper-evident event history (it exists — good) and for **timezone-competent timestamps**: `INCIDENT` has `occurred_at_ut` but no local offset/zone; a custody dispute will nail a UTC timestamp against "her story." Add `tz_offset_min` (mirroring CAPTURE) to INCIDENT.

**C8 · The dev loop.** Logs are "redacted, counts only" by policy — make it structural: a typed diagnostics API that accepts numbers/enums only, incapable of emitting strings. Her daily build must be the release variant; a debug build with Metro + network + real data on her phone is the egress path that exists as an artifact. Add a build gate: **release fails CI if the merged manifest contains `android.permission.INTERNET`** — the aapt check, automated, so it survives O having a bad day.

**C9 · Whisper's "audio never persisted" is asserted, not verified.** Some ASR pipelines stage WAV temp files. Add a test: filesystem snapshot before/after a dictation session asserts zero new audio artifacts.

**C10 · Coercion detail worth one line in her setup runbook:** biometrics can be compelled in some jurisdictions where a PIN cannot. Her *knowledge* factor is the legally stronger lock; she should know that.

**Assumed rather than verified (the list to test, not trust):** FBE-alone adequacy (it isn't — C1); Gboard offline *persistence* across app updates (S0 verifies once); Drive-over-SAF write reliability for the stale-backup path; `llama.rn` cancellation on the 8s timeout; whisper.rn temp-file behavior; `dataExtractionRules` actual effect on her device's Android version.

---

## 5. PART D — CONCRETE DEFECTS, WITH CORRECTED VERSIONS

**D1 · `handed_off` doesn't fit its table (spec text is unimplementable).** Fix: per-record emission contract + `group_id` (Part A6).

**D2 · Event ordering by `at_ut` (non-monotonic; ties).** Fix: rowid is the causal order; document; no comparisons of `at_ut` in safety logic.

**D3 · No model version on attributions.** Strike rates can't be correlated to model versions; B7 #18 ("pin versions") is unenforceable; ladder can't reset on model swap. Fix: `RECORD.model_ref TEXT NULL` — the GGUF hash/version, set whenever `attribution_src='model'`.

**D4 · Spec contradictions (F1): B3 ¶6 and B6 kill-criterion-3 carry the *rejected* permanent-death rule; B3 ¶9 and B2 carry the *rejected* +30d default.** Fix: single source of truth — the decision log wins, Part 3 gets rewritten, and every future decision's adoption includes "spec delta applied" as a checkbox.

**D5 · `scratch` adopted but absent from schema.** Fix: `RECORD.scratch INTEGER 0/1 DEFAULT 0`; purge treats scratch as expiry+48h, same grace; per-record marking only.

**D6 · CAPTURE retention undefined → privacy hole + orphan accumulation.** Fix: capture purge-eligible iff past-window AND no dependent live/exempt record AND not referenced by INCIDENT. Add the missing index `records(capture_id)` (needed for both this join and general provenance queries).

**D7 · `status='promoted'` + `pinned` + `expiry_exempt` = three overlapping representations of "permanent," reachable in inconsistent combinations by bug (e.g., `status='promoted'` with `pinned=0, expiry_exempt=0` → the partial index *includes* it → purge deletes a promoted record).** Fix: make promotion an event + set both flags, and add `CHECK (status <> 'promoted' OR (pinned=1 AND expiry_exempt=1))`. Better: drop `promoted` from status and represent promotion purely as flags+event — one representation, no unreachable-but-reachable states.

**D8 · `wrong_child` as both stored event and derived concept.** Fix: remove from emission; derive (A4).

**D9 · Kill criterion 2 ("≥90% accepted without correction") is undefined at record level.** Does a *type* correction count? A body edit? Fix: per-record rule — an `accepted` event with zero prior correction events of any kind; corrections after acceptance don't count against it. Compute from events; write the exact query into the S1 test.

**D10 · Restore destroys current data.** "Verify schema version → replace" means restoring an old backup silently loses newer records — an unrecoverable error class in a system whose whole point is never losing protective records. Fix: restore writes to a new DB file, compares entity counts, shows a diff, requires explicit confirmation; the pre-restore DB is kept as a restore-point file; nothing is ever auto-replaced.

**D11 · Purge race with review.** She reopens an expired-but-graced record to correct the child while the purge deletes it mid-edit. Fix: single serialized connection, `BEGIN IMMEDIATE`, delete with `WHERE ... RETURNING` re-checking status/flags inside the transaction; any record with an event newer than `expires_at_ut` gets its grace clock restarted (touching = alive).

**D12 · Incident `child_id NOT NULL` blocks the real toddler-room case** — the unknown-perpetrator bite (mark found, two crying children, attribution genuinely unknown at record time). Fix: allow NULL + a `child_unresolved INTEGER 0/1` flag; the append-only event log records resolution later. An incident schema that can't represent uncertainty will push her back to paper at the worst moment.

**D13 · `INCIDENT_EVENT` correction semantics vs `locked_at_ut` undefined.** Fix: pre-lock, edits allowed but logged as deltas; post-lock, appends only. State it in the S3 acceptance test.

**D14 · S1 "crash-proof draft persistence" failure path holds the blob in memory only** — process death loses it, contradicting "never silently drop." Fix: append the raw text to a journal file before/alongside the DB insert; reconcile on next launch.

**D15 · DONE/supply auto-typing idempotency.** "A cleared item never re-enters from the same source capture" needs a key. Fix: `CREATE UNIQUE INDEX done_auto_dedupe ON done_item(record_id) WHERE source='auto_from_record'` (and the equivalent for the supplies queue keyed on `(capture_id, fragment_hash)`).

**D16 · "Tomorrow/Friday" resolution** — resolve via calendar-day arithmetic in the capture's local offset (never `ms + 86400000`), display the resolved weekday so a DST-weekend error is visible and one-tap correctable.

**D17 · Missing index for the Today/day-scoped queries** (`records(created_at_ut)`); harmless at 10k rows, correct anyway.

**D18 · `handed_off` ordering vs clipboard failure:** log the event *before* `Clipboard.setStringAsync` (A6) — failure over-logs (safe) rather than misses.

---

## 6. PART E — ENHANCEMENTS (ABSENCE-FIRST)

**E1 · The copied-notes ledger and recall surface — the single highest-value absence.** The event log already knows exactly what was copied, for which child, when. Build: (a) a "What went to families today" view (child, time, note text); (b) on any `child_corrected` or ambiguous `dismissed` after a handoff, an alert: *"This was in [child]'s note copied at 14:03 — you may want to fix it there."* This converts the one unrecoverable error class from silent-and-permanent into detected-and-actionable, and it's the *family-facing* half that decision ① is missing. Cost: a query and a screen.

**E2 · Year-end rollover as its own slice (S13).** Roster status transitions, new `school_year`, archive-view boundary, retention pass **with dry-run report and human confirmation**, previous year read-only. Currently nothing builds this, and decision ② depends on it.

**E3 · "Needs a who" queue.** Accepted-but-unattributed records currently vanish from the deliverable silently (drafts are per-child; NULL-child records are in nobody's note). A persistent daily surface until resolved — also makes S9's equity flag honest.

**E4 · Rules-only validation spike before the 12–15-day build.** Run the rules engine against 20 synthetic messy dumps modeled on real rest-window dictation; measure fragment coverage. If `llama.rn` stalls (the flagged risk), S1's ≥90% gate becomes a rules-only gate that has never been measured. A half-day spike kills the project's largest unvalidated assumption (see DISSENT).

**E5 · Structural redaction:** typed numeric-only logger (C8); CI INTERNET-permission gate (C8); dictation no-audio-artifact test (C9).

**E6 · Clipboard auto-clear (90s)** after every handoff and incident export (C4).

**E7 · Roster-setup collision check.** The phonetic matcher's failure mode is two children whose names/aliases collide (`<REDACTED-EXAMPLE-NAME>`/`<REDACTED-EXAMPLE-NAME>` — model-invented illustrative pair, redacted post-hoc because one matched the project's forbidden-name gate by coincidence; GLM never had access to any real roster). On setup day, run the matcher across the roster and *warn on any cross-child collision* — that's the ambiguity path working, but she should meet it on setup day, not mid-rest-window.

**E8 · Home-language aliases guidance at roster setup** (aliases exist; add the instruction) — cheap now, expensive to backfill after a year of dictation variants.

---

## 7. MASTER RANKING (severity × likelihood × cost-to-fix-later)

| # | Finding | Sev | Likelihood | Cost-later | Score |
|---|---|---|---|---|---|
| 1 | F1/D4 Spec contradictions — build will execute rejected rules | Critical | ~Certain | High | **Top** |
| 2 | F2/A Strike derivation unsound; emission contract is the must-freeze item | Critical | Certain if as-written | Unrecoverable | **Top** |
| 3 | F3 SQLCipher regression; security floor lands in S12 not S1; `dataExtractionRules` gap | Critical | High | High (exposure window) | **Top** |
| 4 | CAPTURE retained forever — privacy/discovery hole in decision ② | High | Certain | Medium | High |
| 5 | Day-one posture: confirmation tap as default, not punishment (A5) | High | High | Medium | High |
| 6 | Restore destroys newer data (D10) | High | Medium | Unrecoverable | High |
| 7 | `handed_off` logging before clipboard; purge race (D18/D11) | Medium | Medium | Medium | Mid |
| 8 | `scratch` absent from schema (D5); scratch purge semantics | Medium | Certain | Low | Mid |
| 9 | Rollover/retention pass has no slice (E2) | High | Certain (by year end) | Medium | Mid-high |
| 10 | `model_ref` missing — version pinning unenforceable (D3) | Medium | Medium | Medium | Mid |
| 11 | Studio in default browser = extensions read child data (B3) | High | Medium | Low | Mid |
| 12 | Clipboard/IME exposure; auto-clear (C4) | Medium | High | Low | Mid |
| 13 | Backup key = teacher passphrase; paper word-key (C5) | High | Medium | Low | Mid |
| 14 | Incident schema gaps: NULL child, tz offset, lock semantics (D12/D13/C7) | Medium | Medium | Low | Mid |
| 15 | Nightly backup unbuildable; on-open stale backup (B2) | Medium | Certain | Low | Mid |
| 16 | Arithmetic 10× off; window vs age-3 transition (B2/DISSENT) | Low | Certain | Low | Low |
| 17 | D7 status/flags inconsistent states; D15 dedupe; D14 journal; D16–D17 | Low–Mid | Medium | Low | Low |

---

## 8. PART F — THE NEXT SLICE: MY CALL

**Recommendation: a half-day "contract freeze" task before any S1 code, then move the security floor into S1, then the employer conversation lands before real captures. Ranked:**

**1. Spec consolidation + event-contract freeze (≈ half a day, no code).** Apply decisions ①②③ to B2/B3/B6 (kill the +30d text, kill permanent-death text, resolve the sync channel); freeze the RECORD_EVENT emission semantics (rowid ordering, per-record `handed_off` with child snapshot + `group_id`, derived strikes, `wrong_child` removed from emission); add `model_ref`, `scratch`, `group_id`, `CHECK` constraints, the capture-purge rule, D9's exact acceptance-rate query. **Why first:** items 1–3 of the ranking are all *decision-propagation* failures, the fix is nearly free, and S1 is about to pour concrete — the event log written under wrong semantics is the one thing the project itself defines as unrecoverable. Nothing else on the list is cheap *and* unrecoverable-if-skipped *and* certain-to-be-needed.

**2. Security floor into S1 (≈ 1–2 days):** op-sqlite + SQLCipher with Keystore/biometric-gated key; `FLAG_SECURE`; cold-start app-lock; `dataExtractionRules` excluding cloud + D2D; generated paper word-key for backups; clipboard auto-clear; CI INTERNET gate; restore-safety per D10. **Why second:** it must exist before *real data*, not before S12; retrofitting encryption means a plaintext exposure window by construction.

**3. The employer conversation (minutes, already scripted) — plus the rules-only spike (E4, half a day).** The employer answer gates the *real-capture* phase of S1 and the retention number; it does **not** gate items 1–2, which are data-free. The spike gates confidence in the whole on-phone plan. Run both in parallel with item 1.

**On the three unanswered questions — do they block?**
- **Employer policy:** blocks S1's *field acceptance* (20 real captures) and the purge-job build (decision ② itself says the school's number wins). Does not block items 1–2. **Schedule before the real-capture test; treat as hard gate for real data.**
- **Rest window / family-note deadline:** blocks the FamilyNotes UI freeze and the handoff format, not the event contract or security work. Can trail by a week.
- **Parent-app per-child content:** same — blocks handoff formatting only. Not blocking for items 1–2.

---

## 9. DISSENT — WHERE THIS PACKET'S OWN ASSUMPTIONS ARE WRONG

1. **"Reversible" is false labeling on two of the three decisions.** Retention deletions and mis-emitted event history are the two most irreversible artifacts in the project. The decision log's reversal-cost column understates ① and ② by treating them as UI-level choices.
2. **"V1 needs no transfer at all" rests on the project's least-verified assumption.** The no-transfer claim is conditional on `llama.rn`+Qwen3-4B meeting an 8-second budget on an S24 — flagged as the known integration risk, never measured. If it stalls, S1's ≥90% acceptance becomes a rules-only gate that has never been tested against messy dictation. The E4 spike should precede confidence in "no transfer."
3. **The storage arithmetic is ~10× optimistic** (B2). The conclusion survives; the "0.2% of one file" rhetoric doesn't, and it's quotable.
4. **"Year + one term" quietly assumes disputes surface within ~7 months of year-end.** The toddler-room reality is transition-age disputes at 12–15 months. The marginal cost of another year is ~11 MB — the window is a choice being made on the wrong margin.
5. **The "absences are verifiable" principle is being oversold.** The empty socket covers *app-initiated* egress. It does not cover OS-mediated paths (Auto Backup pre-fix, D2D, Drive share of ciphertext), the clipboard/IME channel, forensic extraction of an unlocked device, or the dev-loop artifacts. Round 4's own organizing principle is right; its application here stops one layer short.
6. **Kimi's "the product dies when the model dies" overstates.** Rules-only still extracts — types, name matches, dates, supplies. What dies is pronoun/ellipsis attribution. The graduated ladder is right, but the argument for it was calibrated against a stronger claim than the truth.
7. **The orchestrator's employer-question framing, while honest, understates one thing:** the tool doesn't change what information exists, but it *does* change its searchability, retention, and copyability — which is exactly what a director's question 3 will surface. The corridor script is good; the packet should expect the director's answer to be shaped by that difference, not surprised by it.

**Bottom line:** the three decisions are directionally right and adoption-without-propagation is the failure mode. One decision (①) needs its defence moved from punishment to default; one (②) needs its purge to reach the raw captures and its window re-argued; one (③) needs "same-room" deleted and the socket constraint stated. And the single most urgent artifact in the project is a half-page emission contract nobody has written.
