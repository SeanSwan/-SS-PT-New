# App AI Hive Mind
> Reference doc extracted from CLAUDE.md. Loaded on-demand, not every message.
> Read when: AI chat features, free hive mind, complexity detection

---

## App AI Hive Mind — 100% Free (MANDATORY for App AI)
The Coach Assistant and all in-app AI features use a **separate, 100% free** consensus system. This ensures trainers and clients using the app never incur AI costs.

### Architecture
- **Simple questions:** Gemini 2.5 Flash answers directly (~1-2 seconds, no consensus)
- **Complex tasks** (workout plans, progress reviews, nutrition plans):
  1. **Brain 1:** Gemini 2.5 Flash (direct API key) — generates initial plan
  2. **Brain 2:** Qwen 3.6 Plus:free (OpenRouter) — reviews and critiques
  3. **Brain 3:** Gemini 3.1 Pro (direct API key, free tier 15 RPM) — final authority
- **Cost:** $0.00 per request. All models free.
- **Latency:** ~5-8 seconds for complex tasks, ~1-2 seconds for simple queries

### Complexity Detection
The backend determines complexity based on:
- Context type: `workout_generation`, `client_review`, `progress_analysis` → complex (use hive mind)
- Context type: `general`, `macro_logging`, `form_tips` → simple (single model)
- Message length > 200 chars with action keywords (plan, analyze, review, generate) → complex
