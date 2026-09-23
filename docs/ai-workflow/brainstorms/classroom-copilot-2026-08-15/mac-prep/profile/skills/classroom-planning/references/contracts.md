# Classroom planning contracts

Use exact fields. Unknown fields fail closed.

## Daily card

- `schemaVersion`: `1.0`
- `readTimeSeconds`: integer 1–90
- `coreInvitation`: title, goal, ≤8 materials, launch, child actions, adult
  response, exit, and ≤8 adaptations
- `movement`, `transition`, `careRoutineFocus`
- `safetyFlags`: controlled flags only
- `feedbackOptions`: exactly `used`, `adapted`, `skipped`

Forbidden: deals, voice/audio, child observations, names/IDs, incident text,
assessment, diagnosis, scores, rewards, or autonomous actions.

## Radar query

Exact fields: `category`, `ageBand`, `materialLane`, `radiusBand`.

- age band: `24-36-months`
- radius: `anaheim-hills-15mi`
- material lane: `on-hand`, `borrow-or-free`, or `teacher-supply`
- category: care routine, gross motor, language, materials, or process art

No free-text query derived from a note.

## Radar card

Exact fields: schema version, title, age band, materials, safety flags, HTTPS
source URL, and `verified | generated` provenance. No raw HTML/email.

## SwanGuard opportunity

Exact fields: schema version, opportunity ID, title, category, HTTPS source URL,
provenance, and safety status. The schema contains no child, family, classroom
narrative, roster, observation, or accommodation field.

## Deterministic allergy result

The local checker may emit only:

```json
{"status":"pass|hold","flags":["allergen-match:CODE"]}
```

No name, local student key, roster, affected count, or narrative enters a prompt.

## 5090/external envelope

Exact fields: schema version, classification `public-or-synthetic`, controlled
terms, public source IDs, and a controlled task code. Child-specific content is
ineligible even if redacted or pseudonymous. Unknown fields fail closed.

