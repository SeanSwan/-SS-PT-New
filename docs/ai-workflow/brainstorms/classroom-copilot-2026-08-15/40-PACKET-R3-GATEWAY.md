---
decision: "Design the privacy gateway that sits between a local assistant and any cloud model"
status: open
supersedes: none
sanitized: true
---

# CONSULT PACKET — ROUND 3
## The Redaction Gateway — the component that decides what may leave the machine

**This is a security component.** Design it as one. We want the version that survives a
hostile review, not the version that demos well.

---

## 1. WHAT IT IS

Two people will run a local-first AI assistant:

- **T** — a solo preschool teacher. Her assistant holds developmental observations,
  behaviour notes, toileting and nap records, family circumstances, and incident notes
  about **10–14 children aged 2–3**.
- **O** — the owner/operator. His assistant holds business records, client records, and
  **family/medical/immigration matters**.

Both want to reach strong cloud models (multiple vendors, several providers) for the work
that genuinely benefits: lesson and activity planning, drafting, research, second opinions,
long-form writing, code.

**Neither may leak a real person's identity or sensitive circumstances to any vendor.**

The gateway is the single component every outbound request must pass through. Nothing
reaches a cloud provider except through it.

---

## 2. THE HARD PART — READ THIS BEFORE PROPOSING REGEX

Naive designs strip names and ship the rest. That fails, badly, on free text.

> *"The little boy whose mum is in hospital had a rough drop-off again."*

Zero names. Zero identifiers. Fully re-identifying to anyone at that school. Regex,
named-entity recognition, and token substitution **all pass this through untouched.**

So the central question is not "how do we strip identifiers." It is:

**How do we decide what may leave at all — and how do we prove the decision was right?**

Our working hypothesis, which we want you to attack or improve:

> **Classify-and-block is primary. Stripping is defence-in-depth, never the sole control.**
> Certain content classes never leave the machine regardless of how clean they look after
> redaction. The gateway's main job is refusing, not scrubbing.

If you think that's wrong — that a sufficiently good stripping layer makes free text safe
to send — argue it explicitly and say what would make you confident.

---

## 3. WHAT MUST NEVER REACH A VENDOR

Non-exhaustive; extend it. Assume the worst input, not the typical one.

- Names of children, family members, clients, or staff — including nicknames, initials
  in context, and the possessive forms teachers actually write.
- Government identifiers: national insurance / social-security numbers, passport, visa,
  immigration case numbers, driving licence, tax IDs.
- Contact and location: addresses, phone numbers, email, precise geolocation, the
  school/employer name, room or class identifiers.
- Health: diagnoses, medications, allergies, injuries, therapy, developmental concerns,
  mental-health notes, pregnancy.
- Legal and immigration: case status, hearings, filings, counsel, custody arrangements,
  safeguarding or protective-services involvement.
- Financial: account numbers, card data, balances, payment disputes.
- Credentials: API keys, tokens, passwords, private keys, connection strings.
- **Semantic re-identifiers** — the hard class above. Unique circumstance descriptions
  that identify a person to anyone in their community without naming them.
- **Minor-specific:** any behavioural, developmental, or bodily-function note about an
  identified or identifiable child. Treat this as the highest-sensitivity class in the
  system.

---

## 4. WHAT WE WANT FROM YOU

### 4.1 Architecture
Where does the boundary physically live, and how is bypass made *impossible* rather than
discouraged? Consider: in-process library vs local proxy process vs OS-level egress
control. **Assume the application code is untrusted** — the gateway must hold even if the
app has a bug, a bad dependency, or a prompt-injected instruction telling it to exfiltrate.
Name the enforcement mechanism, not the convention.

Where do provider credentials live, such that the app itself cannot make a direct call?

### 4.2 The decision pipeline
Design the stages a request passes through, in order, with what each contributes and what
it costs in latency. Address at minimum:
- deterministic detection (what it's genuinely good at, and its precise failure boundary)
- roster/entity-aware detection (both users have a small known set of real people)
- model-based classification — and the recursion problem: **a local model classifying
  whether text is safe is itself an inference step; what happens if it's wrong, and how
  is it evaluated?**
- the uncertainty rule: what happens when confidence is low. Be specific about the
  default and why.

### 4.3 Reversible pseudonyms — or not
Substituting stable tokens for real entities lets a cloud reply be re-hydrated locally, so
the user still gets usable output. Tell us whether this is worth it, where the mapping
lives, and how it fails. In particular: does a consistent pseudonym across many requests
leak a social graph to a vendor over time?

### 4.4 Proving it works
**This is the section we care most about.** A privacy control nobody can verify is theatre.
Design the verification: adversarial test corpus, canary tokens, measurable leak rate,
regression gates, and what a red-team exercise against this looks like. What metric would
tell the operator "this is still working" six months from now?

### 4.5 The human in the loop
Both users are the last line of defence and both are busy. Design the moment where a person
sees what is about to be sent. How much friction is correct? What does the preview look
like when the payload is long? What is the failure mode of over-prompting (consent fatigue
— users click through everything), and how do you avoid it without removing the check?

### 4.6 Audit, retention, kill switch
What is logged, where, for how long — and note the trap: **an audit log of what was
redacted is itself a concentrated store of exactly the sensitive data you removed.** Solve
that. Also: the kill switch, and what the system does when the gateway is unavailable
(hint: consider what "fail closed" must mean here).

### 4.7 Slices
Break it into shippable slices ordered by risk retired per day. What is the smallest
version that is genuinely safe to turn on? Be honest if the smallest safe version is
"block everything except an allowlist of clearly-generic requests."

---

## 5. OUTPUT FORMAT (required)

```
## VERDICT
<3 sentences: the single most important design decision>

## ARCHITECTURE
<boundary, enforcement, credential custody, bypass analysis>

## DECISION PIPELINE
<ordered stages, contribution, latency, uncertainty rule>

## PSEUDONYMS
<verdict + mechanism + failure modes>

## PROVING IT WORKS
<test design, metrics, red-team, ongoing assurance>

## HUMAN IN THE LOOP
<the review moment, friction budget, consent-fatigue mitigation>

## AUDIT & KILL SWITCH
<logging, the log-is-also-sensitive problem, failure behaviour>

## SLICES
<S1..Sn, risk retired per slice, smallest safe version>

## HOW THIS LEAKS ANYWAY
<3 concrete mechanisms by which this design still leaks. mandatory.>

## DISSENT
<where this packet is wrong. mandatory.>
```

Both **HOW THIS LEAKS ANYWAY** and **DISSENT** are mandatory. We are explicitly hunting
the reviewer who breaks our own proposal.
