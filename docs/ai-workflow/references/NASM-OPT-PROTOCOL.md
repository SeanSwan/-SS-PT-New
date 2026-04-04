# NASM OPT Protocol (MANDATORY for Workout Features)
> Reference doc extracted from CLAUDE.md — loaded on-demand, not every message.
> Read this doc when working on: workout generation, exercise programming, training session features, or any fitness-related logic.

---

## NASM OPT Protocol (MANDATORY for Workout Features)

All workout generation, logging, and planning MUST follow the NASM Optimum Performance Training (OPT) model.

### 5-Phase Periodization
| Phase | Name | Reps | Sets | Tempo | Rest | %1RM |
|-------|------|------|------|-------|------|------|
| 1 | Stabilization Endurance | 12-20 | 1-3 | 4/2/1 | 0-90s | 50-70% |
| 2 | Strength Endurance | 8-12 | 2-4 | 2/0/2 | 0-60s | 70-80% |
| 3 | Hypertrophy | 6-12 | 3-5 | 2/0/2 | 0-60s | 75-85% |
| 4 | Maximal Strength | 1-5 | 4-6 | X/0/X | 3-5min | 85-100% |
| 5 | Power | 1-5/8-10 | 3-6 | X/0/X | 3-5min | 30-45%/85-100% |

### Tempo Notation
`Eccentric/Isometric/Concentric` — e.g., "4/2/1" = 4s lowering, 2s hold, 1s lifting

### 1RM Formula (Brzycki)
`estimated1RM = weight / (1.0278 - 0.0278 × reps)` — valid for 2-10 reps

### AI Workout Generation Rules
- AI MUST know client's current OPT phase before generating workouts
- All generated exercises include: sets, reps, weight (from 1RM × phase %), tempo, rest
- Phase 5 uses superset format: strength exercise (85-100%) + power exercise (30-45%)

### NASM Calculators
4 built-in calculators (no leaving the app): 1RM, Calorie/TDEE, Body Fat %, BMI
- Full specs: `docs/ai-workflow/blueprints/EMBEDDED-AI-TERMINAL-AND-WORKOUT-LOGGER-MASTER-PROMPT-V2.md` (Sections 6-7)
