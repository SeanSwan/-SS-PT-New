#!/usr/bin/env node
/**
 * SwanStudios Render/payment preflight.
 *
 * Read-only by default. It verifies that render.yaml exposes the production
 * payment/env gates and, when --db is supplied, checks the live database for
 * duplicate payment idempotency keys before the unique-index migration runs.
 */

import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const backendRequire = createRequire(path.join(repoRoot, 'backend', 'package.json'));

const args = new Set(process.argv.slice(2));
const shouldCheckDb = args.has('--db');
const requireLocalEnv = args.has('--require-local-env');

const results = [];

function record(status, label, detail = '') {
  results.push({ status, label, detail });
  const prefix = status === 'pass' ? 'PASS' : status === 'warn' ? 'WARN' : 'FAIL';
  process.stdout.write(`${prefix} ${label}${detail ? ` - ${detail}` : ''}\n`);
}

function fail(label, detail) {
  record('fail', label, detail);
}

function warn(label, detail) {
  record('warn', label, detail);
}

function pass(label, detail) {
  record('pass', label, detail);
}

function readText(relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, 'utf8');
}

function parseEnvFile(relativePath) {
  const text = readText(relativePath);
  if (!text) return {};
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = value;
  }
  return env;
}

function mergedLocalEnv() {
  return {
    ...parseEnvFile('.env'),
    ...parseEnvFile('backend/.env'),
    ...process.env,
  };
}

function extractServiceBlock(renderYaml, serviceName) {
  const lines = renderYaml.split(/\r?\n/);
  const start = lines.findIndex((line) => line.match(new RegExp(`^\\s+name:\\s+${serviceName}\\s*$`)));
  if (start < 0) return '';

  let serviceStart = start;
  while (serviceStart > 0 && !lines[serviceStart].match(/^  - type:\s+/)) {
    serviceStart -= 1;
  }

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].match(/^  - type:\s+/)) {
      end = i;
      break;
    }
    if (lines[i].match(/^[a-zA-Z]+:/)) {
      end = i;
      break;
    }
  }

  return lines.slice(serviceStart, end).join('\n');
}

function extractEnvKeys(block) {
  return new Set(
    [...block.matchAll(/^\s*-\s+key:\s+([A-Z0-9_]+)\s*$/gm)]
      .map((match) => match[1])
  );
}

function checkRenderYaml() {
  const renderYaml = readText('render.yaml');
  if (!renderYaml) {
    fail('render.yaml exists', 'render.yaml is missing');
    return;
  }
  pass('render.yaml exists');

  const mainBlock = extractServiceBlock(renderYaml, 'swanstudios-main');
  const frontendBlock = extractServiceBlock(renderYaml, 'swanstudios-frontend');
  if (!mainBlock) fail('main Render service present', 'swanstudios-main block not found');
  else pass('main Render service present');
  if (!frontendBlock) fail('frontend Render service present', 'swanstudios-frontend block not found');
  else pass('frontend Render service present');

  const mainRequired = [
    'NODE_ENV',
    'PORT',
    'FRONTEND_URL',
    'FRONTEND_ORIGINS',
    'DATABASE_URL',
    'JWT_SECRET',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'VITE_STRIPE_PUBLISHABLE_KEY',
    'ENCRYPTION_MASTER_KEY',
    'REDIS_URL',
    'USE_REDIS_SESSIONS',
    'SESSION_SECRET',
  ];
  const frontendRequired = [
    'VITE_API_URL',
    'VITE_API_BASE_URL',
    'VITE_BACKEND_URL',
    'VITE_SOCKET_URL',
    'VITE_STRIPE_PUBLISHABLE_KEY',
    'NODE_ENV',
  ];

  const mainKeys = extractEnvKeys(mainBlock);
  const frontendKeys = extractEnvKeys(frontendBlock);

  for (const key of mainRequired) {
    if (mainKeys.has(key)) pass(`main Render env includes ${key}`);
    else fail(`main Render env includes ${key}`, 'missing from swanstudios-main env list');
  }

  for (const key of frontendRequired) {
    if (frontendKeys.has(key)) pass(`frontend Render env includes ${key}`);
    else fail(`frontend Render env includes ${key}`, 'missing from swanstudios-frontend env list');
  }

  if (mainBlock.includes('npm run migrate:production')) {
    pass('main Render build runs production migration');
  } else {
    fail('main Render build runs production migration', 'buildCommand does not include npm run migrate:production');
  }

  if (mainBlock.includes('startCommand: cd backend && npm start')) {
    pass('main Render start command uses backend npm start');
  } else {
    fail('main Render start command uses backend npm start', 'unexpected startCommand');
  }
}

function checkLocalEnvShape() {
  const env = mergedLocalEnv();
  const required = [
    ['STRIPE_SECRET_KEY', /^(sk|rk)_(test|live)_/],
    ['STRIPE_WEBHOOK_SECRET', /^whsec_/],
    ['VITE_STRIPE_PUBLISHABLE_KEY', /^pk_(test|live)_/],
    ['DATABASE_URL', /^postgres(ql)?:\/\//],
  ];

  for (const [key, pattern] of required) {
    const value = env[key];
    if (!value) {
      const message = 'not set in process env, .env, or backend/.env';
      if (requireLocalEnv) fail(`local env ${key}`, message);
      else warn(`local env ${key}`, message);
      continue;
    }

    if (!pattern.test(value)) {
      fail(`local env ${key}`, 'value is present but has an unexpected format');
    } else {
      pass(`local env ${key}`, `present (${value.length} chars, value redacted)`);
    }
  }
}

async function tableColumnExists(client, tableName, columnName) {
  const result = await client.query(
    `
      SELECT COUNT(*)::int AS count
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
    `,
    [tableName, columnName]
  );
  return result.rows[0]?.count > 0;
}

async function indexExists(client, indexName) {
  const result = await client.query(
    `
      SELECT COUNT(*)::int AS count
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = $1
    `,
    [indexName]
  );
  return result.rows[0]?.count > 0;
}

async function duplicateKeys(client, tableName, columnName) {
  const result = await client.query(`
    SELECT "${columnName}" AS key, COUNT(*)::int AS count
    FROM "${tableName}"
    WHERE "${columnName}" IS NOT NULL
    GROUP BY "${columnName}"
    HAVING COUNT(*) > 1
    LIMIT 10
  `);
  return result.rows;
}

function describeDuplicateRows(rows) {
  return rows
    .map((row) => `<redacted-key:${String(row.key).length}> x${row.count}`)
    .join(', ');
}

async function checkDatabase() {
  const env = mergedLocalEnv();
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    fail('database duplicate preflight', 'DATABASE_URL is not set');
    return;
  }

  const { Client } = backendRequire('pg');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    pass('database connection', 'connected with DATABASE_URL (value redacted)');

    const checks = [
      {
        table: 'orders',
        column: 'idempotencyKey',
        index: 'idx_orders_idempotency_key',
      },
      {
        table: 'print_orders',
        column: 'idempotency_key',
        index: 'idx_print_orders_idempotency_key',
      },
    ];

    for (const check of checks) {
      const columnExists = await tableColumnExists(client, check.table, check.column);
      if (!columnExists) {
        warn(`${check.table}.${check.column}`, 'column not present yet; migration may add it');
        continue;
      }

      const duplicates = await duplicateKeys(client, check.table, check.column);
      if (duplicates.length) {
        fail(
          `${check.table}.${check.column} duplicate check`,
          describeDuplicateRows(duplicates)
        );
      } else {
        pass(`${check.table}.${check.column} duplicate check`, 'no duplicates found');
      }

      if (await indexExists(client, check.index)) {
        pass(`database index ${check.index}`, 'already present');
      } else {
        warn(`database index ${check.index}`, 'not present yet; expected before migration lands');
      }
    }
  } finally {
    await client.end();
  }
}

async function main() {
  process.stdout.write('SwanStudios Render/payment preflight\n');
  process.stdout.write('Mode: read-only checks' + (shouldCheckDb ? ' + database duplicate probe' : '') + '\n\n');

  checkRenderYaml();
  process.stdout.write('\n');
  checkLocalEnvShape();

  if (shouldCheckDb) {
    process.stdout.write('\n');
    await checkDatabase();
  } else {
    warn('database duplicate preflight', 'skipped; rerun with --db when DATABASE_URL is available');
  }

  const failures = results.filter((result) => result.status === 'fail');
  const warnings = results.filter((result) => result.status === 'warn');
  process.stdout.write(`\nSummary: ${failures.length} failure(s), ${warnings.length} warning(s)\n`);
  process.exit(failures.length ? 1 : 0);
}

main().catch((error) => {
  process.stderr.write(`FAIL preflight crashed - ${error.message}\n`);
  process.exit(1);
});
