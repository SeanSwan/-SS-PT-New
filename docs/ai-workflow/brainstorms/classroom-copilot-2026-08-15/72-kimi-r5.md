# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/70-PACKET-R5-REVIEW.md
**Seed:** (none)
**Tokens:** 12514 in / 10971 out | **Cost:** ~$0.2021 | **Wall:** 292.6s | **finish_reason:** stop

---

# ROUND 5 REVIEW — FULL-SPECTRUM

**Declared strongest angle: data modelling & logic correctness.** That is where this packet's worst wound is, so I go deepest there (Section A, Section D). All other angles covered.

---

## THE THREE FINDINGS I WOULD DEFEND HARDEST

1. **The Section A claim is destroyed on granularity grounds, before clocks are even relevant.** `handed_off` is logged per-*child* (B3 step 8: "logs `handed_off(child_id)`"); `child_corrected` is logged per-*record*. A family note is a multi-record blob. There is no join key. "Later than a `handed_off` event on the same `record_id`" references a relationship the schema does not contain. Two new tables and one event-ordering field are required **in v1** — this is exactly the "unrecoverable if missing" class.
2. **Part 3 contradicts Part 2's own adopted decisions.** The spec still says `expires_at_ut = +30d` (B3 step 9) after the retention decision changed it to school-year-plus-one-term; the `scratch` opt-in has **no field anywhere**; and `CAPTURE` is marked "retained always" while the retention decision invokes data minimisation. The blueprint adopted decisions it did not propagate.
3. **The absence-posture leaks at two unverified seams.** `allowBackup=false` is silently **ignored on Android 12+** unless `android:dataExtractionRules` is also set; and biometric app-lock + `FLAG_SECURE` sit in **S12** — meaning for the entire S1–S11 pilot period, a lost unlocked phone exposes named two-year-olds' behavioural records with no second factor.

Severity × likelihood × cost-later ranking governs everything below.

---

## SECTION A — VERIFY OR DESTROY THE STRIKE-DERIVATION CLAIM

**Verdict: destroyed. The claim is unsound on at least four independent grounds, two of which are fatal by construction rather than by edge case.**

### A1. Fatal: the join key does not exist (granularity)

The claim says: *"a `child_corrected` event whose `at_ut` is later than a `handed_off` event on the same `record_id`."*

But per B3 step 8, `handed_off` is logged with `child_id` — one event per **[Copy note]** tap — while the note is *"assembled from multiple records and copied as one blob"* (the round-4 D4 framing, which the orchestrator quotes approvingly). If a child has four accepted `obs` records, one copy produces **one** `handed_off` event. Which `record_id` does it carry? Four possibilities, all bad:

- It carries one arbitrary `record_id` → three of four records have no handoff marker; a later correction to any of them reads as "caught in review" → **strikes silently under-counted**.
- It carries a null/synthetic `record_id` → the join in the claim never matches anything → **zero strikes, ever**.
- It fans out to four events → now re-copy, partial re-draft, and child-switch semantics are unrecoverable from the log.
- It isn't written per-record at all → the claim's premise is fictional.

This alone destroys the claim. It is not a clock problem; it is a missing-relation problem.

### A2. Fatal: event ordering by wall clock is unsound, and the schema makes it worse

`RECORD_EVENT.id` is `TEXT PK` — a uuid. **Insertion order is not recoverable from the primary key.** The only ordering field is `at_ut`, an INTEGER of Unix ms sourced from the device wall clock. Against that:

- **NTP/manual clock correction can move time backwards.** A correction written after a handoff can receive an *earlier* `at_ut` → a genuine leak classifies as "caught in review." The failure direction is the worst one: it converts strikes into non-strikes.
- **Same-millisecond events** (bulk-accept + copy in one gesture chain) order nondeterministically.
- Timezone travel and DST do not move UTC, so those specific attacks fail — but they illustrate the design error: *ordering was never a wall-clock property in the first place.* Ordering is a log property.

**Exact field, named per the remit:** add **`seq INTEGER NOT NULL`** to `RECORD_EVENT`, populated from a monotonic source — either make the rowid authoritative (`id INTEGER PRIMARY KEY AUTOINCREMENT`, keep uuid only if sync ever needs it) or maintain a `seq` via `SELECT COALESCE(MAX(seq),0)+1` inside the same transaction as the event insert. All strike logic orders by `seq`, never `at_ut`. `at_ut` remains for display only. Missing from v1, every pre-fix event is permanently unordered — this is the exact "unrecoverable" class the project fears.

### A3. Substantive: "she corrected it" ≠ "the model was wrong"

The schema partially defends this (`attribution_src='model'` gate in B3 step 6), but three residue cases remain:

- **Reassignment of an ambiguous note** — the model attributed "the little boy who had a rough drop-off" to C3; she moves it to C5 because the note was *ambiguous*, not wrong. Counted as a strike; the model may have made the defensible choice. Over-counting direction: kills the model path falsely.
- **Copy → dismiss.** She copies the note, then dismisses the record (realising the attribution was wrong after the fact). `dismissed` is not `child_corrected` → **no strike, despite a confirmed leak**. This is an under-count in the worst direction.
- **Copy → correct → copy again** works under the claim. **Copy → correct → never copy again** also works. The broken cases are the silent ones.

### A4. Conceded but under-weighted: the unnoticeable leak

The orchestrator concedes the counter under-reports and calls the confirmation tap "the real defence." I agree the counter is not a safety mechanism — but then **the kill criterion as worded is unmeasurable in its decisive case**, and the packet should say so at the top of the decision log rather than in an "honest weakness" footnote. The honest restatement:

> The strike counter measures *detected* leaks. The zero-tolerance outcome is enforced by *prevention* (confidence-gated confirmation taps on all model attributions, built day one — not as a strike-1 penalty) and by the S1 20-capture sample. The counter is telemetry, and graduation triggers on it, knowing it lags.

### A5. The correct design (the fix, per the remit's demand for concreteness)

**New v1 tables (unrecoverable if missing):**

```sql
HANDOFF
  id TEXT PK, child_id TEXT FK NOT NULL, at_ut INTEGER NOT NULL,
  seq INTEGER NOT NULL            -- monotonic, same source as RECORD_EVENT.seq

HANDOFF_ITEM
  handoff_id TEXT FK NOT NULL, record_id TEXT FK NOT NULL,
  PRIMARY KEY (handoff_id, record_id)
```

Every **[Copy note]** writes one `HANDOFF` + one `HANDOFF_ITEM` per record in the blob. Then:

> **Strike := a `RECORD` with `attribution_src='model'` that appears in `HANDOFF_ITEM`, and that subsequently (by `seq`) receives a `child_corrected` event OR a `dismissed` event.**

Pre-handoff corrections are never strikes (system working). Post-handoff dismissals count (conservative; a dismissal of a model attribution after exposure is a leak until proven otherwise). Ambiguity-reassignment over-counting is accepted deliberately — the failure direction favours her protection.

Also required in v1: `SETTING.model_mode TEXT CHECK IN ('full','suggest_only','rules_only')` — the graduation state must be durable, derived-at-startup from the strike query, not recomputed from memory.

---

## SECTION B — THE THREE PROVISIONAL DECISIONS, ATTACKED

### B1. Wrong-child response (count uncorrected; graduate, don't terminate)

**Merits: the graduation shape is right and I uphold it** — Kimi's round-4 argument stands: rules-only cannot resolve pronouns either, so terminating the model path terminates the product, and a kill criterion that kills the product for *doing its job with a caught error* is a suicide pact. The zero-tolerance spirit is correctly relocated to "a wrong name reaching a parent."

**Attacks:**

- **The trigger is broken (Section A).** Graduation is only as sound as strike measurement; fix A before this decision means anything. Currently the system would graduate on noise or never graduate at all.
- **Inconsistency inside the decision:** strike 1 is defined as "suggest-only + confirmation tap" — but the same document says the confirmation tap is "the real defence… built either way." If it is the real defence, it is **not a penalty**; it belongs in the build from day one for all sub-explicit-name attributions. Re-resolve: strike 1 = model attributions require confirmation *and* confidence display is mandatory + a loud banner; the confirmation tap itself ships in S1 unconditionally.
- **Implementation is cheap and safe:** one `SETTING` row, one query at startup, one UI branch. No attack on cost.
- **Legal:** graduated degradation with an audit trail is *more* defensible to an employer than a silent permanent kill — it demonstrates a functioning incident-response loop. Supports adoption.

**Verdict: adopt, contingent on Section A fixes and the confirmation tap being unconditional.**

### B2. Retention (year + one term; view-based scratchpad; opt-in early deletion)

**Merits: the two-dials separation (view ≠ storage) is the best reasoning in the packet,** and the storage arithmetic (5 MB vs 2,400 MB) is correctly deployed to kill the false argument while data minimisation is correctly retained as the true one. I adopt the shape.

**Attacks:**

- **The spec didn't follow the decision.** B3 step 9 still says `expires_at_ut = acceptance +30d`. Concrete fix below (D2).
- **"School year + one term" is not computable from the current schema.** `expires_at_ut` is set at acceptance; the school year's end date exists nowhere. Required: `SETTING.school_year_end_ut INTEGER` (O-set at setup day, re-set at rollover), and `expires_at_ut := school_year_end_ut + one_term_ms` computed at acceptance. Without the setting, the decision is unimplementable.
- **The `scratch` opt-in has no field.** Exact field: **`RECORD.scratch INTEGER NOT NULL DEFAULT 0`**. Scratch records get `expires_at_ut = accepted_at_ut + 30d`; non-scratch get the school-year-aligned date. Missing from v1 = unrecoverable-in-spirit (you cannot retroactively know what she would have scratched, but you *can* add the column — so this is cheap-later, not fatal; still, it ships in the decision, so it ships in v1).
- **`CAPTURE` "retained always" contradicts the minimisation argument the decision rests on.** The raw dump contains everything she said, including dismissed fragments and things never made into records — the *most* sensitive artefact in the system. Keeping records for a year but their raw text forever is incoherent. Fix in D4.
- **Employer retention expectation correctly flagged as overriding.** Good. Add: the purge job must not be built until question 3 is answered — the decision itself says this; make it a gate, not a note.

**Verdict: adopt the shape; the decision is unimplemented in its own spec. Three named fields/settings close the gap.**

### B3. Sync wording ("briefcase, never a sync engine")

**Merits: correct, well-named, correctly sequenced.** "No server, no cloud, no account, no background sync" preserves both real protections (no conflict engine; O never an operator) while unblocking S6/S8/S11. Decide-now/build-later is right because v1 is phone-local.

**Attacks:**

- **The briefcase moves the trust boundary, and the packet waves at it.** A decrypted snapshot on the Mac means child data now lives on a second device — one that (unlike the phone) may have cloud-backup agents, Spotlight indexing, Time Machine. The wording locks *transfer*; nothing locks the Mac side. Minimum: Briefcase Studio must write only to a designated folder excluded from Time Machine/Spotlight, decrypt in memory, and shred temp files; the setup-day checklist must verify the exclusions. This is one checklist line now, a subpoena problem later.
- **"Same-room" is unenforceable and fine** — don't pretend it is. The real constraint is E2EE + teacher initiation; drop "same-room" from the lock or admit it is descriptive.
- **USB as a briefcase channel is underrated** in the doc (mentioned once). USB file transfer of an encrypted file needs no network stack on either side and no Wi-Fi trust; it should be the *primary* v1-later channel, home Wi-Fi the convenience path.

**Verdict: adopt; add the Mac-side hygiene requirements to the lock so "briefcase" doesn't become "quietly synced by the OS."**

---

## SECTION C — SECURITY REVIEW

Threat model assumed: motivated adversary, lost phone, subpoena, prompt-injected local model, unlucky day. Data class: developmental/behavioural records on named children aged 2–3 on a personal device, plus legally protective incident records.

### C1. The posture's strength is real — and two absences are falsely believed to exist

- **Android backup: `allowBackup="false"` is necessary and insufficient.** On Android 12+ (API 31+), backup/restore behaviour is governed by `android:dataExtractionRules`; `fullBackupContent` is ignored, and device-to-device transfer has its own rules section. A Galaxy S24 ships Android 14. **Without a `dataExtractionRules` XML excluding both cloud-backup and device-transfer for the database path, the round-4 D1 finding is only half-fixed.** Fix: ship `res/xml/data_extraction_rules.xml` with `<exclude domain="database" path=".*"/>` in both `<cloud-backup>` and `<device-transfer>` blocks, and verify on setup day with a real backup-to-Drive attempt plus `bmgr` inspection — not just `aapt dump` of the manifest flag. Also verify **manifest merger**: any native dependency (llama.rn, whisper.rn) can re-introduce permissions or backup flags; the audit must run on the *merged* release manifest, which `aapt` on the built APK does show — good — but the checklist must say "release APK," not "manifest source."
- **At-rest encryption is assumed, not chosen.** Part 3 says "OS file-based encryption at rest." FBE protects a powered-off or locked phone. It protects nothing on a lost *unlocked* phone — and the app-lock/`FLAG_SECURE` controls are in **S12**, i.e., months after real child data enters the DB. Either (a) move biometric app-lock + `FLAG_SECURE` into **S1** (they are small; the S12 framing of "trust hardening" buries a day-one control), or (b) adopt SQLCipher with the key in Android Keystore per round 4. I recommend (a) as sufficient for v1 given the device-lock gate in S0, with (b) as the documented upgrade path — but the packet must stop claiming "encrypted at rest" as an app property when it is a borrowed OS property gated on her lock screen.

### C2. Where it leaks anyway

- **Clipboard is the biggest residual channel.** The entire product value transits the clipboard ×10–14 children/day. On Android 13+, sensitive clips can be flagged (`EXTRA_IS_SENSITIVE`) so the visual preview suppresses content; nothing in the spec does this. Clipboard contents also persist until overwritten. Fix: set the sensitive flag on every handoff copy; overwrite the clipboard with an empty clip after N minutes (a background task needs no INTERNET); document the residue.
- **App-switcher snapshot** leaks record content until S12's `FLAG_SECURE`. Move to S1 (one line).
- **Backup staging**: `.ccbak` files in `backups/` — encrypted, fine — but the share-sheet flow can leave stale staged copies. Fix: delete staged file on share-sheet completion callback; cap staging at one file.
- **Backup passphrase**: PBKDF2-600k with a *memorable* teacher passphrase is brute-forceable offline if her Drive is compromised — and the Drive copy is the whole point. Fix: generated high-entropy key, written on the paper recovery card (round 4's idea), passphrase only as a second factor or omitted. The paper card is the recovery story; make the key worthy of it.
- **Model-file supply chain**: GGUFs imported via SAF were downloaded on some machine from some mirror. A tampered model file inside a no-network app can't exfiltrate, but can degrade/steer extraction — which attacks the *accuracy kill criterion*, the project's load-bearing metric. Fix: pin SHA-256 of both model files in the setup runbook; verify on import.
- **Prompt injection into the local model**: contained by construction (no egress, schema-constrained output, roster-constrained children, enum-constrained types). Residual harm is misclassification — caught by review + confirmation taps. This is the *correct* containment posture; no change.
- **Subpoena/seizure**: retention bounds the exposure (good); the append-only incident log is *discoverable* (correct — that is its protective function; do not add any "plausible deniability" feature, it would be both unlawful-adjacent and product-poison). Paper key keeps O out of compulsion range. Sound.
- **Restore replaces the DB wholesale.** Restoring Monday's backup on Friday silently destroys Tuesday–Friday. Fix: restore flow takes a pre-restore snapshot to `backups/pre_restore_<ts>.ccbak` automatically and requires a typed confirmation; surface the backup's record count and date before replacing.
- **`logs/`** counts-only is right; add rotation/cap so a crash loop can't grow it unboundedly.

### C3. Assumed rather than verified (add to setup-day checklist)

Merged-manifest audit on the **release** APK (permissions + backup rules); airplane-mode full-loop run; FBE + biometric device lock confirmed; clipboard sensitive-flag behaviour confirmed on her actual OS version; backup file verified unreadable without the key (attempt restore with wrong key, assert failure); Drive-copy-is-encrypted spot check (download on Mac, confirm ciphertext).

---

## SECTION D — CONCRETE DEFECTS, WITH CORRECTIONS

Ranked by severity × likelihood × cost-later.

**D1 (critical) — Strike derivation impossible; fix as Section A5.** Add `HANDOFF`, `HANDOFF_ITEM`, `RECORD_EVENT.seq`. Also collapse the event vocabulary: `wrong_child` and `child_corrected` are two event types for one fact (B3 logs `wrong_child`; Section A reads `child_corrected`). Correct version: log `child_corrected` (with `from_value`/`to_value` = child ids) on *every* child change; strikes are *computed* (`attribution_src='model'` ∧ in `HANDOFF_ITEM` ∧ correction/dismissal with greater `seq`). Delete `wrong_child` from the enum.

**D2 (critical) — Expiry spec contradicts the adopted retention decision.** B3 step 9's `+30d` becomes: `expires_at_ut := scratch ? accepted_at_ut + 30d : school_year_end_ut + ONE_TERM_MS`. Add `RECORD.scratch INTEGER NOT NULL DEFAULT 0` and `SETTING.school_year_end_ut INTEGER`. The O-managed "default +30d" setting is deleted — it is now the *scratch* duration, not the default.

**D3 (high) — Purge vs. append-only events.** Purge hard-deletes `RECORD` rows that `RECORD_EVENT.record_id` references. If FK enforcement is on, purge fails; if cascades exist, **strike history dies with the record** — the kill criteria would be erased by the retention job. Correct version: `RECORD_EVENT.record_id` is declared `TEXT` with **no FK** (documented as an intentional dangling reference — the event log is the system of record for history); purge deletes `RECORD` bodies only, never events; `HANDOFF_ITEM` likewise retains rows (its `record_id` also dangles post-purge). Add the unit test: purge a handed-off-then-expired record, assert its events and handoff rows survive.

**D4 (high) — `CAPTURE` "retained always" violates the retention decision.** Correct version: `CAPTURE` rows are retained while any linked `RECORD` is live or linked to an `INCIDENT`; otherwise purged with the same grace window. Re-extraction value is preserved for exactly the window re-extraction could matter; minimisation is honoured. Also: `INCIDENT.capture_id` must mark that capture permanently exempt (join in the purge guard).

**D5 (high) — Incident-adjacent observations expire.** An incident's capture typically also yields ordinary `obs` records ("C7 bit C3 during free play; C3 otherwise had a calm morning") — context that protects her — yet nothing exempts them. Correct version: when an `INCIDENT` is created with `capture_id`, set `expiry_exempt=1` on all records sharing that capture (one UPDATE), or add the negative join to the purge guard. Prefer the UPDATE: it makes exemption inspectable in the UI.

**D6 (medium) — Promote doesn't clear expiry.** `status='promoted'` is in the enum, but unless promotion sets `expiry_exempt=1` (and ideally `expires_at_ut=NULL`), the partial index and purge guard disagree about the row. Correct version: the promote transaction sets `status='promoted', expiry_exempt=1, expires_at_ut=NULL` atomically, and logs a `promoted` event.

**D7 (medium) — Dismissed records are immortal.** `dismissed` rows carry no `expires_at_ut` and match no purge branch — they accumulate forever, content included. Correct version: dismissed records get `expires_at_ut := dismissed_at + 30d` and are purged on the same guard.

**D8 (medium) — Bulk-accept undo vs. append-only log.** The 5s undo must not delete the `accepted` event (append-only). Correct version: undo writes a compensating event — add `unaccepted` to the enum — and flips `RECORD.status` back to `pending`. Acceptance-rate metrics count `accepted − unaccepted`. Same pattern for undo of dismiss.

**D9 (medium) — `handed_off` event type becomes redundant** once `HANDOFF` exists (D1); remove it from `RECORD_EVENT`'s enum to prevent two competing sources of handoff truth.

**D10 (low) — Index coverage.** Add `records(capture_id)` (provenance joins in review and D4/D5 logic); the existing partial expiry index remains correct post-D2. `record_events(event, at_ut)` becomes `record_events(event, seq)`.

**D11 (low) — `expires_at_ut ... set on acceptance`** leaves `pending` records that are never reviewed as permanent clutter. Add: pending records older than 30 days surface in the weekly reset (S5) as a review prompt — no auto-action, just visibility. Silent auto-expiry of *unreviewed* records would delete things she never saw; surfacing is the correct middle.

---

## SECTION E — ENHANCEMENTS (absence-first)

1. **A pre-copy preview screen.** FamilyNotesScreen should show the exact per-child blob with each contributing record's chip visible *before* [Copy note]. This is the actual prevention surface for the project's zero-tolerance outcome, and it is absent from every screen list. Cheapest highest-value safety UI in the packet.
2. **Move biometric app-lock + `FLAG_SECURE` from S12 to S1** (see C1). One user's trust is not a hardening-phase feature; it is the admission ticket for real data.
3. **Clipboard hygiene** (C2): sensitive flag + timed overwrite. One service, no UI.
4. **Setup-day verification runbook as a buildable artefact** — the merged-manifest audit, airplane-mode loop, wrong-key restore test, backup-exclusion checks. The packet keeps saying "verified on setup day"; make the checklist a file in the repo so verification is an act, not an intention.
5. **`SETTING.model_mode` + a one-line in-app state banner** ("Model suggests only — you confirm every name") so graduation is legible to her, not just logged.
6. **Model-file checksum verification on import** (C2).
7. **Restore pre-snapshot + confirmation** (C2/D-restore).
8. **Mac-side briefcase hygiene checklist** (B3): excluded folder, in-memory decrypt, shred temps.
9. **Her own wellbeing surface (HY3's round-4 catch, still unbuilt):** the DONE list is morale-shaped but one-directional. A Friday line in S5's reset — "you documented N observations for M children this week" — costs one query and is the only feature in the system aimed at the person carrying it.
10. **Do NOT build** (resisting the obvious): streaks, push reminders, photo capture, auto-send. The packet's do-NOT list is correct and I add nothing to it.

---

## SECTION F — THE NEXT SLICE: MY CALL

**Ranked:**

1. **Ask the three questions — this week, before any further build planning.** Employer policy (with the packet's corridor framing, which is well-constructed and I endorse verbatim), her real rest window/family-note deadline, and what the parent-comms app records per child per day. Cost: two minutes of conversation. The packet is right that this has been mid-ranked for three rounds while architecture accrued around it; I am ranking it first because **its worst branch deletes the project** and its best branch changes nothing — maximum information value per unit cost, and it gates whether S1 may contain real data at all.
2. **Schema-lock amendment — one focused pass, no new features.** Bake in D1–D10: `HANDOFF`/`HANDOFF_ITEM`, `RECORD_EVENT.seq`, `RECORD.scratch`, `SETTING.school_year_end_ut`/`model_mode`, the corrected purge/retention logic, the event-enum cleanup. This must land **before S1's first build**, because the packet's own ordering principle is correct: these are the unrecoverable-if-missing items, and every day of real captures logged under the current schema is strike history that cannot be reconstructed. It is ~a day of work against a spec that already exists.
3. **S0 habit gate + setup-day verification checklist, run concurrently with #2.** S0 is child-data-free, so it is **not blocked by question 1** — the single most useful property any slice can have right now. It also generates the habit evidence the entire project is gated on while the schema settles.

**Why this order over the alternatives:** Building S1 first (the tempting default — it is "the product") writes irreplaceable event history into a schema this review just showed cannot compute the project's own kill criterion, and may write real child data into an employment-policy void. Deferring the schema amendment to "when we build the purge job" inverts the packet's own correct insight that missing-from-v1 is the real risk.

**Do the three unanswered questions block this recommendation?** Only partially, and that is the point of the ordering: Q1 (employer policy) blocks **S1-with-real-data**, not S0 and not the schema amendment. Q2 (rest window) validates the S0 anchor but S0 is itself the instrument that answers it. Q3 (parent-app fields) blocks the FamilyNotes UI freeze, not the schema. Nothing in my top three is blocked; everything downstream of them is, until Q1 lands.

---

## DISSENT — WHERE THIS PACKET'S OWN ASSUMPTIONS ARE WRONG

1. **"Extraction is the one feature" is asserted, not proven, and two consecutive rounds have now built policy on it.** Kimi's round-4 argument (model death = product death) and my B1 endorsement both assume rules+manual can't carry the product. But the rules engine already does sentence-split, roster match, classification, and dates; the S1 fallback UX ("rules sorted N of M — tap what's missing") might be *good enough* to be the product, with the model as luxury. If so, the locked terminal kill criterion was never a suicide pact, and this round's graduation decision — which I adopted — solved a non-problem. The H0 week could test this directly (rules-only sorting of her real dumps) and nobody has proposed that test.
2. **The review pass is the load-bearing human behaviour, and it is the least-validated assumption in the system.** Every safety mechanism — confirmation taps, correction events, strike counting, the preview screen I just recommended — assumes she reviews before copying, ×10–14 children, against a pickup deadline, daily, forever. Bulk-accept with 5s undo is *designed* for the moment review collapses. If the real-world answer is "she bulk-accepts under pressure," then Section A's entire measurement apparatus counts a world that doesn't exist, and the honest design is: model attributions never pre-fill, period, from day one — which makes the strike machinery mostly decorative.
3. **The 140-bytes-per-record arithmetic is right and irrelevant.** It correctly kills the storage argument, but CAPTURE raw text (~500+ bytes/dump), events (~3–5/record), and SQLite page overhead multiply the real figure several-fold — still trivially small. The dissent is that the packet *used* arithmetic to win an argument that was never about arithmetic; data minimisation was always the real question, and the packet knew it. Fine — but the rhetorical pattern ("the numbers end the debate") is one this project should not get comfortable with.
4. **"No INTERNET permission" as the machine-auditable boundary assumes the Expo/RN build pipeline cooperates.** Manifest merger, expo-modules autolinking, and OTA-update infrastructure (EAS Update is *on by default* in many Expo templates — an update channel is a network path that exists outside the app's own permission posture) are all assumed-away in this packet. My C-section checklist mitigates but does not eliminate: nobody has yet demonstrated a release build from this exact stack with the claimed absence. The boundary is a hypothesis until S0's setup day proves it.
5. **My own Section A severity could be one notch too high.** If the product's honest position becomes "the counter is telemetry, prevention is the tap" (A4), then HANDOFF_ITEM's absence is a metrics gap, not a safety gap — and the truly v1-unrecoverable list shrinks to `seq`, `scratch`, and the retention settings. I ranked D1 critical anyway, because a kill criterion you cannot compute is not a criterion, and the project has built two rounds of governance on top of it.
