#!/usr/bin/env node
/**
 * Reset a user's password by email lookup.
 *
 * Usage:
 *   node backend/scripts/reset-user-by-email.mjs <email> [<email> ...]
 *
 * Behavior:
 *   - Looks up each user by exact email match
 *   - Generates a strong random password
 *   - Passes plaintext to .update() so User.beforeUpdate hashes it ONCE
 *     (do NOT pre-hash here - causes double-hash + 401 on login)
 *   - Writes credentials (id, email, NEW password) to local file ONLY
 *
 * Rule 47 launcher discipline: output path is local Windows path; chat
 * gets a redacted summary only.
 *
 * Rule 8 (Zero PII to LLMs): emails + passwords go to file, never to stdout.
 */

import 'dotenv/config';
import { randomBytes } from 'crypto';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { initializeModelsCache, getModel } from '../models/index.mjs';

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help')) {
  console.log('Usage: node backend/scripts/reset-user-by-email.mjs <email> [<email> ...] [--out=path]');
  process.exit(1);
}

const outArg = args.find((a) => a.startsWith('--out='));
const outPath = outArg ? outArg.replace('--out=', '') : 'c:/tmp/sswan-test-creds.txt';
const emails = args.filter((a) => !a.startsWith('--'));

function generatePassword() {
  const raw = randomBytes(12).toString('base64').replace(/[+/=]/g, '');
  return raw + 'A1!';
}

async function main() {
  console.log(`\n[reset-user-by-email] target emails: ${emails.length}\n`);
  console.log(`[output file] ${outPath}`);
  console.log('[chat-safe] passwords + emails written to file, NOT printed to stdout\n');

  await initializeModelsCache();
  const User = getModel('User');

  const results = [];
  for (const email of emails) {
    const user = await User.findOne({
      where: { email },
      attributes: ['id', 'email', 'username', 'role', 'firstName', 'lastName'],
    });
    if (!user) {
      console.warn(`  [!] email not found - skipping (redacted)`);
      results.push({ email, status: 'NOT_FOUND' });
      continue;
    }

    const newPassword = generatePassword();
    // Pass plaintext to .update() - User.beforeUpdate hook hashes it.
    // Do NOT bcrypt here (causes double-hash + 401 on login).
    await user.update({ password: newPassword });

    console.log(`  [OK] reset user id=${user.id} role=${user.role} (creds written to file)`);
    results.push({
      id: user.id,
      role: user.role,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      newPassword,
    });
  }

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
      lines.push(`email=<not-found>`);
      continue;
    }
    lines.push(`id=${r.id} role=${r.role}`);
    lines.push(`  name:     ${(r.firstName || '') + ' ' + (r.lastName || '')}`.trimEnd());
    lines.push(`  username: ${r.username || '<none>'}`);
    lines.push(`  email:    ${r.email || '<none>'}`);
    lines.push(`  password: ${r.newPassword}`);
    lines.push(``);
  }
  writeFileSync(outPath, lines.join('\n'), 'utf8');

  const successCount = results.filter((r) => r.status !== 'NOT_FOUND').length;
  console.log(`\n[VERIFIED] ${successCount} of ${emails.length} user(s) had their password reset.`);
  console.log(`[file] ${outPath} - open locally for credentials.`);
  console.log(`[reminder] delete the file after smoke is complete.`);
  process.exit(successCount === emails.length ? 0 : 5);
}

main().catch((err) => {
  console.error(`\n[ERROR] ${err?.message || err}`);
  if (err?.stack) console.error(err.stack);
  process.exit(99);
});
