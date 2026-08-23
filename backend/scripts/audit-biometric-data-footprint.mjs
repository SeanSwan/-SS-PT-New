/**
 * ============================================================================
 * FILE: audit-biometric-data-footprint.mjs
 * PURPOSE: READ-ONLY. Size the biometric / special-category data already held,
 *          so the SWA-118 remediation decision (retroactive consent vs purge)
 *          is made from real numbers instead of guesses.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-04
 * ============================================================================
 *
 * WHY THIS EXISTS
 * Heart-rate and related biometrics are GDPR Article 9 special-category health
 * data. The platform is already storing a lot of it with no established lawful
 * basis (SWA-118). Two remediation paths exist — retroactive consent with
 * deletion-on-decline, or purge — and which one is right depends entirely on
 * facts nobody currently has: how many clients, how much history, still growing?
 *
 * SAFETY
 * - READ-ONLY. SELECTs only. There is no INSERT/UPDATE/DELETE in this file.
 * - Privacy (Rules 8/59): prints COUNTS and DATE RANGES only. No user IDs, no
 *   values, no device identifiers. This is a sizing tool, not a data dump —
 *   a biometric audit that itself exposes biometrics would be self-defeating.
 * - Reads DATABASE_URL from the environment; never echoes it.
 *
 * USAGE
 *   node backend/scripts/audit-biometric-data-footprint.mjs
 * ============================================================================
 */

const { default: sequelize } = await import('../database.mjs');

const line = (n = 74) => '─'.repeat(n);

/** Run a SELECT, returning [] and a note on failure (missing table is a valid answer). */
async function q(label, sql) {
  try {
    const [rows] = await sequelize.query(sql);
    return rows;
  } catch (err) {
    console.log(`  [skip] ${label}: ${err.message.split('\n')[0]}`);
    return [];
  }
}

function report(title, rows, render) {
  console.log(`\n${title}`);
  if (!rows.length) { console.log('  (no rows)'); return; }
  render(rows);
}

async function main() {
  console.log(line());
  console.log('BIOMETRIC / SPECIAL-CATEGORY DATA FOOTPRINT — read-only audit');
  console.log('Counts and date ranges only. No identifiers, no values.');
  console.log(line());

  // ── 1. WearableData: the main store ──────────────────────────────────────
  const wd = await q('wearable_data', `
    SELECT COUNT(*)                                   AS total_rows,
           COUNT(DISTINCT "userId")                   AS distinct_clients,
           MIN("recordDate")                          AS earliest,
           MAX("recordDate")                          AS latest,
           COUNT(*) FILTER (WHERE "restingHeartRate"     IS NOT NULL) AS has_resting_hr,
           COUNT(*) FILTER (WHERE "avgHeartRate"         IS NOT NULL) AS has_avg_hr,
           COUNT(*) FILTER (WHERE "heartRateVariability" IS NOT NULL) AS has_hrv,
           COUNT(*) FILTER (WHERE "vo2Max"               IS NOT NULL) AS has_vo2max,
           COUNT(*) FILTER (WHERE "spo2"                 IS NOT NULL) AS has_spo2,
           COUNT(*) FILTER (WHERE "sleepStages"          IS NOT NULL) AS has_sleep_stages,
           COUNT(*) FILTER (WHERE "stressLevel"          IS NOT NULL) AS has_stress
    FROM "WearableData"`);

  report('1. WEARABLE DATA (the main biometric store)', wd, (rows) => {
    const r = rows[0];
    console.log(`  rows: ${r.total_rows}   clients: ${r.distinct_clients}`);
    console.log(`  span: ${r.earliest || 'n/a'} → ${r.latest || 'n/a'}`);
    console.log('  special-category fields populated:');
    for (const [k, v] of [
      ['resting HR', r.has_resting_hr], ['avg HR', r.has_avg_hr], ['HRV', r.has_hrv],
      ['VO2max', r.has_vo2max], ['SpO2', r.has_spo2],
      ['sleep stages', r.has_sleep_stages], ['stress', r.has_stress],
    ]) console.log(`    ${String(k).padEnd(14)} ${v}`);
  });

  // ── 2. Is it still GROWING? The single most decision-relevant number. ────
  const growth = await q('wearable growth', `
    SELECT COUNT(*) FILTER (WHERE "syncedAt" > NOW() - INTERVAL '7 days')  AS last_7d,
           COUNT(*) FILTER (WHERE "syncedAt" > NOW() - INTERVAL '30 days') AS last_30d,
           COUNT(*) FILTER (WHERE "syncedAt" > NOW() - INTERVAL '90 days') AS last_90d,
           MAX("syncedAt")                                                 AS most_recent_sync
    FROM "WearableData"`);

  report('2. IS THE STORE STILL GROWING?  (POST /api/wearable-data/sync is live)', growth, (rows) => {
    const r = rows[0];
    console.log(`  synced last 7d: ${r.last_7d}   30d: ${r.last_30d}   90d: ${r.last_90d}`);
    console.log(`  most recent sync: ${r.most_recent_sync || 'never'}`);
    console.log(Number(r.last_30d) > 0
      ? '  → ACTIVE. Data is accumulating without an established lawful basis.'
      : '  → DORMANT. No recent writes; remediation is not racing new inflow.');
  });

  // ── 3. Baseline measurements — the OTHER health store ────────────────────
  const baseline = await q('client_baseline_measurements', `
    SELECT COUNT(*)                                                        AS total_rows,
           COUNT(DISTINCT "userId")                                        AS distinct_clients,
           MIN("takenAt")                                                  AS earliest,
           MAX("takenAt")                                                  AS latest,
           COUNT(*) FILTER (WHERE "restingHeartRate"      IS NOT NULL)     AS has_resting_hr,
           COUNT(*) FILTER (WHERE "bloodPressureSystolic" IS NOT NULL)     AS has_bp,
           COUNT(*) FILTER (WHERE "parqScreening"         IS NOT NULL)     AS has_parq,
           COUNT(*) FILTER (WHERE "medicalClearanceRequired" = true)       AS flagged_clients,
           COUNT(*) FILTER (WHERE "injuryNotes"           IS NOT NULL)     AS has_injury_notes
    FROM client_baseline_measurements`);

  report('3. BASELINE MEASUREMENTS (resting HR, BP, PAR-Q — also Art. 9)', baseline, (rows) => {
    const r = rows[0];
    console.log(`  rows: ${r.total_rows}   clients: ${r.distinct_clients}`);
    console.log(`  span: ${r.earliest || 'n/a'} → ${r.latest || 'n/a'}`);
    console.log(`  resting HR: ${r.has_resting_hr}   blood pressure: ${r.has_bp}`);
    console.log(`  PAR-Q on file: ${r.has_parq}   medically flagged: ${r.flagged_clients}`);
    console.log(`  free-text injury notes: ${r.has_injury_notes}`);
    console.log('  NOTE: these fields are read into the Swan Coach LLM prompt');
    console.log('        (aiChatService.mjs:1714) — see the audit summary.');
  });

  // ── 4. Age signal — the SWA-117 prerequisite, measured ───────────────────
  const age = await q('users age signal', `
    SELECT COUNT(*)                                          AS total_users,
           COUNT(*) FILTER (WHERE "dateOfBirth" IS NOT NULL) AS has_dob,
           COUNT(*) FILTER (WHERE "dateOfBirth" IS NULL)     AS missing_dob
    FROM "Users"`);

  report('4. AGE SIGNAL COVERAGE (SWA-117 Phase 1 sizing)', age, (rows) => {
    const r = rows[0];
    const pct = Number(r.total_users) ? Math.round((Number(r.has_dob) / Number(r.total_users)) * 100) : 0;
    console.log(`  users: ${r.total_users}   with DOB: ${r.has_dob} (${pct}%)   missing: ${r.missing_dob}`);
    console.log('  → under fail-closed doctrine every missing DOB is treated as a minor.');
  });

  console.log(`\n${line()}`);
  console.log('Audit complete. No data was read into memory beyond aggregates,');
  console.log('and nothing was modified.');
}

main()
  .catch((err) => {
    console.error(`Audit failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await sequelize.close(); } catch { /* already closed */ }
  });
