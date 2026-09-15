#!/usr/bin/env node
/**
 * S17 engine probe.
 *
 * Before adopting markdown-link-check 3.14.2 as the CI engine, establish what it
 * actually does with two link classes the 3.13.7 the workflow used did not flag:
 * same-document anchors and mailto: addresses. If it fails VALID instances of
 * either, that is a false-positive class and must be handled as such rather than
 * "repaired" by mangling correct documentation.
 *
 * Read-only: writes nothing but stdout.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const markdownLinkCheck = promisify(require('markdown-link-check'));

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's17-probe-'));
const file = path.join(dir, 'probe.md');

const markdown = `# Probe

## Overview Section

- [valid anchor](#overview-section)
- [BROKEN anchor](#no-such-heading)
- [valid email](mailto:support@swanstudios.com)
- [valid-looking email](mailto:dev-team@swanstudios.com)
- [odd email](mailto:admin@swanstudios.dev)
- [placeholder email](mailto:testclient_...@test.com)
`;

fs.writeFileSync(file, markdown);

const configPath = path.join(process.cwd(), '.github', 'markdown-link-check-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const opts = {
  ignorePatterns: config.ignorePatterns,
  replacementPatterns: config.replacementPatterns,
  httpHeaders: config.httpHeaders,
  timeout: config.timeout,
  ignoreDisable: config.ignoreDisable,
  retryOn429: config.retryOn429,
  retryCount: config.retryCount,
  fallbackRetryDelay: config.fallbackRetryDelay,
  aliveStatusCodes: config.aliveStatusCodes,
  projectBaseUrl: `file:///${process.cwd().replace(/\\/g, '/')}`,
  baseUrl: process.platform === 'win32' ? `file://${dir.replace(/\\/g, '/')}` : `file://${dir}`,
  quiet: true,
};

const results = await markdownLinkCheck(markdown, opts);
console.log(`markdown-link-check ${require('markdown-link-check/package.json').version}\n`);
for (const r of results) {
  console.log(`${String(r.status).padEnd(8)} ${String(r.statusCode).padEnd(5)} ${r.link}${r.err ? `  <- ${r.err}` : ''}`);
}
fs.rmSync(dir, { recursive: true, force: true });
