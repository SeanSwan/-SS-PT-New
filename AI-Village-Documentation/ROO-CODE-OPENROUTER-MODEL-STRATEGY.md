# ROO CODE + OPENROUTER MODEL STRATEGY
## Best Bang-for-Buck AI Models for Your SwanStudios Workflow

**Last Updated:** 2025-10-20
**Your Budget:** Avoid $100+ models, focus on best performance per dollar

---

## 🎯 YOUR SITUATION (KEY INSIGHT!)

**GAME CHANGER:** Roo Code can use ANY OpenRouter model!

This means you can:
- ✅ Route different task types to specialized models
- ✅ Use FREE models for simple tasks
- ✅ Use premium models (Claude, Gemini) only when needed
- ✅ Optimize cost while maintaining quality

**Your Current Setup:**
- Roo Code (paid subscription) → Can connect to OpenRouter
- OpenRouter account → Access to 400+ models
- Budget: Avoid expensive ($100+/1M tokens), maximize value

---

## 💰 OPENROUTER PRICING TIERS (2025)

### **FREE TIER** (Best Bang-for-Buck!)
| Model | Input Cost | Output Cost | Context | Best For |
|-------|------------|-------------|---------|----------|
| **DeepSeek V3 Free** | $0/1M | $0/1M | 64K | General coding, refactoring |
| **DeepSeek R1 Free** | $0/1M | $0/1M | 64K | Complex reasoning, algorithms |
| **Qwen 2.5 7B** | $0/1M | $0/1M | 32K | Simple coding tasks |

### **ULTRA-CHEAP TIER** ($0.01-0.50 per 1M tokens)
| Model | Input Cost | Output Cost | Context | Best For |
|-------|------------|-------------|---------|----------|
| **DeepSeek V3** | $0.50/1M | $1.25/1M | 64K | Production coding |
| **DeepSeek Coder** | $0.14/1M | $0.28/1M | 128K | Code generation, debugging |
| **Qwen 2.5 Coder 32B** | $0.04/1M | $0.16/1M | 128K | Fast coding iteration |

### **VALUE TIER** ($1-5 per 1M tokens)
| Model | Input Cost | Output Cost | Context | Best For |
|-------|------------|-------------|---------|----------|
| **Gemini 2.5 Flash** | $0.075/1M | $0.30/1M | 1M | Fast UI code, React |
| **Gemini 2.5 Pro** | $2.50/1M | $10/1M | 1M | Complex architecture |
| **Claude 3.5 Sonnet** | $3/1M | $15/1M | 200K | High-quality code, security |

### **PREMIUM TIER** ($5-20 per 1M tokens)
| Model | Input Cost | Output Cost | Context | Best For |
|-------|------------|-------------|---------|----------|
| **Claude 4 Sonnet** | $3/1M | $15/1M | 200K | Complex systems, RLS design |
| **GPT-4o** | $5/1M | $15/1M | 128K | Multi-modal (code + images) |

### **TOO EXPENSIVE** (Avoid)
| Model | Input Cost | Why Avoid |
|-------|------------|-----------|
| **GPT-5** | $30-75/1M | Way too expensive for your budget |
| **Claude Opus 4** | $50-100/1M | Overkill for most tasks |

---

## 🎯 YOUR ROO CODE MODEL ROUTING STRATEGY

### **The Golden Rule:**
**Use FREE models for 80% of work, VALUE tier for 15%, PREMIUM tier for 5%**

---

## 📋 TASK-BASED MODEL RECOMMENDATIONS

### **1. GENERAL CODING (Backend/Frontend)** - 60% of your work

**PRIMARY: DeepSeek V3 Free** ✅ **BEST CHOICE**
- **Cost:** $0/1M tokens (FREE!)
- **Performance:** 49.2% on SWE-bench (very good for coding)
- **Context:** 64K tokens (enough for most files)
- **Use for:**
  - Writing new API endpoints
  - Creating React components
  - Refactoring code
  - Adding features
  - Bug fixes

**BACKUP: DeepSeek V3 (Paid)** ⚠️
- **Cost:** $0.50/1M input, $1.25/1M output
- **When:** If free tier rate-limited
- **Realistic cost:** ~$0.10-0.20 per coding session

**Your Roo Code Prompt:**
```
Model: DeepSeek V3 Free

Task: Implement this API endpoint following the openapi.yaml spec.

Context:
- Stack: Express + TypeScript + Sequelize
- Pattern: Use existing controllers in /backend/controllers
- Testing: Include unit tests with 85% coverage

[Paste spec]
```

**Estimated Monthly Cost:** $0-5 (mostly free tier)

---

### **2. REACT/FRONTEND UI CODE** - 20% of your work

**PRIMARY: Gemini 2.5 Flash** ✅ **BEST CHOICE**
- **Cost:** $0.075/1M input, $0.30/1M output
- **Performance:** Excellent at React + TypeScript
- **Context:** 1M tokens (can see entire component tree!)
- **Use for:**
  - React component generation
  - Styled-components implementation
  - State management (Redux, React Query)
  - Responsive design
  - Integration with v0.dev code

**BACKUP: Qwen 2.5 Coder 32B** ⚠️
- **Cost:** $0.04/1M input, $0.16/1M output (even cheaper!)
- **When:** Simple UI logic, doesn't need Google's React expertise

**Your Roo Code Prompt:**
```
Model: Gemini 2.5 Flash

Task: Integrate this v0.dev component into SwanStudios.

Add:
- API calls (React Query)
- Error handling
- Loading states
- Mobile responsiveness

[Paste v0.dev code]
```

**Estimated Monthly Cost:** $1-3

---

### **3. COMPLEX ALGORITHMS / REASONING** - 5% of your work

**PRIMARY: DeepSeek R1 Free** ✅ **BEST CHOICE**
- **Cost:** $0/1M tokens (FREE!)
- **Performance:** Excellent at complex reasoning, math
- **Use for:**
  - Gamification logic (points calculation)
  - Progress tracking algorithms
  - Complex business rules
  - Data transformations
  - Performance optimization

**BACKUP: Claude 3.5 Sonnet** ⚠️
- **Cost:** $3/1M input, $15/1M output
- **When:** DeepSeek R1 fails on very complex logic
- **Realistic cost:** ~$0.50 per complex algorithm

**Your Roo Code Prompt:**
```
Model: DeepSeek R1 Free

Task: Design algorithm for gamification points calculation.

Requirements:
- Session completion: +10 points
- Streak bonus: +5 per consecutive day (max 50)
- Achievement unlocks: Variable points
- Weekly reset logic

Output: Pseudocode + TypeScript implementation
```

**Estimated Monthly Cost:** $0-2

---

### **4. DATABASE / SEQUELIZE QUERIES** - 10% of your work

**PRIMARY: DeepSeek V3 Free** ✅ **BEST CHOICE**
- **Cost:** $0/1M tokens (FREE!)
- **Performance:** Good at SQL, ORM patterns
- **Use for:**
  - Sequelize model creation
  - Query optimization
  - Migration scripts
  - Index recommendations
  - N+1 query fixes

**BACKUP: Gemini 2.5 Pro** ⚠️
- **Cost:** $2.50/1M input, $10/1M output
- **When:** Complex multi-table queries, performance analysis
- **Realistic cost:** ~$0.30 per optimization session

**Your Roo Code Prompt:**
```
Model: DeepSeek V3 Free

Task: Optimize this Sequelize query to avoid N+1.

Current code:
[Paste slow query]

Expected: Include joins, eager loading, indexes needed
```

**Estimated Monthly Cost:** $0-1

---

### **5. ARCHITECTURE / SYSTEM DESIGN** - 3% of your work

**PRIMARY: Claude 3.5 Sonnet** ✅ **BEST CHOICE**
- **Cost:** $3/1M input, $15/1M output
- **Performance:** Best at system design, security
- **Context:** 200K tokens (can see entire architecture)
- **Use for:**
  - Multi-tenant RLS design
  - Security architecture
  - API design (openapi.yaml)
  - Microservices communication
  - THREAT_MODEL.md

**BACKUP: Gemini 2.5 Pro** ⚠️
- **Cost:** $2.50/1M input, $10/1M output (slightly cheaper)
- **When:** Non-security architecture (Google's strength)

**Your Roo Code Prompt:**
```
Model: Claude 3.5 Sonnet

Task: Design Row-Level Security (RLS) for SwanStudios multi-tenancy.

Requirements:
- Tenant isolation (organization_id on all tables)
- Prevent cross-tenant data leaks
- Sequelize scopes + middleware
- Test strategy

Output: RLS.sql + implementation plan
```

**Estimated Monthly Cost:** $1-3 (rare but high-value tasks)

---

### **6. TESTING / QA** - 2% of your work

**PRIMARY: DeepSeek Coder** ✅ **BEST CHOICE**
- **Cost:** $0.14/1M input, $0.28/1M output
- **Performance:** Excellent at test generation
- **Use for:**
  - Unit test generation
  - Integration test suites
  - Edge case identification
  - Mock data creation
  - Coverage improvement

**BACKUP: Qwen 2.5 Coder 32B** ⚠️
- **Cost:** $0.04/1M input, $0.16/1M output (even cheaper!)
- **When:** Simple test cases

**Your Roo Code Prompt:**
```
Model: DeepSeek Coder

Task: Generate complete test suite for this function.

[Paste function]

Requirements:
- Unit tests (Jest)
- Edge cases (null, undefined, invalid inputs)
- Integration test (API endpoint)
- 85% coverage minimum
```

**Estimated Monthly Cost:** $0.50-1

---

## 🎯 YOUR OPTIMIZED ROO CODE CONFIGURATION

### **Recommended Routing Table:**

```javascript
// For Roo Code settings.json or config

const modelRouting = {
  // 80% of work - FREE MODELS
  "general-coding": "deepseek/deepseek-v3:free",
  "refactoring": "deepseek/deepseek-v3:free",
  "bug-fixes": "deepseek/deepseek-v3:free",
  "database": "deepseek/deepseek-v3:free",
  "algorithms": "deepseek/deepseek-r1:free",

  // 15% of work - CHEAP VALUE MODELS
  "react-ui": "google/gemini-2.5-flash",
  "testing": "deepseek/deepseek-coder",
  "frontend": "google/gemini-2.5-flash",

  // 5% of work - PREMIUM (when needed)
  "architecture": "anthropic/claude-3.5-sonnet",
  "security": "anthropic/claude-3.5-sonnet",
  "complex-systems": "google/gemini-2.5-pro",
};
```

---

## 💰 COST PROJECTION (Realistic Monthly Usage)

Based on typical solo developer building SwanStudios:

### **Week 1-2 (Bug Fixing Sprint):**

| Task Type | Model | Estimated Usage | Cost |
|-----------|-------|-----------------|------|
| Backend bug fixes (10 sessions) | DeepSeek V3 Free | 5M tokens | $0 |
| Frontend bug fixes (8 sessions) | Gemini 2.5 Flash | 3M tokens | $0.90 |
| Database optimization (2 sessions) | DeepSeek V3 Free | 1M tokens | $0 |
| Testing generation (5 sessions) | DeepSeek Coder | 2M tokens | $0.28 |
| **Week 1-2 Total** | | | **$1.18** |

### **Week 3-4 (Feature Development):**

| Task Type | Model | Estimated Usage | Cost |
|-----------|-------|-----------------|------|
| New features (15 sessions) | DeepSeek V3 Free | 8M tokens | $0 |
| React components (10 sessions) | Gemini 2.5 Flash | 4M tokens | $1.20 |
| Algorithm design (3 sessions) | DeepSeek R1 Free | 2M tokens | $0 |
| Architecture review (1 session) | Claude 3.5 Sonnet | 1M tokens | $3.00 |
| Testing (5 sessions) | DeepSeek Coder | 2M tokens | $0.28 |
| **Week 3-4 Total** | | | **$4.48** |

### **Month 2+ (Steady State):**

| Task Type | Model | Estimated Usage | Cost |
|-----------|-------|-----------------|------|
| General coding (40 sessions) | DeepSeek V3 Free | 20M tokens | $0 |
| React/Frontend (20 sessions) | Gemini 2.5 Flash | 8M tokens | $2.40 |
| Complex features (5 sessions) | DeepSeek V3 Free | 3M tokens | $0 |
| Security review (1 session) | Claude 3.5 Sonnet | 0.5M tokens | $1.50 |
| Testing (10 sessions) | DeepSeek Coder | 4M tokens | $0.56 |
| **Monthly Total** | | | **$4.46** |

---

## 🎯 YOUR TOTAL MONTHLY AI SPEND

### **Current (Before Optimization):**
- Claude Pro: $20/month
- Roo Code: $10-15/month (estimate)
- Gemini Code Assist: $0 (free tier)
- ChatGPT: $0-20/month (if you have Plus)
- **Total:** $30-55/month

### **With Optimized Roo Code + OpenRouter:**
- Claude Pro: $20/month (keep for Claude Desktop/Code)
- Roo Code: $10-15/month (keep - it's the interface)
- OpenRouter (via Roo): **$5-10/month** (mostly free models!)
- Gemini Code Assist: $0 (free tier)
- ChatGPT: $0 (can cancel - use OpenRouter instead)
- **Total:** $35-45/month

### **Savings:**
- ✅ Can cancel ChatGPT Plus: Save $20/month
- ✅ Using mostly free models: Save $50-100/month vs. using Claude 4 for everything
- ✅ Better performance: Right model for each task

**Net Result:** ~$35-45/month for world-class AI coding assistance

---

## 🚀 SETUP INSTRUCTIONS FOR ROO CODE

### **Step 1: Configure OpenRouter in Roo Code**

1. Open VS Code
2. Open Roo Code settings
3. Add OpenRouter API key
4. Set default model: `deepseek/deepseek-v3:free`

### **Step 2: Create Model Presets (If Roo Supports)**

Create quick-switch presets:
- **"Coding"** → DeepSeek V3 Free
- **"React"** → Gemini 2.5 Flash
- **"Architecture"** → Claude 3.5 Sonnet
- **"Testing"** → DeepSeek Coder

### **Step 3: Task-Based Routing**

For each Roo Code session, manually select model based on task:

**Writing API endpoint?** → Switch to "Coding" (DeepSeek V3 Free)
**Building React component?** → Switch to "React" (Gemini 2.5 Flash)
**Designing RLS security?** → Switch to "Architecture" (Claude 3.5 Sonnet)
**Generating tests?** → Switch to "Testing" (DeepSeek Coder)

---

## 📊 PERFORMANCE COMPARISON

### **SWE-bench Scores (Industry Benchmark for Coding):**

| Model | SWE-bench Score | Cost per 1M tokens | Value Score |
|-------|-----------------|---------------------|-------------|
| DeepSeek R1 | 49.2% | $0 (free) | ⭐⭐⭐⭐⭐ |
| Claude 4 Sonnet | 72.7% | $3-15 | ⭐⭐⭐⭐ |
| GPT-5 | 65% | $30-75 | ⭐⭐ |
| Gemini 2.5 Flash | ~45% | $0.075-0.30 | ⭐⭐⭐⭐⭐ |
| DeepSeek V3 | 45% | $0-0.50 | ⭐⭐⭐⭐⭐ |

**Key Insight:** DeepSeek R1 (FREE) is only 23% worse than Claude 4 (paid), but costs $0 vs. $3-15!

---

## 🎯 DECISION MATRIX: WHICH MODEL WHEN?

| If you're doing... | Use this model | Why |
|-------------------|----------------|-----|
| Backend API endpoint | DeepSeek V3 Free | Free, great at backend |
| React component | Gemini 2.5 Flash | Best at React, cheap |
| Complex algorithm | DeepSeek R1 Free | Free, great at reasoning |
| Database query optimization | DeepSeek V3 Free | Free, good at SQL |
| Multi-tenant RLS design | Claude 3.5 Sonnet | Best at security |
| Test generation | DeepSeek Coder | Ultra-cheap, great at tests |
| Refactoring | DeepSeek V3 Free | Free, maintains patterns |
| Debugging | DeepSeek V3 Free | Free, good at code analysis |
| Styled-components | Gemini 2.5 Flash | Google knows CSS well |
| Performance optimization | Gemini 2.5 Pro | Worth the cost for perf |

---

## ⚠️ MODELS TO AVOID (For Your Budget)

| Model | Cost | Why Avoid |
|-------|------|-----------|
| **GPT-5** | $30-75/1M | 10-25x more expensive than DeepSeek for similar quality |
| **Claude Opus 4** | $50-100/1M | Overkill - Sonnet is 95% as good for $3 |
| **Gemini Ultra** | $20-50/1M | Gemini Pro is almost as good for $2.50 |
| **GPT-4 Turbo** | $10-20/1M | GPT-4o is better and cheaper |

**Rule:** If it costs more than $5/1M tokens, you probably don't need it.

---

## 🎉 YOUR WINNING STRATEGY

### **The 80/15/5 Rule:**

**80% of tasks:** Use FREE models (DeepSeek V3 Free, DeepSeek R1 Free)
- General coding
- Refactoring
- Bug fixes
- Database work
- Algorithms
- **Cost:** $0/month

**15% of tasks:** Use CHEAP VALUE models (Gemini 2.5 Flash, DeepSeek Coder)
- React UI
- Frontend work
- Testing
- **Cost:** $3-5/month

**5% of tasks:** Use PREMIUM models (Claude 3.5 Sonnet, Gemini 2.5 Pro)
- Architecture design
- Security (RLS, threat models)
- Complex systems
- **Cost:** $2-5/month

**Total:** $5-10/month for OpenRouter (vs. $50-200/month if you used premium for everything)

---

## 📋 QUICK REFERENCE CHEAT SHEET

```
TASK → MODEL

API endpoint         → DeepSeek V3 Free ($0)
React component      → Gemini 2.5 Flash ($0.075/1M)
Complex algorithm    → DeepSeek R1 Free ($0)
Database query       → DeepSeek V3 Free ($0)
Security/RLS design  → Claude 3.5 Sonnet ($3/1M)
Test generation      → DeepSeek Coder ($0.14/1M)
Refactoring          → DeepSeek V3 Free ($0)
Frontend UI          → Gemini 2.5 Flash ($0.075/1M)
Architecture review  → Claude 3.5 Sonnet ($3/1M)
Performance tuning   → Gemini 2.5 Pro ($2.50/1M)
```

---

## 🚀 IMMEDIATE ACTION: CONFIGURE ROO CODE NOW

**Step-by-step:**

1. ✅ Open Roo Code in VS Code
2. ✅ Go to Settings → OpenRouter Integration
3. ✅ Add your OpenRouter API key
4. ✅ Set default model: **deepseek/deepseek-v3:free**
5. ✅ Test it: Ask Roo to "write a simple React component"
6. ✅ Verify it's using DeepSeek V3 Free (should say in response)

**Then:**
- Bookmark this document
- Refer to "DECISION MATRIX" when starting tasks
- Manually switch models based on task type
- Track your spending on OpenRouter dashboard

---

## 💡 PRO TIPS

### **Tip 1: Free Models Are REALLY Good**
DeepSeek V3 Free scored 49.2% on SWE-bench. That's professional-grade coding. Use it for 80% of work without guilt.

### **Tip 2: Context Length Matters**
Gemini 2.5 Flash has 1M token context. Use it when you need to see entire component trees or large file structures.

### **Tip 3: Switch Models Mid-Session**
Start with DeepSeek V3 Free. If it struggles, switch to Claude 3.5 Sonnet for that specific sub-task, then switch back.

### **Tip 4: Batch Premium Tasks**
Save complex architecture questions for one "Claude day" per week. Do all RLS design, security reviews, etc. in one session to minimize premium costs.

### **Tip 5: Free Tier Limits**
If you hit rate limits on free models, fall back to paid DeepSeek V3 ($0.50/1M) which is still ultra-cheap.

---

## 🎯 BOTTOM LINE

**Your Question:** "Which AI should I choose for Roo Code?"

**Answer:** **Don't choose one - route by task!**

**Default:** DeepSeek V3 Free (covers 80% of work, costs $0)
**React/Frontend:** Gemini 2.5 Flash (fast, cheap, excellent)
**Security/Architecture:** Claude 3.5 Sonnet (best-in-class, worth it)
**Testing:** DeepSeek Coder (ultra-cheap, great quality)

**Expected Monthly Cost:** $5-10 (vs. $50-200 if you used premium for everything)

**ROI:** Massive. You get world-class coding assistance for less than a Netflix subscription.

---

**Ready to configure Roo Code? Let me know if you need help with the OpenRouter setup!** 🚀
