# H3 FP8 + LightX 124-frame benchmark receipt

Date: 2026-08-31 UTC

Decision: `REFERENCE_ONLY`

## Reproducibility

- ComfyUI: 0.34.2 at `169fcf35a2fc163fec31338b816503ddac0d3fcf`
- H3 Studio: `8e106b3400bc090cfbb4b385a3b3bda2abf3e145`
- Python: 3.13.15
- PyTorch: 2.13.0+cu130
- GPU: NVIDIA GeForce RTX 5090, 32,607 MiB reported capacity
- Workflow: `h3-lightx-v1-fp8-124f-api.json`
- Workflow SHA-256: `BA19BFC912E264BF316351F6A86AA1B06C676174F1C1329C2153E517205A277E`
- Prompt ID: `3f88b324-da7a-4da6-8406-e57f5be520ec`
- Fixed seed: `20260831`
- Sampling: 8 steps, Euler/simple, CFG 1, video shift 6, audio shift 3

## Measured result

| Measurement | Observed value |
| --- | --- |
| Benchmark wall time | 168.56 seconds |
| ComfyUI execution log | 165.90 seconds |
| Peak VRAM | 29,850 MiB |
| Output | VP9 WebM, 1344 x 768, 24 fps |
| Decoded frames | 124 |
| Decoded duration | 5.167 seconds |
| Output bytes | 1,478,372 |
| Output SHA-256 | `8EEFBB45EDA6FB1E7533658403DF9B3C076466847B5E256A5B74EA524550D83F` |

## Frame-level human QA

- Character identity and the fry-carton silhouette remained coherent from opening pose through movement, impact, and defeat pose.
- Action, expression, and staging are useful as concept and motion references.
- The model generated unwanted wall lettering despite `no text` in the prompt.
- A persistent yellow corner glyph and some prop drift remained visible.
- The output is not canonical geometry, rigging, collision, or animation data.

Local output retained at:
`C:\ComfyUI-H3-v0.34.2-cu130\output-candidate\h3-benchmarks\lightx-v1-fp8-124f-seed20260831_00001_.webm`
