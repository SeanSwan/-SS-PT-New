# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 67.8s
> **Files:** backend/routes/aiChatRoutes.mjs, backend/services/aiChatService.mjs
> **Generated:** 3/9/2026, 5:34:24 PM

---

# Code Review: AI Chat Routes & Service

## Executive Summary
This is a **well-architected AI chat system** with comprehensive NASM-CPT expertise and multi-source data enrichment. However, there are **critical security vulnerabilities**, **performance concerns with massive context injection**, and **missing TypeScript types** (since these are `.mjs` files, not `.ts`).

---

## CRITICAL Issues

### 1. **SQL Injection Vulnerability in Data Enrichment**
**Severity:** CRITICAL  
**Location:** `aiChatService.mjs` - `enrichWithUserData()`

```mjs
// ❌ VULNERABLE: Direct string interpolation in SQL
const q = (sql, replacements) =>
  sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT })
```

**Problem:** While using parameterized queries with `:userId`, the pattern is fragile. If any future developer adds string interpolation, it becomes vulnerable.

**Fix:**
```typescript
// ✅ Use Sequelize models instead of raw queries
const user = await User.findByPk(userId, {
  attributes: ['firstName', 'lastName', 'role', /* ... */]
});
```

---

### 2. **Uncontrolled Context Size → Token Limit Explosions**
**Severity:** CRITICAL  
**Location:** `aiChatService.mjs` - `enrichWithUserData()`

**Problem:** The function pulls **17 data sources** with no size limits:
- 10 workout forms with full exercise details
- 20 macro logs
- 10 form analyses
- Unlimited JSON fields (`masterPromptJson`, `responsesJson`)

This can easily exceed 100K tokens, causing:
- API failures (most models cap at 128K context)
- Massive costs ($0.50+ per request on GPT-4)
- 5-10 second response times

**Fix:**
```typescript
// ✅ Add context budget system
const CONTEXT_BUDGETS = {
  general: 2000,        // tokens
  macro_logging: 3000,
  workout_generation: 5000,
  client_review: 8000,
};

async function enrichWithUserData(userId, role, context, sequelize) {
  const budget = CONTEXT_BUDGETS[context] || 2000;
  const dataParts = [];
  let estimatedTokens = 0;

  // Add data sources in priority order, stop when budget exceeded
  for (const source of prioritizedSources) {
    const data = await fetchSource(source, userId);
    const tokens = estimateTokens(data);
    if (estimatedTokens + tokens > budget) break;
    dataParts.push(data);
    estimatedTokens += tokens;
  }
  // ...
}
```

---

### 3. **Missing Input Validation on AI Data Updates**
**Severity:** CRITICAL  
**Location:** `aiChatRoutes.mjs` - POST `/conversations/:id/messages`

```mjs
// ❌ DANGEROUS: AI can write arbitrary data with no validation
const actionPayload = JSON.parse(actionMatch[1]);
const targetId = actionPayload.targetUserId || conversation.targetUserId;
if (targetId && actionPayload.updates) {
  dataUpdateResult = await processAIDataUpdates(
    targetId,
    actionPayload.updates,
    req.user.id,
    sequelize
  );
}
```

**Problem:** 
- No schema validation on `actionPayload.updates`
- AI could inject malicious data (e.g., negative weights, invalid dates)
- No authorization check (can admin AI update ANY user?)

**Fix:**
```typescript
// ✅ Validate with Zod schema
import { z } from 'zod';

const DataUpdateSchema = z.object({
  action: z.literal('update_client_data'),
  targetUserId: z.number().int().positive(),
  updates: z.array(z.discriminatedUnion('type', [
    z.object({
      type: z.literal('body_measurement'),
      data: z.object({
        weight: z.number().min(50).max(500),
        bodyFatPercentage: z.number().min(3).max(60).optional(),
        // ...
      })
    }),
    // ... other update types
  ]))
});

// In route handler:
const parsed = DataUpdateSchema.safeParse(actionPayload);
if (!parsed.success) {
  logger.warn('[AIChatRoutes] Invalid AI data update:', parsed.error);
  return; // Don't process invalid updates
}

// Authorization check
if (req.user.role !== 'admin' && parsed.data.targetUserId !== req.user.id) {
  logger.error('[AIChatRoutes] Unauthorized AI data update attempt');
  return;
}
```

---

## HIGH Priority Issues

### 4. **Race Condition in Conversation Updates**
**Severity:** HIGH  
**Location:** `aiChatRoutes.mjs` - POST `/conversations/:id/messages`

```mjs
// ❌ RACE CONDITION: Read → Modify → Write without transaction
const conversation = await AiConversation.findOne({ where: { id, userId } });
const updatedMessages = [...conversation.messages, userMsg, assistantMsg];
await conversation.update({ messages: updatedMessages, messageCount: updatedMessages.length });
```

**Problem:** If two messages are sent simultaneously, one will be lost.

**Fix:**
```typescript
// ✅ Use database transaction with row locking
const result = await sequelize.transaction(async (t) => {
  const conversation = await AiConversation.findOne({
    where: { id: req.params.id, userId: req.user.id },
    lock: t.LOCK.UPDATE, // Pessimistic lock
    transaction: t
  });

  if (!conversation) throw new Error('Not found');

  const updatedMessages = [...conversation.messages, userMsg, assistantMsg];
  await conversation.update({
    messages: updatedMessages,
    messageCount: updatedMessages.length,
    lastMessageAt: new Date(),
  }, { transaction: t });

  return conversation;
});
```

---

### 5. **No Rate Limiting on AI Requests**
**Severity:** HIGH  
**Location:** `aiChatRoutes.mjs` - POST `/conversations/:id/messages`

**Problem:** A malicious user could spam AI requests, causing:
- $1000+ API bills in minutes
- DoS via resource exhaustion

**Fix:**
```typescript
// ✅ Add rate limiting middleware
import rateLimit from 'express-rate-limit';

const aiChatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: (req) => {
    if (req.user.role === 'admin') return 100;
    if (req.user.role === 'trainer') return 50;
    return 20; // clients
  },
  message: { success: false, error: 'Too many AI requests. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/conversations/:id/messages', aiChatLimiter, async (req, res) => {
  // ...
});
```

---

### 6. **Hardcoded Provider Priority**
**Severity:** HIGH  
**Location:** `aiChatService.mjs` - `getAvailableProviders()`

```mjs
// ❌ INFLEXIBLE: Gemini hardcoded as primary
if (process.env.GEMINI_API_KEY) {
  providers.push({ name: 'gemini', key: process.env.GEMINI_API_KEY });
}
```

**Problem:** 
- Can't dynamically switch providers based on cost/performance
- No circuit breaker for failing providers
- No provider-specific retry logic

**Fix:**
```typescript
// ✅ Configuration-driven provider management
const PROVIDER_CONFIG = {
  gemini: {
    priority: 1,
    maxRetries: 2,
    timeout: 30000,
    costPer1kTokens: 0.0001,
    circuitBreakerThreshold: 5, // failures before disable
  },
  openai: { priority: 2, maxRetries: 3, timeout: 20000, costPer1kTokens: 0.002 },
  anthropic: { priority: 3, maxRetries: 2, timeout: 25000, costPer1kTokens: 0.003 },
};

class ProviderCircuitBreaker {
  private failures = new Map<string, number>();
  
  isAvailable(provider: string): boolean {
    const config = PROVIDER_CONFIG[provider];
    return (this.failures.get(provider) || 0) < config.circuitBreakerThreshold;
  }
  
  recordFailure(provider: string) {
    this.failures.set(provider, (this.failures.get(provider) || 0) + 1);
  }
  
  reset(provider: string) {
    this.failures.delete(provider);
  }
}
```

---

## MEDIUM Priority Issues

### 7. **Missing TypeScript Types**
**Severity:** MEDIUM  
**Location:** All files (`.mjs` instead of `.ts`)

**Problem:** No compile-time type safety, IntelliSense, or refactoring support.

**Fix:** Convert to TypeScript:
```typescript
// ✅ aiChatService.ts
interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: string;
  metadata?: {
    provider?: string;
    model?: string;
    tokenUsage?: { prompt: number; completion: number; total: number };
  };
}

interface AIConversation {
  id: number;
  userId: number;
  role: 'client' | 'trainer' | 'admin';
  context: string;
  title: string | null;
  targetUserId: number | null;
  messages: AIMessage[];
  status: 'active' | 'archived' | 'deleted';
  messageCount: number;
  metadata: Record<string, unknown>;
  lastMessageAt: Date | null;
  createdAt: Date;
}

export async function enrichWithUserData(
  userId: number,
  role: 'client' | 'trainer' | 'admin',
  context: string,
  sequelize: Sequelize
): Promise<string> {
  // ...
}
```

---

### 8. **Massive System Prompts Waste Tokens**
**Severity:** MEDIUM  
**Location:** `aiChatService.mjs` - `SYSTEM_PROMPTS`

**Problem:** 
- `NASM_OPT_REFERENCE` is 1,200+ tokens
- `NUTRITION_REFERENCE` is 800+ tokens
- Sent with **every single message** (even "What's your name?")

**Fix:**
```typescript
// ✅ Lazy-load references only when needed
function getSystemPrompt(role: string, context: string): string {
  const basePrompt = SYSTEM_PROMPTS[role]?.[context] || SYSTEM_PROMPTS.client.general;
  
  // Only include NASM reference for workout-related contexts
  const needsNASM = ['workout_suggestions', 'workout_generation', 'form_tips'].includes(context);
  const needsNutrition = ['macro_logging', 'nutrition_coaching'].includes(context);
  
  return basePrompt
    + (needsNASM ? `\n${NASM_OPT_REFERENCE}` : '')
    + (needsNutrition ? `\n${NUTRITION_REFERENCE}` : '');
}
```

---

### 9. **No Caching for User Data**
**Severity:** MEDIUM  
**Location:** `aiChatService.mjs` - `enrichWithUserData()`

**Problem:** Every message triggers 17 database queries, even if user data hasn't changed.

**Fix:**
```typescript
// ✅ Add Redis caching with smart invalidation
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

async function enrichWithUserData(userId: number, role: string, context: string, sequelize: Sequelize): Promise<string> {
  const cacheKey = `user_context:${userId}:${context}`;
  
  // Try cache first (5 minute TTL)
  const cached = await redis.get(cacheKey);
  if (cached) {
    logger.debug(`[AIChatService] Cache hit for user ${userId}`);
    return cached;
  }
  
  // Fetch fresh data
  const data = await fetchUserDataFromDB(userId, role, context, sequelize);
  
  // Cache with TTL
  await redis.setex(cacheKey, 300, data); // 5 minutes
  
  return data;
}

// Invalidate cache when user data changes
export async function invalidateUserContext(userId: number) {
  const keys = await redis.keys(`user_context:${userId}:*`);
  if (keys.length > 0) await redis.del(...keys);
}
```

---

### 10. **Error Messages Leak Implementation Details**
**Severity:** MEDIUM  
**Location:** `aiChatRoutes.mjs` - Multiple routes

```mjs
// ❌ LEAKS INTERNALS
return res.status(500).json({ success: false, error: 'Failed to create conversation' });
```

**Problem:** Generic errors don't help users, but logged errors have no request IDs for debugging.

**Fix:**
```typescript
// ✅ User-friendly errors + detailed logging
class AppError extends Error {
  constructor(
    public statusCode: number,
    public userMessage: string,
    public internalMessage: string,
    public code?: string
  ) {
    super(internalMessage);
  }
}

// In route handler:
try {
  // ...
} catch (err) {
  const requestId = req.id; // From express-request-id middleware
  logger.error(`[AIChatRoutes] [${requestId}] Create conversation error:`, {
    error: err.message,
    stack: err.stack,
    userId: req.user.id,
  });
  
  return res.status(500).json({
    success: false,
    error: 'We couldn't create your conversation. Please try again.',
    requestId, // User can reference this in support tickets
  });
}
```

---

## LOW Priority Issues

### 11. **Inline Function in Route Definition**
**Severity:** LOW  
**Location:** `aiChatRoutes.mjs` - `generateTitle()`

```mjs
// ❌ DRY VIOLATION: Function defined in route file
function generateTitle(message) {
  const cleaned = message.replace(/\n/g, ' ').trim();
  if (cleaned.length <= 50) return cleaned;
  return cleaned.slice(0, 47) + '...';
}
```

**Fix:** Move to shared utilities:
```typescript
// ✅ utils/textUtils.ts
export function truncateText(text: string, maxLength: number = 50): string {
  const cleaned = text.replace(/\n/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength - 3) + '...';
}
```

---

### 12. **Magic Numbers Throughout**
**Severity:** LOW  
**Location:** Multiple files

```mjs
// ❌ MAGIC NUMBERS
if (message.length > 5000) { /* ... */ }
limit: Math.min(Number(limit) || 20, 50),
const recentMessages = conversationMessages.slice(-20);
```

**Fix:**
```typescript
// ✅ Named constants
const LIMITS = {
  MESSAGE_MAX_LENGTH: 5000,
  CONVERSATION_LIST_DEFAULT: 20,
  CONVERSATION_LIST_MAX: 50,
  CONTEXT_MESSAGE_HISTORY: 20,
  WORKOUT_HISTORY_COUNT: 10,
  MACRO_LOG_DAYS: 2,
} as const;

if (message.length > LIMITS.MESSAGE_MAX_LENGTH) {
  return res.status(400).json({
    success: false,
    error: `Message too long (max ${LIMITS.MESSAGE_MAX_

---

*Part of SwanStudios 7-Brain Validation System*
