# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/HERMES-OS-TERMINAL-AUDIT-2026-08-15.md
**Tokens:** 5180 in / 21492 out (reasoning: 18091) | total 26672
**Wall:** 319.1s

---

# Hostile Review — Hermes ui-tui Audit Packet (v2026-08-15)

The verified spine of this document — git state, compare API, the alias-patch inventory — holds. Everything downstream of it still commits the scope sin in new places, including inside the section written specifically to atone for it. The document now contains its own standard (§2.2: *"a claim is only as strong as the surface it was probed against"*). I will apply it.

---

## 1. The fourth instance (and three accomplices)

**F1 — THE fourth instance: "the missing options arrive by updating."** §0 states it flat; H6 states it as *"ships upstream in v0.20.0 and therefore closes on update."* The evidence for the upstream side is **release notes** — marketing prose. The author ran the registry probe against the *local* tree and then took upstream's feature list on faith. Release notes are the upstream equivalent of a repo-wide grep: they assert repository presence, not product exposure. By the document's own method rule, the claim "updating delivers `/diff`, `!`, `/context`, `/init`, `/focus` as typed commands" is unestablished. This is not a corner case — it is the load-bearing claim of the TL;DR ("update first, then reskin") and of the downstream verdict. Same error class, fourth occurrence, wearing a halo because it points in the convenient direction.

The probe is one command:
```
git fetch --depth 1 origin tag v2026.8.13
git grep -nE "'(diff|init|context|focus)'" v2026.8.13 -- ui-tui/src/app/slash/
```
No unshallow needed. It was never run.

**F2 — H4 "CONFIRMED on proper evidence" is a fifth instance.** §4.1's own rule: *"file presence is not default rendering."* The "verified exception" for H4 is that `petSprite` and `fpsOverlay` are "mounted in the default tree at appLayout.tsx:108 and :571." JSX mount points are file presence with line numbers. A `<PetSprite/>` that returns null when no pet is selected renders nothing; `petPicker` existing implies selection state, i.e., plausibly off by default. Mount ≠ pixel. Also: H4's evidence list cites `petFlashStore`, which appears nowhere in the 36-component inventory of §3 — one of the two enumerations is wrong, and neither was reconciled.

**F3 — §2.2's `/voice` row is a sixth instance.** "Barge-in/wake-words are sub-features of a shipped command" — registration of `/voice` establishes a voice command exists; it establishes nothing about barge-in or on-device wake words functioning in this build. §2.1 found `wake_word` in exactly 5 files repo-wide and never localized them (TUI vs gateway vs desktop). This is the corrected "/context ✅ present" error re-performed inside the correction table.

**F4 — `!` shell mode: wrong surface entirely.** A `!` prefix mode is dispatched in the input layer, not the slash registry. "Not registered" is vacuous evidence for it — the registry is as wrong a probe for shell mode as the narrow grep was for A2A. The conclusion may be true; §2.2 cannot establish it. Correct probe: `grep -n "shell" ui-tui/src/components/textInput.tsx` and the input dispatcher, locally and at the upstream tag.

**F5 — §3.1 launders a hypothesis into a constraint.** "The problem is not the color system… dissatisfaction lives in layout, chrome, density, motion" is an experience-level allocation asserted from static code reading — zero captures, zero decomposition of Sean's complaint. It is then hardened into §5 constraint 3 ("Do not rewrite `theme.ts`"). H1/H2/H5 wearing a declarative costume.

**F6 — numeric hygiene.** (a) §2's per-release commit counts don't sum to the verified 4,657 under any reading: cumulative-since-v0.19.0 gives 2,789 + 861 + 1,444 = **5,094**; per-release gives 7,883. Unremarked. (b) Local "version 0.19.0" is read from `pyproject.toml` — a version *string* — while HEAD is dated 2026-07-24 and v0.19.1 released 07-30, i.e., HEAD likely sits mid-stream between tags. `git describe --tags --exact-match HEAD` was never run; the audit doesn't know which ref it's actually auditing. (c) §2.2 credits "GLM 5.3" with naming the registry probe; §9 asserts GLM 5.3 doesn't exist. Same document, same date. I am comfortable with my existence; the document's provenance for its own key evidence is not.

---

## 2. Is §2.2 sound?

Right probe for slash commands — and oversold. Defects:

1. **The count doesn't reconcile.** "66 registered entries (≈63 real commands)" — the printed list contains **62** names. Which 3–4 are "parse noise"? Unnamed. Which extraction command produced 66? **Not recorded.** A section self-branded AUTHORITATIVE, superseding all prior evidence, with an enumeration that doesn't match its own headline and no reproducible command, is unauditable. An authoritative table that silently drops rows re-teaches the lesson it claims to have learned.
2. **The registry is not the user-reachable surface in this product — by the document's own testimony.** §1.1 documents a quick-command alias system (`/builder → /model deepseek --global`). The effective command surface is registry ∪ aliases ∪ (possibly) skills/plugins. §2.2's method rule — "the registry defines what users can reach" — is falsified by §1.1, four sections earlier.
3. **Registration ≠ reachable ≠ working.** Modules named `subscription` and `topup` suggest tier-gated commands. `66 registered` proves nothing about what functions for this user.
4. Never run against the upstream tag (F1), so it can support local-absence claims only — not arrival claims.

---

## 3. H1–H7 salvage and the exact probes

All of H1–H6 are salvageable in **under one hour of machine time**. H7 stays dead. The scandal: §9 records a 45 GB download this audit *did* run, while the 30-minute capture it says would beat §4 was *not* run.

| H | Salvageable | Exact probe |
|---|---|---|
| H1 | Yes — but first check the counter-evidence the doc ignored | The registry itself ships `/density`, `/statusbar`, `/indicator`, `/verbose`, `/skin`, `/title`. Chrome may already be tunable down. Run `/density`, `/statusbar`, capture at 120×40 and 80×24 (`asciinema rec`), count persistent non-transcript rows in default and minimal configs. |
| H2 | Yes | Same scripted exchange in Hermes, Claude Code, Codex at identical geometry. Per-row ANSI histogram: `grep -o $'\x1b\[[0-9;]*m' capture.txt \| sort \| uniq -c`; rows-per-message count. The Claude/Codex side of every comparison in §4 is also uncaptured — the baseline is vibes. |
| H3 | Yes — the instrument ships in the tree | Enable the existing `fpsOverlay` while typing (the probe is a registered feature the audit never thought to use). Script `tmux send-keys` typing under asciinema; measure keystroke→echo from frame timestamps; paste 5k chars, time to stable frame. |
| H4 | Yes | `grep -rn "pet\|fps" ui-tui/src/config*` for defaults; boot with `HOME=$(mktemp -d)` and capture whether anything paints. Resolves mounted-vs-rendered in one run. |
| H5 | Yes | Scripted 5-task run (model switch, logs, session switch); % of wallclock with a modal occluding the transcript. |
| H6 | Yes | The F1 tag-grep closes the upstream half; after update, run `/diff` on a dirty file and capture. Note §2.2 found `/replay-diff` registered and promised a re-scope of H6 — **the re-scope was never applied to §4's text**, which still calls it "the single biggest experiential gap." An audit that notes its own correction is needed and doesn't apply it. |

---

## 4. §5 and §7 defects

**§5:**
- **Constraint 1 quietly converts the mandate.** The decision line says "rebuild"; constraint 1 restricts to "theme-layer, config-layer, or upstreamable patches." A Claude-Code-grade rework of `appChrome`/`appLayout`/`messageLine` is component *replacement* — in-bounds or not? As written, the blueprint can be ruled non-compliant for doing its job. Say explicitly: component-level replacement within Ink is allowed.
- **Constraint 6 is written blind.** The audit never records OS, terminal emulator, `$TERM`, truecolor support, or font — for a *TUI*. winget says Windows; `~` says POSIX-ish shell; unresolved. Degrade-targets were authored without measuring the one machine that matters.
- **Missing: a latency budget.** "Feels like a chore" is fundamentally latency + layout; there is no keystroke→paint or token→paint target anywhere, so no slice can have a meaningful acceptance criterion.
- **Missing: the gateway interface.** The one locally patched file is gateway-side (`tui_gateway/server.py`), yet no constraint addresses TUI↔gateway schema/version compatibility — the exact seam the reskin will stress.
- **Missing counterparts:** a probe for whether upstream independently fixed the alias bug (`git log a61183b56..v2026.8.13 -- tui_gateway/server.py`) before the re-apply/retire decision; SIGWINCH/resize correctness; transcript virtualization policy for long sessions.

**§7:**
- **The process contradiction:** §6 commissions the blueprint and a keep/cut/defer table for the 36 components *now*, while §7 step 6 declares §3/§4 possibly obsolete *after* update. The doc half-knows this ("Step 6 is not optional") but doesn't carry it through: steps 1–6 must precede the §6 commissioning, or the panel ratifies an inventory that's about to churn. Only constraints and method survive pre-update.
- **Missing step 0: baseline capture of the OLD tree.** Step 6's "re-audit the NEW tree" is a diff against nothing — you cannot determine "upstream already fixed it" without a before-capture, and H1–H5 arbitration needs it too. One asciinema session now, at both geometries, scripted task list.
- **Missing post-update boot smoke test.** §9's own lesson — exit 0 while inner commands failed — is unapplied to step 4: "reinstall deps" with no verification the TUI boots. (And step 5's test suite is Python gateway tests; no frontend test inventory exists anywhere in this document.)
- **Missing:** `git diff --stat a61183b56..v2026.8.13 -- ui-tui | tail -1` — one command quantifying how much of §3's 56k-LOC inventory survives, i.e., how stale this entire packet already is.
- Sean's §8 answers gate step 7's slice content; no step collects them.

---

## 5. What this audit never considered at all

1. **The platform itself.** No terminal emulator, no `$TERM`/truecolor/font/scrollback/OSC-133/kitty-keyboard/bracketed-paste matrix. A TUI audit that never names the terminal it runs in hasn't recorded its operating system.
2. **A performance and durability baseline.** Keystroke and token paint latency, memory growth over a 10k-line session, transcript virtualization. The registry's own `heapdump` and `mem` commands are upstream's admission of memory concerns — never chased.
3. **The registry read as telemetry.** `redraw` implies paint corruption; `reload`/`reload-mcp`/`widgets-reload` imply hot-reload pain; `busy` implies stuck states; `rollback`/`undo`/`retry` imply state-recovery failures; `compress` implies context-management UX. The audit held this list and used it only as an existence proof. Why do these commands exist? Every one is a lead.
4. **Resize and crash behavior.** SIGWINCH mid-stream; gateway restart mid-session. Classic Ink failure modes; zero probes.
5. **A task-parity comparison harness** — same five tasks, timed and captured, in all three tools. The complaint is comparative; the protocol isn't.
6. **The config-surface inventory** — how much reskin is achievable zero-code decides how binding constraint 1 actually is, and nobody enumerated it.
7. **Upstream's own trajectory.** v0.20.0's CLI power commands suggest upstream is already converging on Claude-Code affordances; a parallel reskin is a collision/merge-debt analysis the doc never performs. Also: contribution norms, if §8 Q4's PR path is taken.
8. **Accessibility:** is mouse optional (`/mouse` exists)? Reduce-motion for spinners/pets? Keyboard-only completeness.
9. Minor but real: the audit *upgraded Ollama mid-pass* (§1) — it mutated the environment it was verifying and then labeled the result "verified environment state."

---

## Severity ranking

1. **F1 — upstream-arrival claim from release notes** (fourth scope error): poisons the TL;DR, H6, and the downstream verdict's core mechanism. One-command fix, never run.
2. **§6/§7 sequencing contradiction + missing baseline capture:** invalidates the commissioned blueprint's inventory and makes step 6's before/after comparison impossible.
3. **§2.2 authority defects:** 66/≈63/62 unreconciled, no extraction command, alias layer ignored (contradicted by §1.1), `/voice` sub-feature promotion, `!` on the wrong surface — the new load-bearing evidence is unauditable as presented.
4. **H4 "CONFIRMED" from mount points; H6 re-scope promised but unapplied; comparative baseline (Claude/Codex) uncaptured on both sides** — §4 remains the weakest layer, again.
5. **§5 ungrounded:** no platform record, no latency budget, no gateway constraint, rebuild-vs-reskin ambiguity, hypothesis laundered into constraint 3.
6. **Numeric/provenance hygiene:** commit sums don't reconcile (5,094 ≠ 4,657), no `git describe`, `petFlashStore` ghost component, GLM-5.3-exists/doesn't-exist contradiction.
7. **Unconsidered surfaces** (§5 list above) — items 1–3 there arguably belong at rank 4–5.

The pattern across all four corrections and all six new findings is one error: **the audit keeps probing the surface it has in hand and reporting the surface it wishes it had probed.** §2.2 finally wrote the rule down. It still doesn't apply it upstream, to mount points, to sub-features, or to its own constraint list.
