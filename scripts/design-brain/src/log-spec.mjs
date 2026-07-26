/** Spec persistence is disabled pending signed activation and external phase gates. */
const error = new Error('E_SPEC_PERSISTENCE_DISABLED: SDIR experiments must remain task-local and non-durable.');
error.code = 'E_SPEC_PERSISTENCE_DISABLED';
throw error;