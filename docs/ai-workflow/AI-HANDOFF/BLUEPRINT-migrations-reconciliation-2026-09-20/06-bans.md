1. Do not equate `SequelizeMeta` membership with schema correctness.
2. Do not complete a migration because stdout/stderr contains “already exists.”
3. Do not enable `SWAN_MIGRATE_ALLOW_FAILURE`.
4. Do not reinterpret `--to` as one migration.
5. Do not continue after the first failed or indeterminate migration.
6. Do not convert permission or connection errors into an empty migration history.
7. Do not permit parent and child to resolve different database targets.
8. Do not automatically retry an interrupted, timed-out, or failed migration.
9. Do not rename, delete, or rewrite the five historical repair migrations.
10. Do not modify legacy metadata to make a new chain appear applied.
11. Do not replay legacy repairs against a fresh v2 database.
12. Do not widen only the outer discovery filter to execute inert files.
13. Do not assume `.ts`/`.cts` are absent or executable merely from the quoted resolver regex.
14. Do not guard the 23 historical ALTERs blindly.
15. Do not claim all 23 entries target `Users`/`SocialLikes`.
16. Do not infer production identifiers or types from models, headers, or source searches.
17. Do not merge `Users` and `users`, cast identifiers, or invent replacement identities without the approved data plan.
18. Do not use the existing `Users` FK house rule to bypass D2/D3.
19. Do not disable production sync before a complete migration-owned replacement is verified.
20. Do not retain production sync as an automatic escape hatch after cutover.
21. Do not let a schema-gate failure proceed to application listen/readiness.
22. Do not treat a local connection as a disposable database.
23. Do not include credentials, connection strings, client records, or sensitive defaults in artifacts or review prompts.
24. Do not stage, commit, push, deploy, or write to production under this planning task.
25. Do not overwrite parallel work or broad-stage changes.
26. Do not create new files exceeding 300 lines; split by the responsibilities in the build order.
27. Do not cite a green count as proof of untested database behavior.
28. Do not relabel BLOCKED, NOT RUN, or mocked coverage as PASS.
29. Do not claim review filing until the caller supplies its archive receipt.

N/A — MUI, styled-components, Victory, visual color tokens, touch targets, and responsive layout rules have no surface in this headless change.
