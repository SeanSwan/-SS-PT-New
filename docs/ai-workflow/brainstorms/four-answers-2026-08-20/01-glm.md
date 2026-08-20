# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/four-new-answers-packet-2026-08-20.md
**Tokens:** 1140 in / 10185 out (reasoning: 8404) | total 11325
**Wall:** 190.0s

---

# TASK 1 — HOSTILE REVIEW (four drafts)

Method note: checked each draft against (a) clinical accuracy of the escalation decision, (b) the over-referral failure mode, (c) the over-restriction failure mode, (d) trainer-scope discipline, (e) citation discipline. All four use `[verify]` tags rather than invented citations — that discipline holds; none fabricate.

---

**11 — Head impact.** Core call is right: suspected concussion ends the session, no same-day return, no finishing sets — this is the standard "when in doubt, sit them out" position [verify: current concussion consensus statement], so it is *not* over-restriction. The not-driving provision and the red-flag list are sound. Two gaps a grader would catch:

1. He already has a mental-status change (slow answers). "Same-day medical evaluation" reads like end-of-day appointment; altered mentation at baseline means now.
2. No supervision provision. Sending a concussed member home with no watcher leaves the red-flag list unenforced after handoff.

AMENDMENTS (exact text):
- REPLACE: "Same-day medical evaluation." → "Medical evaluation today — and since his slow answers are already a mental-status change, today means now, not end-of-day."
- REPLACE: "confusion deepening," → "confusion deepening or not clearing,"
- INSERT after "…or a seizure.": "And he's not left alone for the rest of the day — someone stays with him and watches for exactly those signs [verify head-injury observation-period guidance]."

**12 — Suspected rhabdo.** Correct rejection of "hydrate and stretch," correct same-day care call, correct no-diagnosis framing, and the prevention/programming-lesson close is exactly in trainer scope. Not over-referral — the triad presented (exertional soreness beyond normal + swelling with lost range + dark urine) is a textbook urgent presentation [verify rhabdomyolysis recognition guidance]. One gap: "if he can't be seen today" is too permissive. Dark urine already signals myoglobinuria; the dangerous complications (hyperkalemia-driven arrhythmia, falling urine output) need named triggers.

AMENDMENT (exact text):
- REPLACE: "If he can't be seen today, urgent care or the ER." → "If he can't be seen within a few hours — or his urine is still dark, he's putting out little urine, his heartbeat feels off, or he's throwing up — that's the ER now [verify rhabdomyolysis escalation signs: reduced urine output, potassium-related arrhythmia risk]."

**13 — T1D hypo.** Stop-now is right; carbs from her kit is correctly scoped as first aid; nothing-by-mouth-if-not-alert is correct. I explicitly checked the over-restriction failure mode: "no resume today even if she comes up clean" is *defensible*, not over-restriction — exercise continues to drive glucose down post-treatment and this is a symptomatic mid-session low [verify diabetes-and-exercise return-after-hypo guidance]. Two gaps:

1. The draft treats the sensor as ground truth. CGMs lag when glucose is moving fast.
2. The escalation path skips the repeat-treat step of the standard 15/15 loop, so "not improving" at minute 15 jumps straight to EMS.

AMENDMENTS (exact text):
- INSERT after "…squarely my job.": "If she carries a fingerstick meter, use it to confirm — sensors lag when glucose is moving fast [verify CGM lag during exercise]."
- REPLACE: "If she's not improving, becomes drowsy, or can't swallow safely: emergency services, and nothing by mouth if she's not fully alert." → "If she's still low at the fifteen-minute mark, repeat the carbs once. If she's still low or dropping after that, or becomes drowsy or can't swallow safely: emergency services, and nothing by mouth unless she's fully alert and swallowing easily."

**14 — Heat illness.** Clean. Correctly refuses the "water and shade" under-response; correctly identifies hot dry skin + confusion as the emergency presentation; correctly orders EMS call *and* immediate aggressive cooling including immersion; correctly scopes "cool first, transport second" to exertional heat stroke [verify current EHS first-aid wording]; nothing by mouth while confused is right; stopping the whole class is hazard control, not over-restriction. Adding unresponsiveness/CPR branches would be padding — that's base first-aid certification, not this key item. No amendment.

---

# TASK 2 — ENTERPRISE RECOMMENDATIONS (ranked)

The pipeline shape is right — these are **gates on shipping, not new scope**. Finish the eval banks *through* these gates.

1. **Close the clinician gap formally — it is the trust hole you already know about.** An LLM panel + owner approving medical grading-key text is the thing an enterprise auditor kills first. *Artifact:* clinician review packet — every medical assertion across all key items, `[verify]`s resolved, named-reviewer column. *Gate:* promotion from `clinician_check: pending` requires recorded per-item clinician sign-off; no "obvious item" exemptions. *Measurement:* count of items with sign-off (target: 100%); open `[verify]` debt → 0.

2. **Citation ledger with a staleness clock.** "Never fabricate" governs drafting; the ledger governs the library. *Artifact:* claim → source → date verified → verifier table; every remaining `[verify]` tag becomes a tracked defect with an owner. *Gate:* no eval-bank item ships while its answer-key claims carry unlinked `[verify]` tags. *Measurement:* % red-flag claims with a current, dated source (target 100%); forced re-verification at 24 months or on guideline publication, whichever first.

3. **Benign-twin calibration bank — the direct counter to the over-referral failure mode.** The key currently tests only emergencies; untested is whether it makes everything an emergency. *Artifact:* for each emergency item, a matched near-miss twin that must NOT escalate (normal DOMS vs. 12; heat exhaustion that recovers with rest/shade vs. 14; asymptomatic sensor low treated per her plan vs. 13; head bump with zero symptoms vs. 11). *Gate:* key ships only if expected answers cleanly separate every twin. *Measurement:* false-escalation rate on twins (≤5%), miss rate on true emergencies (0), reported as a confusion matrix over a four-tier taxonomy: EMS-now / same-day care / stop-session / manage-in-session.

4. **Versioned key + anchor regression suite.** Today's amendments are exactly the kind of edit that silently shifts grading downstream. *Artifact:* semver key with dated changelog and rationale; ~15-item anchor set spanning all four tiers. *Gate:* any key-text edit (including today's) re-runs the anchor suite before merge. *Measurement:* anchor score delta per version; drift alarm if >3 points.

5. **Double-grading reliability check.** A key is only as trustworthy as its application. *Artifact:* 30 sampled trainee/model responses, blind-scored by two graders. *Gate:* key goes live only at ≥90% exact agreement on tier labels. *Measurement:* inter-rater agreement per tier; every disagreement adjudicated and folded back into key wording as a clarification.

---

**VERDICT 11:** AGREE WITH AMENDMENT — three edits (now-not-later eval, "not clearing" red flag, no-alone observation provision).
**VERDICT 12:** AGREE WITH AMENDMENT — one edit (ER-now triggers: persistent dark urine, low output, irregular heartbeat, vomiting).
**VERDICT 13:** AGREE WITH AMENDMENT — two edits (fingerstick confirmation, repeat-carbs step before escalation).
**VERDICT 14:** AGREE — as written, no changes.

**RECOMMENDATIONS:** 1) Clinician sign-off gate → 2) Citation ledger + staleness clock → 3) Benign-twin calibration bank with 4-tier confusion matrix → 4) Versioned key + anchor regression suite → 5) Double-grading reliability gate.

**CONSENSUS: YES** — 4/4 approved (11–13 carry the amendments above; 14 as written).
