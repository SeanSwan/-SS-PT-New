/**
 * Waiver Re-Consent Migration Policy — Phase 5W-F
 * =================================================
 * Identifies users whose waiver consent is outdated or missing
 * relative to current waiver version policy, and optionally marks
 * versions as requiring re-consent.
 *
 * Modes:
 *   --dry-run     Report only (default) — shows impacted users
 *   --apply       Mark target waiver versions as requiresReconsent=true
 *   --version-id  Target a specific waiver version ID
 *   --type        Target waiver type(s): core, ai_notice, or both (default: both)
 *
 * Usage:
 *   node backend/scripts/waiver-reconsent-migration.mjs --dry-run
 *   node backend/scripts/waiver-reconsent-migration.mjs --apply --type ai_notice
 *   node backend/scripts/waiver-reconsent-migration.mjs --apply --version-id 3
 *
 * Contract: WAIVER-CONSENT-QR-FLOW-CONTRACT.md §7, §10.3, §13
 */

import { Op } from 'sequelize';
import getModels from '../models/associations.mjs';
import sequelize from '../database.mjs';

const APPLY = process.argv.includes('--apply');
const DRY_RUN = !APPLY; // default is dry-run
const TAG = '[Waiver Re-Consent Migration]';

function parseArg(flag) {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
}

const TARGET_VERSION_ID = parseArg('--version-id')
  ? Number(parseArg('--version-id'))
  : null;
const TARGET_TYPE = parseArg('--type') || 'both';
const REQUIRED_TYPES = TARGET_TYPE === 'both'
  ? ['core', 'ai_notice']
  : [TARGET_TYPE];

async function run() {
  console.log(`${TAG} Starting... ${DRY_RUN ? '(DRY RUN)' : '(APPLY MODE)'}`);
  console.log(`${TAG} Target types: ${REQUIRED_TYPES.join(', ')}`);
  if (TARGET_VERSION_ID) {
    console.log(`${TAG} Target version ID: ${TARGET_VERSION_ID}`);
  }

  try {
    await sequelize.authenticate();
    console.log(`${TAG} Database connected.`);

    const models = await getModels();
    const { WaiverVersion, WaiverRecord, WaiverRecordVersion, AiConsentLog, User } = models;

    if (!WaiverVersion || !WaiverRecord || !WaiverRecordVersion) {
      console.error(`${TAG} Required waiver models not found. Run migrations first.`);
      process.exit(1);
    }

    const now = new Date();

    // ──────────────────────────────────────────────
    // Step 1: Find current (active) waiver versions
    // ──────────────────────────────────────────────
    const versionWhere = {
      effectiveAt: { [Op.lte]: now },
      retiredAt: null,
    };

    if (TARGET_VERSION_ID) {
      versionWhere.id = TARGET_VERSION_ID;
    } else {
      versionWhere.waiverType = { [Op.in]: REQUIRED_TYPES };
    }

    const currentVersions = await WaiverVersion.findAll({
      where: versionWhere,
      order: [['waiverType', 'ASC'], ['effectiveAt', 'DESC']],
    });

    if (currentVersions.length === 0) {
      console.log(`${TAG} No current waiver versions found matching criteria.`);
      process.exit(0);
    }

    console.log(`${TAG} Found ${currentVersions.length} current version(s):`);
    for (const v of currentVersions) {
      console.log(`  - Version #${v.id} (${v.waiverType}) — effectiveAt: ${v.effectiveAt}, requiresReconsent: ${v.requiresReconsent}`);
    }

    const versionIds = currentVersions.map((v) => v.id);

    // ──────────────────────────────────────────────
    // Step 2: Find all linked waivers with AI consent
    // ──────────────────────────────────────────────
    const linkedWaivers = await WaiverRecord.findAll({
      where: { status: 'linked' },
      include: [{
        association: 'consentFlags',
        where: { aiConsentAccepted: true },
        required: true,
      }],
      attributes: ['id', 'userId'],
    });

    console.log(`${TAG} Users with linked AI-consent waivers: ${linkedWaivers.length}`);

    if (linkedWaivers.length === 0) {
      console.log(`${TAG} No users with AI consent waivers. Nothing to migrate.`);
      process.exit(0);
    }

    // ──────────────────────────────────────────────
    // Step 3: Check version acceptance per user
    // ──────────────────────────────────────────────
    const waiverIds = linkedWaivers.map((w) => w.id);

    const acceptedLinks = await WaiverRecordVersion.findAll({
      where: {
        waiverRecordId: { [Op.in]: waiverIds },
        waiverVersionId: { [Op.in]: versionIds },
        accepted: true,
      },
      attributes: ['waiverRecordId', 'waiverVersionId'],
    });

    // Build lookup: waiverRecordId → Set of accepted version IDs
    const acceptedByRecord = new Map();
    for (const link of acceptedLinks) {
      if (!acceptedByRecord.has(link.waiverRecordId)) {
        acceptedByRecord.set(link.waiverRecordId, new Set());
      }
      acceptedByRecord.get(link.waiverRecordId).add(link.waiverVersionId);
    }

    // ──────────────────────────────────────────────
    // Step 4: Classify users
    // ──────────────────────────────────────────────
    const fullyCurrentUsers = [];
    const outdatedUsers = [];
    const missingUsers = [];

    for (const waiver of linkedWaivers) {
      const accepted = acceptedByRecord.get(waiver.id) || new Set();
      const missing = versionIds.filter((id) => !accepted.has(id));

      if (missing.length === 0) {
        fullyCurrentUsers.push({ userId: waiver.userId, waiverRecordId: waiver.id });
      } else if (accepted.size > 0) {
        outdatedUsers.push({ userId: waiver.userId, waiverRecordId: waiver.id, missingVersionIds: missing });
      } else {
        missingUsers.push({ userId: waiver.userId, waiverRecordId: waiver.id, missingVersionIds: missing });
      }
    }

    // ──────────────────────────────────────────────
    // Step 5: Report
    // ──────────────────────────────────────────────
    console.log('');
    console.log(`${TAG} ═══ IMPACT REPORT ═══`);
    console.log(`  Fully current (no action needed): ${fullyCurrentUsers.length}`);
    console.log(`  Outdated (some versions missing):  ${outdatedUsers.length}`);
    console.log(`  Missing (no versions accepted):    ${missingUsers.length}`);
    console.log(`  Total impacted:                    ${outdatedUsers.length + missingUsers.length}`);

    if (outdatedUsers.length > 0 && User) {
      console.log('');
      console.log(`${TAG} Outdated users:`);
      for (const u of outdatedUsers.slice(0, 50)) {
        const user = await User.findByPk(u.userId, { attributes: ['id', 'email', 'firstName', 'lastName'] });
        const name = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'unknown';
        console.log(`  - User #${u.userId} (${name}) — missing versions: ${u.missingVersionIds.join(', ')}`);
      }
      if (outdatedUsers.length > 50) {
        console.log(`  ... and ${outdatedUsers.length - 50} more`);
      }
    }

    if (missingUsers.length > 0 && User) {
      console.log('');
      console.log(`${TAG} Missing-all-versions users:`);
      for (const u of missingUsers.slice(0, 50)) {
        const user = await User.findByPk(u.userId, { attributes: ['id', 'email', 'firstName', 'lastName'] });
        const name = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'unknown';
        console.log(`  - User #${u.userId} (${name}) — missing versions: ${u.missingVersionIds.join(', ')}`);
      }
      if (missingUsers.length > 50) {
        console.log(`  ... and ${missingUsers.length - 50} more`);
      }
    }

    // ──────────────────────────────────────────────
    // Step 6: Check requiresReconsent status
    // ──────────────────────────────────────────────
    const alreadyMarked = currentVersions.filter((v) => v.requiresReconsent);
    const notYetMarked = currentVersions.filter((v) => !v.requiresReconsent);

    console.log('');
    console.log(`${TAG} ═══ VERSION STATUS ═══`);
    console.log(`  Already marked requiresReconsent: ${alreadyMarked.length}`);
    for (const v of alreadyMarked) {
      console.log(`    - Version #${v.id} (${v.waiverType})`);
    }
    console.log(`  Not yet marked:                   ${notYetMarked.length}`);
    for (const v of notYetMarked) {
      console.log(`    - Version #${v.id} (${v.waiverType})`);
    }

    // ──────────────────────────────────────────────
    // Step 7: Apply (if requested)
    // ──────────────────────────────────────────────
    if (DRY_RUN) {
      console.log('');
      console.log(`${TAG} DRY RUN complete. No changes made.`);
      console.log(`${TAG} To apply, re-run with --apply`);
      process.exit(0);
    }

    if (notYetMarked.length === 0) {
      console.log('');
      console.log(`${TAG} All target versions already marked. Nothing to apply.`);
      process.exit(0);
    }

    console.log('');
    console.log(`${TAG} Applying requiresReconsent=true to ${notYetMarked.length} version(s)...`);

    const transaction = await sequelize.transaction();
    try {
      for (const version of notYetMarked) {
        await version.update({ requiresReconsent: true }, { transaction });
        console.log(`  ✓ Version #${version.id} (${version.waiverType}) marked`);

        // Audit log — uses valid enum values from AiConsentLog model
        if (AiConsentLog) {
          await AiConsentLog.create({
            userId: null, // system action — no specific user
            action: 'override_used',
            sourceType: 'waiver_record',
            sourceId: version.id,
            reason: `Migration script marked version #${version.id} (${version.waiverType}) as requiresReconsent`,
            metadata: {
              versionId: version.id,
              waiverType: version.waiverType,
              impactedUsers: outdatedUsers.length + missingUsers.length,
              script: 'waiver-reconsent-migration.mjs',
            },
          }, { transaction });
        }
      }

      await transaction.commit();
      console.log('');
      console.log(`${TAG} Applied successfully. ${notYetMarked.length} version(s) now require re-consent.`);
      console.log(`${TAG} Impacted users will see re-consent prompts on next login.`);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error(`${TAG} Error:`, err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
