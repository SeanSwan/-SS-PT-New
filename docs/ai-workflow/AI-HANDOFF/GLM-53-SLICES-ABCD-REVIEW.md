# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/HERMES-SLICES-ABCD-REVIEW-PACKET-2026-08-16.md
**Tokens:** 2007 in / 23207 out (reasoning: 19204) | total 25214
**Wall:** 397.0s

---

# Hostile Review — Hermes Slices A–D

All probes assume repo root; file names as used in the packet (`cli.py`, `hermes_cli/main.py`, `methods_tools.py`). Where a probe poisons config, it uses the exact `quick_commands` shape the packet itself documented.

---

## SLICE A — `display.compact` point-of-use re-read

**Q1 — Does the point-of-use read now disagree with `self.compact` at `cli.py:10256`?**
**Verdict: BROKEN** (deterministic inconsistency, not merely TOCTOU; no security boundary crossed).

The disagreement is not a race — it is structural. On the `hermes_cli/main.py` entry path, `compact=False` is always passed, so `self.compact` is pinned `False` for the process lifetime. Post-fix, the banner (~7437) reads `CLI_CONFIG` directly; `/clear` at 10256 still reads `self.compact`. So whenever `display.compact` is truthy in config:

- banner path: `self.compact=False` ∨ `cfg=True` → compact chrome
- `/clear` path: `self.compact=False` → non-compact behaviour

Two renderings of one preference in one session. The TOCTOU/late-mutation framing is the *smaller* hazard (a mid-session `/config` reload flips the banner but nothing else); the static divergence exists on every launch with config set. Note the divergence is entry-path-specific: any caller that instantiates `HermesCLI()` without the kwarg gets `self.compact` from config and the two sites agree — the bug is exactly on the CLI path the fix claimed to repair.

Probe (settles in one shot, mirrors production kwargs):
```
python -c "import cli as m; c=m.HermesCLI(compact=False); m.CLI_CONFIG.setdefault('display',{})['compact']=True; print('10256 sees:', c.compact, '| banner sees:', c.compact or bool(m.CLI_CONFIG['display']['compact']))"
```
`False | True` printed = divergence proven.

**Q2 — Is leaving `main.py`'s `getattr(args, "compact", False)` correct minimalism?**
**Verdict: BROKEN** — it is the defect; the banner patch is a workaround on top of it.

`getattr(args, "compact", False)` with no `--compact` flag means `__init__`'s config-fallback branch (`compact if compact is not None else CLI_CONFIG[...]`) is permanently dead on the CLI path, and **every** `self.compact` consumer (10256 and whatever else) stays broken relative to config. The smaller fix is in `main.py`: pass `None` (or drop the kwarg) — one line, no new read site, no divergence. The chosen fix is larger *and* leaves the root cause live.

Probes:
```
grep -n "compact" hermes_cli/main.py        # shows getattr default + no add_argument
grep -c "add_argument.*compact" hermes_cli/main.py   # → 0
```

**Q3 — Does `bool()` mask truthy-but-not-bool config values?**
**Verdict: NEEDS-PROBE** (leans BROKEN for any stringly-typed config source).

First, `bool()` is a control-flow no-op — the `or` chain already uses truthiness; the wrapper changes nothing. The real issue is raw strings reaching `CLI_CONFIG`. Python truthiness: `bool("no") == bool("false") == bool("0") == True`. If the config is YAML 1.1, bare `no` parses to `False` and this is safe; if any layer hands through strings (env overrides, JSON/TOML, quoted YAML `"no"`), an intended **off** becomes **on**. Settled by inspecting the actual parsed type:

```
printf 'display:\n  compact: "no"\n' >> config.yaml && python -c "import cli as m; m.load_config(); print(repr(m.CLI_CONFIG['display']['compact']))"
```
`'no'` (str) → bug confirmed (banner goes compact); `False` → SAFE.

**Q4 — Other consumers of `self.compact` now divergent?**
**Verdict: NEEDS-PROBE** — but the answer is "yes by construction" for every consumer that is not the banner site, whenever config-compact is truthy. 10256 is confirmed; the census is one grep:
```
grep -n "self\.compact" cli.py
```
Every hit outside ~7437 that doesn't re-read `CLI_CONFIG` is a divergent site.

---

## SLICE B — Qwen 3.8 swap

**Q1 — Is 17 GB @ 65k ctx safe on 31.8 GiB once KV grows? Is 100%-GPU-at-idle misleading?**
**Verdict: NEEDS-PROBE, leaning BROKEN (operational).**

Idle is misleading. 17 GB ≈ q4_K_M weights (~15.5–16.5 GB for 27B) plus a default-ctx sliver — the 65k KV cache is **not materialized at idle**. Arithmetic: a ~27B-class model with 64 layers / 8 KV heads / head_dim 128 needs 2·L·h·d·2B ≈ 256 KiB/token → **16 GiB f16 at 65,536 tokens**. 17 + 16 = 33 GiB > 31.8 GiB → OOM at full context unless KV is quantized (q8_0 → 8 GiB → 25 GiB, fits single-stream with ~5 GiB headroom minus CUDA/graph overhead). And any concurrency (parallel tool/subagent calls) allocates KV per sequence → 2× KV breaks even the q8 case. Decide it deterministically:
```
curl -s localhost:11434/api/show -d '{"model":"hermes-fast-38"}' | jq '.model_info | with_entries(select(.key|test("block_count|head_count|key_value|context_length|quant")))'
```
then confirm under load:
```
nvidia-smi --query-gpu=memory.used,memory.total --format=csv -l 1 & ollama run hermes-fast-38 "$(python -c "print('summarize: '+'text '*25000)")"; kill %1
```

**Q2 — Two-brain state (qwen/quinn new, fast/local old)?**
**Verdict: SAFE** — and load-bearing, not just rollback: `fast`/`local` on 3.6 shields any short-budget internal caller from the reasoning-model empty-response (Q3). Keep, but document it. Probe: `grep -rn "'qwen'\|\"qwen\"\|quinn\|'fast'\|\"fast\"" --include=*.py hermes_cli/ | grep -v test`.

**Q3 — Does empty-response-at-low-num_predict break Hermes callers?**
**Verdict: NEEDS-PROBE, likely BROKEN for any caller routed via qwen/quinn with a short cap** — thinking tokens consume the budget, `response` comes back empty, caller reads it as refusal/blank. One command settles which callers exist:
```
grep -rn "num_predict\|max_tokens" --include=*.py hermes_cli/ | grep -v test
```
Model-side behaviour is already proven; re-confirm the boundary: `curl -s localhost:11434/api/generate -d '{"model":"hermes-fast-38","prompt":"Say OK","stream":false,"options":{"num_predict":40}}' | jq '.response|length'` → `0`.

---

## SLICE C — blocked-name reservation

**Q1 — Is `break` the wrong disposition vs `_alias_unresolved`?**
**Verdict: SAFE (fail-closed), with a consistency nit.**

The invariant holds: `break` fires only when the *current* `_alias_name` ∈ blocked set, so the loop exits with `cmd`'s base **being** the blocked name, and the downstream guard inspects exactly that. Chained case: aliases `a→/b`, `b→/snapshot`; typing `/a` → hop1 expands to `/b` → hop2 expands to `/snapshot` → hop3 sees `snapshot` blocked → break → guard refuses `/snapshot`. Partial expansion can only carry *arguments* forward, which the guard ignores. Homoglyph-alias case (`ѕnapshot → /snapshot`) also dies at hop 2 because the **target** is exact ASCII. The nit: `_alias_unresolved` (refuse with its own error) vs `break` (freeze, guard's error) are two semantics for two mid-loop aborts — unify for maintainability, but both fail closed. Probe:
```
printf 'quick_commands:\n  a: {type: alias, target: "/b"}\n  b: {type: alias, target: "/snapshot"}\n' >> config.yaml && printf '/a\n' | python -m hermes_cli 2>&1 | tail -2
```
Refusal naming the blocked command = invariant holds at depth 2 (the committed test only covers depth 1).

**Q2 — Can an alias named after a pending-input command hijack a confirmation? (M1)**
**Verdict: EXPLOITABLE-if-ordering — the gap is real; Slice C reserved only one set, so M1 stands, severity unchanged (HIGH).**

Everything depends on whether the pending-input matcher compares the **raw** input (safe) or the **expanded** cmd (hijack), i.e., dispatch order relative to the expansion loop in `methods_tools.py`. One grep settles it:
```
grep -n "_PENDING_INPUT_COMMANDS" hermes_cli/*.py
```
If any consumer sees the expanded string, the exact attack — a flipped refusal during a destructive confirmation:

Config: `quick_commands: {no: {type: alias, target: "/yes"}}`
Attack input during any pending confirm: `/no`
Code path: user/model input → quick-command fixpoint (`methods_tools.py`) → returns `/yes` → pending-input dispatcher consumes it as acceptance → destructive op proceeds. User (or reviewing operator) typed the refuse word; the expansion flipped it. This is worse than the blocked-name shadow because there is no second guard in this path. Live probe (if grep shows expansion-first):
```
printf 'quick_commands:\n  no: {type: alias, target: "/yes"}\n' >> config.yaml && printf '/<pending-trigger>\n/no\n' | python -m hermes_cli 2>&1 | tail -3
```

**Q3 — Case/Unicode evasion of the reservation?**
**Verdict: SAFE for ASCII case and Cyrillic; NEEDS-PROBE for fullwidth/NFKC (M2 family).**

- ASCII: `"SNAPSHOT".lower() == "snapshot"`; Python `.lower()` is locale-independent; membership and dispatch are exact-match. Safe. (The one exotic, `"İ".lower() → "i̇"`, is neutralized by exact-match dispatch.)
- Cyrillic `ѕ` (U+0455): `.lower()` keeps it Cyrillic → never equals `snapshot` → unknown command at dispatch (exact match), and a user alias `ѕnapshot → /snapshot` dies at hop 2 per Q1. Safe at the CLI.
- Fullwidth: `'Ｓ'.lower() == 'ｓ'` — **lower() does not fold width**. `python -c "print('ＳNAPSHOT'.lower())"` proves it. This is only exploitable if some entry point NFKC-normalizes where the CLI loop doesn't — i.e., a gateway/CLI normalization differential, exactly M2's shape. Attack string if confirmed: raw `"/\uff33NAPSHOT restore"` submitted through the gateway JSON API, normalizing to `/snapshot restore` after the guard ran on the un-normalized form. Settle:
```
grep -rn "NFKC\|unicodedata\|normalize\|casefold" --include=*.py hermes_cli/ | grep -v test
```
Zero hits ⇒ differential impossible ⇒ SAFE; hits ⇒ probe `printf '/ＳNAPSHOT restore\n' | python -m hermes_cli` vs the same bytes via gateway and compare dispositions.

---

## SLICE D — `git fsck --full` exit 0

**Verdict: BROKEN as authenticity evidence (integrity-only theatre); SAFE as a local-corruption check.**

`fsck` proves the object graph you *have* is self-consistent: contents hash to their IDs, DAG connected, no missing parents. It says nothing about whether these 4,657 commits are the ones upstream authored — a fully consistent rewritten history from a hostile mirror passes fsck identically. With zero signatures there is no authenticity binding at all; trust collapses onto the transport used for the unshallow and the stale-`shallow.lock` removal — precisely the events fsck retroactively blesses. Probe:
```
git log --all --format='%G?' | sort | uniq -c
```
All `N` = nothing authenticated; fsck's clean exit is then scope-limited to "local objects not corrupted," full stop. Real closure needs signed tags + `verify-tag` pinning or independent-hash cross-check. Severity unchanged (MEDIUM per prior downgrade).

---

## The additional error-class instance

**Named instance: Slice B's "Measured: 17 GB, 100% GPU at 65536 ctx" — an idle, single-shot reading stated as the broad operational fact that the deployment fits a 31.8 GiB card.** The 17 GB is weights + default-ctx sliver; the 65k KV cache does not exist at idle, so the measurement cannot support the capacity claim it is presented under. This is the exact class the author already got burned by once *in this same slice* (the `num_predict: 40` surprise — a single-shot read contradicting an "identical parameters" equivalence claim), and it matches the biography: instrumentation found what seven static reads missed. Same class still standing, two adjacent instances: the Slice A comment's "honoured regardless of load order" (broad invariant from a one-site fix — falsified at 10256 per Q1) and the Slice C comment's "must not be able to rename its way out of the blocklist" (broad invariant from a one-set, one-loop, single-hop-tested fix). Headline instance is the VRAM claim because it is both unflagged-as-fact and arithmetically refutable.

---

## Ranked findings

| # | Finding | Severity | Verdict | One-command probe |
|---|---|---|---|---|
| 1 | **C-Q2**: pending-input commands unreserved; alias `no→/yes` flips destructive confirms if expansion precedes pending-match (M1 unchanged) | HIGH (if ordering confirms) | EXPLOITABLE-if-ordering | `grep -n "_PENDING_INPUT_COMMANDS" hermes_cli/*.py` |
| 2 | **B-Q1**: 17 GB weights + 8–16 GiB KV at 65k ctx → mid-session OOM under real load/concurrency; idle 100% GPU misleading | MED-HIGH (operational) | NEEDS-PROBE→BROKEN | `curl -s localhost:11434/api/show -d '{"model":"hermes-fast-38"}' \| jq '.model_info \| with_entries(select(.key\|test("block_count\|head_count\|key_value\|context")))'` |
| 3 | **D**: fsck exit 0 ≠ authenticity of 4,657 unsigned commits (known, unchanged) | MEDIUM | BROKEN-as-evidence | `git log --all --format='%G?' \|| sort \| uniq -c` |
| 4 | **A-Q1/Q2/Q4**: banner/`self.compact` divergence at 10256 (+ any other consumers); root cause `getattr(args,"compact",False)` left live | MEDIUM (correctness) | BROKEN | `python -c "import cli as m; c=m.HermesCLI(compact=False); m.CLI_CONFIG.setdefault('display',{})['compact']=True; print(c.compact, bool(m.CLI_CONFIG['display']['compact']))"` |
| 5 | **B-Q3**: reasoning model returns empty `response` under short budgets; breaks any qwen/quinn-routed caller | MEDIUM (if callers exist) | NEEDS-PROBE | `grep -rn "num_predict\|max_tokens" --include=*.py hermes_cli/ \| grep -v test` |
| 6 | **C-Q3**: fullwidth/NFKC normalization differential (M2 family); ASCII/Cyrillic paths safe | LOW-MED (known) | NEEDS-PROBE | `grep -rn "NFKC\|normalize\|casefold\|unicodedata" --include=*.py hermes_cli/ \| grep -v test` |
| 7 | **A-Q3**: stringly `"no"/"false"/"0"` config values truthy → compact forced ON | LOW | NEEDS-PROBE | `python -c "print(bool('no'),bool('false'),bool('0'))"` then `repr()` of parsed config value |
| 8 | **C-Q1**: `break` vs `_alias_unresolved` — two abort semantics; invariant holds (fail-closed) | LOW (nit) | SAFE | `printf 'quick_commands:\n  a: {type: alias, target: "/b"}\n  b: {type: alias, target: "/snapshot"}\n' >> config.yaml && printf '/a\n' \| python -m hermes_cli 2>&1 \| tail -2` |
| 9 | **B-Q2**: two-brain alias split — deliberate, shields short-budget callers; document it | LOW | SAFE | `curl -s localhost:11434/api/ps \| jq '.models[].name'` |

Bottom line: Slice C's guard mechanism is sound where it applies — its sin is scope (one name-set, and M1 sits exactly in the unreserved set). Slice A fixed a symptom and manufactured a live inconsistency at 10256; the one-line fix in `main.py` (`None` instead of `getattr` default) is smaller and total. Slice B's claims are idle-state measurements wearing load-state conclusions — instrument before believing the card fits.
