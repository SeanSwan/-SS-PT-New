---
title: "Swan Values Corpus"
date: 2026-08-25
author: grill-me (Rule 64)
status: EMPTY — awaiting Sean's line-by-line acceptance
decision: "The durable Direction layer. Ships EMPTY by six-seat panel verdict; entries require Sean's explicit ack."
supersedes: none
expires_if: "the entries below are never acked — then this file is deleted, not grown"
---

# Swan Values Corpus

> **STATUS: EMPTY BY DESIGN.** The candidate list at the bottom is *not* the corpus. It is a
> queue awaiting Sean's line-by-line acceptance. Until he acks a line, it is not a value —
> it is an agent's guess about a value, which is precisely the failure this file was
> reviewed to avoid.

## Why this file is empty

A six-seat panel (GLM 5.3, Grok 4.6, Ox Alpha, DeepSeek V4 Pro, Kimi K3, HY3) reviewed the
first draft of this file on 2026-08-25. **Every seat that answered reached the same
verdict: as originally written, it was "artifact #1,608 with better branding."**

The indictment, in the panel's own terms:

- **Nothing in the design caused a read.** "Tier-7 compounds" is a theory about *writes*.
  The repo has 491 pending memos and 308 handoff docs untouched in 30 days — it is
  demonstrably excellent at writing durable artifacts and bad at draining them. A new
  durable markdown file created by the same population joins the pile.
- **It was seeded by an agent, not by Sean.** The first draft contained ~20 values
  inferred from `CLAUDE.md` and shipped decisions. That is an agent asserting what Sean
  believes. Grok: *do not start a values corpus until Sean has personally acked every line.*
- **It had no eviction rule.** "Capped by usefulness" is a vibe, not a mechanism.
- **The rot problem migrates, it does not die.** GLM: moving durable-artifact risk from
  brainstorm docs to a corpus relocates the problem unless the mechanism differs in kind.

## The four conditions any entry must satisfy

An entry may be added ONLY when all four hold. These are the panel's convergent
requirements, not preferences.

1. **Sean acked this exact line.** Not "inferred from," not "consistent with" — he read the
   sentence and said yes. Record the date he acked it.
2. **The whole file stays under ~2 KB / ~20 entries.** Cap by token budget, not line count,
   because the file must be small enough to inject wholesale into the front of context. If
   adding an entry would breach the cap, something must be evicted first — the cap is not
   advisory.
3. **It is a value, not a discipline.** A value survives a year and a different feature. A
   discipline is a procedure built around a human limitation. Disciplines go in a
   deterministic gate, or nowhere.
4. **It has a decision it would have changed.** If no agent decision would differ with this
   line present versus absent, it is a preference. Preferences do not enter.

## Eviction and expiry (mandatory — entry without exit is how the pile grew)

- An entry that has not changed an agent decision in **K sessions is demoted to an archive
  section, not deleted** (Rule 34 — no blind cleanup).
- A newer tier-7 confirmation **supersedes** a conflicting older entry; conflicts are
  escalated to Sean, never silently overwritten.
- **Values expire.** "No MUI" is a date-stamped decision, not eternal law. Every entry
  carries its ack date and is re-confirmed periodically.

## The unresolved condition — read this before adding anything

The panel's sharpest point stands unanswered: **what structurally causes this file to be
read?** Writing it is easy and the repo is already good at that. Until there is a mechanism
that puts these lines in front of an agent without the agent choosing to look — injection
into the always-on context front, not a file an agent may open — this file is a hopeful
artifact. Building that mechanism is a prerequisite to growing the corpus, not a follow-up.

---

## Candidate queue — NOT the corpus, NOT in force

The following were inferred from `CLAUDE.md`, the memory index, and shipped decisions
during the 2026-08-25 session. They are **observations about Sean's behavior, not values he
has confirmed.** They carry no authority. Each needs his explicit yes, and the cap means
**most of these will not make it** — that is the point.

Ordered by the author's guess at value, highest first, so the cap bites the weakest.

1. Zero PII reaches an LLM — client IDs and roles only.
2. The trainer stays indispensable — clients read and do; the trainer decides.
3. Care-first — a feature that could hurt a client physically or financially does not ship on speed.
4. Least clicks, least time; every flow states a before→after tap count.
5. Workout-progress-first — log it, prove it, decide the next action.
6. Mock data is a gap with a deadline, never a feature.
7. Irreversible actions stop and ask — production data, money, another person's record.
8. Trainer-led B2B2C, not a fitness social network.
9. Sensitive data (biometric, injury, recovery) gets consent, export and deletion as product surfaces.
10. Integrations enrich; SwanStudios owns the canonical record.
11. Premium and specific, never template — generic is a defect.
12. Dark-first — the dark theme is the real design.
13. Realism over abstraction in imagery.
14. "Swan Coach," never "AI," in anything a user reads.
15. Credentials stated exactly — "26+ years," NASM-*protocol*, never "NASM-certified."
16. "Stretching" and "flexibility," never yoga or meditation.
17. White-label means white-label — a Move Fitness client sees Move Fitness only.
18. Public product and private operator never blur.
19. Encryption is the user's choice — E2EE opt-in.
20. Mobile is judged at phone width before anything is called finished.

**To promote:** Sean says yes to a specific number. It moves above this line with his ack
date. Anything he does not ack stays here or is cut — and this queue is itself subject to
deletion if it is still unacked when the `expires_if` above comes due.
