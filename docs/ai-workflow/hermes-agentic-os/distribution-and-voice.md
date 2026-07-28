# Distribution & Voice (Level 6)

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL — the careful last mile: who else ever touches any of this, and how voice joins without gaining authority
- **Companions:** `../references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` §2 (boundaries 1–2 — the lines this level walks up to) · `./channels-and-brokers.md` (Discord outbound; channel law a voice device inherits) · `./approval-gates.md` (why voice can't approve) · `./dashboard-command-center-spec.md` §3 (the greyed voice strip)
- **Tier vocabulary:** bridge §4.

---

## 1. The distribution ladder

Distribution is rungs of *audience*, and capability strictly shrinks as audience grows. Nothing moves down a rung by drift — each move is a deliberate product decision with Sean's yes.

| Ring | Who | What they get | What they never get |
|---|---|---|---|
| **Sean-only** | Sean | Hermes core: broker, working memory, cross-domain context (business/family/health/immigration), T3/T4 approvals, receipt stream, kill switches, keys | — (this ring is the ceiling) |
| **Team / trainers** | Trainers, future staff | **Role-scoped product surfaces** — Coach Command Center and successors — through app auth, multi-tenant, per-role (Sean's 2026-06-18 decision: operator capability ships THROUGH the product tool layer). Their own clients, their own receipts lane (bridge §11 Q1) | Raw Hermes, ever. Cross-tenant data. Approval authority beyond their own role scope. Any Hermes memory |
| **Clients** | SwanStudios end users | Swan Coach product features: chat, proposals, logging drafts — governed by subscription tiers and product approval gates | Anything operator-shaped. Any awareness that Hermes exists |
| **Public** | Everyone else | **Nothing.** | Everything |

The enforcement is structural, not policy: trainers authenticate to the *product* (JWT + role), which has no route to Hermes at all — there is no "Hermes with permissions checked," only product endpoints that happen to be operator-grade (bridge boundary 2). A feature that can only work by punching a trainer through to Hermes is a feature that doesn't ship.

## 2. What could become what

- **Could become a web app (product surface):** the trainer-facing slice of the command-center *ideas* — a role-scoped "my clients: stale list, pending proposals, session receipts" panel inside the SwanStudios dashboards, built with product auth, product design system, product review chain. It shares concepts with the command center, zero code or authority.
- **Could become an Obsidian plugin (local tooling):** vault conveniences — provenance-frontmatter templates, stale-note surfacing, receipt-digest rendering inside the vault. Read-only over the brain lanes, no broker access, distributable only in the sense of "installable on Sean's machines."
- **Stays local, permanently:** the broker, the runner, working memory, the switches file, the approval queue, the command center itself. These are LAN-ring components (architecture §4); "hosted command center" is a contradiction — no public inbound ports (bridge boundary 6).
- **Never distributed, in any form:** cross-domain memory, receipt archives, approval history, keys, the Telegram lane, anything carrying family/health/immigration context. Not to trainers, not anonymized, not "just the dashboard, read-only." The blast radius of a leak here is Sean's whole life, not a feature.

## 3. The no-new-authority rule

Every distribution and every new modality obeys one sentence: **reach may grow; authority may not.** A new audience gets a *view* or a *product feature*, never a lever on the broker. A new input device gets a *channel with a ceiling* (`./channels-and-brokers.md` §5), never a bypass. Anything that would give a second human T3/T4 approval power is not a distribution decision — it is a constitutional change to the bridge, made by Sean in writing there first.

## 4. Local voice / Jarvis layer (optional, T0/T1 only)

The voice layer is a convenience skin, speced so it can never become a hole:

- **Capture-and-query only.** Voice may: capture notes and content ideas (→ `memory-note`, T2 via its standing allowlist row, dictated content typed `untrusted`), ask T0 questions ("what's system status?", "how many open queue entries?"), and request T1 drafts ("draft a briefing now"). That is the entire vocabulary — registered commands with `voice` in their channels field, ceiling T0/T1 requests plus the single T2 memory-note path.
- **Voice NEVER approves T3/T4.** A voiceprint is spoofable with a decent speaker and thirty seconds of audio; exact-match phrases lose their meaning when the input medium can be synthesized. Approvals stay on authenticated channels — command-center session or allowlisted Telegram chat-id (`./approval-gates.md` §3). A spoken "approve it" is answered with where to actually approve it. No exceptions, including obvious-emergency framing — *especially* including that framing.
- **Wake-word device stays on the LAN.** Local wake-word, local STT (5090 has the compute), no cloud voice assistant in the loop, no internet-reachable microphone. The device talks to the broker over the LAN ring only; if it can't reach the broker it does nothing (fail closed, principles §11). Raw audio is processed and discarded — transcript in the receipt, audio not retained beyond the session buffer.
- **Untrusted like everything else.** Transcribed text enters the broker exactly as Telegram text does: untrusted input, registered-command matching, validated params (`./channels-and-brokers.md` §2). Anyone speaking in the room is, from the broker's perspective, an unauthenticated sender whose reach ends at T0 queries and note capture — which is why the ceiling is set where it is.
- **Ships last, as a placeholder first.** The command center's voice strip stays greyed (`./dashboard-command-center-spec.md` §3) until slice 6 (`./implementation-slices.md`), and hardware choice waits on Sean (`./open-questions.md` Q6). A voice layer that arrives before the receipt/queue spine is decoration on an unfinished vault door.

Seed voice vocabulary (the whole list — additions are registry proposals):

| Utterance class | Backing command | Tier |
|---|---|---|
| "System status" / "anything need me?" | `switch-status` + `queue-list` | T0 |
| "How many open approvals?" | `queue-list` | T0 |
| "Run the health sweep" | `health-sweep` | T0 |
| "Brief me" / "make the briefing" | `morning-briefing` | T1 |
| "Note: …" / "idea: …" | `memory-note` | T2 (standing allowlist row) |
| Anything containing "approve", "arm", "kill", "resume" | **refused** — pointer to real channels | — |

## 5. Distribution decision checklist

Before anything crosses a ring boundary, five questions, all answered in writing to Sean:

1. Which ring is the audience, exactly — and is the thing being moved a *view*, a *product feature*, or (stop here) a *lever*?
2. What authenticates the new audience at its own layer, and what is the tier ceiling of anything they can request?
3. What data crosses with it — and does any line of it originate in the never-distributed list (§2)?
4. What is the receipt story — whose lane records what the new audience did (bridge §11 Q1 pattern)?
5. What kills it — which switch or flag withdraws the distribution without touching product uptime?

A move that can't answer all five isn't blocked forever; it's blocked until it can.
