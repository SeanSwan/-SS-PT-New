# Legacy Python QA Scripts

The legacy Python Playwright scripts that used to live in this folder were moved
on 2026-05-17 to:

`archive/pending-deletion/2026-05-17/legacy-playwright-python/`

They are not the canonical smoke test path for SwanStudios.

Use this instead from the repo root:

```bash
npm run qa:smoke
npm run qa:smoke:prod
```

Those files were written for older routes, live production login flows, or exact
UI copy that has changed. They can fail even when the app is healthy, so AI
agents should not run them by default.

Before reusing an archived Python QA script, classify it first:

- active only if it targets a current route and avoids live credentials
- legacy if it documents an old manual QA pass
- archive candidate if it has no current references and depends on stale prod
  credentials, stale route text, or old screenshot expectations

Physical deletion from `archive/pending-deletion/` remains a separate explicit
cleanup decision.
