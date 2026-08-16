# ⛔ SUPERSEDED 2026-08-18 — read `NEXT-AGENT-HANDOFF.md` instead
> This file's primary task (the unlensed panel re-run) was absorbed by later rounds. The
> arbitrated, current handoff is `NEXT-AGENT-HANDOFF.md` in this folder. Kept for history only.

# HANDOFF — Classroom Copilot + The Switchyard
## Everything a fresh agent needs. Ask the owner nothing that is answered below.

You are taking over an in-flight design project. This document is self-contained: origin,
decisions locked, decisions open, what exists on disk, what is wrong with it, and exactly
what to do next. **Do not ask the owner to re-explain any of it.**

---

## 0. THE ONE RULE THAT OVERRIDES EVERYTHING

This project handles **developmental records about named children aged 2–3**, held by their
teacher, plus the owner's own family/legal matters. Every external model call in this project
has been made against a **sanitised** brief.

**Before any packet leaves this machine, it passes a leak gate.**

The literal pattern is **deliberately not written in this file.** It lives in
`scan-patterns.local.txt`, which is gitignored — because a scan pattern necessarily contains
every string it protects, and embedding it here would publish the teacher's surname, her
school's systems, and every child's first name to whatever repo this document lands in.

*(That is not hypothetical. An earlier revision of this file did exactly that, and the
pre-push scan caught its own pattern. The guard was the leak.)*

Build the local pattern file once, from: her surname · her school or centre name · her
classroom/room identifier · her classroom theme · the trade names of the parent-comms app and
attendance system she uses · every child's first name and nickname. Then:

```bash
grep -qEif scan-patterns.local.txt "$PACKET" && { echo "LEAK — ABORT"; exit 1; }
```

Run it on **outbound model packets AND anything published or committed.** A near-miss occurred
when a teacher-facing document quoted an example containing children's names lifted from the
source transcript; the gate caught it only because it was run on the artifact too.

Never send: the teacher's name, her school, her room/class code, her classroom theme, the
names of the commercial parent-comms app or school SIS she uses, or any child's name.
Refer to the teacher as **T** and children as **C1..Cn**. This applies to model calls *and*
to anything published as an artifact.

A real near-miss happened: a draft of the teacher-facing document quoted an example
brain-dump containing children's first names lifted from the source transcript. The grep
caught it pre-publish. **Run the gate on artifacts too, not just packets.**

---

## 1. WHAT IS BEING BUILT, AND FOR WHOM

**The user (T):** a solo preschool teacher, ~10–14 children aged 2–3, **no classroom aide**.
Her school year started 2026-08-17. She is not technical and will not maintain a system.
She cannot replace two mandated systems: a commercial parent-comms app (daily notes home)
and a school SIS (attendance). Lesson plans go in a weekly shared spreadsheet.

**Her devices:** a **Galaxy S24-class Android** phone (12GB, Snapdragon 8 Gen 3) and a
**high-RAM MacBook Air (24–32GB)**. NOTE: the owner believes 32GB; the 2024 M3 Air topped out
at 24GB and 32GB exists only on the M4 (2025) Air — so it is either a maxed M3 or an M4 and
the year is off by one. Either way, design to a 24GB floor. Confirm on setup day.

**The owner (O):** the teacher's partner. Runs a personal AI operator bridge ("Hermes") on a
**5090 desktop** that is kept powered on. Wants her system to mirror his architecture. His
own data (business, family, immigration) is in scope for the same gateway — **this layer is
dual-use**.

**Two products:**
1. **Classroom Copilot** — a phone-first capture-and-sort tool for T.
2. **The Switchyard** — the model-routing + privacy-gateway layer underneath it, which also
   protects O's own system.

---

## 2. THE METHODOLOGICAL ERROR YOU ARE FIXING — THIS IS YOUR PRIMARY TASK

The previous agent ran a six-model panel but assigned each model a **narrow lens**
(Kimi = systems architect, GLM = product lead, HY3 = interaction designer, Gemini = design,
Fable = final decider). This was wrong and the owner rejected it.

**Why it was wrong:** lensing optimises for non-overlap between reviewers, not for depth. It
filtered each model's contribution before it was made. The proof: GLM 5.3, restricted to the
"product" lens, still produced the best *architectural* catch of the entire session and the
sharpest *security* insight — despite being pointed away from both. What it withheld because
of its assigned remit is unknown and unrecoverable without a re-run.

**What the owner wants instead:** **every model answers the FULL brief across ALL angles** —
product, systems, interaction, design, security, strategy, synthesis, final-decider judgement.
Maximum depth from each brain on every dimension.

**Roles are declared, not restrictive.** A model may still be given a specialty — but the
required shape is *"my assigned role is X; from that angle I see… and here is everything else
I see across every other angle."* The role earns the model's deepest pass; it never bounds its
scope. A reply that covers only its assigned lane is incomplete and gets re-run.

This is being codified as **Rule 82** in `CLAUDE.md` / `AGENTS.md` on `main` — draft text at
`RULE-82-DRAFT.md` in this folder. It is standing law for every consult from now on, not a
one-off correction for this project.

### Your task, in order

1. **Re-run the panel, unlensed.** Every model gets the complete brief and answers every
   section. Models to use: **GLM 5.3, Kimi K3, HY3** at minimum. Add Fable and Gemini if the
   owner approves the spend. The owner specifically wants GLM 5.3's view on *everything*,
   not just product.
2. **Re-synthesise** from the full-spectrum replies.
3. **Update all three published artifacts** to match (paths in §6).
4. Only then proceed to the build work in §7.

Keep the existing replies — they are valid, just incomplete. Do not discard their findings;
treat them as a floor the re-run must clear, not as a ceiling.

---

## 3. TOOLING — HOW TO CALL THE MODELS

All scripts are in `scripts/`, run from repo root. All are dry-run by default; paid ones need
`--confirm-spend`.

```bash
# GLM 5.3 — subscription billed, no spend gate, SLOW (250–400s), streaming
node scripts/consult-glm.mjs --document <packet.md> --out <reply.md> --model glm-5.3 --remit "..."

# Kimi K3 — OpenRouter, ~$0.13/call, $3 hard cap
node scripts/consult-kimi.mjs --document <packet.md> --out <reply.md> --remit "..." --confirm-spend

# HY3 — OpenRouter, ~$0.004/call, very cheap
node scripts/consult-hy3-design.mjs --document <packet.md> --out <reply.md> --remit "..." --confirm-spend

# Fable 5 — Final Decider, OpenRouter ~$0.33/call, accepts a --seed of prior replies
node scripts/consult-fable.mjs --document <packet.md> --seed <panel-seed.md> --out <reply.md> --remit "..."

# Gemini 3.1 Pro — subscription; output lands at AI-Village-Documentation/gemini-consults/latest.md
node scripts/consult-gemini.mjs --plan --file <packet.md>
```

Run them **in parallel in the background**; each takes 1.5–7 minutes. Total session spend so
far is **under $1.00**.

**AI Village is broken for this use case — do not retry without fixing it first.**
`node scripts/validation-orchestrator.mjs --document <doc> --mode plan` aborts at its own
spend gate. Two real bugs: (a) `SWAN_VILLAGE_SINGLE_PASS_DEBATES` is only read in the
file-review path (`validation-orchestrator.mjs:2514`), never in the plan-mode gate
(`:2203`), so "flat, no debates" cannot be requested in plan mode; (b) the estimator prices
debate panels at 7–51 calls each = $138 of a $147 worst case, ~25× observed reality (Rule 16
documents this). Clearing it means authorising ~$147 against an owner expectation of $1–2.
**Wiring `debatePanels` into the plan-mode gate is a small, real, unclaimed fix.**

---

## 4. DECISIONS THAT ARE LOCKED — do not relitigate

- **v1 is one feature:** messy paragraph in → typed records out → one-tap correction.
- **H0 is not an app.** Local assistant on her Mac + paper triage sheet + one phone capture
  habit, then watch 5 school days. The app build is **gated** on her doing the ritual
  unprompted on ≥4 of those 5 days.
- **Platform: Expo Android**, TypeScript, styled-components, `expo-sqlite`, `llama.rn` later.
  No iOS, no native macOS, no `react-native-macos`, no Catalyst. Phone and laptop **do not
  sync** — two tools, different jobs.
- **Voice is a fallback.** Text plus Gboard's on-device dictation is primary. Exception: in
  the rest window with sleeping toddlers and hands free, dictation is arguably the *safest*
  input — GLM argued for promoting it in that one window.
- **Timing anchor: the midday rest window.** Family notes are due before pickup, so an
  after-school dump delivers value after its own deadline. This single catch reshaped the
  product.
- **Scratchpad, not archive** — with the amendment below.
- **Observations expire; incidents and promoted evidence never do.** Kimi caught a
  contradiction: blanket auto-expiry deletes the contemporaneous records that legally
  protect her. `pinned` and `expiryExempt` must exist in the **v1** schema or adding them
  later is a storage rewrite.
- **Three kill criteria, not one:** (1) habit — drafts family notes from the app ≥3 of 5 days
  by end of week 2; (2) accuracy — ≥90% of extracted records accepted without correction over
  a logged sample of 20; (3) **wrong child — zero, full stop.** Two wrong-child errors and the
  model path dies for family notes permanently, rules-only forever.
- **Model tiers (v1 has NO cloud vendor at all):**
  - T1 — her Mac, Qwen3 8B (same brain as O's, so he can support it). Child data: yes.
  - T2 — her Mac, 14B Q4. **Ceiling for child data**, and the fallback for everything.
  - T3 — O's 5090, 70B+, over an encrypted peer-to-peer mesh. Child data: **no**.
  - T4 — a cloud vendor: **deliberately not built.** Add later only on evidence of a real gap.
- **Sensitivity outranks capability, always.** "This is hard" is never a reason to route
  outward — only upward, locally. This is why the high-RAM Mac is load-bearing.
- **Child data never reaches O's 5090.** The school authorised *her*, not him. Encryption
  doesn't change that a person outside the authorised circle controls the hardware. The owner
  accepted this reasoning.
- **Separate knowledge vaults for her and O** — same folder architecture and disciplines,
  separate instances. A merged vault means retrieval bleed both ways, a permanent indexed
  copy of children's records on O's machine, and it collapses the gateway (everything becomes
  potentially tainted). An explicitly-shared third vault for household matters is fine.
- **Hostile review is ported from the owner's own rules**, with a fork: child-data work is
  reviewed by the **local** 14B; child-free project work by a cheap capable reasoner. Trigger:
  *does this output leave her head and go somewhere real?* Never review the trivial sorting pass.
- **Never AI-generate an incident narrative.** Fabrication risk in a legally protective
  document. The assistant checks her fields; it never writes the account.
- **Gateway:** classify-and-block is primary; stripping is defence-in-depth only. Free text
  cannot be reliably de-identified — *"the little boy whose mum is in hospital"* has no name
  and identifies a child completely. The local classifier is **deny-only**: it may veto,
  never authorise. Uncertainty always blocks. The boundary is installed **once, in person, by
  O** — a teacher will not maintain a firewall — with a watchdog that verifies it hasn't
  drifted.

---

## 5. GENUINELY OPEN — needs answers, do not guess

1. **Where is the laptop at midday?** GLM's catch, and nobody had asked. The rest window is
   the anchor, the laptop is the stronger machine, and the devices don't sync — so if the
   laptop isn't physically in the room at rest time, the best model is running where the work
   isn't. **Structural, not a detail.**
2. **What exactly does the school's parent-comms app already record per child per day?**
   Changes the gap list materially — the difference between a top-five absence and a banned
   duplicate.
3. **Does her employer have a policy on child information on personal devices?** Can
   invalidate the whole architecture. Nobody has checked.
4. **Her real rest window and family-note deadline.** Inferred from her schedule, never
   confirmed. If wrong, the anchor is wrong, and the anchor is the product.
5. **Exact Samsung model**, confirmed on setup day.
6. **Does her school network permit a peer-to-peer mesh VPN?** If not, T3 never fires from
   work and everything falls to T2 — which the design already handles, but it should be known.

### Unsolved design problems, flagged honestly by the panel
- **The browser channel voids the privacy claim.** She can open a vendor's chat and paste.
  The honest name for the gateway is "assistant egress guard," not "privacy boundary." The
  mitigation is *not* a stricter gate — a stricter gate increases this risk. It's making the
  local path good enough that she never wants the browser tab.
- **The local model can launder tainted data.** A prompt-injected local assistant with tool
  access can paraphrase a child's note into clean-looking prose before egress; the gateway
  inspects at the door and sees something clean. Taint must propagate through every local
  transform, enforced at the store/tool layer. **This is its own design problem — scope it as
  its own slice, don't pretend the current design covers it.**
- **"Proof" is the wrong standard.** Bounding an adversary's auxiliary information is
  impossible by construction. Report measured miss-rate under adaptive attack, canary values
  that must never appear outbound, and a coverage check — the destination's own records must
  match the gateway's log exactly.

---

## 6. WHAT EXISTS ON DISK

All under `docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/`:

| File | What it is |
|---|---|
| `00-PACKET.md` | Round 1 brief (sanitised) |
| `10-kimi-k3.md` · `11-glm-53.md` · `12-hy3.md` | Round 1 replies (LENSED — the flaw) |
| `19-PANEL-SEED.md` | Round 1 replies concatenated, fed to Fable |
| `20-FABLE-VERDICT.md` | Fable's Final-Decider ruling on 5 splits |
| `30-PACKET-R2.md` | Round 2 brief — absences + slice roadmap |
| `31-kimi-r2.md` · `32-glm-r2.md` · `33-hy3-r2.md` | Round 2 replies (LENSED) |
| `40-PACKET-R3-GATEWAY.md` | Round 3 brief — the privacy gateway |
| `41-kimi-gateway.md` · `42-glm-gateway.md` · `43-hy3-gateway.md` | Round 3 replies (LENSED) |
| `classroom-copilot.html` | **Published artifact** — the build plan |
| `switchyard.html` | **Published artifact** — routing + gateway |
| `for-her.html` | **Published artifact** — plain-language version for T |

Gemini's round-1 reply is at `AI-Village-Documentation/gemini-consults/latest.md`. Note Gemini
reflexively applied the owner's SwanStudios brand palette to a preschool teacher's tool; its
UX findings were kept, its visual direction rejected.

**Republishing:** call the Artifact tool with the same file path to keep the same URL. Keep
favicons stable (`✏️` plan, `🔀` switchyard, `🌿` hers).

---

## 7. THE SLICE ROADMAP (from the lensed run — re-derive it, but don't lose it)

S1 capture core (12–15d) · **S2 DONE list + parking lot (2d)** · **S3 incident record (4d)** ·
**S4 triage must/should/extra (3d)** · S5 weekly reset (2d) · S6 promote-to-keep + conference
binder (4d) · S7 sub/sick day sheet (2d) · S8 display-board narratives (4d) · S9 attention
equity + patterns (3d) · S10 supplies queue (2d) · S11 lesson planning (5d) · S12 trust
hardening (3d).

**If she only ever gets three more: S2, S3, S4 — in that order.** S2 because morale features
are load-bearing not decorative and it's two days. S3 because it's the only slice whose
absence can *harm* her. S4 because it's her own stated number one, and a roadmap that ignores
that has failed at listening.

**Honest flag:** her stated #1 lands at slice four. If week-2 data shows triage-level distress,
S4 jumps S3 — knowingly, out loud, with her.

### The absences she never mentioned (the highest-value findings of the whole project)
1. **The protective record** — contemporaneous incident documentation. She listed incident
   *communication*; the record that protects *her* is the part nobody assigns.
2. **Write once, appears four times** — one observation is currently hand-rewritten into the
   family note, the display board, conference prep, and assessment evidence. Her display-board
   rubric *is* an assessment instrument; she's never noticed they're the same object. Largest
   recurring manual labour in her job, absent from her own list.
3. **Attention equity** — which child has gone 9 days with no documented observation.
4. **Pattern view** — same transition, same two children, both missed snack.
5. **A day she isn't there** — sub/sick handoff sheet.
6. **The shadow list** — the email she's been avoiding, promises made at pickup, and wording
   for the three hardest messages in toddler teaching.

---

## 8. IMMEDIATE NEXT ACTION AFTER THE RE-RUN

**Her Mac setup — one evening, and the only thing that helps her in the near term.**

Ollama; **Qwen3 8B** as the always-loaded default (same brain as O's, so he can support it)
plus a **14B at Q4** for heavy local work; system prompt written **from her own words in the
source transcript — do not invent one, she described the assistant she wants better than we
could**; one notes folder; **fail-closed, no cloud path at all in v1**; the encrypted mesh link
to O's 5090 for hard child-free work, with silent fallback to the 14B when it doesn't answer.

Plus the paper triage sheet and one phone capture habit — those are what actually carry her
through the first week while the 5-day gate runs.

---

## 9. HOUSE CONSTRAINTS

- **Rule 16:** paid multi-model runs need the owner's explicit permission per run. Quote
  $1–2, cap $2.50. Never quote the Village estimator's figure — it is ~25× reality.
- **No Grok / X-AI models, ever.**
- **Rule 73 / proof-before-done:** no "done", "fixed", or "working" without current-session
  evidence *and* a clean hostile-review pass in the same message.
- **Rule 57:** substantial closeouts get a dual-tier summary — plain-English first, then
  technical.
- The owner communicates by voice-to-text; transcription garbles model names ("Gwen three
  point eight" = Qwen3 8B, "Capernasky" = Karpathy, "Efzidian" = Obsidian, "ChemE three" =
  Kimi K3). Read through it rather than asking him to repeat.
- This is a **side project**, not SwanStudios production work. It lives in `brainstorms/`.
  Do not let it consume the production lane without the owner saying so.
