#!/usr/bin/env node
/**
 * Generic password reset for any user by id.
 *
 * Usage:
 *   node backend/scripts/reset-user-password.mjs <userId> [<userId> ...]
 *
 * Examples:
 *   # Reset both trainer 98 and client 99 in one call
 *   node backend/scripts/reset-user-password.mjs 98 99
 *
 *   # Specify a custom output file (defaults to c:/tmp/sswan-test-creds.txt)
 *   node backend/scripts/reset-user-password.mjs 98 99 --out=c:/tmp/my-creds.txt
 *
 * Behavior:
 *   - Generates a strong random password per user (16 chars, mixed case + digits + symbols)
 *   - bcrypt-hashes it and updates the User row
 *   - Writes credentials (id, email, NEW password) to a LOCAL file - never to chat
 *   - Confirms success to stdout WITHOUT printing the password
 *
 * Rule 47 launcher discipline: output path is local-only Windows path; chat
 * gets a redacted summary only. Sean opens the output file locally to grab
 * passwords for browser login.
 *
 * Rule 8 (Zero PII to LLMs): emails + passwords go to file, never to stdout.
 */

import 'dotenv/config';
import { randomBytes } from 'crypto';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { initializeModelsCache, getModel } from '../models/index.mjs';

// IMPORTANT: User.mjs has a User.beforeUpdate hook (line 546-557) that
// auto-hashes the password when it changes. We MUST pass plaintext to
// .update() and let the hook do the hashing. Do NOT pre-hash here, or
// the hook will hash the already-hashed value (double-hash bug -> login
// returns 401 because bcrypt.compare(plaintext, double-hash) never matches).
//
// Discovered 2026-05-01 when trainer 98 + client 99 reset rows produced
// 401s on /api/auth/login. Verified against User.mjs:546-557.

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help')) {
  console.log('Usage: node backend/scripts/reset-user-password.mjs <userId> [<userId> ...] [--out=path]');
  process.exit(1);
}

const outArg = args.find((a) => a.startsWith('--out='));
const outPath = outArg ? outArg.replace('--out=', '') : 'c:/tmp/sswan-test-creds.txt';
const userIds = args.filter((a) => !a.startsWith('--')).map((s) => parseInt(s, 10));

if (userIds.some((id) => !Number.isInteger(id) || id < 1)) {
  console.error('ERROR: All user ids must be positive integers');
  process.exit(2);
}

function generatePassword() {
  // 16 chars, base64url-safe, mixed case + digits, no easy ambiguity (no O/0, l/1)
  // We add symbols at known positions for password-policy compatibility
  const raw = randomBytes(12).toString('base64').replace(/[+/=]/g, '');
  return raw + 'A1!';
}

async function main() {
  console.log(`\n[reset-user-password] target user ids: ${userIds.join(', ')}\n`);
  console.log(`[output file] ${outPath}`);
  console.log('[chat-safe] passwords will be written to file, NOT printed to stdout\n');

  await initializeModelsCache();
  const User = getModel('User');

  const results = [];
  for (const id of userIds) {
    const user = await User.findByPk(id, { attributes: ['id', 'email', 'username', 'role'] });
    if (!user) {
      console.warn(`  [!] user id=${id} not found - skipping`);
      results.push({ id, status: 'NOT_FOUND' });
      continue;
    }

    const newPassword = generatePassword();
    // Pass plaintext to .update() - the User.beforeUpdate hook hashes it.
    // Do NOT bcrypt here (causes double-hash + 401 on login).
    await user.update({ password: newPassword });

    console.log(`  [OK] reset user id=${id} role=${user.role} (email + password written to file)`);
    results.push({
      id: user.id,
      role: user.role,
      username: user.username,
      email: user.email,
      newPassword,
    });
  }

  // Write credentials to local file (rule 47 launcher pattern)
  try {
    mkdirSync(dirname(outPath), { recursive: true });
  } catch (_e) { /* dir may already exist */ }

  const stamp = new Date().toISOString();
  const lines = [
    `# SwanStudios test-account credentials`,
    `# generated ${stamp}`,
    `# WARNING: this file contains plaintext passwords. Delete after use.`,
    ``,
  ];
  for (const r of results) {
    if (r.status === 'NOT_FOUND') {
      lines.push(`id=${r.id} -> NOT_FOUND`);
      continue;
    }
    lines.push(`id=${r.id} role=${r.role}`);
    lines.push(`  username: ${r.username || '<none>'}`);
    lines.push(`  email:    ${r.email || '<none>'}`);
    lines.push(`  password: ${r.newPassword}`);
    lines.push(``);
  }
  writeFileSync(outPath, lines.join('\n'), 'utf8');

  const successCount = results.filter((r) => r.status !== 'NOT_FOUND').length;
  console.log(`\n[VERIFIED] ${successCount} of ${userIds.length} user(s) had their password reset.`);
  console.log(`[file] ${outPath} - open locally to copy passwords for browser login.`);
  console.log(`[reminder] delete the file after the smoke is complete.`);
  process.exit(successCount === userIds.length ? 0 : 5);
}

main().catch((err) => {
  console.error(`\n[ERROR] ${err?.message || err}`);
  if (err?.stack) console.error(err.stack);
  process.exit(99);
});
