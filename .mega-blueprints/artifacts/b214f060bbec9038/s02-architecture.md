# S02 architecture: lossless intensity and rest compatibility

This bounded step implements the prescription portion of R-H11 under canonical document14 section3. It does not complete all H11 metadata work or H12/H14 identity/dirty-state work.

Own the existing planDataBuilder, workoutPlannerLoadPlanHydration, WorkoutPlannerTypes, new workoutPlannerPrescription helper, existing builder exercise rows and targeted helper/component tests. Preserve original planData and all generated weeks through existing sanitizer/assignment wrappers. No new writer or API.

Manual payloads carry finite supported numeric intensityPercent and compatible complete percentage text. Read typed numeric first, then only a complete legacy percentage form; unsupported/missing source intensity stays unset and original text is preserved. Preserve zero rest, tempo, notes and saved exercise key without deriving prescriptions from setScheme. Use established percentage limits; if no input limit exists, report to Astra before inventing a new one.

The numeric intensity editor is blank for unset values. Show existing saved text or Intensity not specified, and only a deliberate numeric edit replaces legacy text. Existing new-exercise phase defaults remain intact. Accessible labels must identify the exercise/field. Layout must retain wrapping/44px controls.

Tests: actual serializer/hydration roundtrip at 40/70/83/85, zero rest, known complete legacy form, invalid nonfinite/malformed intensity, unknown original text survives a save, explicit edit replaces it, phase defaults remain. Use the existing isolated intensity RED cases and persistent helper/component tests. No fabricated load-time70 percent.

Later slices own full saved metadata fidelity, immutable baseline/revision, normalized complete dirty signature and async lifecycle adoption. Keep them explicitly pending in final traceability. Source scope is finalized and admitted via append-slice after S01, not by this document alone.
Astra source adjudication: the existing parseIntensityPercent helper in workoutPlannerGenerationActions.helpers.ts accepts numeric input without bounds and strips every non-digit from strings, so a range such as 70-80% becomes7080. Include that helper's call site in S02 and use the shared decoder to preserve range text with unset numeric intensity. Existing new-exercise phase defaults are separate and remain intentional. No source percentage input bound was found; preserve finite numeric values without introducing a training prescription limit. Invalid nonfinite values are not serializable prescriptions. New numeric control uses no invented min/max range. Ranges/text remain visible and preserved until explicitly edited.
