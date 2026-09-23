# Hostile Review Packet — Swan Taste Brain + Prompter

**For:** Kimi K3 · GLM-5.3 · Qwen · Grok 4.6
**Author of the work under review:** Claude Opus 5
**Date:** 2026-08-21 · **Board:** SWA-186

You are reviewing a system that is already built and passing its own tests. Your job is to find what
is **wrong with it**, not to praise it. Assume the author was competent and still missed things —
your value is in the things a self-review structurally cannot see.

---

## 1. What the owner asked for

> "I'm trying to build a prompter... I want to create a random [mode] that just creates random images
> based off of my themes. I want to connect it to a Karpathy Wiki brain. The wiki brain is going to
> have everything that I love about it — everything I love visually, artistically, design-wise. So
> the prompts that are created are going to be based off of my taste versus just random prompts.
> A system that creates prompts based off of my taste, and I can fill this brain up with more and
> more information. As I fill the brain with more information, it's going to continue to create
> things based off of the things that I like."

Key properties implied by that ask:
1. Output should reflect **his** taste, not generic taste.
2. There is a **random/surprise** mode, but still anchored to his themes.
3. The system **compounds** — it gets more like him as he feeds it.
4. It connects to his existing personal knowledge brain.

---

## 2. What was built

### 2.1 Corpus (knowledge half)

Scraped a Midjourney guide site the owner subscribes to and donates to: 78 documents, ~143k words,
5,825 image references. Stored **outside** any public repo (third-party copyrighted; personal
offline copy only). Distilled into machine-readable tables:

- **223 SREF codes** (Midjourney style-reference seeds) with example prompts. Style *names* are
  populated for only 131 of them — the other 92 were harvested from guide prose where the nearest
  heading is an article section, not a style name, so those display as "unnamed code" rather than
  inventing a name.
- **4,272 example prompts** the site author actually ran (4,044 carry parameters).
- 22 canonical Midjourney parameters (allowlist-filtered).
- 407 style/artist handles.

### 2.2 Generator

Does **not** invent prompt structure. It samples:

- **Grammar shapes** at frequencies observed in the real corpus:
  `descriptive` 1638 · `by_artist` 1622 · `fragment` 974 · `style_of` 38
- **Parameter combinations** at observed co-occurrence:
  `--v` 2191 · `--sref` 680 · `--stylize --v` 187 · `--niji` 152 · `--chaos --v` 65 …

Pipeline per prompt: filter corpus by taste → pick grammar shape → pick style code → attach
parameters → emit. Seeded RNG so any batch is exactly reproducible.

### 2.3 Taste model

Two files the owner edits:
- `themes.md` — positive signal. Free-text bullets; keywords extracted from them.
- `rejected.md` — negative signal. Subjects/looks/phrasings to avoid, plus rejected style codes.
- `loved-srefs.md` — a markdown table of `code | name | rating 1-5 | note`.

Scoring is **literal substring keyword matching**: +2 per theme keyword found in the prompt text,
−3 per avoid-keyword. Prompts scoring ≤ −1 are dropped; "taste mode" uses the top half of positives;
"surprise mode" uses the whole positive pool.

Current state: 41 theme keywords, 111 avoid keywords, **145 distinct on-taste subjects** out of 4,029
usable prompts (3.6% of the corpus).

### 2.4 Explore/exploit

Rating a code makes it more likely to be chosen (weight = rating²), but exploration of unrated codes
decays only to a floor:

```
exploreRate = max(0.25, 1 - ratedCount / 20)
```

0 rated → 100% explore · 10 rated → 50% · 20+ rated → 25% floor.

### 2.5 Hermes wiring

Taste is exported into the owner's existing personal knowledge vault as a native collection
(4 documents: identity, refusals, rated styles, system description) so his assistant retrieves it
through the search path it already uses. Only his *judgement* travels; the copyrighted corpus does
not. Re-export supersedes the previous export rather than accumulating (a stale taste copy would make
the assistant retrieve contradictory preferences).

---

## 3. Defects already found and fixed (do not re-report these)

18 rounds of self-review across two slices found and fixed:

1. Scraper reported pages as "thin" when the extractor was pointed at the wrong container — nearly
   lost 26 documents and all the SREF codes.
2. Fabricated Midjourney parameters from markdown em-dash mangling in natural-language prompts.
3. Parameter counts inflated by counting inside CDN image filenames.
4. 426 broken internal cross-reference links (root-relative hrefs dead on disk).
5. Documentation prose harvested as prompts (23 instances).
6. `--style raw` left a stray "raw" in subject text.
7. Attribution-strip left two-word stubs as whole prompts.
8. Surprise mode admitted score-0 prompts → produced kids-cartoon and packaging prompts.
9. Candidate pool rebuilt per prompt (O(n·m)) → 100 prompts hung past 2 minutes.
10. Explore/exploit collapse — rating 2 codes made the generator use only those 2.
11. Style names fabricated from article headings (92 of 223).
12. Export accumulation — two taste copies indexed simultaneously.

---

## 4. What I want you to attack

Ranked by how much I suspect they are wrong. Be specific; cite the mechanism, not vibes.

**A. Is literal substring keyword matching a defensible taste model at all?**
41 keywords reaching 3.6% of a 4,029-prompt corpus. "animals" matches both "patient wildlife
stillness" and "paper cutout African animals". Does this approach have a ceiling low enough that it
should be replaced rather than tuned? If so, replaced with what, given there is no embedding
infrastructure and the owner's standing policy explicitly forbids adding vector/RAG infrastructure?

**B. Does recombination actually produce variety, or an illusion of it?**
145 subjects × 400 artists × 223 codes is a large product space, but the subject is the semantic
core; swapping the artist may produce prompts that are *nominally* distinct and *perceptually* the
same. How fast will this feel repetitive in real use? Is the claimed variety honest?

**C. Is the explore/exploit curve right?**
25% floor, decaying over 20 ratings. Is 20 the right horizon? Is a fixed floor correct, or should
exploration be driven by uncertainty (e.g. explore codes *similar to* highly-rated ones rather than
uniformly at random)? What does the current design do wrong when the owner's taste is genuinely
narrow?

**D. Rating a style code conflates two things.**
A rating attaches to an SREF code, but what the owner reacted to was *a code applied to a subject*.
A 5/5 might mean "this style is my eye" or "this style suited that subject". The system cannot tell.
Does this poison the signal? What is the cheap fix?

**E. What is structurally missing?**
The owner said the brain should get better as he fills it. Right now the only feedback channel is
rating style codes. What other signal is cheap for him to give and disproportionately valuable? What
would you build that is not here?

**F. The negative-signal file is doing a lot of work.**
111 avoid-keywords vs 41 positive. Blunt substring rejection may be silently killing good prompts
(e.g. "tattoo" rejects a legitimate tattoo-adjacent aesthetic; "wide" nearly rejected camera
technique). How would you detect over-rejection? The system currently has no way to know what it
threw away.

**G. Failure modes under growth.**
What breaks when there are 200 rated codes? 2,000 prompts of feedback history? The taste files are
hand-edited markdown parsed by regex.

**H. Anything about the copyright/ethics posture that is wrong.**
Corpus stored locally, gitignored, never redistributed; owner is a paying subscriber and donor.
Images referenced by URL, not mirrored (~5,800 requests deliberately not made). Is any of this
misjudged in either direction — too cautious or not cautious enough?

---

## 5. Output format

For each finding:

- **Claim** — one sentence, falsifiable.
- **Mechanism** — why it fails, concretely. Name the input that breaks it.
- **Severity** — blocking / significant / minor, and *why that severity*.
- **Fix** — the cheapest change that addresses it. If the fix is "redesign", say what to.
- **Confidence** — and what evidence would change your mind.

Do not soften. If a section of the design is fine, say so in one line and spend your budget on what
is not. If you think the whole taste model is a dead end, say that plainly and defend it.
