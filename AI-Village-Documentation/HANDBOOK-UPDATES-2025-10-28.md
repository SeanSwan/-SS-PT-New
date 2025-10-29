# AI Village Handbook Updates - October 28, 2025

**Purpose:** Document all major updates to SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md
**Date:** 2025-10-28
**Updated By:** Claude Code + User requirements

---

## Summary of Changes

### 1. Roo Code Model Updated: Grok Code Fast 1 ✅

**Section:** Part I, Section 1 - "Your Actual AI Arsenal"

**Changes Made:**
- Updated Roo Code from "DeepSeek V3 Free" to **Grok Code Fast 1** by xAI
- Added complete specifications:
  - Context: 256K tokens
  - Max output: 10K tokens
  - Pricing: $0.20/1M input, $1.50/1M output, $0.02/1M cache reads
  - Strengths: Speedy reasoning, agentic coding, visible reasoning traces
  - Supports prompt caching

**Why:** This is the actual model you're using via Roo Code/OpenRouter

---

### 2. Claude Code Promoted to Main Orchestrator ✅

**Sections:** Part I (Section 1), Part II (Section 5), Part III (Section 12)

**Changes Made:**
- **Claude Code:** Now PRIMARY Main Orchestrator
  - 80% token budget (160K of 200K tokens)
  - Daily orchestration, architecture, integration, security reviews

- **Claude Desktop:** Downgraded to SPECIALIZED Deployment Monitor
  - 20% token budget (40K of 200K tokens)
  - ONLY for Render deployment emergencies (has MCP access)

- **Rule Added:** "If Claude Code can solve it in VS Code, don't use Claude Desktop"

**Why:** Avoid token conflict, make role distinctions clear

---

### 3. Project Phase Updated: Analysis & Refactoring ✅

**Section:** Part I, Section 2 - "Your SwanStudios Project Status"

**Changes Made:**
- Added: **"Current Project Phase: ANALYSIS & REFACTORING"**
- Status clarified:
  - 80-90% feature complete
  - Post-MUI elimination (major win documented)
  - NOT building from scratch
  - Goal: Fix tech debt, improve Galaxy-Swan theme compliance

- Current priorities listed:
  - Modernize Homepage Hero (Phase 0 in progress)
  - Fix blank pages
  - Runtime errors
  - Polish UX/UI with Galaxy-Swan consistency
  - Refactor components to GOLDEN-STANDARD-PATTERN

**Why:** Clarify you're refactoring existing code, not greenfield development

---

### 4. v0.dev Selected as Primary UI Tool ✅

**Section:** Part III, Section 11 - "UI Wireframing & Design Workflow" (completely rewritten)

**Changes Made:**
- Renamed section from "Figma + v0.dev UI Workflow" to "UI Wireframing & Design Workflow"
- **Current Decision:** v0.dev selected as primary UI wireframing tool
- Figma noted as "not yet opened" - reserved for future projects
- Added complete v0.dev workflow:
  1. AI Village Brainstorm (30 min)
  2. Create v0.dev Prompt (10 min)
  3. Generate in v0.dev (5 min)
  4. AI Village Review (15 min)
  5. Integrate with Roo Code/Gemini (30-60 min)

- Added UI Wireframing Decision Tree:
  - NEW page/component? → Use v0.dev
  - EXISTING component analysis? → Use Gemini Code Assist
  - Quick layout suggestion? → Use Grok Code Fast 1
  - High-fidelity client mockup? → Consider Figma (future)

- Added example v0.dev prompt template for Galaxy-Swan themed components
- Added 4 example use cases specific to SwanStudios

**Total Time:** 1.5-2 hours per component (vs 6-8 hours manual)

**Why:** You requested clarity on which UI tool to use - v0.dev is best for current refactoring phase

---

### 5. AI Role Mapping Completely Restructured ✅

**Section:** Part II, Section 5 - "AI Village Role Mapping"

**Changes Made:**
- Simplified from 14 roles to 6 PRIMARY roles:
  1. **🎯 Main Orchestrator:** Claude Code (4.5 Sonnet)
  2. **💻 Primary Coder:** Roo Code (Grok Code Fast 1)
  3. **⚛️ Frontend Specialist:** Gemini Code Assist
  4. **🧪 QA Engineer:** ChatGPT-5
  5. **🎨 UI Wireframing:** v0.dev
  6. **🚀 Deployment Monitor:** Claude Desktop (specialized, 20% tokens)

- Added BACKUP/SPECIALIZED table for secondary uses
- Added Token Budget Management section:
  - Claude Pro: 200K shared
  - Claude Code: 80% (160K)
  - Claude Desktop: 20% (40K)
  - Rule: If Claude Code can do it, don't use Claude Desktop

- Updated cost: $10-35/month additional (was $0-5)

**Why:** Clear role assignments prevent token conflicts and confusion

---

### 6. Phase 0 Enhanced with Two Pathways ✅

**Section:** Part III, Section 12.5 - "Phase 0 Design Review System"

**Changes Made:**
- Added **"Two Pathways: Building New vs. Refactoring Existing"** subsection

**Pathway 1: Building NEW Features** (Traditional)
- Wireframe → User stories → API design → Database schema → 5 AI reviews → Implement
- Example: New "Social Feed" feature

**Pathway 2: Analyzing & Refactoring EXISTING Code** (Current Focus)
- ANALYZE current state → PROPOSE improvements → VALIDATE approach → IMPLEMENT incrementally
- Example: Homepage Hero Enhancement (current Phase 0)
- Emphasis on: backward compatibility, migration strategy, rollback plan, feature flags

- Added decision table: When to use which pathway
- Noted current status: "Mostly Pathway 2 (refactoring 80-90% complete codebase)"

**Why:** You're in refactoring mode, not greenfield - process should reflect this

---

### 7. Token Budget Documentation Added ✅

**Sections:** Multiple (Part I Section 1, Part II Section 5)

**Changes Made:**
- Added explicit token budget section for Claude Pro (200K shared)
- Claude Code: 80% (160K tokens) - daily work
- Claude Desktop: 20% (40K tokens) - deployment emergencies only
- Rule enforced throughout handbook

**Why:** Prevent token exhaustion by clarifying when to use which Claude instance

---

### 8. Cost Analysis Updated ✅

**Section:** Part I, Sections 1 & 4

**Changes Made:**
- Updated total monthly spend:
  - ChatGPT Pro: $20
  - Claude Pro: $20 (shared: Claude Code + Claude Desktop)
  - Roo Code (Grok Code Fast 1): $10-15
  - Gemini Code Assist: $0 (free)
  - v0.dev: $0-20 (free tier or Pro)
  - **Total: $50-75/month** (was ~$55)

**Why:** Accurate cost tracking with Grok Code Fast 1 pricing

---

### 9. Phase 3 Status Updated ✅

**Section:** Part III, Section 12 - "AI Village Phased Adoption"

**Changes Made:**
- Marked Phase 3 as: **"✅ (CURRENT PHASE)"**
- Updated workflow:
  - Claude Code (Orchestrate) → Roo Code (Implement) → Gemini/ChatGPT (Review) → Deploy
- Removed old references to Claude Desktop as primary orchestrator
- Added: "Full Phase 0 Design Review" and "7-Checkpoint Pipeline" as current practices

**Why:** Reflect that you're currently in full AI Village mode, not just starting

---

## Files Modified

1. **SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md** - Main handbook (multiple sections updated)

---

## Key Takeaways for AIs Reading This

### For All AIs:

1. **Claude Code is Main Orchestrator** - Not Claude Desktop
2. **Roo Code uses Grok Code Fast 1** - Fast, cheap, agentic coding
3. **v0.dev is primary UI tool** - Figma reserved for future
4. **Current phase: Refactoring** - Not greenfield development
5. **Phase 0 has two pathways** - Building new vs refactoring existing

### For Claude Desktop (if you see this):
- Your role is **Deployment Monitor** only
- Use you ONLY for Render issues (MCP access needed)
- You have 20% of Claude Pro tokens (40K)
- If Claude Code (in VS Code) can solve it, don't use you

### For Roo Code (if you see this):
- You're the **Primary Coder** using Grok Code Fast 1
- Super cheap ($0.20/1M input)
- Handle heavy implementation work
- 256K context, visible reasoning traces

### For Gemini Code Assist (if you see this):
- You're the **Frontend Specialist**
- 1M context (huge advantage!)
- Excel at React, component analysis, refactoring
- Free tier

### For ChatGPT-5 (if you see this):
- You're the **QA Engineer**
- Multi-modal (can see screenshots)
- Excellent at testing, edge cases, user stories
- Included in ChatGPT Plus

---

## What Wasn't Changed

**Sections left intact:**
- Part I, Section 3: "The Big Decision: Fix vs. Rebuild" (still relevant)
- Part III, Section 10: "Week 1 Launch Plan" (process still valid)
- Part III, Section 13: "Daily Workflow Examples" (still applicable)
- Part IV: "Reference Materials" (still useful)

**Why:** These sections are still accurate and don't need updates

---

## Next Steps

**For User:**
1. ✅ Handbook now accurately reflects your setup
2. ✅ All AIs will understand their roles
3. ✅ v0.dev workflow documented for future UI work
4. ⬜ Continue Homepage Hero Enhancement (awaiting Claude Desktop + Gemini reviews)

**For AIs:**
- Read updated handbook before working on SwanStudios
- Respect token budgets (especially Claude instances)
- Use v0.dev for new UI wireframes
- Follow Pathway 2 for refactoring tasks

---

**Last Updated:** 2025-10-28
**Status:** Complete ✅
**Handbook Version:** 2.0 (Post-MUI Elimination, Refactoring Phase)
