**Evidence levels**

- **Unit:** policy and contract behavior only.
- **Route integration:** actual middleware and mounted handler, with recording dependencies where appropriate.
- **Database integration:** real isolated PostgreSQL, actual transaction boundaries, at least two concurrent connections.
- **Browser:** actual mounted Coach page against the isolated test application.
- **Provider:** recording adapter verifies outbound bytes; it does not prove a live provider’s compliance or availability.

All cases below are proposed and `NOT RUN`. Counts are planned assertions, not measured coverage.

**S1 — 23 cases**

| File | Named cases | Proves |
|---|---|---|
| `backend/tests/unit/coachHarnessRegistrySafety.test.mjs` — 5 | `read_flags_false`; `destructive_is_write`; `confirmation_is_write`; `missing_or_nonboolean_flags_rejected`; `duplicate_command_rejected` | Sole registry risk classification and initialization validation |
| `backend/tests/unit/coachHarnessProviderAdmission.test.mjs` — 5 | `approved_enum_fields_admitted`; `unknown_template_rejected`; `extra_or_raw_string_field_rejected`; `nonfinite_or_out_of_bounds_number_rejected`; `template_version_mismatch_rejected` | Positive admission; no arbitrary prompt field |
| `CC/harnessOutcome.test.ts` — 9 | `explicit_fallback_only`; `error_never_falls_back`; `not_wired_never_falls_back`; `unknown_variant_fails_closed`; `null_operation_disables_confirmation`; `executed_read_is_not_mutation_receipt`; `dispatch_is_not_save`; `debate_is_job_only`; `unknown_transport_requires_reconciliation` | Exhaustive lane/UI decisions |
| `CC/harnessContracts.test.ts` — 4 | `valid_confirmation_parsed`; `malformed_receipt_rejected`; `unexpected_response_fields_not_executed`; `legacy_preview_requires_new_preview` | Runtime parsing rather than TypeScript-only trust |

**S2 — 12 database cases**

`backend/tests/integration/coachHarnessOperations.test.mjs` — 9:

1. `same_request_replays_one_preview`.
2. `changed_payload_same_key_conflicts`.
3. `foreign_actor_cannot_read_confirm_or_cancel`.
4. `concurrent_confirms_commit_one_effect_and_audit`.
5. `confirm_cancel_race_has_one_terminal_outcome`.
6. `expired_preview_cannot_dispatch`.
7. `revoked_access_invalidates_without_write`.
8. `registry_or_domain_version_change_invalidates`.
9. `dispatcher_or_audit_failure_rolls_back_effect_and_receipt`.

`backend/tests/integration/coachHarnessRetention.test.mjs` — 3:

1. `pending_expiry_uses_database_time`.
2. `payload_removal_preserves_terminal_tombstone`.
3. `old_request_cannot_be_silently_reexecuted_after_retention`.

Use controlled database timestamps or injected database-clock fixtures; do not wait five minutes in tests. Verify table contents, not only returned JSON.

**Added after round-2 review R2-07 — the duration change must be pinned, not assumed.** An "expired
preview" fixture passes under *either* duration if it simply supplies an already-past timestamp, so
the 120 s → 300 s change this slice decides is currently untested. With the controlled clock, assert:
(i) a preview created now is still valid at 120 s, (ii) it is rejected at the approved five-minute
boundary, and (iii) the **creation-to-expiry interval itself** equals the approved value. Also note
that the current implementation uses `<` against the expiry instant — so an operation is still
accepted at *exactly* the boundary. Decide and test which side of the boundary is intended.
Separately, `destructiveOperations.mjs:151` hardcodes the string `"Operation expired (120s)"` in an
operator-facing message; the approved duration must not be restated as a literal there, and S3 must
carry the named route assertion for the exact `410` body it specifies.

**S3 — 12 mounted command-route cases**

`backend/tests/integration/coachHarnessCommandRoutes.test.mjs`:

1. `unauthenticated_execute_rejected`.
2. `client_scope_derived_and_authorized_server_side`.
3. `lane_pause_blocks_execute_and_confirm`.
4. `write_pause_blocks_registered_writes_but_allows_reads`.
5. `pause_still_allows_owned_status_and_cancel`.
6. `ambiguous_action_never_returns_chat_fallback`.
7. `confirmation_ignores_client_parameter_injection`.
8. `unsupported_external_effect_returns_not_wired`.
9. `null_or_legacy_operation_cannot_execute`.
10. `commit_response_loss_recovered_by_operation_id`.
11. `preview_response_loss_recovered_by_request_key`.
12. `each_enabled_mutating_dispatcher_obeys_write_pause`.

Case 12 is parameterized over the approved enabled registry entries. The number of generated assertions must be reported separately from the 12 named cases.

**S4 — 10 real-boundary cases**

`backend/tests/integration/coachHarnessProviderBoundary.test.mjs` — 7:

1. `raw_message_identifier_never_reaches_recording_adapter`.
2. `route_previous_and_food_context_cannot_smuggle_fields`.
3. `unapproved_cortex_note_is_excluded`.
4. `approved_note_cannot_invoke_dispatcher`.
5. `classifier_and_chat_use_same_admission_boundary`.
6. `invalid_model_output_is_not_saved_as_approved_action`.
7. `provider_timeout_has_no_automatic_retry_or_mutation`.

`backend/tests/integration/coachHarnessProposalBoundary.test.mjs` — 3:

1. `model_response_cannot_auto_approve`.
2. `approval_rechecks_scope_and_write_pause`.
3. `duplicate_approval_obeys_existing_atomic_save_contract`.

The third case is blocked until the actual proposal/atomic-save contract is supplied. A guessed proposal model is not an acceptable fixture.

**S4 — 24 cases closing the eight named module gaps**

Each file contains three named behavioral cases. Actual exports and adapters are fixed at S0; tests must exercise the production module.

| File | Cases |
|---|---|
| `backend/tests/unit/coachHarnessInputSanitizer.test.mjs` | `rejects_invalid_input_type`; `bounds_input_without_silent_action_change`; `sanitization_does_not_grant_authority` |
| `backend/tests/unit/coachHarnessDeIdentifier.test.mjs` | `synthetic_identifiers_removed`; `cross_request_mapping_isolated`; `rehydration_requires_correct_authorized_mapping` |
| `backend/tests/unit/coachHarnessPhiScanner.test.mjs` | `synthetic_email_phone_and_medical_identifier_detected`; `obfuscated_fixture_rejected_or_blocked_by_admission`; `ordinary_training_fixture_not_misrepresented_as_private_data` |
| `backend/tests/unit/coachHarnessManualOnlyPolicy.test.mjs` | `manual_only_command_blocked`; `known_nonmanual_command_unchanged`; `unknown_command_not_promoted_to_executable` |
| `backend/tests/unit/coachHarnessDeterministicIntent.test.mjs` | `supported_intake_phrase_classified`; `negated_action_not_executed`; `ambiguous_multi_action_requires_clarification` |
| `backend/tests/unit/coachHarnessModelSelector.test.mjs` | `approved_entitlement_selects_allowed_model`; `missing_entitlement_cannot_escalate`; `unsupported_model_fails_without_paid_fallback` |
| `backend/tests/unit/coachHarnessErrorLoop.test.mjs` | `repeated_failure_blocks_loop`; `unrelated_conversation_isolated`; `authorized_reset_does_not_erase_other_conversation_state` |
| `backend/tests/unit/coachHarnessMeasurementContext.test.mjs` | `authorized_measurement_fields_only`; `missing_or_nonfinite_measurement_not_fabricated`; `out_of_scope_client_rejected_at_call_boundary` |

A failing privacy detector does not justify weakening its test. The boundary must either reject the payload or provide approved evidence that no identifying content crosses.

Add direct `detectPii` assertions to the existing validator test location supplied at S0. This closes the uncertainty about that symbol; module import counts do not close it.

**S5 — 12 frontend integration cases**

`CC/CoachHarnessFlow.test.tsx` — 8:

1. `mounted_submit_uses_command_before_chat`.
2. `explicit_fallback_calls_chat_once`.
3. `command_error_never_calls_chat`.
4. `double_confirm_does_not_create_new_operation`.
5. `client_change_disables_old_preview`.
6. `late_response_remains_bound_to_originating_thread`.
7. `lost_response_enters_unknown_and_checks_existing_status`.
8. `frontend_dispatch_never_renders_workout_saved`.

`CC/CoachConsoleDock.harness.test.tsx` — 4:

1. `composer_is_labeled_and_keyboard_submittable`.
2. `sending_disables_duplicate_submit`.
3. `status_announces_without_focus_theft`.
4. `empty_input_explains_validation`.

**S5 — 8 browser scenarios**

`frontend/tests/e2e/coach-harness.spec.ts`:

1. `admin_trainer_client_mount_correct_surface`.
2. `long_transcript_keeps_composer_reachable`.
3. `review_confirm_cancel_keyboard_flow`.
4. `mobile_keyboard_preserves_composer_and_controls`.
5. `stale_scope_and_expired_preview_recover`.
6. `unknown_outcome_reconciles_without_duplicate_effect`.
7. `history_uses_authoritative_receipts`.
8. `responsive_zoom_focus_and_reduced_motion_matrix`.

Parameterize role/access expectations from the actual registry and fixtures. Do not assume all three roles share the same command permissions.

**RED-before-GREEN**

- For an observed regression, first reproduce it through the current mounted caller.
- For new contract modules, assertion failures against an intentionally incomplete behavioral implementation establish RED; missing-file/import failures do not.
- For transaction failures, inject a failure after the proposed domain write but before audit/receipt completion and prove rollback.
- For privacy, use synthetic canaries in each possible input channel and capture final adapter bytes.
- For UI races, resolve promises out of order and change client/thread while requests are pending.
- Preserve expected RED output separately from normal green-suite output.
- Where current behavior already satisfies a requirement, record a passing characterization test; do not manufacture a failure.

**Isolation**

Test startup must refuse a database lacking an explicit test marker and an approved disposable database identity. Never fall back to `DATABASE_URL`. Provider adapters are recording fakes unless a separate live call is authorized. No test sends a message to a real client, creates a real workout, or uses private production data.

**Traceability**

| Requirement | Primary cases | Observable assertion |
|---|---|---|
| H01 | Outcome reducer; mounted submit; explicit fallback | No chat call after a denied/failed/unsupported/unknown command |
| H02 | Null/legacy preview; injected confirmation parameters | Confirm consumes operation identity only; displayed params cannot alter execution |
| H03 | Foreign actor; revoked access; changed scope/version | Zero domain writes |
| H04 | Concurrent confirm; confirm/cancel; rollback; lost response | At most one domain effect and one success audit |
| H05 | Registry validation; every enabled mutating dispatcher under pause | Zero mutating dispatcher invocations while paused |
| H06 | Admission and final recording-adapter canaries | Captured adapter bytes contain only admitted fields |
| H07 | Note injection; invalid output; no auto-approval | **Zero dispatcher invocations** — see the spy requirement below |
| H08 | Dispatch honesty; unknown outcome; authoritative history | No unsupported "saved" claim |
| H09 | Dock integration and browser matrix | Named viewports/zoom/motion states verified |
| H10 | Snapshot-bound checkpoint receipts and runner outputs | Hashes and exit codes present |
| H11 | Legacy-preview transition, retention, migration and rollback rehearsal | Legacy preview cannot bypass upgraded checks |

**Added after round-2 review R2-08 — two gaps this table had.** First, it maps requirements *forward*
but never states, per named case, which requirement it satisfies; the builder could therefore add
cases that trace to nothing. Second, H07's acceptance is "no dispatcher invocation", yet
`invalid_model_output_is_not_saved_as_approved_action` could pass **while a dispatcher was in fact
called** — the case name asserts a *storage* outcome, not the *invocation* the requirement is about.
Add an explicit dispatcher **spy** assertion (counted invocations, expected 0) for malformed output,
fabricated commands/tools, and instruction injection. The same spy shape applies to H01's "never
calls chat" and H05's pause cases — assert the *call count*, not the rendered outcome.

Also add named executable procedures for the obligations that currently have none: checkpoint
integrity (H10), migration and rollback rehearsal, rolling-preview transition (H11), and the
operational budgets in `07-checkpoints.md`. A budget or a rehearsal with no named command is a
criterion nobody can fail. Update the stated case counts when adding cases.

Finally, `rejects_invalid_input_type` must state what it observes: the supplied `sanitizeInput`
returns empty text with `blocked: false` for a non-string, so a naive "it rejects" assertion could
pass on a path that neither blocks nor signals rejection. Name the expected return shape.
