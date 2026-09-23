# Opus-Codex Debate: Swan Coach Model Selection
**Date:** 2026-08-05  
**Participants:** Claude (Opus), Codex, Kimi K3  
**Status:** ROUND 1 — Awaiting Review

## Context
Selecting the AI model for Swan Coach — a production feature that:
- Screens client health/injuries (NASM protocol)
- Generates meticulous workout plans  
- Charges per user query (~50-5000 queries/week depending on adoption)
- Needs to be smart + cheap + fast

## Claude's Initial Recommendation
**Model:** Claude Sonnet 5  
**Reasoning:**
- Smart enough for NASM protocol + health screening
- Cost-efficient: ~$0.01–$0.03 per query
- Fast enough for user-facing latency
- Proven at SwanStudios
- 1M context window

**Alternatives considered but rejected:**
- Claude Opus 5: Too expensive (60%+ more)
- Kimi K3: Vendor lock-in risk (Moonshot/Chinese), unknown pricing, overkill capability
- Qwen 3.6 35B: Private access, less proven
- Gemini 3.6 Flash: Good fallback if cost becomes issue

## Sean's Challenge
"Sonnet 5 wasn't that good. It uses too many tokens for what it's worth."

**Request:** Hostile review from Kimi K3 on whether this recommendation is sound.

## Questions for Review
1. Is Sonnet 5 actually the right choice given token efficiency?
2. What are the REAL risks/gaps with Sonnet 5 for NASM health screening + workout planning?
3. Would Gemini 3.6 Flash be cheaper + capable enough?
4. Is there a better model on the Venice API list?
5. What's the final recommendation?

---

## ROUND 1 RESPONSES

### Codex Review (Pending)
[Awaiting Codex response]

### Kimi K3 Review (Pending)
[Awaiting Kimi K3 response via AI Village orchestrator]

---

## SYNTHESIS (Pending)
[After reviews, synthesize findings and produce final recommendation]