#!/usr/bin/env node
/**
 * Waiver remediation audit — SWA-140 (READ-ONLY)
 * ==============================================
 * Finds waiver records that need human attention because they were signed
 * under rules the system did not yet enforce:
 *
 *   COHORT A — minors who signed for themselves. Until SWA-140, date of birth
 *              was collected and never evaluated, and the guardian flag was a
 *              self-declared checkbox. A release signed by a minor is
 *              disaffirmable, so these are not "imperfect" — for the highest
 *              risk activity (swim lessons) they may be no release at all.
 *   COHORT B — guardian-submitted records with no emergency contact.
 *   COHORT C — everyone still on a superseded document version, once v2.0 is
 *              activated (the re-consent population).
 *
 * Prints counts and ID-only detail. NEVER prints names, emails, phones, DOBs,
 * or signature data — this output is meant to be pasteable into a ticket
 * (Rule 8: IDs and roles only).
 *
 * Usage: node backend/scripts/audit-waiver-minor-cohort.mjs [--json]
 * Writes nothing. Changes nothing.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import sequelize from '../database.mjs';
import { initializeModelsCache, getModel } from '../models/index.mjs';

const asJson = process.argv.includes('--json');

function ageAt(dob, at) {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  let age = at.getFullYear() - d.getFullYear();
  const monthDiff = at.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && at.getDate() < d.getDate())) age -= 1;
  return age;
}

async function main() {
  await sequelize.authenticate();
  await initializeModelsCache();

  const WaiverRecord = getModel('WaiverRecord');
  const WaiverVersion = getModel('WaiverVersion');
  const WaiverRecordVersion = getModel('WaiverRecordVersion');

  const records = await WaiverRecord.findAll({
    attributes: [
      'id', 'userId', 'status', 'dateOfBirth', 'signedAt', 'activityTypes',
      'submittedByGuardian', 'emergencyContactName', 'participantName',
    ],
    where: { status: ['pending_match', 'linked'] },
  });

  const cohortA = [];
  const cohortB = [];

  for (const r of records) {
    const ageAtSigning = ageAt(r.dateOfBirth, new Date(r.signedAt || Date.now()));
    if (ageAtSigning !== null && ageAtSigning < 18) {
      if (!r.submittedByGuardian) {
        cohortA.push({
          waiverRecordId: r.id,
          userId: r.userId,
          ageAtSigning,
          activityTypes: r.activityTypes,
          aquatic: Array.isArray(r.activityTypes) && r.activityTypes.includes('SWIMMING_LESSONS'),
        });
      } else if (!r.emergencyContactName) {
        cohortB.push({ waiverRecordId: r.id, userId: r.userId, ageAtSigning });
      }
    }
  }

  // Cohort C — anyone whose accepted versions are all retired/superseded.
  const activeIds = new Set(
    (await WaiverVersion.findAll({ where: { retiredAt: null }, attributes: ['id'] })).map((v) => v.id),
  );
  const links = await WaiverRecordVersion.findAll({
    attributes: ['waiverRecordId', 'waiverVersionId', 'accepted'],
    where: { accepted: true },
  });
  const byRecord = new Map();
  for (const l of links) {
    if (!byRecord.has(l.waiverRecordId)) byRecord.set(l.waiverRecordId, []);
    byRecord.get(l.waiverRecordId).push(l.waiverVersionId);
  }
  const cohortC = [];
  for (const r of records) {
    const accepted = byRecord.get(r.id) || [];
    if (accepted.length > 0 && !accepted.some((id) => activeIds.has(id))) {
      cohortC.push({ waiverRecordId: r.id, userId: r.userId });
    }
  }

  const summary = {
    scannedRecords: records.length,
    cohortA_minorSelfSigned: cohortA.length,
    cohortA_aquatic: cohortA.filter((c) => c.aquatic).length,
    cohortB_guardianNoEmergencyContact: cohortB.length,
    cohortC_onSupersededVersion: cohortC.length,
  };

  if (asJson) {
    console.log(JSON.stringify({ summary, cohortA, cohortB, cohortC }, null, 2));
  } else {
    console.log('\n── Waiver remediation audit (read-only) ─────────────────');
    console.log(`Records scanned (pending_match + linked): ${summary.scannedRecords}\n`);
    console.log(`COHORT A — minor signed without a guardian: ${summary.cohortA_minorSelfSigned}`);
    console.log(`           …of those, swim lessons:        ${summary.cohortA_aquatic}`);
    console.log(`COHORT B — guardian, no emergency contact:  ${summary.cohortB_guardianNoEmergencyContact}`);
    console.log(`COHORT C — on a superseded version:         ${summary.cohortC_onSupersededVersion}\n`);
    if (cohortA.length) {
      console.log('Cohort A waiver record ids (re-execution needed, guardian as signer):');
      console.log('  ' + cohortA.map((c) => c.waiverRecordId).join(', '));
    }
    if (cohortB.length) {
      console.log('Cohort B waiver record ids:');
      console.log('  ' + cohortB.map((c) => c.waiverRecordId).join(', '));
    }
    console.log('\nNo records were modified.\n');
  }
}

main()
  .catch((err) => {
    console.error('Audit failed:', err.message || err);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
