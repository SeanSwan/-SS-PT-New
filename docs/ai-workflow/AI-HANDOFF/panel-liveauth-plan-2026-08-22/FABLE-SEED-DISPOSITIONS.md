# Seed for the Final Decider — panel findings and how I disposed of each

You are arbitrating. The attached document is **v2** of a handoff plan. **v1** was
reviewed by seven seats (GLM 5.3, Kimi K3, Grok 4.6, DeepSeek V4 Pro, DeepSeek V4 Flash,
Qwen 3.8, GPT-5.6 Sol Pro): six REVISE, one REJECT. Below is every finding and my
disposition. **Rule on my dispositions, then rule on v2 itself.**

Two questions I most need you to answer:

1. **Did I accept a finding I should have argued with, or discard one I should have
   accepted?** I discarded two as false positives after checking the code myself.
2. **Is v2 now over-specified?** It grew from ~16.7k to ~26k characters. A plan nobody
   finishes is worse than a plan with gaps. If the weight is in the wrong places, say
   which sections to cut.

---

## Findings I ACCEPTED and fixed

**1. No forced-failure test (GLM P0, Sol P1#4, Grok P0#1 — three seats independently).**
v1's Journey A tested only a *successful* save. The bug this workstream exists to kill is
"a surface claiming success it did not earn". v1 could not have detected its own titular
bug returning. **Fix:** A2 now runs three passes — happy path, forced offline failure,
forced expired-auth failure — and requires an error state, never "Saved". Plus an
optional slow-network pass to catch optimistic success.

**2. PII to LLM by construction (Sol P0, GLM P1#4, DeepSeek Pro P0, Grok P0#3).**
v1 offered an AI-observed Playwright session while asking the agent to read a real
member's health notes and transformation photos, then mandated Linear/PROOF/Hermes
artifacts — persisting PII. Rule 8 is zero PII to LLMs. **Fix:** harness use restricted
to synthetic fixtures with placeholder values; new §2.1 evidence discipline (booleans,
pixel counts, ratios, HTTP statuses, IDs — never field values or photo URLs); if no
fixtures exist, that route is closed and Sean runs it himself.

**3. Fixtures assumed but never provisioned (Kimi P0#1, Grok P0#2, DeepSeek Pro P0#2/#3,
GLM P1#5).** v1 said "find a member with two same-angle photos" — no such member is known
to exist, and per v1's own settled findings there is *no member-reachable upload path*,
so seeding requires placing R2 objects and hand-recording them. **Fix:** new §0.5 makes
fixtures blocking preconditions with a status table, declares provisioning a separate
Sean-gated sub-task, and names the honest fallback (run the fixture-free journeys, report
the rest NOT RUN — not passed).

**4. Production mutation with no rollback (Qwen P0, Kimi P1#3, DeepSeek Pro P0#2).**
**Fix:** synthetic account required; explicit restore-original step that must itself be
verified.

**5. No red path (GLM P1#3, Grok P1#6, and my own pass).** v1 branched only on success.
GLM's framing was sharp: the agent holds a document naming every file, has a worktree and
build recipe, and localhost writes to the production DB — so the predictable failure is a
*verification* session attempting a hotfix. **Fix:** new §4 RED PATH — record, file
against SWA-187, change nothing, stop; continue independent journeys for a fuller map;
one carve-out for actively harmful production findings.

**6. localhost offered as a valid route for the final gate (Sol P1#3).** It exercises
neither the deployed frontend nor the deployed backend, while still writing to production
data. **Fix:** demoted to exploration-only, explicitly cannot close the slice.

**7. B/C were URL checks, not capability checks (Sol P1#2, Grok P1#5).** **Fix:** both now
require a visible logger as the terminal state.

**8. `PROOF: N/A` let the entire slice be waived (Sol P1#5).** v1's own closeout gate
permitted a clean close with a disclosure attached. **Fix:** `PROOF: N/A` is now
unavailable for A2/B/C/D; if they did not run, the closeout is "slice NOT COMPLETE".

**9. §3 settled claims on code-reading and forbade re-litigation (Kimi P0#2).** The
sharpest catch: v1 argued code-reading is insufficient proof for this bug class, then used
code-reading to close questions and told the next agent not to revisit them. **Fix:**
§3 retitled "Settled by code-reading — verify behaviourally, do not rebuild"; evidence
kept as a search-saver, explicitly not a substitute.

**10. Subjective thresholds (Sol P2#7, GLM P2#6, DeepSeek Pro P1#4/P2#5, Kimi P1#4).**
"roughly 744px", "text must stay legible", unmeasured 44px. **Fix:** D names the element,
zoom, devtools-dock caveat and tolerance, and instructs that a disagreement with the
prediction is a *finding*; E requires computed ratios ≥ 4.5:1; A3 requires a measured
handle box.

**11. Activity journey did not reproduce the defect (Sol P2#6).** The bug was a matching
workout past position 6; v1 only asked for an empty filter, which passes even with the bug
present. **Fix:** A6 requires a fixture with a workout at position 7–20 and asserts it
appears.

**12. Wave 1's fake "Mute User" never verified gone (Grok P1#4).** **Fix:** A7 added.

**13. Ambiguous "hard-refresh" (Qwen P1#3).** **Fix:** fresh session or re-login, since a
cache-bypass reload may still serve cached JSON.

**14. My own findings, not from the panel:** A2 never named the fields (now enumerates all
thirteen); no deploy-identity check (new §0.1 — verify `lostpointercapture` is in the
served chunk before testing, or a stale bundle yields a false result); the plan
institutionalised an unrepeatable manual check (new §9 recommends Playwright specs,
recommend-only per the red path).

---

## Findings I DISCARDED — please check my reasoning

**A. "One trainer-workspace consumer does not prove the admin route consumes the intent"
(Sol P1#2, partially Grok P1#5).** I checked: `/dashboard/admin/client-management` mounts
`ClientsWorkspace` (audience defaults to `'admin'`), and `/dashboard/trainer/clients`
mounts `TrainerClientsWorkspace`, which is a **16-line wrapper**:
`<ClientsWorkspace audience="trainer" />`. Both therefore reach `runClientHubIntent` at
`ClientsWorkspace.tsx:106`. The seat's inference was reasonable from the document alone
but wrong against the code. I kept Journeys B and C as behavioural checks anyway — for
Kimi's reason (code-reading is not proof), not this one.

**B. "The document contains PII" (DeepSeek Pro P0#1).** I grepped: no emails, no
identifiers, no client names. The only personal string is Sean's own Windows username in
a filesystem path inside a trap warning ("never work in this tree"). I judged that not a
client-PII leak. **Open question for you: should that path be genericised anyway?** The
document is committed to a repo that was public until a credential-leak remediation.

---

## What I could not fix, and want your ruling on

- **The plan is now blocked on fixtures that require production writes.** §0.5 is honest
  about it but it means the next agent's realistic first move is "ask Sean", not "start
  testing". Is that the right shape, or should the plan instead lead with the
  fixture-free journeys (D, E, A7, §0.1) so something ships regardless?
- **A2 requires forcing failures against production.** Offline and expired-auth are safe
  and reversible, but they are still deliberate failure injection on a live system, on a
  synthetic account. Acceptable, or does this need its own gate?
- **Spend calibration:** the 7-seat panel estimated $0.2631 and cost **$0.4861**. Sol alone
  was $0.3474 against a $0.1026 estimate — it billed 46,361 input tokens for a
  ~5,000-token document. I have recorded this in §11 so future panels quote it, but I do
  not know *why* Sol's input count is ~9× the document. If you know, say so.
