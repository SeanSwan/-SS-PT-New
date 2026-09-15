#!/usr/bin/env node
/**
 * S17 anchor-slug probe.
 *
 * 51 in-scope failures are same-document anchors like `#overview` while the
 * heading is `## 📚 OVERVIEW`. Establish what slug the checker actually computes
 * for emoji-prefixed headings, so the repair targets the real anchor instead of
 * a guess. Read-only.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const markdownLinkCheck = promisify(require('markdown-link-check'));

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's17-anchor-'));
const file = path.join(dir, 'probe.md');
const markdown = `# Title

## 📚 OVERVIEW

## 🎨 DESIGN PRINCIPLES

## Plain Heading

- [a](#overview)
- [b](#-overview)
- [c](#design-principles)
- [d](#-design-principles)
- [e](#plain-heading)

## 2. Chart Data Pipeline

- [f](#2-chart-data-pipeline)
- [g](#chart-data-pipeline)
`;
fs.writeFileSync(file, markdown);

const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), '.github', 'markdown-link-check-config.json'), 'utf8'));
const opts = {
  ...config,
  projectBaseUrl: `file:///${process.cwd().replace(/\\/g, '/')}`,
  baseUrl: process.platform === 'win32' ? `file://${dir.replace(/\\/g, '/')}` : `file://${dir}`,
  quiet: true,
};

const results = await markdownLinkCheck(markdown, opts);
for (const r of results) console.log(`${String(r.status).padEnd(6)} ${r.link}`);
fs.rmSync(dir, { recursive: true, force: true });
