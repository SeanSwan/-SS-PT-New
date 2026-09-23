**Status:** all newly specified cases below are **NOT RUN**. Existing receipts retain their historical scope. Each named case must be independently discoverable; helpers belong in non-test modules.

**Fixture contract**

- Create an isolated temporary `CREATOR_BRAINS_ROOT`.
- Seed two creators, including one already enabled.
- Seed a real published generation with nonempty index/topics/timeline and at least two valid claims.
- Seed a distinct raw-transcript canary that must never cross the display boundary.
- Provide damaged registry/state cases, missing documents, invalid pointers, a junction escape, and a `gen-9999`/`gen-10000` boundary fixture.
- For add responsiveness, invoke the real engine add function with its supported resolver seam performing a deterministic synchronous child-process wait of at least two seconds.
- Signal “resolver entered” before issuing concurrent reads. Do not replace the engine add function with an async mock.
- For process races, use separate Node processes against the same **temporary** store.
- No network, real YouTube lookup, OAuth, production backend, or operator store.

**Named bridge/tool tests**

All paths are relative to `packages/creator-brains-console/`.

| ID / file / named cases | Requirement and observable proof |
|---|---|
| **T-N01** `test/registry-worker.test.mjs`: `read_completes_before_blocked_add`; `new_creator_is_disabled`; `worker_failure_is_typed` | R4/R17. During real synchronous resolution, `/api/status` completes before worker release and within 1000ms on the recorded test host. Final row persists disabled. Moving the call back to the bridge thread must fail the concurrency case. |
| **T-N02** `test/registry-concurrency.test.mjs`: `patch_refused_while_add_runs`; `second_add_refused_without_queue`; `external_cli_write_preserves_both_updates` | R17. Busy writes return pre-dispatch 409; only one engine mutation runs. The separate-process test must preserve consent and both intended updates or block release. |
| **T-N03** `test/registry-outcome.test.mjs`: `disconnect_keeps_gate`; `soft_deadline_is_unknown`; `no_automatic_replay`; `post_commit_projection_error_is_not_refusal` | R17/R20. Count engine invocations; require exactly one. After dispatch, timeout never produces `outcome:not_started`. A worker settlement eventually releases the gate. |
| **T-N04** `test/registry-consent.test.mjs`: `readd_preserves_enabled`; `damaged_counts_are_null`; `confirmed_refusal_preserves_bytes` | R4. Existing enabled row remains enabled; unavailable counts do not become zero; genuine refusal leaves registry byte-identical. |
| **T-N05** `test/publication-boundary.test.mjs`: `drawer_and_query_share_containment`; `junction_escape_refused`; `empty_hits_do_not_skip_pointer_validation`; `missing_document_is_skipped` | R6/R19. Test successful published paths as well as hostile paths. No raw-canary content or unauthorized read. |
| **T-N06** web validators listed below | R18. Every consumed required field has a targeted mutation plus a valid-payload control. |
| **T-N07** `test/publication-identity.test.mjs`: `valid_five_digit_name_parses`; `noncanonical_name_refused`; `same_generation_changed_content_changes_digest`; `one_response_uses_one_pinned_generation` | R6/R20. Preserve grammar fixes; digest detects changed delivered content. The pinned-generation behavioral test uses an injected filesystem boundary to move the pointer between reads; a source-text pin alone is insufficient. |
| **T-N08** `test/display-privacy.test.mjs`: `raw_canary_never_served`; `renamed_transcript_shape_refused`; `legitimate_claim_allowed`; `errors_remove_private_paths`; `publication_fence_blocks_writes` | R19. Exercise successful responses, errors, worker messages, and logs. Fence daily/repair at the unsafe generation boundary; do not reject valid generation syntax in the parser. |
| **T-N09** `test/query-completeness.test.mjs`: `unpublished_is_not_exhaustive_zero`; `skipped_source_marks_partial`; `query_uses_only_published_claims` | R5. Distinguish incomplete evidence from no matching claims; transcript-only search words yield no leaked content. |
| **T-N10** `test/run-exclusion.test.mjs`: `daily_and_repair_share_gate`; `two_process_journal_preserved`; `failed_admission_does_not_corrupt_active_journal` | R7/R8. Real engine/temp-store boundary, not just mocked spawn count. Supports or rejects the historical `20` receipt. |
| **T-N11** `test/operation-scope.test.mjs`: `backup_has_no_route`; `dangerous_routes_absent`; `repair_counts_are_projected`; `route_allowlist_sees_all_dispatch_sites` | R8/R9/R13. A route added outside `routes.mjs` must still fail the allowlist. |
| **T-N12** `test/run-correlation.test.mjs`: `acceptance_has_null_run_id`; `exit_zero_without_correlated_verdict_is_unknown`; `lost_lock_is_not_completion`; `restart_loses_no_truth_claim` | R7. Only matching engine evidence advances the UI to completed; absent correlation stays unknown. |
| **T-N16** `test/verification-chain.test.mjs`: `valid_chain_with_anchor`; `changed_event_fails`; `deleted_middle_fails`; `truncated_tail_fails_anchor`; `rewritten_chain_fails_external_anchor` | R21/R24. Distinguish internal consistency from anchored completeness. |
| **T-N17** `test/verification-gate.test.mjs`: `candidate_only_is_ineligible`; `unreviewed_candidate_cannot_enter_verified_tier`; `stale_candidate_digest_fails`; `blocking_finding_prevents_pass`; `not_run_is_not_pass`; `review_backlink_update_preserves_immutable_digest` | R21. No curated software release from an unreviewed candidate. This is not a creator-content curation system. |
| **T-N18** `test/verification-evidence.test.mjs`: `missing_evidence_file_fails`; `hash_mismatch_fails`; `wrong_requirement_scope_fails`; `duplicate_case_registration_detected`; `projection_contains_no_private_path` | R24. Real references and scoped evidence, not document-name matching alone. |

**Named web tests**

Paths below are relative to `web/src/`.

| ID / file / named cases | Proof |
|---|---|
| **T-N06a** `adapters/validateCreators.test.ts`: `missing_enabled_names_path`; `null_counts_allowed`; `string_boolean_refused`; `healthy_row_passes` | Creator consumer cannot receive malformed consent/count fields. |
| **T-N06b** `adapters/validateBrain.test.ts`: `missing_generation_names_path`; `bad_claim_timestamp_refused`; `missing_markdown_names_path`; `healthy_publication_passes` | Drawer fails visibly before React dereferences malformed data. |
| **T-N06c** `adapters/validateQuery.test.ts`: `missing_hits_refused`; `malformed_hit_names_index`; `skipped_projection_is_safe`; `healthy_result_passes` | Query validator cannot pass by rejecting everything. |
| **T-N06d** `adapters/validateRun.test.ts`: `missing_budget_refused`; `accepted_not_completed`; `unknown_correlation_remains_unknown` | Run state and correlation semantics hold at the adapter seam. |
| **T-N06e** `adapters/validateCanary.test.ts`: `history_is_stale`; `unknown_has_no_fabricated_time`; `healthy_probe_passes` | Provenance survives UI consumption. |
| **T-N04w** `components/CreatorRoster.test.tsx`: `add_disabled_then_explicit_enable`; `no_optimistic_consent`; `unknown_outcome_requires_refresh`; `late_read_is_discarded` | Mounted roster presents confirmed state and recovers safely. |
| **T-N07w** `components/BrainDrawer.test.tsx`: `focus_returns_to_trigger`; `missing_publication_copy`; `copy_reference_excludes_claim_text`; `markup_is_inert` | Drawer behavior, focus, privacy, and publication identity. |
| **T-N09w** `components/QueryConsole.test.tsx`: `zero_copy_names_terms`; `partial_results_warn`; `drawer_return_preserves_query`; `old_query_cannot_replace_new` | Search truth and low-click return context. |
| **T-N11w** `components/OpsRail.test.tsx`: `backup_rejects_locally_without_fetch`; `blocked_copy_visible`; `repair_failure_keeps_panel` | D4 cannot be bypassed through UI or MockAdapter. |
| **T-N17w** `components/VerificationPanel.test.tsx`: `absent_receipt_is_unknown`; `source_mismatch_is_stale`; `claim_content_never_gets_curated_badge` | Software verification cannot become content endorsement. |
| **T-N19** `adapters/EvidenceMapAdapter.test.ts`: `groups_exact_topics_and_videos`; `no_timestamp_inference`; `duplicate_rows_do_not_inflate_distinct_claim_count`; `no_extra_http_route` | Atlas is a bounded projection of supported fields. |
| **T-N20** `components/EvidenceMapGate.test.tsx`: `no_import_before_opt_in`; `failed_import_keeps_list`; `renderer_throw_keeps_list`; `dead_data_has_error_not_fake_list`; `stale_list_is_labeled`; `reduced_motion_never_loads_three` | Lazy enhancement cannot erase or fabricate evidence. |

**Browser and visual tests**

Use `playwright.console.config.ts`; actual test files below are planned under `packages/creator-brains-console/e2e/`.

| ID / file / cases | Acceptance |
|---|---|
| **T-N13** `console-layout.spec.ts`: `viewport_matrix`; `375_drawer`; `long_labels`; `all_panel_states`; `keyboard_paths`; `six_token_palette` | Widths 320/375/414/768/1024/1280/1440/1920/2560/3440/3840; explicit 2560×1440 and 3840×2160; no overflow/clipped action; every target ≥44px; normal text ≥4.5:1; focus and axe checks. |
| **T-N14** `constellation-regression.spec.ts`: `deferred_chunk`; `reduced_motion_zero_fetch`; `no_webgl_zero_fetch`; `real_render_changes`; `selection_matches_roster`; `resize_fit`; `hidden_stops_frames` | Preserve CD3 and existing GPU proof. Test real rendered pixels, pointer domain, pause/disposal, and first-poll/idle load contract. |
| **T-N15** `standalone-flow.spec.ts`: `real_bridge_status`; `add_while_status_responds`; `drawer_publication`; `damaged_store_visible`; `application_rollback_preserves_data` | Real bridge, built web app, temp store. Separate Windows launcher receipt proves ≤15s on the named host. |
| **T-N20e** `evidence-map.spec.ts`: `lazy_failure_falls_back`; `375_map_list_parity`; `no_affiliation_copy`; `keyboard_selection` | Atlas degradation and semantic constraints survive a real browser. |

**Performance acceptance**

- Read API p95 ≤50ms on a recorded local fixture, excluding worker completion time and cold engine operations; report sample count and payload size.
- Add responsiveness additionally requires event ordering: read response **before** the synchronous resolver finishes.
- Status payload ≤256KiB; bridge cold start ≤1.5s.
- Initial web bundle ≤500KiB gzip; deferred three chunk ≤900KiB gzip.
- S5: 40 nodes, DPR≤2, full-frame median ≤16.7ms on the named browser/GPU environment.
- Keep workload inflation, empty renderer, frozen renderer, omitted disposal, and disabled dolly as mutation controls.
- Entry dolly ≤2.5s and once per page entry; skip if its chunk arrives more than 3s after first successful status. Reduced motion skips it entirely.
- Future idle drift is bounded to ≤0.25 degrees/second; no continuous scale/opacity pulsing. Preserve a stricter already-verified value if U1 supplies it.

**Exact execution commands**

Run from the repository root. These commands are specified for the builder; none was executed in this review.

```powershell
# Console bridge/tools: enumerate unique files; no helper import re-registration.
$consoleTests = @(Get-ChildItem -LiteralPath packages/creator-brains-console/test `
  -Filter *.test.mjs -File | Sort-Object FullName |
  ForEach-Object { $_.FullName })
if ($consoleTests.Count -eq 0) { throw 'No console tests found' }
node --test @consoleTests
if ($LASTEXITCODE -ne 0) { throw "Console tests failed: $LASTEXITCODE" }
```

```powershell
# Focused S2 behavior gate.
node --test `
  packages/creator-brains-console/test/registry-worker.test.mjs `
  packages/creator-brains-console/test/registry-concurrency.test.mjs `
  packages/creator-brains-console/test/registry-outcome.test.mjs `
  packages/creator-brains-console/test/registry-consent.test.mjs `
  packages/creator-brains-console/test/publication-boundary.test.mjs `
  packages/creator-brains-console/test/publication-identity.test.mjs `
  packages/creator-brains-console/test/display-privacy.test.mjs
if ($LASTEXITCODE -ne 0) { throw "S2 gate failed: $LASTEXITCODE" }
```

```powershell
Push-Location packages/creator-brains-console/web
try {
  npx --no-install vitest run
  if ($LASTEXITCODE -ne 0) { throw "Web tests failed: $LASTEXITCODE" }
  npx --no-install tsc --noEmit
  if ($LASTEXITCODE -ne 0) { throw "Type check failed: $LASTEXITCODE" }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "Web build failed: $LASTEXITCODE" }
} finally {
  Pop-Location
}
```

```powershell
npx --no-install playwright test --config playwright.console.config.ts
if ($LASTEXITCODE -ne 0) { throw "Browser tests failed: $LASTEXITCODE" }
```

```powershell
# Engine regression only when required by the slice; explicitly exclude live tests.
$engineTests = @(Get-ChildItem -LiteralPath scripts/creator-brains/test `
  -Filter *.test.mjs -File |
  Where-Object { $_.Name -ne 'live.test.mjs' } |
  Sort-Object FullName | ForEach-Object { $_.FullName })
if ($engineTests.Count -eq 0) { throw 'No offline engine tests found' }
node --test @engineTests
if ($LASTEXITCODE -ne 0) { throw "Offline engine tests failed: $LASTEXITCODE" }
```

**Meaningful RED/GREEN discipline**

Record the intended assertion failing before implementation. Import/setup failures are not RED evidence. Mutation runs must restore original bytes and rerun the relevant baseline. Do not broaden a green suite repeatedly without a new change or unresolved concern.
