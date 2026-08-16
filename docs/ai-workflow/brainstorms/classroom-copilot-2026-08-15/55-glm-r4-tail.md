# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/54-GLM-CONTINUATION-REQ.md
**Tokens:** 9760 in / 20096 out (reasoning: 15613) | total 29856
**Wall:** 460.3s

---

*Resuming exactly where the output truncated: the cut row was S12's "what ships" column, mid-phrase at "biometric app-lock (10-minute re-auth…" — the full table follows, whole.*

---

## B6 — Slice order

| Slice | Days | What ships | Hard acceptance test (demonstrated, not asserted) |
|---|---|---|---|
| **S0** — H0 foundation | ~3 hrs build + 5 school days observation | **No app.** Her Mac: Ollama + Qwen3 8B, three saved prompts (end-of-day sort / morning brief / wording helper), pinned tab named "Assistant." Her phone: local-only notes app + one-tap home-screen widget, Gboard offline dictation verified, biometric lock, auto-lock ≤1 min. Paper triage sheet on a clipboard, ritual written on it **in her handwriting**. Egress denial installed in person by O + weekly watchdog on O's calendar. | (1) Mac Wi-Fi **OFF** → prompt A correctly sorts a test dump (proves zero network dependency, not just "no visible calls"). (2) Firewall log shows **zero outbound attempts** by the assistant stack across a full session. (3) Gboard dictation of "C7 counted five bears by herself" succeeds in airplane mode. (4) **THE GATE:** on ≥4 of 5 consecutive school days, T performs the ritual **unprompted** (note-app edit timestamps are the evidence; O checks silently each evening, says nothing). <4/5 → one reset week, then the project stops. No app code is written before this passes. |
| **S1** — Capture core | 12–15 | The app. Expo/Android: messy paragraph in → typed records out (rules-first; model-assist when a brain is reachable), roster picker, one-tap correction of type/child/date, crash-proof draft persistence, encrypted backup file **plus tested import**. | Over **20 real captures on real school days** across ≥5 days: ≥18/20 records accepted without correction (90%); **zero wrong-child attributions** in the entire sample — one occurrence halts the build and counts against kill-criterion 3; every correction is exactly one tap; full loop runs in airplane mode (rules-only) and still yields typed records; kill the app mid-entry → draft intact on reopen; capture-to-reviewed <60s for a 4-sentence dump. Restore drill: Friday's backup file restores on a clean install Monday, verified by record count. |
| **S2** — DONE list + parking lot | 2 | DONE list auto-populated from completed/corrected records + one-tap manual adds. Idea parking lot reachable in ≤2 taps from any screen. | On 4 of 5 days the DONE list contains ≥3 true items she never typed; a Monday-parked idea is retrievable Friday in ≤2 taps; **T opens DONE unprompted at end-of-day on ≥4 of 5 days** — if she doesn't look at it, the slice failed even if it works. |
| **S3** — Incident record | 4 | Fielded, timestamped incident template; append-only revisions; `pinned` + `expiryExempt` enforced; one-tap export block for the parent app that **assembles her words only**; included in nightly backup; never expires. | Simulated incident → complete record in **≤90 seconds, one-handed, standing up**; any edit creates revision 2 with revision 1 byte-identical; forced clock +60 days → incident intact while a sibling scratch record expires on schedule; diff of the export shows 100% of narrative text traceable to fields she typed (zero model-generated sentences); works offline; record present in backup within 24h. |
| **S4** — Triage MUST/SHOULD/EXTRA | 3 | Today's list auto-sorted into three tiers, capacity-capped, one-tap override, honest carry-over with reason prompt at day end. | 4 of 5 mornings T opens triage **unprompted before first circle**; MUST count ≤5 every day of the test week with zero manual filing by her; category override is one tap; an unfinished MUST at day end reappears Monday automatically — no silent drops. |
| **S5** — Weekly reset | 2 | Friday close-out: carry-over rollup, next-week skeleton, DONE-week rollup, parking-lot surfacing. | First real Friday: start-to-finish **≤10 minutes**; every unfinished MUST from that week appears in Monday's triage with zero re-entry; rollup shows ≥15 true DONE items. |
| **S6** — Promote-to-keep + conference binder | 4 | One-tap promote of any record to permanent per-child evidence, grouped by developmental domain; print-ready export per child. | Promote = one tap; promoted record survives +60-day clock-advance while an unpromoted twin expires on schedule (both directions tested); seeded child with 3 promoted observations renders a binder grouped by domain; export fits one printed page per child with no manual reformatting. |
| **S7** — Sub/sick-day sheet | 2 | One-page handoff: routines, roster needs, day plan, who-to-ask. Generated on device, printed locally. | Sick-morning drill at **06:30**: decision → printed sheet in ≤5 minutes; after removing a child from the roster, regeneration contains zero traces of that child; generation succeeds in airplane mode. |
| **S8** — Display-board narratives | 4 | Promoted observation → board scaffold: what happened / what the child was practising / skill tag / next offer. Her words verbatim in event fields; model supplies only the skill tag and next-offer options, both swappable. | Promoted record → printable board draft in one tap and **≤15 min end-to-end** (against her paper baseline, timed once for comparison); "what happened" text is **byte-identical** to her original record; boundary log shows zero roster names in any generic-ideas lookup; output fits her physical board format. |
| **S9** — Attention equity + patterns | 3 | Per-child flag for no documented observation in N school days; co-occurrence pattern view (same transition, same pair, both missed snack). | Seeded synthetic year: flags **exactly** the one child with 9 silent days and no others, computing in <1s; pattern view surfaces the seeded pair from ≥3 co-occurring notes; zero false flags on control children. **Synthetic data only — never her real roster.** |
| **S10** — Supplies queue | 2 | "Need wipes" inside any dump auto-types to a running list ordered by needed-by; one-tap copy-all; one-tap clear. | 10 seeded supply mentions inside real dumps → 10/10 land in the queue with zero taps; copy-all pastes into her ordering channel unedited; a cleared item never re-enters from the same source capture. |
| **S11** — Lesson planning | 5 | Weekly skeleton assembled from parking lot + observations + activity library; output shaped to the school spreadsheet's exact column order; generic-idea lookups via the boundary only. | Friday: next week's skeleton in ≤15 min; paste into the real shared spreadsheet needs **zero column reordering** (tested against last week's actual sheet); canary test — a child's name injected into an idea request is **blocked** by the boundary. |
| **S12** — Trust hardening | 3 | Biometric app-lock (10-minute re-auth window, PIN fallback, `FLAG_SECURE` so record content never appears in the app-switcher snapshot); nightly encrypted backup to **T's own** cloud account; taint propagation through local transforms; watchdog cadence formalized; global kill switch. | After 10 min backgrounded: reopening demands biometrics and the recents screen shows a blank card; restore on a clean device recovers **100% of pinned + promoted records** (count + spot-hash); seeded poisoned record (canary + child ref) run through the local summarize tool produces output the gateway **still blocks**; boundary process killed → all outbound fails closed and the UI says why in one plain sentence; kill switch on → airplane-mode-equivalent behavior while every core S1 loop still passes. |

**Cross-cutting gates (not per-slice — project-level):**
- Kill criterion 1: family notes drafted from the app ≥3 of 5 days by end of week 2 → else stop building.
- Kill criterion 2: the S1 accuracy test above, on a logged sample of 20.
- Kill criterion 3: **wrong child — zero, full stop.** Two occurrences kills the model path for family notes permanently; rules-only forever.
- Swap rule: if week-2 data shows triage-level distress, **S4 jumps S3** — knowingly, out loud, with her.
- Every slice's acceptance runs on her real days, **except S9**, which is synthetic-only. Total build time after the S0 gate: ~43–46 days.

---

## B7 — The do-NOT list

**Product & scope**

1. **Do NOT add photos of children.** The single most tempting addition. Photos are biometric-class PII of minors: they explode the sensitivity of every downstream control (backup, export, boards, gateway), and the parent-comms app *already owns* photos — you'd be rebuilding the mandated system you're banned from duplicating. If photos ever come, they're a separately designed slice with their own threat model, never a bolt-on to capture.
2. **Do NOT store voice audio.** A stored child's voice is COPPA-sensitive data with zero product need. Gboard dictation is on-device and ephemeral — the moment your app records and keeps audio, you've turned a keyboard into an evidence liability. Also: loud-room ASR garbage-in poisons the accuracy metric the whole project lives or dies on.
3. **Do NOT add cross-device sync.** Sync is a conflict-resolution engine wearing a feature costume. Its dominant failure mode is **silent record loss on the device that holds protective records** — the one unrecoverable error. It also doubles the attack surface. Two tools, different jobs: the Mac is a brain, the phone is a hand.
4. **Do NOT port to iOS/macOS.** Zero second users exist. Every Catalyst/react-native-macos week is a week not spent on extraction accuracy — which is the actual product. The Mac is served by the local assistant, not by an app.
5. **Do NOT build accounts, auth, or "a tiny backend."** The entire legal posture is *the developer never sees a byte*. One relay server touching a child record makes the developer a COPPA operator with consent, retention, breach, and parental-access obligations, and a school that never procured any of it.
6. **Do NOT add streaks, badges, or notification nudges.** Morale features must *forgive* the bad week; streaks punish exactly the moments she needs the tool most — a broken streak is a quit event. A phone that nags a teacher mid-class gets silenced by uninstalling.
7. **Do NOT build analytics dashboards.** Charts imply archive posture, contradicting scratchpad. She needs **flags** ("C8 silent for 9 days"), not visualizations. Chart libraries are permanent maintenance debt for a one-user tool.
8. **Do NOT polish export formats early.** PDF/DOCX/print-perfection is the classic week-eater that arrives before accuracy is proven. Plain text that fits her school's existing formats wins.
9. **Do NOT build enterprise/multi-teacher sharing.** Shared infrastructure creates operator status, a different buyer, and puts you in a lane with funded incumbents. "Enterprise-grade for one" means robustness, recoverability, trustworthiness — build those.

**Data & privacy**

10. **Do NOT put any cloud vendor in the child-data path.** Sensitivity outranks capability: "this is hard" routes *upward, locally* — never outward. The gateway can't un-send.
11. **Do NOT auto-send anything to parents or auto-submit to mandated systems.** A wrong-child message to a family is the one error with no recovery, and the project's stated tolerance is zero. Draft-and-human-sends is the *permanent* shape, not a v1 limitation.
12. **Do NOT let any note draft introduce a fact absent from the record.** Family-note drafting is assembly-and-polish of her typed facts. Any generated sentence without a source fact is flagged or deleted. (The absolute version of this ban — incidents — is already locked: the model checks fields, never writes the account.)
13. **Do NOT weaken auto-expiry exemptions.** Blanket expiry deletes the contemporaneous records that legally protect her. `pinned`/`expiryExempt` exist in v1 for this reason; no "simplification" may remove them.

**Security & the gateway**

14. **Do NOT make redaction primary.** *"The little boy whose mum is in hospital"* passes every scrubber ever written. Classify-and-deny, uncertainty blocks, stripping as depth only.
15. **Do NOT merge the vaults.** A merged T+O vault means retrieval bleed both ways, a permanent indexed copy of children's records on O's machine, and total gateway taint. The school authorized *her*.
16. **Do NOT police her browser.** The browser channel can't be closed, and trying makes things worse: a stricter gate makes the vendor tab *more* attractive. The mitigation is local quality, not surveillance of your own user.
17. **Do NOT ship free-form "chat with all my data."** It's the prompt-injection and taint-laundering surface, and it converts a typed, auditable tool into an assistant she'll over-trust. The model gets tool schemas and typed operations, nothing else.
18. **Do NOT auto-update models or extraction logic silently.** The trust contract is "corrections stick." If the sorter's behavior drifts invisibly, she can't build a mental model of it and stops correcting. Pin versions; one-line changelog per change.

**Builder discipline**

19. **Do NOT test with real child data on any machine but hers.** Synthetic rosters everywhere else, full stop. A "quick parse test" with a real export on the 5090 is precisely the boundary breach this architecture exists to prevent — and the one with no undo.

---

## B8 — First-session checklist — the one evening of Mac setup

~2¼ hours. Rule of the evening: **T drives, O instructs.** The final test is her doing it alone.

### Prep (O, at home, before arriving)
- [ ] Download onto a USB stick: Ollama installer, Docker Desktop dmg, LuLu installer. (Don't burn her evening on downloads.)
- [ ] Print 10 triage sheets (MUST ≤3 / SHOULD / EXTRA / DONE + tomorrow strip) and the gate calendar (5 school days).
- [ ] Write the three prompt texts (end-of-day sort / morning brief / wording helper) — bring them as text on the stick.

### Phase 0 — Confirm & collect (15 min)
- [ ] Mac:  → chip, RAM (expect ≥24GB; record exact), macOS version, **free disk ≥40GB**.
- [ ] Phone: Settings → About phone — record the **exact Samsung model**.
- [ ] T talks, O writes — close the open questions tonight:
  - Real rest window start/end? Real family-note deadline? *(The anchor. If wrong, the product is wrong.)*
  - **Where is the laptop at midday?** In the room / staff room / home?
  - Staff handbook: any policy on child information on personal devices? If none findable → she emails the director Monday; **if the answer is "no," the project pauses** — do not build past it.
  - Five-minute tour of the parent-comms app: what exactly does it record per child per day?
- [ ] Park for later (say so, don't solve): mesh VPN at school, the 14B model, vault structure — all months away.

### Phase 1 — OS hygiene (15 min, her hands)
- [ ] She sets/changes her Mac password. **O never learns it — said out loud.** No O account on this Mac, ever.
- [ ] Verify FileVault **ON**; if off, enable — recovery key written on paper *she* keeps.
- [ ] Firewall **ON**. Find My Mac **ON**. Require password immediately on sleep.
- [ ] Time Machine to the USB drive if space allows (encrypted, her passphrase).

### Phase 2 — The brain (30 min)
- [ ] Install Homebrew (she pastes the command from brew.sh; run the two `eval` lines the installer prints).
- [ ] `brew install ollama` → start it → `ollama pull qwen3:8b` (~5GB).
- [ ] Smoke test in Terminal: `ollama run qwen3:8b "sort this into a list: need wipes, C7 loved playdough, print family pictures"` → sane list in <10s.
- [ ] Optional if disk/time allow: `ollama pull qwen3:14b` (needed before T2 matters, not tonight).

### Phase 3 — The face (20 min)
- [ ] Install Docker Desktop (`brew install --cask docker`), launch once, accept.
- [ ] Run Open WebUI:
```
docker run -d --name classroom-ui --restart always \
  -p 8080:8080 \
  -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \
  -v classroom-ui:/app/backend/data \
  ghcr.io/open-webui/open-webui:main
```
- [ ] Browser → `http://localhost:8080` → **she** creates the admin account (her passphrase). Pin the tab; name it "Assistant."
- [ ] Load the three prompts from the stick into Workspaces. O keeps a copy of the prompt text (it's code, not data).
- [ ] *Fallback if Docker fights you:* the floor is `ollama run` in Terminal. The ritual survives; the UI is polish — don't let the evening die here.

### Phase 4 — The boundary (15 min — O's hands, explained out loud)
- [ ] Install LuLu (`brew install --cask lulu`). Rules: ollama and the Docker container **local-only, all outbound denied**. No exceptions "for later."
- [ ] Open WebUI admin → confirm **zero external providers configured**; model list shows only local qwen3.
- [ ] **Offline proof:** Wi-Fi OFF → run prompt A on a test dump → works. Wi-Fi back on. *(This is S0 acceptance test 1 — do it now, not later.)*
- [ ] Watchdog: recurring Friday 10-min event on **O's** calendar — LuLu rules unchanged, no new outbound allows, `docker ps` healthy, no new models.

### Phase 5 — The phone (15 min, her hands)
- [ ] Capture app: **Samsung Notes, cloud sync OFF** (local-only for the gate week; revisit after the policy answer). One-tap widget on the home screen.
- [ ] Gboard: install, set default, download the offline voice pack.
- [ ] **Airplane-mode dictation test:** dictate "C7 counted five bears by herself" with Wi-Fi and data off → correct text, or fix the pack tonight.
- [ ] Biometric screen lock ON; auto-lock 1 min; lock-screen notifications show "New note," **not contents**.

### Phase 6 — Paper & the gate (10 min)
- [ ] Triage sheets on a clipboard in her work bag.
- [ ] The ritual, **in her handwriting**, on the top sheet: "Rest window: dump into Notes. Pickup: MUST list on paper. Friday: weekly sort."
- [ ] Gate calendar on the fridge: 5 school days marked. Rule written next to it: she does it unprompted; O checks note timestamps silently each evening; ≥4/5 → the build starts; <4/5 → one reset week, then stop.

### Phase 7 — The evening's acceptance test (5 min)
- [ ] **O leaves the room.** Alone, T: opens Notes → types a two-sentence dump → opens the Assistant tab → runs prompt A → reads the sort → writes one MUST on paper. **If she can't complete this unaided, the evening is not finished — fix the friction now, not next week.**

### Do NOT do tonight
- No cloning of the full Hermes stack. No merged vault, no O account, no cloud API keys "for later," no iOS anything, no real child names typed into anything other than her own Mac and phone.
