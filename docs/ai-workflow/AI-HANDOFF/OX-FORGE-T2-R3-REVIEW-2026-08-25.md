# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** <HOME>/AppData/Local/Temp/claude/<SCRATCH-KEY>/79074e1c-43bb-41f9-b3a2-990172463a35/scratchpad/forge-t2-r3-packet.md
**Seed:** (none)
**Tokens:** 5916 in / 8781 out · **Cost:** ~$0.0000 · **Wall:** 206.5s · **finish:** stop

---

# Ox Alpha — Swan Forge T2, Round 3 review (87f3df199)

## Scores against the actual code

| Finding | Score | Basis |
|---|---|---|
| **N1** lexer + re-audit | **FIXED** | The stack lexer is real: nested templates, `${…}` interp regions, escapes, and the three damage classes in `audit-hex-tags.mjs` are correctly discriminated. 66-tag re-audit with a damage-not-taste report is the right shape. Residual risk noted below — it is *less wrong*, not *trustworthy*, but its failure modes now fall toward refusal or benign forms. |
| **N2** R6 aliasing | **NOT-FIXED** | Two concrete evasions survive the fix. See Blockers 1–2. |
| **N3** allow-list scope + tamper-evidence | **NOT-FIXED** | The exact seam GLM§3 closed in `flex` is wide open one property away. See Blocker 3. |
| **N4** retention | **FIXED** | Mechanism is sound and bidirectionally checkable. Caveats: `checkRetention(existsFn)` is only as real as whatever CI wires in as `existsFn` (asserted by evidence, not shown), and the documented import path `ui/GlowButton.ts` shim is not itself guarded — acceptable, since deleting the shim fails loudly at build time rather than silently. |

---

## The attacks

**Is the stack lexer trustworthy or merely less wrong?** Merely less wrong — and that is *good enough for this job*, which is the honest framing. It remains a heuristic: the regex-vs-division test uses last-significant-char, so `return /…/`, `typeof /…/`, `case /…/` are misread as division, and a quote or backtick inside such a regex scrambles state until the next newline. But score it against the harm model: a mis-lex into `template` yields `/* */`, which is valid anywhere; a mis-lex into `normal` at a真 template line would emit `//` into CSS — reachable only via those keyword-adjacent regexes on the *tagged line itself*. Narrow, improbable, and the auditor independently re-checks existing tags. Fixed, with eyes open.

**Can R6 still be evaded?** Yes, trivially, twice (Blockers 1–2). Worse: your own Evidence section contradicts your own verbatim code. You claim "commented-out wrapper does NOT phantom-flag," but `scanStyledBindings` runs raw regex over raw text — `// const W = styled(FB)\`background:red\`` matches and phantom-flags. Either the comment-stripping step named in the Closes table lives outside the packet, or the probe claim is stale. After round 1's lesson about filtered diffs manufacturing false blockers, an evidence claim that the verbatim code disproves is itself a finding.

**Is the frozen manifest tamper-evidence or theatre?** Mostly genuine. `Object.freeze` kills runtime mutation; the golden test converts boundary-widening into a two-place diff. But the golden test is *claimed*, not reproduced — and the manifest⇄regex pair is hand-duplicated, so the test is the only thing making the duplication safe. Produce it verbatim or the tamper-evidence is a promise, not a mechanism. (I eyeballed the 26-entry list against the regex alternation: currently in agreement.)

**Does R7 protect the rollback?** It protects the rollback's *existence*, not its *validity*. A drilled revert proves today's tree reverts green; every commit landed on top of T2 silently decays that guarantee, and R7 says nothing about it. Existence-guarded, decay-unguarded.

---

## Governance

Three rounds, and every round the blockers were holes in tools this slice invented *during* the review of the migration. That is the signal. The enforcement layer is now larger, subtler, and buggier than the constraint it enforces, and each new rule has cost more review than it saved decisions. **Stop inventing enforcement mid-migration.** Fix the blockers below, freeze the toolkit, and spend the next round's entire budget on the thing actually protecting users: the computed-style receipt in SWA-213.

**On the posture question: no.** Authenticated-receipt gap + drilled revert + R7 is not an acceptable posture for a payment-adjacent surface. A revert compensates for a *bad deploy*; it does nothing for the unproven items that are correctness failures, not deploy failures — focus order on payment modals and auth-gated render branches chief among them. If focus order is broken on a payment modal, the drill gives you a fast way to *arrive at* the incident, not to avoid it. Land T2 only where a live receipt exists; hold the 11 authenticated files until SWA-213 closes or receipts ship first.

---

## DISSENT (mandatory)

I dissent from the packet's central claim that "all six closed." Two of my four round-2 blockers are closed in letter and open in substance: N2's fix seeds and chains correctly only for the shapes the probes happened to use, and N3's fix moved the seam one property over without moving the guard. I further dissent from the framing of the Evidence section as verification: it contains at least one claim (no phantom-flag on commented-out wrappers) that the verbatim code in the same packet refutes. A packet whose evidence contradicts its own code has an integrity problem independent of any individual finding. And I dissent from GLM's "NOT-FIXED-but-managed" accommodation on the receipt gap — "managed" is the right word for a risk register, the wrong word for an unproven cascade on authenticated payment UI.

---

## VERDICT: REVISE

Blocking findings (line numbers estimated from the packet's stated ranges; drift-lint excerpts carry no numbers, cited by symbol):

1. **drift-lint.mjs — `scanStyledBindings`, the `chain` regex** (`(?:\\s*\\.\\w+\\([\\s\\S]*?\\))*`): terminates at the *first* `)`, so any `.attrs(…)`/`.withConfig(…)` whose arguments contain a `)` — a nested call, an arrow function `(props) => ({…})`, or a `)` inside a string — ends the chain early, the required backtick never matches, and the entire wrapper goes unscanned. R6 evasion with a one-line diff. Require balanced-paren scanning or flag any `.attrs`/`.withConfig` on a bound wrapper whose args can't be parsed.

2. **drift-lint.mjs — `scanStyledBindings`, the closure seed regex** (`styled\\(\\s*${name}\\s*\\)`): requires `)` immediately after the wrapped name, so `const W = styled(ForgeButton).attrs({…})` never enters `bound`, and every downstream `styled(W)\`…\`` is invisible. Same for cross-file re-extension: a consumer importing a wrapper from another file has no forge import, falls back to the `'ForgeButton'` seed, and the wrapper is unscanned. Move the restyle one file over and R6 is blind.

3. **codemod-glowbutton.mjs ~L63 (`LAYOUT_ALLOWED`) and the manifest ~L57–62**: `flex-basis` is allow-listed with **no value check**. `flex-basis: 320px` accomplishes exactly the main-axis sizing that `flex: 0 0 320px` is blocked for — the GLM§3 seam is closed in the shorthand and open in the longhand. Apply the same length-basis test to `flex-basis`.

4. **drift-lint.mjs — `scanStyledBindings` vs. Evidence**: the Closes table claims a "comment-stripped scan" and the Evidence claims commented-out wrappers do not phantom-flag; the verbatim code strips nothing and will flag them. Either the packet omits shipped code (the exact round-1 failure mode) or the probe result is false. Reconcile, and include the golden manifest⇄matcher test verbatim, before this packet is believed again.

Fix these four, freeze the toolkit, and bring the receipt — not a fifth round of new rules.
