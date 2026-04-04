# Auto Research Protocol
> Reference doc extracted from CLAUDE.md. Loaded on-demand, not every message.
> Read when: running skill optimization, Karpathy-style auto-research

---

## Auto Research Protocol (Karpathy-Style Skill Optimization)

Autonomous skill optimization loop based on Andrej Karpathy's auto-research methodology.

### Three Ingredients
1. **Objective metric** — Binary yes/no eval criteria per skill (`scripts/auto-research/evals/*.eval.json`)
2. **Measurement tool** — LLM judge (Gemini Flash) scores skill prompts against criteria
3. **Something to change** — The skill SKILL.md prompt itself (iterated until optimal)

### Usage
```bash
node scripts/auto-research/runner.mjs --skill verification-before-completion --generations 3 --runs 5
node scripts/auto-research/runner.mjs --list        # list available evals
node scripts/auto-research/runner.mjs --skill systematic-debugging --dry-run  # score without mutating
```

### Architecture
```
scripts/auto-research/
├── runner.mjs              — Main loop: run skill → eval → mutate → repeat
├── eval-suite.mjs          — Eval framework (LLM judge, binary criteria)
├── prompt-mutator.mjs      — AI-powered prompt mutation (anti-collapse safeguards)
├── results/                — Historical run results for analysis
│   └── {skill}-gen{N}-{timestamp}.json
└── evals/                  — Per-skill eval definitions
    ├── verification.eval.json   (6 criteria, weight 10)
    ├── debugging.eval.json      (6 criteria, weight 11)
    ├── code-review.eval.json    (6 criteria, weight 10)
    └── design-taste.eval.json   (7 criteria, weight 13)
```

### Safeguards
- **Anti-collapse:** Mutations rejected if prompt shrinks >50%, grows >100%, or loses section headings
- **Backup:** Original prompt backed up to `results/{skill}-original-backup.md` before first mutation
- **Best-wins:** Only the highest-scoring prompt variant is written back; no improvement = no change
- **Cost:** ~$0.00-0.02/run (all free models via OpenRouter)
