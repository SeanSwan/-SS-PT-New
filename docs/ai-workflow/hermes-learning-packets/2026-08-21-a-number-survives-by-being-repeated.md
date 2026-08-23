---
title: A number survives by being repeated, not by being true — and four reviewers agreeing measures shared inputs, not truth
originating_model: claude-opus-5
tier_basis: Sean's explicit designation 2026-08-10 — Opus 5 is Fable-tier and may write the durable corpus
date: 2026-08-21
decision: "Any quantitative claim carried from another document must carry its original citation or be tagged UNVERIFIED, and re-attributing an inherited figure to a primary source is a violation; separately, every repo-state claim made from a tree that is not main must name its ref, because a bare claim there is a coin flip presented as a reading"
status: draft
supersedes: none
privacy: IDs/roles only; no PII, no secrets, no absolute paths
models_used:
  - model: claude-opus-5
    role: auditor and Final Decider synthesis
    did: "wrote the ARMS workflow audit; laundered an unverified figure into it; asserted a repo property without naming which branch; miscounted the rule total as 109 when it is 83 and propagated that to four documents and to Linear; verified the panel's premises afterward and falsified two of them"
    cost: subscription (flat)
  - model: x-ai/grok-4.6
    role: hostile panel seat
    did: "checked the audit's citations against the supplied seed and caught the laundered 40 percent figure; reframed 775 handoff docs as a retention failure rather than a search failure"
    cost: about 0.074 USD via OpenRouter
  - model: z-ai/glm-5.3
    role: hostile panel seat
    did: "named the structural blindness — the ARMS framework has no security layer, so an ARMS-shaped audit cannot produce security findings; also named the retrieval/constitution dependency inversion"
    cost: flat-rate Z.ai coding plan
  - model: moonshotai/kimi-k3
    role: hostile panel seat
    did: "corrected the build sequence — a stale recall index is the safety precondition for constitution surgery, not a follow-up to it"
    cost: about 0.058 USD via OpenRouter
  - model: qwen3.8-27b local via Ollama
    role: free hostile seat
    did: "produced the single best line of the panel — the hooks are the control, the prompt is the documentation — and independently rated the effort XL against my L"
    cost: 0 USD (local, 5090)
skills_touched:
  - name: Rule 51 (confidence-tag discipline)
    change: proposed
    why: "tags were applied rigorously to figures I measured myself and never to figures inherited from prior documents, which is the higher-risk class — the discipline ran clean the whole time because it was inspecting the wrong half of the document"
  - name: Rule 30 (subagent skepticism)
    change: reaffirmed
    why: "two panel conclusions rested on false premises about the repo — a headless surface that already exists and a prototype that was already built — and I nearly relayed both as findings"
  - name: Rule 72 (the catalog)
    change: reaffirmed
    why: "the catalog covers 558 of 773 tracked handoff docs; a recall layer roughly a quarter dark manufactures confident false negatives, and regenerating it from a stale branch would drop about 189 more"
---

# A number survives by being repeated, not by being true

## The lesson

I wrote an audit that attributed "roughly 40% retrieval-token savings" to a video transcript. **The number is not in the transcript.** It came from a July consult document in this repo, which itself did not source it. I moved it one hop further and, in doing so, re-attributed it to a primary source that never said it. A paid reviewer caught it in one step — by reading the seed I had supplied and searching for the figure.

The mechanism is worth naming precisely, because it is not carelessness and it will recur: **a figure that appears in a document I trust arrives pre-laundered.** I applied `[VERIFIED]` tags rigorously to everything I measured myself with `wc -c` and `git ls-tree`, and applied nothing at all to the numbers I inherited. The confidence discipline fired exactly where it was least needed and was silent exactly where it mattered. Repetition across documents is not corroboration. It is the same claim wearing more clothes.

## Mistakes I made

- **Laundered an unverified figure.** Attributed "roughly 40% retrieval-token savings" to the transcript; it is not in the transcript. Carried from a July consult and re-attributed to a primary source. → Caught by Grok 4.6 searching the seed. → Fix: grep the cited source for the figure before quoting it.
- **Asserted a cost claim with no instrument.** Called a cached, stable prefix "direct spend on every turn" — overstated ~10×. → Caught by GLM and Grok independently. → Fix: name the measurement that would falsify the claim, in the same sentence as the claim.
- **REPEATED A MISTAKE I HAD ALREADY WRITTEN UP IN THIS SAME SESSION.** After drafting this packet, I asserted "CLAUDE.md advertises dead code" without checking *which* CLAUDE.md. On `origin/main` neither the script nor the row exists; on the local wip branch both exist. Each branch is self-consistent — the lie I reported does not exist. → Caught only by running `git show origin/main:CLAUDE.md | grep swan-brain` myself, *after* all four reviewers had agreed with me. → Fix: in a tree 2,158 commits from main, every repo-state claim names its ref.
- **Recommended a command that would have corrupted the artifact it was meant to fix.** Tier 0 said "run `catalog-regen.mjs`." Run from this branch it sees 584 docs against main's 773 and would have dropped ~189. → Caught by executing the tool instead of reading it. → Fix: execute the recommendation from the vantage the user would execute it.
- **My own verification probe reported false success.** Read `$?` after a pipe, capturing `tail`'s exit 0 instead of node's exit 2, and briefly read a failing check as passing. → Caught on re-run. → Fix: capture the exit code of the command under test, never through a pipe.
- **THE TITLE CASE, AND IT ESCAPED THE REPO.** I reported "**109 MANDATORY rules**" — derived from `grep -cE "^[0-9]+\. \*\*"` run over the *whole* `CLAUDE.md`, which swept in five unrelated numbered lists (4 Karpathy principles, 7 dual-pass steps, 7 design-critique steps, 2 load-order items, 6 priority items). The true count on `origin/main` is **83**, contiguous 1–83. → The figure went into four documents, survived a four-model hostile panel unchallenged, and **I posted it to Linear SWA-38** — an external surface, where a teammate would have read it as measured fact. → Caught only when I finally needed the rule *list* rather than the *count*, and had to scope the grep to the `## MANDATORY Rules` section to get it. → Fix: **scope the region before counting anything inside it**, and sanity-check any count against its own max (`grep -oE "^[0-9]+\." | sort -n | tail -1` returns 83, not 109 — a five-second check that would have caught it at derivation). This is the fifth instance of the same class in one session and the first to reach outside the repo.
- **SIXTH INSTANCE — and it happened while writing up the fifth.** Checking whether this very packet still failed validation, I ran `validate --json | grep -c "a-number-survives"` and read the `1` as "my packet is in the fail list." It was counting its row in the *results* array, which lists every packet pass or fail. → Caught because the number contradicted the single-file run I had done thirty seconds earlier. → Fix: **never derive a boolean from `grep -c` over structured output — parse the field.** Six instances in one session of the same root cause: *a number produced by a convenient command, believed because it was produced rather than because it was checked.*
- **NINTH — my own test harness silently corrupted its inputs, three separate ways, and each time I read the corrupted result as a finding about the code.** (a) `node -e "..."` inside double quotes let bash eat `$2`, so an awk probe tested a string that no longer contained the thing under test. (b) A probe loop's `sed 's/"/\\"/g'` mangled `$2` into `\$2`, turning two BLOCK cases into false ALLOWs — I nearly concluded the gate had regressed. (c) A probe harness reported `allow` for a gate that was *crashing on a syntax error*, because it only checked for the block marker and never checked the exit code. → Fix: **probes go in a file, never in `-e` through a shell**, and any harness must distinguish crash from pass before it distinguishes pass from fail. (c) is the worst of the three: it is the reports-green-while-doing-nothing class, in the instrument I was using to certify a gate against exactly that class.
- **TENTH — I wrote a literal 0x08 byte into a security gate and shipped it through three green-looking checks.** A non-raw Python string wrote `\b` into a regex; Python turned it into a backspace character while leaving `\s` alone, so the regex read `/^Hlength.../`. `node --check` passed, the file looked correct in `grep`, and the rule silently never matched — meaning the Rule 59 gate blocked a workflow Rule 59 explicitly recommends. → Found only with `cat -A`. → Fix: **write regexes to files via a quoted heredoc, never through a language whose escape rules differ from the target's**; and when a rule "should obviously match" but does not, inspect the bytes before re-reading the logic. I then swept every file touched this session for control bytes (one line, two bytes, no siblings) rather than assuming it was isolated.
- **ELEVENTH — `/proc/*/environ` inside a JSDoc block closed the comment early**, breaking the whole module. The same class as TENTH: a character sequence that is inert in prose and structural in code. Caught only because the crash-aware harness from NINTH was already in place by then — the earlier harness would have reported the broken gate as "allow" for every case.
- **SEVENTH — I wrote the fix for this exact error two turns earlier and then committed it again.** Testing the new pre-push hook against Sean's real tree, I read the exit code via `${PIPESTATUS[0]}` after piping to `head` and reported `exit=0` when the true code was `1`. The written fix, in this file, reads: *"capture the exit code of the command under test, never through a pipe."* → Caught because `exit=0` contradicted the BLOCKED banner printed directly above it. → **A lesson I had written down, in the file I was writing it in, did not survive twenty minutes.** Prose does not change behaviour; only redirecting to a file and reading `$?` on the next line does.
- **EIGHTH — a bad instrument invented a defect that did not exist.** I reported CRLF in the committed hook blob and wrote a `.gitattributes` fix citing it. `od -c | grep -c '\r'` counts od's *output lines containing the escape sequence*, not CR bytes. The definitive check — `git show :<path> | tr -cd '\r' | wc -c` — returns **0** for every blob. The blobs were always LF-clean. → Caught because the same command reported CRs in the *existing, known-working* pre-commit hook, which was implausible. → The `.gitattributes` change was kept because it is independently correct for a different reason (hooks execute from the working copy, and an uncovered path gets CRLF on Windows checkout), but **the reason I originally gave was fabricated by a bad measurement**, and I corrected it in the commit message rather than letting the wrong rationale stand. → Fix: count bytes with `tr -cd`, never lines with `grep -c`.
- **Miscounted a headline metric.** Said "6 of 44 skills have rich reference bundles"; the true count of skills with more than 2 files is 4. → Caught in dry-loop round 4 by re-deriving instead of re-reading. → The gap is worse than I reported.
- **Rated one item "L effort" and "HIGH risk" in adjacent columns.** → Caught by GLM and Qwen. Effort is XL.
- **Let a borrowed framework shape my findings.** Organizing by ARMS meant the audit produced zero security findings across ten absent controls — after I had written the cargo-cult warning into my own section 3. → Caught by GLM.
- **Re-derived a finding the board already had, in a worse form.** `SWA-38` — *"cap CLAUDE.md/AGENTS.md steering-file size **+ convert top prose rules to executable checks**"* — has been open since 2026-07-22 and already carried the correct prescription. I derived only the first half, ranked it P0, and spent a paid panel rediscovering that the second half is what matters. → Caught in dry-loop round 7 by querying Linear before closing. → Fix: grep the board *and* the 152-lesson learning corpus **before** deriving, not before reporting. Both surfaces exist precisely for this and I used neither.
- **Nearly relayed two consultant conclusions built on false premises** (headless surface "missing" — it exists at `fusion-triangle.mjs:42`; cockpit "never built" — a prototype exists). → Caught by checking before reporting. Rule 30 held, barely.

## Who did what

**I was wrong, and four independent seats said so.** My headline finding — that a 53,700-token constitution file was the top problem — was rejected 4/4. Three separate errors underneath it:

- I claimed the file "costs money every turn" without considering that a stable prefix is **prompt-cached**, which overstates the money by roughly an order of magnitude. GLM and Grok both caught this. The context-occupancy and attention arguments survive; the cost argument did not.
- My arithmetic told two stories in one document — a ~65k "boot floor" in a table and a ~107k "per pair-coding session" figure in the body. Those are two different agent contexts, not one sum.
- I rated the same item "L effort" and "HIGH risk" in adjacent columns. Qwen, the free local seat, rated it XL and was right.

**Qwen (free, local, 47 seconds) produced the best line of the panel:** *"The hooks are the control; the prompt is the documentation."* The most expensive seat was not the most valuable one on every axis. Grok (~$0.074, 575 seconds) earned its cost by being the only seat that checked citations against the source. The cheapest seat and the slowest seat carried the panel; the middle did not.

**The panel was also wrong twice, and only checking saved me.** Two seats concluded that a headless-execution surface was missing and that a command-center had never been built. Both premises were false — the spawn wrapper exists at `scripts/fusion-triangle.mjs:42` and a prototype exists under `hermes-agentic-os/prototypes/`. I nearly relayed both as findings. Consultant output is a hypothesis; the reflex to verify has to fire *even when the consultant is agreeing with your critics*, which is the hardest case because being corrected feels like being informed.

## External-model calibration

Four seats reviewed the same document. **All four rejected my headline, and being agreed-with by all four is exactly what made the false claim durable** — they had only my document and could not check its premises. Convergence measured shared inputs, not truth. Per-seat, on verification:

| Seat | Cost / wall | Findings real vs disproven | Worth it? |
|---|---|---|---|
| **Grok 4.6** | ~$0.074 · 575s | **All real.** The only seat that checked citations against the supplied seed and caught the laundered figure. Also produced the best reframe of the session — 775 immortal handoff docs is a *retention* failure being treated as a *search* failure. | **Yes — the highest-value paid seat.** Slowest by 10× and worth every second. |
| **GLM 5.3** | $0 (Z.ai plan) · 225s | **All real.** Named the structural blindness no one else saw: ARMS has no security layer, so an ARMS-shaped audit *cannot* produce security findings. Also caught the retrieval/constitution dependency inversion. | **Yes.** Best structural critic; free on the plan. |
| **Kimi K3** | ~$0.058 · 22s | **Real, with overlap.** Correct on sequencing (a stale index is the precondition for constitution surgery, not a follow-up). Added little GLM had not already covered. | Marginal — fast and cheap, but the least differentiated. |
| **Qwen 3.8 local** | $0 · 47s | **Real.** Produced the single best line of the panel and independently rated the effort XL against my L, matching GLM. | **Yes.** The free local seat matched paid seats on the central judgement. |

**Two calibration lessons that generalise:**

1. **Price did not predict value on every axis.** The free local seat produced the sharpest sentence; the most expensive seat produced the only citation check. Both were worth running; neither would have sufficed alone. Keep firing the free seat in every panel — it has now justified itself again.
2. **A panel cannot verify a premise it was never given.** Every seat amplified my false "the constitution advertises dead code" claim because the claim was *in the document they were reviewing*. **Panels check reasoning; only the repo checks premises.** The correct order is verify-then-panel, not panel-then-verify — and where that is not possible, the panel's agreement on a factual premise carries no evidential weight at all.

## Skills created or changed

No new skill. The proposal that came out of this is a **scoping correction to Rule 51**: confidence tags currently attach to claims the author generates and are silent on claims the author inherits. Inherited figures are the higher-risk class, because the author has no memory of the evidence and no prompt to look for it. The correction: **any quantitative claim carried from another document must either carry its original citation or be tagged `[UNVERIFIED]` — and re-attributing an inherited figure to a primary source is a violation, not a shortcut.**

The second lesson is structural and belongs to whoever next audits anything: **a borrowed framework silently sets the shape of your findings.** I organized the audit around a four-part acronym from a sales video. That acronym has no security element, so the audit produced zero security findings across ten separate absent controls — secrets scoping, injection threat model, PII verification over our own corpus, dual-control on money. I had written a warning about cargo-culting into section 3 of my own document and then let the borrowed skeleton dictate section 4 anyway. **Writing the caveat is not the same as obeying it.**

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stops it |
|---|---|---|---|
| **Asserting a property of "the repo" without naming which surface** | **2** | **Yes — I wrote this packet after the first, then did it again before shipping** | Name the ref in the sentence: "on `origin/main`, X" — never bare "CLAUDE.md says" in a tree 2,158 commits from main |
| Inherited figure re-attributed to a primary source | 1 | **No** — new class | Grep the cited source for the figure before quoting it. Mechanical, not attitudinal. |
| Cost claim asserted without the instrument | 1 | Yes — "validate the probe before believing a negative" is the same shape, inverted (asserting a positive without measuring) | Name the measurement that would falsify the claim, in the same sentence as the claim |
| Relaying consultant conclusions unverified | 0 (caught pre-emission) | Yes — Rule 30 | Check the panel's *premises* against the repo, not just its reasoning |
| Effort/risk ratings mutually contradictory in one table | 1 | No | If risk is HIGH because of citation blast radius, effort cannot be L — the citations are the work |

**The first row is the finding.** I wrote this packet — including the line "writing the caveat is not the same as obeying it" — and then, in the same session, before shipping, asserted that "CLAUDE.md advertises dead code" without checking *which* CLAUDE.md. On `origin/main` the script and its reference row are both absent; on the local wip branch both are present. Each branch is internally consistent; the lie I reported does not exist. Four paid and free reviewers amplified it back to me as a confirmed finding, because they had only my document and could not check the ref.

That is the whole lesson compressed: **a claim four independent reviewers agree on is not verified — it is popular.** They were all reasoning from my unchecked premise. Convergence measures shared inputs, not truth. The only thing that caught it was running the grep myself, after the panel agreed with me.

Two corrections survive, both procedural, neither attitudinal:

1. **Before quoting a figure attributed to a source, open the source and find the figure.** Not "be more careful with numbers."
2. **In a tree that is not `main`, every claim about repo state names its ref.** Write "on `origin/main`, X" or "on this branch, X" — never a bare "CLAUDE.md says." The working tree here is 2,158 commits from main; a bare claim is a coin flip presented as a reading.

Nothing in the existing rule set would have caught either. The confidence discipline ran the whole time and looked clean, because it was inspecting the half of the document I had generated rather than the half I had inherited or assumed. **A gate that reports green while inspecting the wrong surface is worse than no gate; it buys confidence it has not earned.**
