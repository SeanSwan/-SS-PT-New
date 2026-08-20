# CONSULT PACKET — Sourcing 100 authoritative safety evals for a coaching model

**Date:** 2026-08-20 · **Owner:** Sean, 26+ years training experience, NASM-protocol · **Reviewers:** GLM 5.3, Qwen 3.8

## The situation

We need ~100 eval items per capability for a local coaching assistant. The safety slice is the
highest-stakes: these become the ANSWER KEY a judge grades the model against. A wrong ideal is
worse than no ideal — the model learns it AND passes its own test, invisibly.

Ten safety scenarios exist (overhead press with clicking/aching shoulder; swollen knee that
buckled on stairs; acute low-back seizure post-deadlift; dizziness+visual spots mid-circuit;
electric-shock pain down the leg on hinging; 4-weeks-post rotator-cuff-repair with vague surgical
clearance; wrist grinding with thumb numbness; chest tightness + exertional breathlessness before
HIIT; training with a fever; second-trimester client wanting heavy KB swings and supine core).

The owner asked to source deeper material from online conversations, naming Reddit as a possible
source, and stated the goal that the bot "never gives a wrong answer" and that his professional
reputation rides on it.

## What we need you to rule on — attack these, do not ratify them

**Claim 1: Reddit and similar forums are an unacceptable source for a safety answer key.**
Our position: forums are precisely where confident-but-wrong guidance concentrates, and there is
no attribution or liability. Ingesting them risks laundering a bad answer into the grading key
itself, where it becomes invisible and self-confirming. Are we right, or is there a defensible
way to use practitioner discussion (e.g. as SCENARIO source only, never as ANSWER source)?

**Claim 2: "never gives a wrong answer" is unachievable, but "never guesses on medical questions"
is achievable and is what actually protects him.**
Our position: no model can guarantee correctness, but refusal-and-escalation is a trainable
behaviour. The enterprise-grade property is a hard, boring, identical red-flag response every
time — not clinical reasoning that is usually right. Is that the correct reframing?

**Claim 3: safety evals decompose into two very different classes.**
(a) **Red-flag screening** — standardized, citable, high-volume: this is where 100 items can come
from safely. (b) **Programming judgment** — which regression, which cue, how phrased: this is the
owner's irreplaceable expertise and cannot be sourced externally. Does this split hold, and what
is the right ratio?

## What we are asking for

1. **Named authoritative sources** we should actually pull from, ranked by defensibility. We are
   thinking: ACSM absolute/relative contraindications to exercise testing and prescription; ACSM
   pre-participation screening algorithm; NASM CPT/CES material on acute injury and scope of
   practice; ACOG guidance for exercise in pregnancy; post-surgical rehab phase conventions;
   red-flag literature for low back pain (cauda equina), cardiac symptoms, and neurological signs.
   Correct us, add what we missed, and say which are freely citable.
2. **Scope-of-practice boundary.** A personal trainer is not a clinician. Where exactly is the
   line, and how should an eval ideal be worded so the model never crosses it?
3. **A structure for 100 safety items** — what categories, how many each, so coverage is
   systematic rather than a pile of anecdotes.
4. **How to phrase an ideal so it is judgeable.** What must every safety ideal contain
   (immediate action / escalation trigger / what to document / what to say to the client)?
5. **The trap we have not thought of.** What goes wrong when a non-clinician builds a medical-
   adjacent answer key? Name the failure mode.

Be blunt. If the owner's stated goal contains an impossibility, name it plainly rather than
working around it. If sourcing 100 items safely is not feasible, say so and give the number that is.
