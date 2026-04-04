# File Cleanup Protocol
> Reference doc extracted from CLAUDE.md. Loaded on-demand, not every message.
> Read when: cleanup tasks, purge/archive, file management

---

## File Cleanup Protocol (MANDATORY)
**Trigger:** User says "do file cleanup protocol" OR AI detects workspace bloat (test artifacts >100MB, >50 untracked dirs).

### Target Categories
| Category | Action | Examples |
|----------|--------|---------|
| Test Artifacts | **PURGE** (delete, no archive) | `frontend/test-results/`, `playwright-report/`, `*.last-run.json`, trace.zip, test-failed-*.png |
| Build Artifacts | **PURGE** | `frontend/dist/`, `node_modules/.cache/` |
| Old AI Village Archives | **PURGE** (kept in git history) | `AI-Village-Documentation/validation-prompts/archive/` dirs older than 7 days |
| Dead/Duplicate Code | **ARCHIVE** (move + map) | Unused components, deprecated files, redundant utils |
| Deprecated Docs | **ARCHIVE** | Superseded blueprints, old planning docs |

### Safety Rules (NEVER Delete)
- **Source code** in `frontend/src/`, `backend/` (unless explicitly archiving dead code with user confirmation)
- **Config files:** `*.config.*`, `.env*`, `package.json`, `CLAUDE.md`, `.gitignore`
- **Database:** `backend/migrations/`, `backend/seeders/`, `backend/models/`
- **Git rule:** Only clean untracked files OR `git rm` after adding to Archive Map

### Archive Map (`.swan/archive-map.json`)
Dead code that might be useful later goes to `.swan/archive/` with a JSON manifest entry:
```json
{ "timestamp": "2026-03-23T12:00:00Z", "originalPath": "src/components/OldComponent.tsx", "archivePath": ".swan/archive/OldComponent_20260323.tsx", "reason": "Replaced by NewComponent", "archivedBy": "Claude Opus 4.6" }
```

### Execution Workflow
1. **Scan** — List all untracked dirs/files, calculate sizes, identify bloat
2. **Classify** — Sort into PURGE vs ARCHIVE categories
3. **Map** — Append ARCHIVE entries to `.swan/archive-map.json` (skip mapping for PURGE targets)
4. **Execute** — Move archived files to `.swan/archive/`. Delete purge targets with `rm -rf`
5. **Gitignore Sync** — Ensure `frontend/test-results/`, `playwright-report/`, `.swan/archive/` are in `.gitignore`
6. **Report** — Output: `[File Cleanup] Purged X MB of test artifacts. Archived Y files. See .swan/archive-map.json`

### Proactive Detection
When git status shows >20 untracked test result directories, suggest cleanup to the user before proceeding with other work.
