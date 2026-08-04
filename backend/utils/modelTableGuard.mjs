/**
 * modelTableGuard — boot-time schema-drift tripwire (SWA-115 item 4, 2026-08-04)
 * ==============================================================================
 * WHAT: after startup DB work completes, verifies every registered Sequelize model
 * has a live table. A model with no table means its mounted endpoints 500 on first
 * touch — the exact failure class that shipped 12 table-less models undetected
 * (drift audit 2026-08-03: progress_data, user_follows, video_sessions, ...).
 *
 * WARN-ONLY BY DESIGN: never throws, never blocks boot (crash-loop protection has
 * priority — same doctrine as safe-migrate). It makes the drift LOUD in deploy logs
 * on every boot instead of silent until a user hits the endpoint.
 *
 * The deep diff (column/type/FK level) stays in scripts/audit-schema-drift.mjs —
 * this guard is the cheap always-on tripwire (one pg_tables query per boot).
 */
import logger from './logger.mjs';

/**
 * KNOWN-MISSING allowlist (Kimi F2, 2026-08-04): models whose missing table is a TRACKED,
 * deliberate deferral. These log ONCE at info; only NEW (un-allowlisted) missing tables
 * fire error — so `error` always means "new drift", never wallpaper. Every entry MUST
 * carry the ticket that owns its resolution; remove the entry when the ticket closes.
 */
export const KNOWN_MISSING = [
  { model: 'Package', table: 'packages', ticket: 'SWA-115' }, // legacy surface vs canonical StorefrontItem — retire/create decision pending
  { model: 'PainEntryCorrectiveExercise', table: 'PainEntryCorrectiveExercises', ticket: 'SWA-115' }, // dormant: zero runtime consumers
];

/** Pure classifier — unit-testable without a DB. Splits missing into known vs NEW. */
export function classifyMissingTables(modelEntries, liveTableNames, knownMissing = KNOWN_MISSING) {
  const live = new Set(liveTableNames);
  const knownTables = new Set(knownMissing.map(k => k.table));
  const missing = modelEntries
    .filter(({ table }) => !live.has(table))
    .sort((a, b) => a.model.localeCompare(b.model));
  return {
    known: missing.filter(m => knownTables.has(m.table)),
    fresh: missing.filter(m => !knownTables.has(m.table)),
  };
}

/** Extract { model, table } pairs from a getModels() result. */
export function extractModelTables(models) {
  const entries = [];
  for (const [name, model] of Object.entries(models)) {
    if (!model || typeof model.getTableName !== 'function') continue;
    let tn = model.getTableName();
    if (typeof tn === 'object') tn = tn?.tableName;
    // Malformed models (getTableName() → undefined/empty) must not become a phantom
    // missing table named "undefined" (Kimi F5) — skip them; they are not auditable here.
    if (typeof tn !== 'string' || tn.length === 0) continue;
    // User.mjs declares tableName '"Users"' with embedded quotes — normalize.
    entries.push({ model: name, table: tn.replace(/"/g, '') });
  }
  return entries;
}

/**
 * Run the guard. Returns { checked, missing } — missing = [{ model, table }].
 * Never throws.
 */
export async function runModelTableGuard(models, sequelize) {
  try {
    const [rows] = await sequelize.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
    );
    const entries = extractModelTables(models);
    const { known, fresh } = classifyMissingTables(entries, rows.map(r => r.tablename));

    if (known.length > 0) {
      logger.info(
        `[ModelTableGuard] ${known.length} known-missing model table(s), tracked deferrals ` +
        `(${[...new Set(KNOWN_MISSING.map(k => k.ticket))].join(', ')}): ` +
        known.map(m => m.model).join(', '),
      );
    }
    if (fresh.length === 0) {
      logger.info(`[ModelTableGuard] ✅ no NEW drift — ${entries.length} models checked`);
    } else {
      logger.error(
        `[ModelTableGuard] 🚨 ${fresh.length} model(s) have NO live table and are NOT tracked ` +
        `deferrals — every mounted endpoint that queries them will 500. Create the table ` +
        `(migration or utils/tableCreationOrder.mjs), retire the model, or add a ticketed ` +
        `KNOWN_MISSING entry:`,
      );
      for (const m of fresh) {
        logger.error(`[ModelTableGuard]   - model ${m.model} -> missing table "${m.table}"`);
      }
    }
    return { checked: entries.length, missing: [...known, ...fresh], fresh, known };
  } catch (err) {
    logger.warn(`[ModelTableGuard] guard skipped (non-critical): ${err.message}`);
    return { checked: 0, missing: [] };
  }
}

export default runModelTableGuard;
