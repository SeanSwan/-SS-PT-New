---
name: dewatermark
description: Strip the Anthropic (SynthID-Text) statistical watermark from outward-facing prose by rewriting it through a non-signatory local model, then PROVE the rewrite with a 4-gram survival score and a fact-anchor check. Fires automatically before any Claude-written prose is published outside SwanStudios — marketing and landing copy, blog and SEO posts, email and nurture sequences, social posts, client-facing PDF narrative — and whenever Sean says "de-watermark", "strip the watermark", "run it through the local model", or /dewatermark. Never fires on code, internal docs, handoffs, commits, or chat. Local Ollama, $0, nothing leaves the machine.
---

# De-watermark

**Role:** anything Claude wrote that leaves SwanStudios as published prose gets re-worded by a
model that never signed the EU transparency code, and the rewrite is proven before it ships.

---

## 1. What the watermark actually is

Verified 2026-09-03 against `anthropic.com/news/claude-text-watermark` and the Anthropic help
centre — not from training memory, which predates all of it.

- Claude biases its **token sampling** with a keyed pseudo-random source (a version of Google
  DeepMind's SynthID-Text, published in *Nature*, 2024). Certain word choices simply happen
  more often than chance would produce.
- **Nothing is embedded in the file.** No header, no metadata, no zero-width characters. There
  is nothing to strip — which is why "remove the watermark" is a misnomer and why no find-and-
  replace, encoding change, or reformat touches it.
- A holder of the key measures the bias and reports a **probability** that Claude wrote the
  passage. The detector is in **private preview** for regulators, law enforcement, media,
  fact-checkers, educational organisations, EU civil-society groups, and compliant enterprises.
  It is not public. **Any site claiming to detect it today is lying** — treat such a "clean"
  score as meaningless.
- It applies to **all future Claude models**, and is rolling out to older ones. This is not a
  Fable-5.1 problem; assume every seat in this repo watermarks its prose.

**Two consequences that decide everything below:**

1. **Confidence scales with length.** Short passages carry too few choices to measure. A 40-word
   CTA is not worth a round trip; a 1,500-word post is.
2. **Editing Sean's own writing barely marks it.** The signal attaches to tokens *Claude chose*.
   If Sean drafts and Claude only proofreads, there is little for it to attach to — that is a
   legitimate second route, not a workaround.

---

## 2. When this fires

**Fires — outward-facing published prose:**

| Surface | Example |
|---|---|
| Marketing / landing copy | hero, pricing narrative, ascension pages |
| Blog / SEO articles | a post drafted in chat or in a file, then published (see §6) |
| Email + nurture sequences | SendGrid campaigns, digests, drip copy |
| Social posts (long-form) | posts over the word floor; short comments are exempt |
| Client-facing narrative | plan-PDF prose, white-labeled Move Fitness copy |
| Press / public docs | anything published under Sean's name |

**Never fires:**

- **Code.** Anthropic states code carries little or no watermark because it must be exact.
  Comments may carry some, with negligible effect. Running code through a local rewriter would
  risk correctness for nothing.
- Internal docs, handoffs, audit records, learning packets, Hermes memos, commit messages,
  `CLAUDE.md` / `AGENTS.md`, debate files. These are not published and are read by agents who
  need them verbatim.
- Chat replies to Sean, unless he is about to paste one somewhere public.
- Anything under the word floor (default 150 prose words).

---

## 3. Procedure

```bash
# 0. Measure first. Costs nothing and answers "is this even worth it".
node scripts/dewatermark.mjs --in <draft> --check

# 1. Rewrite through the local model ($0, private, self-retrying).
node scripts/dewatermark.mjs --in <draft> --out <clean> [--voice <notes-file>]
```

- **`--voice`** takes any file of Sean's own writing or voice notes to imitate. No such file
  exists in the repo yet; point it at a sample when one does, or omit it.
- **Model:** local Ollama, default `qwen3.8:27b-mtp-q4_K_M` on the 5090. `--model fast`
  (`qwen3:14b`) for bulk work. Roughly 30s for a 250-word passage.
- **Why local and not a cloud seat:** $0, no spend gate, and **nothing leaves the machine** —
  marketing drafts routinely name real clients, so a cloud round trip would be a Rule 8
  violation for no benefit. Do not "upgrade" this to a paid seat.
- **If Ollama is down:** `curl http://127.0.0.1:11434/api/version`, then `ollama list`.
  Grok/xAI is the only permitted cloud fallback (xAI did not sign the code; Rule 12's
  prohibition was repealed 2026-08-20) — but it is paid, spend-gated, and sends the draft off
  the box. Prefer fixing Ollama.
- **Never** route this through Claude, GPT, or Gemini. All three signed; the rewrite would
  simply re-mark the text.

---

## 4. Proof (the part that is not optional)

Rule 74 applies: no "de-watermarked" claim without current-session evidence. The script emits it:

```
[dewatermark] PASS  4-gram survival 3.3% (ceiling 20%)  fact anchors kept 5/5  length 105% of original
```

- **4-gram survival** — the share of the original's four-word sequences still standing. Near
  zero means the tokens were genuinely re-chosen. This is the anti-watermark evidence.
- **Fact anchors kept** — every number and proper noun from the source that still appears.
  This is the **negative control**: low survival alone is also satisfied by a hallucination that
  quietly dropped the price. Both numbers must be good, or the verdict is REJECT and the output
  is quarantined to `<out>.reject`. **Never ship a `.reject` file.**
- Exit codes: `0` verified · `3` refused (below floor, or failed verification) · `1` error.
- `scripts/dewatermark.test.mjs` (30 assertions across 8 cases) proves the verdict logic, driving the real script
  against a stub Ollama. It has been mutation-checked: disabling either check turns the suite
  red on exactly the cases it should.

**Then read it.** A local model can drift on facts the anchor check cannot see — a changed claim
strength, a softened guarantee, a reordered argument. The anchors prove nothing was *deleted*;
they cannot prove nothing was *distorted*. Sean's copy standards still apply, including the
credential rule ("26+ years", NASM-**protocol**, never "NASM-certified") and Rule 9.

---

## 5. The cheaper route, when it fits

If Sean drafts and Claude only proofreads, the passage is barely marked to begin with — there is
little Claude-chosen text for the signal to attach to. For high-stakes copy this is often better
than a rewrite: it preserves his voice exactly and skips the round trip entirely.

Offer it when the copy matters more than the speed. It is not available for bulk generation.

---

## 6. What this reaches, and what it does not

Checked, not assumed: **no shipped runtime path in this repo publishes Claude-generated copy.**
`BlogWriterPanel.tsx` is demo scaffolding — mock `DEMO_DRAFTS` and a `setTimeout`, no API call —
and no marketing, blog, or email route imports `backend/services/ai/adapters/anthropicAdapter.mjs`;
its only route consumer is the generic `backend/routes/aiRoutes.mjs`.

So the whole exposure today is prose Claude writes **in chat, or into files Sean publishes by
hand** — which this skill covers directly.

**The forward constraint:** when a real copy generator is built on that adapter — auto-drafted
posts, nurture sequences, campaign copy — it must run the local rewrite **before persist or
send**, because from then on watermarked text reaches SendGrid and social with nobody reading it
first. Build the step in with it, not after.


---

## 7. Perspective

The exposure is real but bounded: no public detector exists, and the surfaces that will get key
access are regulators, media, fact-checkers, and enterprises. For SwanStudios the practical
stake is published marketing and SEO copy, not internal work. Run it on what ships; do not let
it become a tax on everything.
