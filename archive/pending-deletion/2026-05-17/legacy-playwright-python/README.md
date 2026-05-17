# Legacy Python Playwright Scripts

Moved here on 2026-05-17 during QA script hygiene Phase 2.

These files were removed from the active `tests/` surface because they depend on
older routes, live production login flows, seeded production data, old exact UI
copy, or one-off manual QA assumptions.

Use the canonical smoke launcher instead:

```bash
npm run qa:smoke
npm run qa:smoke:prod
```

Do not restore one of these scripts without first modernizing it into the
current mocked Playwright style and documenting the reason it belongs in the
active test surface.
