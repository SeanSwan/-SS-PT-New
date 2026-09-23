---
decision: "Hostile review packet for Hermes slices A-D (banner fix, Qwen 3.8 alias, shadow guard, fsck)"
status: open
originating_model: claude-opus-5
date: 2026-08-16
linear: SWA-160
---

# Hermes Slices A–D — Hostile Review Packet
**Reviewer:** GLM 5.3 · **Author:** Opus 5 · **Base:** `v2026.8.13` (v0.20.1)

Three commits on `swan/alias-security-hardening-20260816`:
`5ce780af2` (prior, already reviewed 3×) → `21b47e1ed` (Slice A) → `e55bb4e77` (Slice C)

---

## SLICE A — `display.compact` was unreachable config (`cli.py`)

**Change**, at the point of use in `cli.py` (~7437):

```python
        # `self.compact` is resolved once in __init__, where CLI_CONFIG may not yet
        # be populated, so a config-only preference could read as False there. Re-read
        # the config at point of use so `display.compact` is honoured regardless of
        # load order. Without this, the setting has no route to take effect at all:
        # there is no --compact CLI flag either.
        use_compact = (
            self.compact
            or bool(CLI_CONFIG.get("display", {}).get("compact", False))
            or term_width < 80
        )
```

**Was:** `use_compact = self.compact or term_width < 80`

**Why it was dead:** `hermes_cli/main.py` builds kwargs with
`"compact": getattr(args, "compact", False)` — and **no `--compact` argparse flag exists**, so
this always passed an explicit `False` into `cli.main(**kwargs)` → `HermesCLI(compact=False)` →
`self.compact = compact if compact is not None else CLI_CONFIG[...]` never reached the config.

**Runtime probe that localised it:** `self.compact=False cfg=True term_width=120 use_compact=False`.

**Effect:** box-drawing chrome at 120×40 drops **34/40 → 2/40**. Tests: 266 passed / 9 skipped
(banner+compact selection); full gateway suite 559.

**Attack this:**
1. Is re-reading `CLI_CONFIG` at point-of-use correct, or does it introduce a TOCTOU / late-mutation
   hazard where the banner disagrees with `self.compact` used elsewhere (`cli.py:10256` reads
   `self.compact` for the `/clear` path — now potentially INCONSISTENT with the banner)?
2. I fixed the symptom's site, not the plumbing. `hermes_cli/main.py`'s `getattr(..., False)` is
   still wrong. Is leaving that a defect, or correct minimalism?
3. Does `bool()` around the config read hide a truthy-but-not-bool config value (`"no"`, `0`, `[]`)
   that a user would expect to mean off?
4. Anything else that reads `self.compact` and now behaves differently from the banner?

---

## SLICE B — Qwen 3.8 (config only, no code)

Sean's `qwen`/`quinn` aliases pointed at `hermes-fast:latest` — a custom Ollama build
(`num_ctx 65536`, `temperature 1`), 23 GB, matching `qwen3.6:35b-a3b`. Built
`hermes-fast-38:latest` FROM `qwen3.8:27b-mtp-q4_K_M` with identical parameters; registered it
with the `local-ollama` provider; repointed `qwen` and `quinn`. `fast` and `local` deliberately
left on `hermes-fast:latest` as rollback.

**Measured:** 17 GB, **100% GPU at 65536 ctx**, ~113 tok/s. Verified reachable over the endpoint
Hermes uses; `load_config()` confirms both aliases.

**Operational gotcha found:** Qwen 3.8 is a **reasoning** model. `num_predict: 40` returned an
EMPTY `response` — the budget was consumed by `thinking`. At 300 it answered correctly.

**Attack this:** is a 17 GB model at 65k ctx actually safe on a 31.8 GiB card once KV cache grows
under real load, or is 100%-GPU at idle misleading? Does splitting `qwen`/`quinn` from
`fast`/`local` create a confusing two-brain state? Does the empty-response-at-low-num_predict
behaviour break any Hermes caller that uses short budgets?

---

## SLICE C — blocked names reserved against alias shadowing (`methods_tools.py`)

```python
            if _alias_name in _WORKER_BLOCKED_COMMANDS:
                # Blocked names are RESERVED: a user alias must not be able to
                # rename its way out of the blocklist. Stop expanding and let the
                # guard below see the blocked command exactly as it was typed.
                break
```

Inserted inside the fixpoint loop, **before** the alias lookup.

**Hole it closes:** `quick_commands: {snapshot: {type: alias, target: "/help"}}` made
`/snapshot restore` resolve to `/help`, so `_cmd_base` became `"help"` and the guard never fired.

Test verified **failing before** the fix. Suite 558 → 559.

**Attack this:**
1. `break` leaves `cmd` at whatever the current partial expansion is. If a blocked name appears at
   hop 3 of a chain, is the *partially expanded* command what the guard should inspect — or is
   `break` the wrong disposition here where `_alias_unresolved` (refuse) is used elsewhere?
2. Scope: only `_WORKER_BLOCKED_COMMANDS` is reserved. `_PENDING_INPUT_COMMANDS` is NOT — can an
   alias named after a pending-input command hijack a confirmation prompt? (Kimi's M1.)
3. Case: `_alias_name` is `.lower()`-ed; `_WORKER_BLOCKED_COMMANDS` is lowercase. Any Unicode
   case-folding path where `/SNAPSHOT` or `/ѕnapshot` (Cyrillic) evades the reservation?

---

## SLICE D — `git fsck --full` → exit 0

Only dangling blobs/commits (stash + rebase residue). No corruption after the unshallow and the
stale-`.git/shallow.lock` removal. HY3's integrity concern partially closed.

**Attack this:** does `fsck` clean-exit actually establish anything about the *authenticity* of
4,657 unsigned upstream commits, or is it integrity-only theatre against a supply-chain threat?

---

## Known-unfixed (do not re-report unless severity changed)

- **Q2** — exec quick-commands run via `subprocess.run(..., shell=True)`; alias args flow in
  unsanitised. Pre-existing upstream. GLM HIGH → HY3 downgraded to MEDIUM (direct `/build; …`
  already works, so alias only evades *name-based* blocking).
- **Supply chain** — 4,657 unsigned commits, ~46 GB unverified model blobs.
- **Kimi M1/M2/M3** — pending-input confirmation hijack; cross-site normalization differential;
  mirror injection via ANSI/bidi in expanded `cmd`.

---

## Author's error record — calibrate against this, and find the next instance

This session I have made **nine-plus** instances of one class: *a narrow, static, or secondhand
reading stated as a broad fact.* Separately, I generated **seven** consecutive wrong hypotheses
about Slice A's root cause, all derived from reading source; instrumentation found it in one run.
Two reviewers previously found holes in my own security fixes (fail-open at a cap; fail-open on
config error).

**Assume at least one more instance is present in the four slices above. Name it.**
