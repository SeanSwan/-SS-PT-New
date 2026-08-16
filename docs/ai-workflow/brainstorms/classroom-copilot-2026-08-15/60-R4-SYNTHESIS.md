# Round 4 — Unlensed Panel Synthesis

**Date:** 2026-08-16 · **Rule:** first run under Rule 82 (full-spectrum, no narrow lenses)
**Panel:** GLM 5.3 · Kimi K3 · HY3 — identical packet, identical remit, all angles required
**Cost:** GLM $0 (subscription) · Kimi $0.311 · HY3 $0.007 · **total ≈ $0.32**
**Replies:** `51-glm-r4-unlensed.md` (+ `55-glm-r4-tail.md`) · `52-kimi-r4-unlensed.md` · `53-hy3-r4-unlensed.md`

---

## 0. Did the re-run justify itself?

Yes, decisively. Unlensed, the panel found **defects the lensed round had not surfaced at all**,
including one critical data-leak path that no round had ever named. Two of the three models
independently converged on the same structural defect from different starting angles — which is
the evidence lensing was destroying, because a lensed panel is *designed* not to overlap.

**Rule 82 is now live on `main` (`8257e42b6`), in both `CLAUDE.md` and `AGENTS.md`.**

---

## 1. Per-model calibration — who caught what, on which angle

*(Required by Rule 82; feeds Rule 68 `## External-model calibration`. This is how the routing
table becomes learned from evidence rather than asserted.)*

| Model | Declared strongest | Unique catches nobody else got | Verdict on value |
|---|---|---|---|
| **GLM 5.3** | Systems / architecture | Backup slice **absent from the entire roadmap** while incidents never expire; **O's dev loop is the likeliest first leak** (real captures in logs/screenshots/fixtures); lock-screen notification disclosure; raw-audio retention policy; school-year rollover fields; multilingual families | **Highest.** Deepest blueprint, best-argued reversals, only model to produce a complete setup-day runbook. Vindicates the re-run entirely. |
| **Kimi K3** | Security / privacy | **Android Auto Backup is ON by default and ships the SQLite DB to Google Drive with zero code written** — the single worst finding in the project; `expo-sqlite` is **unencrypted at rest** → SQLCipher + Keystore; paper recovery key (a non-technical user *will* forget a passphrase); **photos** belong on the do-NOT list before someone builds them; O bus-factor; hash-only audit logs; roster lifecycle is 3 screens in S1, not a slice | **Critical.** Worth 20× its $0.31 for the Auto Backup finding alone. Its threat model is the first one properly stated. |
| **HY3** | Systems / architecture | Default expiry is **still wrong even with `pinned`/`expiryExempt`** — expiry must be opt-in per record, not default-on for observations; kill criterion should trigger on **uncorrected** wrong-child, not on a model guess she fixed; **restore on a new phone without O**; a wellbeing nudge for the teacher herself (she is solo, no aide) | **Strong for $0.007.** Sharper than expected on legal-risk framing; weakest on the device-tier question. |

**Routing lesson:** all three produced full-spectrum answers when asked. None needed a lens to
be useful, and the cheapest model produced a legal-risk catch the expensive ones missed.

---

## 2. Convergence — independently reached, therefore high confidence

| Finding | GLM | Kimi | HY3 |
|---|---|---|---|
| The "no sync" lock is mis-framed and makes S6/S8 unbuildable | ✔ | ✔ | ✔ |
| **Q3 employer policy is fatal and blocking** — answer it before anything else | ✔ | ✔ | ✔ |
| Taint-laundering must be its own slice, not folded into the gateway | ✔ | ✔ | ✔ |
| The phone has **no assigned model tier** — the core loop has no brain at the anchor moment | ✔ | ✔ | (different fix) |
| Kill criteria are **unmeasurable** — no events/corrections tables exist | ✔ | ✔ | — |
| Gboard dictation is **not provably on-device** and violates the project's own privacy lock | ✔ | ✔ | (flagged as unknown) |
| **No `INTERNET` permission** is the real v1 boundary, not the classifier | ✔ | ✔ | — |
| The round-3 gateway is **dead code in v1** — nothing egresses yet | ✔ | ✔ | partial |

---

## 3. The six defects that must change

Ranked by severity × likelihood × cost-to-fix-later.

**D1 · Android Auto Backup silently exfiltrates the child database.** *(Kimi, unique)*
An Expo app has `allowBackup` on by default; Android copies the app sandbox — including
`copilot.db` — to the user's Google Drive. Child data leaves the device with **zero code
written and no user action**. Every privacy control designed over three rounds sits downstream
of this. Fix: `android:allowBackup="false"`, `fullBackupContent="false"`, verified on setup day.

**D2 · The core loop is assigned to the wrong device.** *(GLM + Kimi, converged)*
Round 1 settled on-phone extraction; rounds 3–4 locked the extraction tiers to her Mac. Both
cannot be true. At 12:47 in a dark room with sleeping toddlers, the Mac is in another building.
Fix: **T0 = Qwen3-4B Q4_K_M on the phone** via `llama.rn`, rules-first, model optional. The Mac
becomes the evening/weekly engine for work that is already evening-shaped. Open question #1
("where is the laptop at midday?") is **dissolved**, not answered.

**D3 · The kill criteria cannot be measured, and the history is unrecoverable.** *(GLM + Kimi)*
"≥90% accepted without correction" and "wrong child — zero" require an append-only event log
that does not exist in any schema draft. Day-one behaviour that isn't logged is **gone forever** —
this, not the `pinned` flag, is the true "must exist in v1" item. Fix: `RECORD_EVENT` table
written from the first build, plus `attribution_src` so a model guess is distinguishable from
her own choice.

**D4 · The product ends one step short of its own deliverable.** *(GLM, unique)*
The value is realised *inside the mandated parent app*. The draft→paste handoff, ×10–14 children
against a pickup deadline, appears in no brief, no slice, and no kill criterion. If copying is
clumsy she reverts to typing directly into the parent app and the habit metric reads
false-positive for weeks. Fix: a dedicated Family-Notes screen with per-child **[Copy note]** and
a `handed_off` event per copy.

**D5 · The locked input choice violates the locked privacy constraint.** *(GLM + Kimi)*
"Gboard's on-device dictation" is not provably on-device — it depends on per-device settings,
language packs, and account state, and falls back to network recognition silently. The project
already wrote the correct rule (*uncertainty always blocks*) and failed to apply it to its own
keyboard. Fix: long-form dictation moves in-app to **`whisper.rn`**, which is provably egress-free
once the build has no network permission.

**D6 · There is no backup slice, and the data that never expires has no survival story.**
*(GLM, unique; Kimi adds the recovery key)*
Incidents are legally protective and exempt from expiry — and a lost phone in October destroys
them permanently. S1–S12 contain no backup slice at all. Fix: encrypted backup/restore in S1c,
a **hand-written paper recovery key** in her classroom drawer (never photographed, never in O's
vault), and a quarterly restore drill.

---

## 4. Genuine disagreements — these need your call, not mine

**① The wrong-child response.** Locked: *two errors and the model path dies permanently.*
- **GLM:** uphold it; just define the term precisely and instrument it.
- **Kimi:** it is *a suicide pact* — rules-only cannot resolve "the little boy who had a rough
  drop-off" either, so the day the model dies the **product** dies, because extraction is the
  one feature. Proposes **graduated degradation**: raise the confirmation threshold → shrink
  model scope → rules-plus-manual.
- **HY3:** trigger on **uncorrected** wrong-child only — an error she caught and fixed in the
  review pass is the system working, not failing.

*My read:* Kimi and HY3 are both right about different halves. The criterion should count
**uncorrected** wrong-child reaching a family note (HY3), and the response should be graduated
rather than terminal (Kimi) — but the *zero-tolerance spirit* is what protects her, so the first
strike should be loud and immediate.

**② Expiry default.** HY3 argues that even with `pinned`/`expiryExempt`, defaulting ordinary
observations to expire is a legal time bomb — a contemporaneous note about biting that wasn't
promoted yet can be the only thing that protects her. Proposes expiry becomes **opt-in per
record** ("scratch"). GLM and Kimi both accepted the locked amendment as sufficient.
*This is a real fork and it is cheap to decide now, expensive later.*

**③ Sync.** All three say the lock is mis-framed. GLM: deliberate encrypted "briefcase" export.
Kimi: lock *"no server, no cloud, no account"* instead of "no sync", and same-room E2EE transfer
is fine. HY3: an explicit local transfer path is **mandatory**, not optional.

---

## 5. Blocking — do these before any code

1. **Employer policy on child data on personal devices.** Unanimous: *potentially fatal to
   everything, costs one conversation.* It has been mid-ranked for three rounds while an entire
   tier architecture was designed around an unasked HR question.
2. **Her real rest window and family-note deadline.** The anchor is the product; it has never
   been confirmed, only inferred.
3. **What the parent-comms app already records per child per day.** Determines the handoff
   format, and therefore blocks the S1c UI freeze.

---

## 6. What survived hostile review intact

Worth stating, because after four rounds it is evidence the core is sound: v1-is-one-feature;
the H0 no-app gate; the midday anchor; sensitivity-outranks-capability; child data never touching
O's hardware; separate vaults; never AI-generating an incident narrative; T3/T4 staying unbuilt.
GLM's summary: *"everything else locked survives hostile review substantially intact, which —
after four rounds — is itself evidence the core is sound."*

---

## 7. The organising principle the panel converged on

**Controls must be verifiable by someone who isn't standing there.**

No-network beats a classifier (you can `aapt dump` it). Synthetic fixtures beat a no-real-data
policy (a repo diff proves it). Events beat impressions (SQL counts them). The v1 security
posture is built almost entirely from **absences** — no network, no accounts, no SDKs, no
notifications, no stored audio, no photos, no backup-to-Google — and gates appear only when
egress does. That is also why the round-3 gateway, however well designed, is the wrong thing to
build first: **v1's strongest boundary is an empty socket.**
