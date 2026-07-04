# Design Decision Log Policy

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL for logging and citing design decisions
- **Why this exists:** design arguments re-litigate themselves across sessions when the losing option isn't written down with its reason. The log converts "we discussed this once" into a citable record — the design-lane sibling of the rule-48 audit record and the arbitration log required by `../adapters/fable.md` §3 and `../adapters/reviewers.md` §A4.

---

## 1. What counts as a significant design decision (log it)

- A concept direction chosen from a Fable 2–3 direction gate (and the directions rejected)
- A doctrine arbitration: Gemini/Village/skill suggestion overridden by CLAUDE.md or the design system
- A new token, pattern, or ban proposed — whether accepted or rejected by Sean
- A deviation from `../design.md` approved for one surface (scope of the exception matters)
- A pattern retired, quarantined, or superseded
- A recurring QA finding elevated into doctrine ("stop doing X on dashboards")

Not logged: routine pattern reuse, polish choices inside an existing direction, per-slice spacing tweaks. The log is for decisions someone might otherwise re-argue.

## 2. Entry format

```markdown
## DD-<YYYY-MM-DD>-<slug>
- **Date:** 2026-07-03
- **Surface:** <route/component, or "system-wide">
- **Decision:** <one sentence — what was decided>
- **Alternatives rejected:** <each with its one-line reason for rejection>
- **Why:** <the load-bearing reasoning, 2–5 sentences; cite doctrine (rule/§) where it decided the call>
- **Decided by:** <Sean | Fable arbitration | review verdict> · **Proposed by:** <agent/model>
- **Source-of-truth impact:** <none | design.md §X updated | design-system §G addition proposed | token proposal pending>
- **Review hook:** <the one condition under which this should be re-examined — e.g. "revisit if Victory adds native annotations">
```

Every field is mandatory. An entry without alternatives-rejected is a announcement, not a decision record. The review hook keeps decisions falsifiable instead of eternal.

## 3. Where entries live

- **Written to:** vault `outputs/design-decisions/` (per `vault-routing.md` §4), one file per decision or a monthly rollup file — either is fine, the `DD-` id is the citation unit.
- **Promoted to:** `wiki/design/` when a decision proves reusable across surfaces (cited ≥2 times, or it changed a source-of-truth doc). Promotion adds the standard provenance frontmatter (`vault-routing.md` §5.2) and keeps the original in place with `status: promoted`.
- **Mirrored in repo only when** the decision changed a repo doc — then the repo change cites the `DD-` id in its own text (e.g. design.md changelog line), keeping repo and vault cross-linked.

## 4. Citation discipline — cite, don't re-litigate

- Before proposing a design change, agents **search the decision log** for the surface and the pattern involved. A prior on-point decision is cited by `DD-` id and followed.
- Re-opening a logged decision requires **new evidence** that triggers its review hook (or an explicit Sean override) — "I disagree" is not new evidence. This is the design-lane application of rule 52's anti-rework burden of proof.
- A citation in a slice/receipt looks like: `Per DD-2026-07-03-chart-narrative-column, charts ship with narrative columns; not re-arguing.`
- If an agent finds two contradicting entries, that conflict is flagged to Sean/Fable and resolved with a new entry superseding one of them (`Source-of-truth impact` names the superseded id). Silent pick-your-favorite is forbidden.

## 5. Verification before done (when a log entry was owed)

- [ ] Every §1 trigger that occurred in the slice has an entry — especially rejected alternatives and overrides
- [ ] All eight fields present; doctrine citations included where doctrine decided
- [ ] Entry landed in `outputs/design-decisions/` with correct frontmatter; zero PII/secrets
- [ ] Prior log searched before proposing; citations by `DD-` id in the slice artifacts
- [ ] Any source-of-truth impact actually executed or explicitly left as a pending proposal
