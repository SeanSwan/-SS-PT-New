/**
 * reconcile-commission-rates.mjs — READ-ONLY historical commission reconciliation (S0).
 * ============================================================================
 * Verifies the "affiliated was accidentally computed at the intended 35/65" claim from the
 * S0 drift fix. For every TrainerCommission row, joins the trainer's CURRENT trainerType and
 * checks whether the stored commissionRateBusiness matches the intended base rate for that
 * type (accounting for lead-source + loyalty modifiers is NOT attempted here — this flags
 * BASE-rate drift, the money-material case). Reports discrepancies; NEVER writes/updates.
 *
 * ⚠ Caveat: a trainer's type may have changed since a historical purchase, so a mismatch is a
 * SIGNAL to investigate (pull the row, check the type-change audit), not proof of underpayment.
 * Remediation, if any, is a manual audited adjustment entry — never an UPDATE to a ledger row.
 *
 * Usage:  node backend/scripts/reconcile-commission-rates.mjs [--limit N] [--json]
 *
 * @module scripts/reconcile-commission-rates
 */
import getModels from '../models/associations.mjs';
import { BASE_RATES, LEAD_SOURCE_MODIFIERS, RATE_FLOOR, LOYALTY_BUMP_REDUCTION } from '../utils/commissionRates.mjs';

const arg = (name, def = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : def;
};
const asJson = process.argv.includes('--json');
const limit = parseInt(arg('limit', '0'), 10) || undefined;

/**
 * The EXACT finite set of legal business rates a type can produce, across every
 * lead-source × loyalty combination. A stored rate NOT in this set is drift — this
 * catches a single misapplied −5 (which a plausible-band check would miss). Kimi F7.
 */
function legalBusinessRates(trainerType) {
  const base = BASE_RATES[trainerType];
  if (!base) return null;
  const set = new Set();
  for (const leadReduction of Object.values(LEAD_SOURCE_MODIFIERS)) {
    for (const loyalty of [0, LOYALTY_BUMP_REDUCTION]) {
      set.add(Math.max(RATE_FLOOR, base.businessRate - leadReduction - loyalty));
    }
  }
  return set;
}

async function main() {
  const models = await getModels();
  const { TrainerCommission, User } = models;
  if (!TrainerCommission || !User) {
    console.error('Models not available (TrainerCommission/User). Aborting.');
    process.exit(1);
  }

  const rows = await TrainerCommission.findAll({
    include: [{ model: User, as: 'trainer', attributes: ['id', 'trainerType'] }],
    order: [['createdAt', 'DESC']],
    ...(limit ? { limit } : {}),
  });

  const findings = [];
  let checked = 0;
  let unknownType = 0;

  for (const row of rows) {
    checked += 1;
    const type = row.trainer?.trainerType || null;
    const storedBiz = Number(row.commissionRateBusiness);

    if (!type || !BASE_RATES[type]) {
      unknownType += 1;
      findings.push({
        id: row.id, trainerId: row.trainerId, issue: 'unknown_or_null_trainerType',
        trainerType: type, storedBusinessRate: storedBiz,
      });
      continue;
    }

    const legal = legalBusinessRates(type);
    // Exact-set membership (tolerant of float noise) — a stored rate that isn't one of the
    // finite legal outcomes for this type is drift, including a lone misapplied modifier.
    const isLegal = [...legal].some((r) => Math.abs(r - storedBiz) < 0.01);
    if (!isLegal) {
      findings.push({
        id: row.id, trainerId: row.trainerId, issue: 'business_rate_not_a_legal_value_for_type',
        trainerType: type, storedBusinessRate: storedBiz, legalRates: [...legal].sort((a, b) => a - b),
        leadSource: row.leadSource, isLoyaltyBump: row.isLoyaltyBump,
      });
    }
  }

  const summary = {
    checked,
    findings: findings.length,
    unknownType,
    verdict: findings.length === 0
      ? 'CLEAN — every historical commission base rate is within the expected band for its trainer type.'
      : `REVIEW — ${findings.length} row(s) need investigation (see findings). Do NOT auto-fix ledger rows.`,
  };

  if (asJson) {
    console.log(JSON.stringify({ summary, findings }, null, 2));
  } else {
    console.log('\n=== Commission Rate Reconciliation (READ-ONLY) ===');
    console.log(summary.verdict);
    console.log(`Checked: ${summary.checked} | Findings: ${summary.findings} | Unknown/null type: ${summary.unknownType}`);
    if (findings.length) {
      console.log('\nFindings (investigate — mismatch ≠ proof of underpayment; check type-change history):');
      for (const f of findings.slice(0, 50)) {
        console.log(`  #${f.id} trainer=${f.trainerId} type=${f.trainerType} storedBiz=${f.storedBusinessRate}% issue=${f.issue}`);
      }
      if (findings.length > 50) console.log(`  ... and ${findings.length - 50} more (use --json for all).`);
    }
    console.log('');
  }

  process.exit(findings.length === 0 ? 0 : 2);
}

main().catch((err) => {
  console.error('[reconcile-commission-rates] error:', err);
  process.exit(1);
});
