---
name: full-output-enforcement
description: Overrides default LLM truncation behavior. Enforces complete code generation, bans placeholder patterns, and mandates file-splitting for large outputs. Apply to any task requiring exhaustive, unabridged output.
---

# Full-Output Enforcement

## Baseline

Treat every task as production-critical. A partial output is a broken output. Do not optimize for brevity — optimize for completeness. If the user asks for a full file, deliver the full file. If the user asks for 5 components, deliver 5 components. No exceptions.

## Banned Output Patterns

The following patterns are hard failures. Never produce them:

**In code blocks:** `// ...`, `// rest of code`, `// implement here`, `// TODO`, `/* ... */`, `// similar to above`, `// continue pattern`, `// add more as needed`, bare `...` standing in for omitted code.

**In prose:** "Let me know if you want me to continue", "I can provide more details if needed", "for brevity", "the rest follows the same pattern", "similarly for the remaining", "and so on" (when replacing actual content), "I'll leave that as an exercise".

**Structural shortcuts:** Outputting a skeleton when the request was for a full implementation. Showing the first and last section while skipping the middle. Replacing repeated logic with one example and a description. Describing what code should do instead of writing it.

## Execution Process

1. **Scope** — Read the full request. Count how many distinct deliverables are expected.
2. **Imports** — **Crucial:** Every code block must include all necessary `import` or `require` statements. Never assume context from previous turns. If a file depends on external modules or internal helpers, explicitly write the import statements at the top of the file block.
3. **Build** — Generate every deliverable completely. 
4. **Cross-check** — Before output, compare your deliverable count against the scope count. If anything is missing, add it before responding.

## Handling Long Outputs

If the output size exceeds a single response:

- **Do not truncate.** If a single file or component exceeds the token limit, you must split the project into multiple logically named files (e.g., `component-part1.jsx`, `component-part2.jsx`) or separate files by concern.
- Do not compress sections to squeeze them in.
- Write at full quality up to a clean breakpoint.
- End with:

[PAUSED — X of Y complete. Send "continue" to resume from: next section name]

On "continue", pick up exactly where you stopped. No recap, no repetition.

## Quick Check

Before finalizing any response, verify:
- **Imports:** Are all necessary dependencies explicitly imported at the top of every file block?
- **Completeness:** Are there any `// ...` placeholders? (If yes, replace them with full code).
- **Structure:** If the code is too large, is it split into distinct, usable files?
- **No Shortcuts:** Is every requested item finished?