- Do not use a fixed list of lane filenames for discovery.
- Do not derive a writable filename from `claude`, `codex`, `workbuddy`, or any other display label.
- Do not treat `digest`, exit zero, marker presence, or a hook configuration file as edit clearance.
- Do not hide stale lanes, empty claims, parse errors, or excess lock paths.
- Do not reclaim claims because of age.
- Do not merge static and per-session records by label.
- Do not run pruning, claim, release, or maintenance during orientation.
- Do not test against the real coordination directory.
- Do not use a real database or network service in these tests.
- Do not execute lane-file text.
- Do not introduce a second Markdown parser in the hook.
- Do not silently fall back to another checkout or identity.
- Do not replace missing harness evidence with a capability assertion.
- Do not claim atomic exclusion.
- Do not stage the shared tree’s dirty mirror files as a shortcut.
- Do not broad-stage, reset, clean, or overwrite parallel work.
- Do not hand-edit generated mirror bodies.
- Do not automatically retry interrupted mutations.
- Do not add paid/provider calls.
- Do not claim tests, archive filing, or deployment occurred during this review.

House-rule applicability:

- New files: ≤300 lines and a purpose/boundary header.
- Commit format: `type(scope): description`.
- Secrets and private identifiers: excluded from committed fixtures and review evidence.
- MUI, styled-components, Victory, palette, touch targets, and typography: **N/A — no graphical product surface is introduced.**
- Database FK rules: **N/A — no models or tables are touched.**
