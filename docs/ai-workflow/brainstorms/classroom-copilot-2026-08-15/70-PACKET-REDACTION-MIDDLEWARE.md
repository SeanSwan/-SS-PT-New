---
decision: "Design the redaction middleware that lets a teacher use an employer-approved cloud AI without disclosing children — and judge whether the existing production implementation needs upgrading"
status: open
sanitized: true
---

# CONSULT PACKET — The Redaction Middleware

**Two deliverables, equally weighted:**
1. **Design the middleware** for T (blueprint + mermaid + wireframes + flowchart).
2. **Judge the existing production implementation** described in §4 — does it need upgrading
   to handle what T's case exposes? Be specific and be willing to say "no".

## RULE 82 — FULL-SPECTRUM, NO LENS
Answer every angle: architecture, security, privacy, legal, UX, human factors, product,
operations, strategy. **You have no assigned lane.** If a thought feels like "someone else's
area", that is exactly the thought this rule exists to override — say it.

---

## 1. THE SITUATION

**T** is a solo preschool teacher, ~12 children aged 2–3, no aide. Her notes contain
developmental observations, behaviour, toileting, family circumstances, incidents.

**New fact that changes the problem:** her employer has **approved ChatGPT**.

**New fact that does NOT change it as much as it appears to:** approval to *use a tool* is
not approval to *put children's developmental records into it*. Schools approve tools for
lesson planning and admin without anyone contemplating a two-year-old's toileting notes.
**Flag explicitly whether you think this distinction is load-bearing, and what the owner should
confirm with her director before any of this ships.**

She already has (built, adversarially reviewed, ready): a **fully local** assistant — a small
model on her laptop, no tools, no credentials, no network path. Child data is safe there today.

The owner now wants her to have **three lanes**:
- **Hermes / local** — private, offline, child data allowed.
- **ChatGPT** — employer-approved, cloud.
- **Claude Code** — cloud, with local filesystem access.

The middleware exists so lanes 2 and 3 cannot receive a child's identity.

---

## 2. THE ARCHITECTURAL FORK — RESOLVE THIS FIRST

**You cannot redact what does not pass through you.** If she types into a browser, no
middleware intercepts it. So there are exactly two shapes, and they are different products:

**Shape A — Programmatic proxy.** She uses a client that routes through the middleware to the
cloud API. Redaction is automatic and unavoidable *on that path*. But she must abandon the
ChatGPT app/website she was actually approved to use, and the browser remains one click away.

**Shape B — Paste-through desk tool.** She pastes raw text into a local tool; it returns a
redacted version she copies into ChatGPT. Manual, adds friction, works with *any* cloud tool
including the browser — and it makes the redaction visible, which may be its real value.

**Pick one as primary and defend it.** Say what the loser costs. If you think a hybrid is
right, specify exactly which content class goes down which path — a hybrid that relies on her
judgement in the moment is not a design, it is a hope.

---

## 3. THE HARD PROBLEM — DO NOT PROPOSE REGEX AND STOP

> *"The little boy whose mum is in hospital had a rough drop-off again."*

Zero names. Zero identifiers. **Fully re-identifying** to anyone at that school. Name-stripping,
entity recognition and token substitution all pass this through untouched.

In a closed cohort of ~12 children who all know each other, **the circumstance IS the
identifier.** Any design whose core mechanism is "remove the names" fails here.

Our working position, which you should attack or improve: **classify-and-block is primary;
redaction is defence-in-depth, never the sole control.** Some content never leaves regardless of
how clean it looks afterwards.

Also required:
- **Bidirectional.** The reply comes back referring to `Child A`. It must re-hydrate locally, or
  the output is unusable and she will stop using it.
- **Fail-closed.** Define what happens when redaction errors or is uncertain.
- **Verification.** How does anyone know six months on that it still works? A control nobody can
  measure is theatre.

---

## 4. THE EXISTING PRODUCTION IMPLEMENTATION — JUDGE IT

A live SaaS in the same family already runs a mature version of this. Architecture, described
faithfully (no code, no identifiers):

- **Model: "body-aware, identity-blind."** STRIP name, email, phone, address, occupation,
  emergency contacts. KEEP age, gender, weight, height, medical/health concerns, injury history,
  goals, measurements, workout history. Rationale: the domain output is worthless without the
  body data, and identity is what creates the risk.
- **Targeted, roster-driven.** The current record's identity fields are fetched, and search
  terms are generated for variations — full name, "Last, First", email, phone.
- **Bidirectional.** Outbound messages are stripped; **inbound model responses are also
  scrubbed** for hallucinated or leaked names before the user sees them.
- **Fail-closed by withholding.** If stripping throws, the message is replaced with an explicit
  "withheld: redaction unavailable" placeholder rather than sent raw. Same for history items and
  for responses.
- **History-window sanitisation** — the last N messages are re-sanitised on every call.
- Separate PII-manager and text-sanitisation middleware layers, plus five dedicated test suites.

**Your job on this half:**
1. **What does T's case expose that this design does not handle?** Our candidate: it assumes
   removing the name makes the text safe. That holds for a large, mutually-anonymous customer
   base. It does not hold for a closed cohort of twelve who all know each other, where a
   circumstance identifies a person with no name present.
2. **Should the production system be upgraded**, or is the difference genuinely a
   different-threat-model question where its current design is correct for its own users?
   **"No upgrade needed" is a valid and expected answer if that's what you conclude** — do not
   invent work for a system you cannot see running.
3. If yes: what exactly, ranked by risk retired per unit of effort, and what would you NOT touch?
4. **What should the new middleware steal from it?** Be specific — fail-closed-by-withholding
   and bidirectional scrubbing look strong to us.

---

## 5. REQUIRED OUTPUT

```
## VERDICT
<3 sentences: the single most important design decision>

## SHAPE A OR B
<pick one, defend it, name what the loser costs>

## BLUEPRINT
<component-by-component: what runs where, what it does, what it never does,
 where keys/rosters live, the trust boundary>

## MERMAID
<a flowchart of the decision pipeline AND a sequence diagram of one round trip
 including re-hydration. Real mermaid, renderable.>

## WIREFRAMES
<screen by screen, described concretely enough to build: what she sees when it
 passes silently, when it shows her a diff, when it refuses. Include the refusal —
 a refusal that dead-ends is what drives someone to the browser.>

## THE HARD CASE
<how your design handles the no-name-but-identifying sentence in §3. If it cannot,
 say so plainly — that is more useful than a design that pretends.>

## PRODUCTION SYSTEM VERDICT
<§4: what T's case exposes, upgrade or not, ranked, and what to steal>

## VERIFICATION
<how anyone knows it still works in six months: corpus, canaries, measurable leak
 rate, what metric an operator watches>

## HOW THIS LEAKS ANYWAY
<3 concrete mechanisms. mandatory.>

## DISSENT
<where this packet is wrong. mandatory.>
```

Both **HOW THIS LEAKS ANYWAY** and **DISSENT** are mandatory. We are explicitly hunting the
reviewer who tells us the premise is flawed — three prior rounds on a sibling package found
thirteen real defects, eight of them introduced by fixes to earlier findings.
