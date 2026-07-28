/**
 * Import MindBody Clients → SwanStudios
 * =====================================================================
 * Reads a CSV exported from MindBody (via the Hermes browser harness or
 * MindBody's native client export) and creates SwanStudios client records.
 *
 * Mirrors the canonical admin "createExternalClient" path
 * (backend/controllers/adminClientController.mjs) so migrated clients behave
 * exactly like admin-created Move Fitness / external clients:
 *   - role = 'client', isActive = true
 *   - accountStatus = 'stub'  (no login until they claim / reset)
 *   - forcePasswordChange = true, random server-side password (hashed by model hook)
 *   - username auto-generated (email prefix + random hex), collision-checked
 *   - availableSessions = 0 for non-deducting sources (move_fitness / external)
 *   - defensive ClientProgress row (skipped if table missing)
 *   - optional admin-only ClientNote preserving MindBody-only fields
 *     (address, referral, last visit, membership, balance, waiver)
 *
 * SAFETY: dry-run by DEFAULT. Nothing is written unless you pass --commit.
 * Idempotent: an email that already exists is skipped, so re-runs are safe.
 * This script NEVER sends email. Claim invites / password resets stay a
 * separate, deliberate action from the admin UI once you're ready to onboard.
 *
 * Usage:
 *   # Preview (no writes) — always do this first:
 *   node backend/scripts/import-mindbody-clients.mjs --file "C:/path/mindbody-clients.csv"
 *
 *   # Actually create the records:
 *   node backend/scripts/import-mindbody-clients.mjs --file "C:/path/mindbody-clients.csv" --commit
 *
 * Flags:
 *   --file <path>       (required) CSV to import
 *   --commit            perform writes (omit = dry run)
 *   --source <s>        clientSource: move_fitness (default) | external | swanstudios
 *   --no-notes          do NOT create the admin-only migration ClientNote
 *   --claim-tokens      generate + store a SWAN-XXXX claim token per client and
 *                       write the plaintext codes to the results file
 *                       (results file becomes sensitive — treat like a secret)
 *
 * Output: a "<input>.import-results.csv" next to the input file
 *         (rowNumber, email, status, userId, username, claimToken, message)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { initializeModelsCache } from '../models/index.mjs';
import sequelize from '../database.mjs';
import { generateClaimToken } from '../services/claimTokenService.mjs';

// ─────────────────────────────────────────────────────────────
// CLI args
// ─────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const getFlagValue = (name) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : null;
};
const FILE = getFlagValue('--file');
const COMMIT = argv.includes('--commit');
const CREATE_NOTES = !argv.includes('--no-notes');
const CLAIM_TOKENS = argv.includes('--claim-tokens');
const SOURCE = (getFlagValue('--source') || 'move_fitness').toLowerCase();

const VALID_SOURCES = ['move_fitness', 'external', 'swanstudios'];
const NON_DEDUCTING = new Set(['move_fitness', 'external']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// User-model-native CSV columns (mapped straight onto User.create()).
const USER_FIELDS = [
  'firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'gender',
  'weight', 'height', 'fitnessGoal', 'trainingExperience',
  'healthConcerns', 'emergencyContact', 'availableSessions',
];
// MindBody-only columns with no home on User → preserved in a ClientNote.
const NOTE_FIELDS = [
  ['mindbodyId', 'MindBody ID'],
  ['addressStreet', 'Address'],
  ['addressCity', 'City'],
  ['addressState', 'State'],
  ['addressZip', 'Zip'],
  ['referralSource', 'Referral source'],
  ['clientSince', 'Client since'],
  ['lastVisit', 'Last visit'],
  ['membershipSummary', 'Membership'],
  ['accountBalance', 'Account balance'],
  ['waiverSigned', 'Waiver signed'],
];
const NUMERIC_FIELDS = new Set(['weight', 'height', 'availableSessions']);

// ─────────────────────────────────────────────────────────────
// RFC-4180 CSV parser (handles quoted fields, embedded commas/quotes/newlines).
// ─────────────────────────────────────────────────────────────
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else { field += c; }
      continue;
    }
    if (c === '"') { inQuotes = true; }
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\r') { /* ignore */ }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else { field += c; }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

const csvEscape = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// ─────────────────────────────────────────────────────────────
// Row helpers
// ─────────────────────────────────────────────────────────────
function buildRowObject(headers, cells) {
  const obj = {};
  headers.forEach((h, idx) => { obj[h] = (cells[idx] ?? '').trim(); });
  return obj;
}

function normalizeDateOnly(raw) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw; // already ISO
  const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // MM/DD/YYYY
  if (us) {
    const [, mm, dd, yyyy] = us;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return null;
}

function toUserPayload(row) {
  const payload = {};
  for (const field of USER_FIELDS) {
    const raw = row[field];
    if (raw === undefined || raw === '') continue;
    if (NUMERIC_FIELDS.has(field)) {
      const n = Number(raw);
      if (Number.isFinite(n)) payload[field] = n;
      continue;
    }
    if (field === 'dateOfBirth') {
      // DATEONLY needs YYYY-MM-DD. Accept ISO as-is; reformat US MM/DD/YYYY
      // deterministically (no Date() tz math); drop anything else.
      const iso = normalizeDateOnly(raw);
      if (iso) payload.dateOfBirth = iso;
      continue;
    }
    payload[field] = raw;
  }
  return payload;
}

function buildMigrationNote(row) {
  const lines = ['Migrated from MindBody.'];
  for (const [key, label] of NOTE_FIELDS) {
    const v = row[key];
    if (v) lines.push(`${label}: ${v}`);
  }
  return lines.length > 1 ? lines.join('\n') : null;
}

async function generateUniqueUsername(User, email, transaction) {
  const base = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_').slice(0, 24) || 'client';
  for (let attempt = 0; attempt < 6; attempt++) {
    const username = `${base}_${crypto.randomBytes(4).toString('hex')}`;
    const clash = await User.findOne({ where: { username }, transaction, attributes: ['id'] });
    if (!clash) return username;
  }
  throw new Error('could not generate a unique username after 6 attempts');
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────
async function main() {
  if (!FILE) {
    console.error('ERROR: --file <path.csv> is required.');
    process.exit(1);
  }
  if (!VALID_SOURCES.includes(SOURCE)) {
    console.error(`ERROR: --source must be one of ${VALID_SOURCES.join(', ')}`);
    process.exit(1);
  }
  const absFile = path.resolve(FILE);
  if (!fs.existsSync(absFile)) {
    console.error(`ERROR: file not found: ${absFile}`);
    process.exit(1);
  }

  console.log(`\n[MindBody Import] ${COMMIT ? 'COMMIT (writing)' : 'DRY RUN (no writes)'}`);
  console.log(`[MindBody Import] file=${absFile}`);
  console.log(`[MindBody Import] source=${SOURCE}  notes=${CREATE_NOTES}  claimTokens=${CLAIM_TOKENS}\n`);

  const parsed = parseCsv(fs.readFileSync(absFile, 'utf8'));
  if (parsed.length < 2) {
    console.error('ERROR: CSV has no data rows (need a header row + at least one client).');
    process.exit(1);
  }
  const headers = parsed[0].map((h) => h.trim());
  const dataRows = parsed.slice(1);

  // Fail loud if the three required columns are absent.
  for (const req of ['firstName', 'lastName', 'email']) {
    if (!headers.includes(req)) {
      console.error(`ERROR: required column "${req}" missing from CSV header. Found: ${headers.join(', ')}`);
      process.exit(1);
    }
  }

  await sequelize.authenticate();
  const models = await initializeModelsCache();
  const { User, ClientProgress, ClientNote } = models;
  if (!User) { console.error('ERROR: User model not available.'); process.exit(1); }

  const clientProgressExists = await tableExists('client_progress');
  const clientNotesExists = CREATE_NOTES && await tableExists('client_notes');

  const seenEmails = new Set();
  const results = [];
  let created = 0, skipped = 0, failed = 0;

  for (let idx = 0; idx < dataRows.length; idx++) {
    const rowNum = idx + 2; // 1-based + header row
    const row = buildRowObject(headers, dataRows[idx]);
    const email = (row.email || '').trim().toLowerCase();
    const record = { rowNum, email, status: '', userId: '', username: '', claimToken: '', message: '' };

    try {
      if (!row.firstName || !row.lastName) throw new Error('missing firstName/lastName');
      if (!EMAIL_PATTERN.test(email)) throw new Error(`invalid email "${row.email}"`);
      if (seenEmails.has(email)) { record.status = 'skipped_duplicate_in_file'; skipped++; results.push(record); continue; }
      seenEmails.add(email);

      const existing = await User.findOne({ where: { email: { [Op.iLike]: email } }, attributes: ['id'] });
      if (existing) {
        record.status = 'skipped_exists';
        record.userId = existing.id;
        record.message = 'email already in Users';
        skipped++; results.push(record); continue;
      }

      const payload = toUserPayload(row);
      payload.email = email;
      payload.role = 'client';
      payload.isActive = true;
      payload.clientSource = SOURCE;
      payload.accountStatus = 'stub';
      payload.forcePasswordChange = true;
      if (NON_DEDUCTING.has(SOURCE)) payload.availableSessions = 0;

      const noteContent = clientNotesExists ? buildMigrationNote(row) : null;

      if (!COMMIT) {
        record.status = 'would_create';
        record.username = `${email.split('@')[0]}_<generated>`;
        record.message = noteContent ? 'with migration note' : '';
        created++; // count previews so the dry-run summary is accurate
        results.push(record);
        continue;
      }

      // ── Write path (per-client transaction, mirrors createExternalClient) ──
      const tx = await sequelize.transaction();
      try {
        payload.username = await generateUniqueUsername(User, email, tx);
        payload.password = crypto.randomBytes(24).toString('base64url') + '!A1';

        let plainToken = '';
        if (CLAIM_TOKENS) {
          const token = generateClaimToken();
          payload.claimTokenHash = token.hash;
          payload.claimTokenExpires = token.expires;
          plainToken = token.plainToken;
        }

        const newClient = await User.create(payload, { transaction: tx });

        if (clientProgressExists && ClientProgress) {
          await ClientProgress.create({ userId: newClient.id }, { transaction: tx });
        }

        await tx.commit();
        record.status = 'created';
        record.userId = newClient.id;
        record.username = newClient.username;
        record.claimToken = plainToken;
        created++;
        results.push(record);

        // Migration note is best-effort AFTER commit — a note failure (e.g. FK
        // quirk) must never roll back an otherwise-valid client.
        if (noteContent && ClientNote) {
          try {
            await ClientNote.create({
              userId: newClient.id,
              noteType: 'general',
              visibility: 'admin_only',
              content: noteContent,
            });
          } catch (noteErr) {
            record.message = `client created; migration note failed: ${noteErr.message}`;
          }
        }
      } catch (writeErr) {
        await tx.rollback();
        throw writeErr;
      }
    } catch (err) {
      record.status = 'failed';
      record.message = err.message;
      failed++;
      results.push(record);
      console.error(`  row ${rowNum} (${email || 'no-email'}): FAILED — ${err.message}`);
    }
  }

  // ── Results file (next to input) ──
  const resultsPath = absFile.replace(/\.csv$/i, '') + '.import-results.csv';
  const resultHeader = ['rowNumber', 'email', 'status', 'userId', 'username', 'claimToken', 'message'];
  const resultsCsv = [
    resultHeader.join(','),
    ...results.map((r) => [r.rowNum, r.email, r.status, r.userId, r.username, r.claimToken, r.message].map(csvEscape).join(',')),
  ].join('\n');
  fs.writeFileSync(resultsPath, resultsCsv, 'utf8');

  console.log(`\n[MindBody Import] ${COMMIT ? 'created' : 'would create'}: ${created}   skipped: ${skipped}   failed: ${failed}`);
  console.log(`[MindBody Import] results written: ${resultsPath}`);
  if (CLAIM_TOKENS && COMMIT) {
    console.log('[MindBody Import] ⚠ results file contains plaintext claim codes — treat it as sensitive (do not commit / share).');
  }
  if (!COMMIT) {
    console.log('[MindBody Import] DRY RUN — re-run with --commit to actually create these clients.\n');
  }

  await sequelize.close();
  // Dry run is a preview — always exit 0 unless a fatal error was thrown.
  process.exit(COMMIT && failed > 0 && created === 0 ? 1 : 0);
}

async function tableExists(name) {
  try {
    const [res] = await sequelize.query(`SELECT to_regclass(:t) AS exists`, { replacements: { t: name } });
    return Boolean(res?.[0]?.exists);
  } catch {
    return false;
  }
}

main().catch((err) => {
  console.error('[MindBody Import] FATAL:', err.message);
  process.exit(1);
});
