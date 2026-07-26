/** Inspect attestations were retired by the Opus/Kimi hardening decision. */
const error = new Error('E_INSPECT_RETIRED: Inspect detail persistence is forbidden; use coarse Probe mode.');
error.code = 'E_INSPECT_RETIRED';
throw error;