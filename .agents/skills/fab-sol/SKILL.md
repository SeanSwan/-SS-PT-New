---
name: fab-sol
description: Planner/executor model split — Fable plans and verifies, a cheaper model executes. Harvested from the "FabSol" pattern (Fable orchestrates, GPT-5.6 Sol builds via CLI Proxy API) and the Anthropic guidance that Fable-as-orchestrator + cheaper-executor yields ~92% of Fable quality at ~63% of cost. In this repo the SAFE default executor is a cheaper Claude tier (Sonnet/Haiku via the Agent tool's model override) or Codex via the Rule 67 lane — NOT an unreviewed base-URL proxy. The OpenAI-Sol-via-CLI-Proxy-API wiring is documented here but GATED: it changes Claude Code's API routing and requires Sean's explicit approval + a security review slice before setup. Use when Sean says "fab-sol", "plan with Fable, build with the cheap model", or wants to stretch usage limits on a big build.
---

# Fab-Sol (Planner/Executor Split)

**Origin:** harvested 2026-07-16 from a workflow video: Fable plans → hands off to GPT-5.6 "Sol" (via the open-source CLI Proxy API tool, OAuth'd to an OpenAI subscription) → Fable optionally verifies the result against spec. Measured cheaper than Fable-solo on every test in the video, with comparable output quality.

## The pattern (model-agnostic core)
1. **PLAN (expensive brain):** Fable produces a complete, decision-free build spec — this is exactly what `fable-blueprint-forge` already forges. For smaller slices, a compact spec with file paths, signatures, acceptance criteria, and "do NOT" bans is enough.
2. **EXECUTE (cheap brain):** hand the spec to a cheaper executor:
   - **Default (no setup, allowed today):** `Agent` tool with `model: "sonnet"` or `"haiku"`, or a Workflow fan-out with per-agent model overrides.
   - **Codex lane (Rule 67):** queue the spec as a work order; Codex builds, Fable reviews.
   - **GPT-5.6 Sol via CLI Proxy API:** GATED — see below.
3. **VERIFY (expensive brain):** Fable hostile-reviews the built slice against the spec (rule 61) before closeout.

## The gated Sol wiring (do NOT set up without Sean's explicit go)
- Tool: CLI Proxy API (open-source, ~40k GitHub stars) — runs a local proxy, OAuths to the user's OpenAI subscription, and lets Claude Code launch with GPT-5.6 Sol as the underlying model while keeping all Claude Code skills/commands.
- Why gated: it re-points Claude Code's model routing through a third-party local proxy. The Fable Context Compression Protocol keeps unreviewed API/base-URL proxies BLOCKED; setup is a T2 config change touching auth/token flow, so it needs Sean's approval plus a security-review slice (proxy source review, token handling, no secrets in shell history) before first use.
- If approved, setup lives in its own slice with a rule-48-style receipt; never bundle it into a feature task.

## When to use fab-sol
- Large mechanical builds (many files, clear spec) where Fable-solo would burn usage limits.
- Batch migrations, test scaffolding, boilerplate-heavy UI where the spec makes every decision.

## When NOT to
- Security/auth/billing/PII code — Fable (or the Final Decider chain) writes and reviews these itself.
- Ambiguous or design-taste work — the cheap executor amplifies a vague spec's errors; run `grill-me`/`swan-design-router` first.
