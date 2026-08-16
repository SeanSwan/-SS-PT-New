# ROUND 4 — FULL-SPECTRUM HOSTILE REVIEW + BUILD BLUEPRINT

## How to answer (this overrides any habit you have of staying in a lane)

You are the **only** reviewer on this pass. There is no other model covering the angles you
skip. In earlier rounds you were given a narrow lens ("product lead") and you still produced
the best *architectural* catch and the sharpest *security* insight of the whole session —
despite being pointed away from both. That is the proof that lensing was destroying value.
It has been abolished.

**Answer every angle, at full depth:**

1. **Product** — is this the right thing to build for this person, in this order?
2. **Systems / architecture** — data model, storage, sync, failure modes, migration cost.
3. **Interaction** — the actual physical act of using this with 12 two-year-olds in the room.
4. **Visual design** — hierarchy, legibility one-handed at arm's length, what it looks like.
5. **Security & privacy** — attack it. Assume a motivated adversary and an unlucky day.
6. **Strategy** — what makes this succeed or die in the first three weeks.
7. **Synthesis** — what the pieces above mean together that none of them says alone.
8. **Final-decider judgement** — where the existing decisions are simply WRONG, called plainly.

Declare which angle you consider your strongest, give that one your deepest pass — then cover
all the others anyway. **A reply that stays in one lane is incomplete and will be re-run.**

## Your remit on this pass

### A. HOSTILE REVIEW — attack everything below
Section 4 of the brief is a list of decisions marked "locked." **Treat "locked" as a target,
not as a boundary.** For each one you believe is wrong, say so directly and say what breaks.
Section 5 lists open questions and three unsolved problems. Tell us which of those are
actually fatal, which are non-problems, and which ones we have mis-framed.

Also attack what is NOT there. The highest-value finding of the entire project so far was an
absence — a whole category of work nobody had listed. Do that again.

Rank everything you raise by: **severity × likelihood × cost-to-fix-later**. Be specific about
which slice or file each finding lands in. Vague concerns are worthless here.

### B. BUILD BLUEPRINT — this is a build deliverable, not an essay
The owner is going to build from your answer. Produce, concretely:

1. **Architecture** — components, boundaries, what runs where (phone / her Mac / the 5090).
2. **Data model** — every table/entity, every field, types, indexes, and which fields must
   exist in v1 because adding them later is a storage rewrite.
3. **The capture→extract→correct loop** — exact step sequence, including the failure paths.
4. **Mermaid diagrams.** Give at least: one `flowchart` of the system, one `sequenceDiagram`
   of the core capture loop, one `erDiagram` of the data model, and one `stateDiagram-v2` of a
   record's lifecycle. Use fenced ` ```mermaid ` blocks. Make them syntactically valid.
5. **Wireframes** — monospace/ASCII box-drawing, phone-width, for every v1 screen. Show real
   example content, not `[placeholder]`. Mark tap targets. Show the loading, empty, and error
   state of each screen, not just the happy path.
6. **Slice order** — with a day estimate and a hard acceptance test per slice.
7. **The "do NOT" list** — the things a builder will be tempted to add that would damage this.

Write for a competent builder who has never seen this project and cannot ask you a question.
Every decision you leave open is a decision they will make badly.

### C. Format
Markdown. Long is fine — depth is the point. Lead with the three findings you would defend
hardest if someone told you you were wrong.

---
