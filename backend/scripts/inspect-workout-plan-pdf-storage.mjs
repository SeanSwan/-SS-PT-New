#!/usr/bin/env node
/**
 * FILE: inspect-workout-plan-pdf-storage.mjs
 * PURPOSE: Diagnose why workout-plan PDFs fail to display/download in production.
 *
 * READ-ONLY. SELECT statements only. No writes, no mutations, no secrets echoed.
 * Output is PII-free by construction: plan UUIDs, storage enums, booleans, counts.
 * Plan titles and client names are never selected.
 *
 * Tests the two live hypotheses from the 2026-08-10 PDF forensics pass:
 *   H1: metadata.planPdf.storage === 'local'  -> 503 in production
 *       (workoutPlanPdfContentService.mjs:44 gates local storage off in prod)
 *   H2: storageKey does not match the plan id -> 404 "PDF is not available"
 *       (workoutPlanPdfContentService.mjs:95)
 *   H3: no planPdf metadata at all            -> 404 (derivative never generated)
 */

import 'dotenv/config';
import sequelize from '../database.mjs';

// --- Match rule mirrored verbatim from services/workoutPlanPdfKeyService.mjs ---
const WORKOUT_PLAN_PDF_PREFIX = 'workout-plans/';

const slugifySegment = (value, fallback) => {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
  return slug || fallback;
};

const normalizeStorageKey = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const key = value.trim().replace(/^\/+/, '');
  if (
    !key.startsWith(WORKOUT_PLAN_PDF_PREFIX)
    || !/\.pdf$/i.test(key)
    || /[\0\r\n\t]/.test(key)
    || key.includes('\\')
    || key.split('/').some((part) => part === '..' || part === '')
  ) {
    return null;
  }
  return key;
};

const storageKeyMatchesPlan = (storageKey, planId) => {
  const key = normalizeStorageKey(storageKey);
  if (!key || planId === undefined || planId === null || String(planId).trim() === '') return false;
  const planSegment = slugifySegment(planId, 'plan');
  const fileName = key.split('/').pop() || '';
  return fileName === `${planSegment}.pdf` || fileName.startsWith(`${planSegment}-`);
};

// --- Diagnosis ---
const diagnose = (plan) => {
  const metadata = plan.metadata || {};
  const planPdf = metadata.planPdf || metadata.pdfFile || null;

  if (!planPdf) return { verdict: 'NO_PDF_METADATA', detail: '404 — derivative never generated' };

  const rawKey = planPdf.storageKey;
  const normalized = normalizeStorageKey(rawKey);
  if (!normalized) return { verdict: 'BAD_STORAGE_KEY', detail: '404 — key fails normalization' };

  if (!storageKeyMatchesPlan(rawKey, plan.id)) {
    return { verdict: 'KEY_PLAN_MISMATCH', detail: '404 — key does not match plan id (H2)' };
  }

  const storage = planPdf.storage === 'r2' ? 'r2' : 'local';
  if (storage === 'local') {
    return { verdict: 'LOCAL_STORAGE', detail: '503 in production — local disabled (H1)' };
  }

  return { verdict: 'OK_R2', detail: 'should serve — investigate R2 config/auth if still failing' };
};

async function main() {
  await sequelize.authenticate();
  console.log('connected (read-only diagnostic)\n');

  const [rows] = await sequelize.query(`
    SELECT id, metadata, status, "createdAt", "updatedAt"
    FROM workout_plans
    ORDER BY "updatedAt" DESC NULLS LAST
    LIMIT 60
  `);

  console.log(`inspected ${rows.length} most-recently-updated plans\n`);

  const tally = new Map();
  const lines = [];

  for (const plan of rows) {
    const { verdict, detail } = diagnose(plan);
    tally.set(verdict, (tally.get(verdict) || 0) + 1);
    const planPdf = (plan.metadata || {}).planPdf || (plan.metadata || {}).pdfFile || null;
    lines.push({
      id: String(plan.id).slice(0, 8),
      status: plan.status,
      storage: planPdf ? (planPdf.storage || '(unset)') : '—',
      verdict,
      updated: plan.updatedAt ? String(plan.updatedAt).slice(0, 10) : '—',
      detail,
    });
  }

  console.log('VERDICT TALLY');
  for (const [verdict, count] of [...tally.entries()].sort((a, b) => b[1] - a[1])) {
    const pct = ((count / rows.length) * 100).toFixed(0);
    console.log(`  ${verdict.padEnd(20)} ${String(count).padStart(3)}  (${pct}%)`);
  }

  console.log('\nPER-PLAN (most recent 25, PII-free)');
  console.log(`  ${'plan'.padEnd(10)}${'status'.padEnd(11)}${'storage'.padEnd(10)}${'updated'.padEnd(12)}verdict`);
  for (const l of lines.slice(0, 25)) {
    console.log(`  ${l.id.padEnd(10)}${String(l.status).padEnd(11)}${String(l.storage).padEnd(10)}${l.updated.padEnd(12)}${l.verdict}`);
  }

  const serveable = tally.get('OK_R2') || 0;
  console.log('\nBOTTOM LINE');
  if (serveable === 0) {
    console.log('  ZERO plans in this sample can serve a PDF in production.');
  } else {
    console.log(`  ${serveable}/${rows.length} plans should serve; ${rows.length - serveable} will fail.`);
  }

  const total = await sequelize.query(
    `SELECT COUNT(*)::int AS n FROM workout_plans`,
    { type: sequelize.QueryTypes.SELECT },
  );
  console.log(`  (total plans in table: ${total[0].n})`);

  await sequelize.close();
}

main().catch(async (error) => {
  console.error('diagnostic failed:', error.message);
  try { await sequelize.close(); } catch { /* already closed */ }
  process.exit(1);
});
