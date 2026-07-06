# Fix Instructions — Code Quality Consensus

> Generated from Phase 2B specialty debate (Claude Sonnet 4.6 ↔ Nemotron 3 Super)
> Consensus: YES

---

CONSENSUS REACHED

## Merged Findings: Critical Architecture Gaps Requiring Immediate Remediation

### F-01: Validator Pipeline Failure — Silent Data Loss in Consensus System
**Agreed Issue:** Two validators (`04-performance-planning.md`, `05-competitive-intel.md`) produced zero output due to timeout (240s) and invalid model ID (0.2s failure), yet were archived as valid inputs to the consensus system, creating a 33% data deficit without provenance tracking.
**Agreed Fix:** Implement blocking validation pipeline with:
- Timeout reduced to 120s (fail fast)
- Model-specific error handling (no retries for `MODEL_ERROR`)
- Pipeline assertion blocking consensus on any validator failure
- Retry logic with exponential backoff for transient errors only
*Files to modify:* `validation-pipeline/runner.ts` (new implementation)

### F-02: Model ID Hardcoded Without Validation — Configuration Debt
**Agreed Issue:** Hardcoded model ID `gemini-3-flash-preview-20251217` (missing provider prefix) causes silent 404; inconsistency with `04-performance-planning.md` using `google/gemini-3-flash-preview-20251217` indicates fragmented configuration.
**Agreed Fix:** Centralized model registry with startup validation:
```typescript
// config/model-registry.ts
export const MODEL_REGISTRY = {
  GEMINI_FLASH: 'google/gemini-2.5-flash',
  GEMINI_FLASH_PREVIEW: 'google/gemini-3-flash-preview-20251217', // Marked DEPRECATED
  CLAUDE_SONNET: 'anthropic/claude-4.6-sonnet-20260217',
  DEEPSEEK_V3: 'deepseek/deepseek-v3.2-20251201',
  NEMOTRON_NANO: 'nvidia/nemotron-3-nano-30b-a3b:free',
} as const;
```
*Files to modify:* `05-competitive-intel.md` (remove hardcoded ID), add `config/model-registry.ts` and validation hook in pipeline initializer

### F-03: No Migration Safety Policy — AI-Induced Data Annihilation Risk
**Agreed Issue:** Absence of explicit prohibition against `sequelize.sync({ force: true })` in all six planning documents enables AI executors to destroy production data (user accounts, workout plans, session history, etc.) when "fixing" database issues.
**Agreed Fix:** Mandatory migration policy enforced at code level:
```typescript
// database/migrator.ts
export const migrator = new Umzug({ /* config */ });
export async function runMigrationsOnStartup() {
  // ... migration logic
  // BLOCK UNSAFE SYNC
  sequelize.sync = async (options?: SyncOptions) => {
    if (options?.force || options?.alter) {
      throw new Error('POLICY VIOLATION: Use Umzug migrations only');
    }
    return originalSync(options);
  };
}
```
*Files to modify:* All six validation documents (add migration policy section), create `database/MIGRATION_POLICY.md`, implement `database/migrator.ts`

### F-04: PII Leakage to External LLMs — Unenforced Security Policy
**Agreed Issue:** `03-security-planning.md` correctly identifies "ZERO PII TO LLMs" requirement but lacks enforcement mechanisms, relying on advisory guidelines that AI executors will ignore.
**Agreed Fix:** Implement runtime PII scanning and blocking:
```typescript
// llm-gateway/pII-filter.ts
export async function safeLLMPrompt(messages: Message[]): Promise<string> {
  const piiPatterns = [/\b\d{3}-\d{2}-\d{4}\b/, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i];
  const sanitized = messages.map(m => ({
    ...m,
    content: m.content.replace(piiPatterns, '[REDACTED_PII]')
  }));

  if (hasPII(messages)) {
    auditLog.piiBlocked(messages);
    throw new Error('PII transmission blocked by policy');
  }

  return callLLM(sanitized);
}
```
*Files to modify:* `03-security-planning.md` (add enforcement section), create `llm-gateway/pII-filter.ts`, integrate into all LLM call paths

## Consensus Summary
All four critical findings represent systemic risks that would inevitably lead to production incidents:
1. **Data integrity failure** via broken validation pipeline (F-01)
2. **Configuration fragility** from unvalidated dependencies (F-02)
3. **Catastrophic data loss** from unsafe ORM usage (F-03)
4. **Regulatory violation** via uncontrolled PII exposure (F-04)

The agreed fixes establish:
- **Fail-fast validation** with explicit error states
- **Centralized, validated configuration**
- **Automated blocking of dangerous patterns**
- **Runtime enforcement of security policies**

Implementation must block further pipeline execution until these are resolved, as the current state risks cascading failures in downstream AI-generated code.
