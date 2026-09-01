# Training a Krea 2 LoRA on this machine — read before the first run

**The one thing that will waste your afternoon is at the bottom of this section. Read it first.**

## Do NOT train inside this ComfyUI

This ComfyUI runs **PyTorch 2.13.0+cu130**, which is correct for H3 and for Krea 2 *inference*.

AI Toolkit's Krea 2 trainer has an **open, unfixed VRAM regression on PyTorch 2.13 / Triton 3.7**
([ostris/ai-toolkit#990](https://github.com/ostris/ai-toolkit/issues/990), filed 2026-08-03): VRAM is
exhausted before training starts. A 24 GB card that previously trained fine now OOMs at any
resolution, and `low_vram`, lower resolution and cache changes all fail to fix it.

So: **AI Toolkit gets its own virtual environment, with its own pinned torch.** Do not downgrade
this ComfyUI to train — that trades a working video pipeline for a training run.

The reporter's confirmed-good pin (note that **CUDA 13 is fine — the torch *version* is the problem**):

```
torch==2.11.0+cu130
torchvision==0.26.0+cu130
torchaudio==2.11.0+cu130
triton==3.6.0
```

…and **uninstall sageattention** in that environment (`pip uninstall sageattention`, then delete any
leftover `site-packages/sageattention*`). SageAttention is worth having for H3 inference; it is part
of this failure for training.

On that pin, a 24 GB card trained at 1328 px with `low_vram` **disabled**. This card has 32 GB, so
1024 px with no layer offloading is comfortable. *(Inferred from the verified 24 GB result — not
measured on this machine. Treat the first run as the measurement.)*

## Which architecture to pick in AI Toolkit

The dropdown labels, read from AI Toolkit's own source:

| Label in the UI | What it is |
|---|---|
| **Krea 2 (raw)** | ← **pick this** |
| Krea 2 Turbo (w/ Training Adapter) | distilled + adapter; fine for *short* style/character runs, degrades on long runs |
| Krea 2 (raw) [Edit Training] | experimental |

Krea's own guidance is **train on Raw, run the LoRA on Turbo**. The common advice to avoid the Turbo
option is right as a default but slightly overstated — Ostris's adapter card says it can beat Raw on
short runs. Raw is the correct default; Turbo is a tool, not a trap.

## Settings that matter

- **`timestep_type: linear`** with the **`flowmatch`** scheduler. Copying a FLUX recipe with
  `sigmoid` silently degrades Krea 2 — this is the most-reported failure after the torch one.
- Rank 32, lr 1e-4, 1024 px, batch 1, 2000–3000 steps. Usable checkpoints almost always land between
  **1000 and 2000**; leave the cap at 3000 and pick, because more training makes a LoRA *less*
  flexible, not better.
- **EMA off. Differential guidance off.** Both measured worse by practitioners.
- **Disable sampling.** Previews are slow, eat VRAM, and are rendered differently from what ComfyUI
  will produce. Compare checkpoints in ComfyUI instead.
- Raise "max step saves to keep" — the default keeps too few checkpoints to compare.
- At inference a style LoRA often wants strength **1.5–2.5**, not 1.0.

## The dataset

Do not caption by hand or with a vision model. This repo already has the captions:

```
node prompter/export-lora-dataset.mjs --token swanstyle --write
```

(from `swan-taste-brain`). Every render's caption is **the prompt that actually made it**, the
trigger token is forced into every caption, and third-party reference photographs are refused — a
trained model redistributes what it was trained on, and the Midlibrary/Unsplash material is licensed
for reference, not for training. `TRAINING-NOTES.json` ships beside the images with these settings.

The dataset needs about a dozen images. Check where you are:

```
node prompter/export-lora-dataset.mjs --token swanstyle        # dry run, reports the count
```

## Licence, worth knowing before you build a product on it

Krea 2 is under the **Krea 2 Community License**, not Apache. Free commercial use below **$1M
trailing-12-month company-wide revenue**; above that it needs an enterprise licence. Deployers are
asked to "implement reasonable and appropriate Content Filter measures". You own your outputs, and
LoRAs are distributable with attribution.

SwanStudios is comfortably inside the free tier today. It is a revenue-triggered tripwire, not a
free-and-clear licence — worth a note in the business record rather than a surprise later.

If that tripwire is unwelcome, **FLUX.2 [klein] 4B** (7.22 GiB) is **Apache 2.0** and ungated, and
FLUX.2 [dev] rates higher for general photorealism. Krea 2 is rated strongest specifically for *raw,
textured* realism — grain, motion blur, low dynamic range — which is closer to the nature-and-
wildlife look this vault's taste memory keeps selecting for.
