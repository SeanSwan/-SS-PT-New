#!/usr/bin/env node
/** Install Sean-authorized Mega Blueprints adapters with verified pre-change copies.
 * Default is a dry run. --apply performs only enumerated user/repository writes.
 * Existing credentials/configuration are never printed or used for model calls.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyTargets, managed, mergeHooks, read, sha } from './install-lib.mjs';

const packageRoot = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1]; };
const home = resolve(option('--home') || homedir());
const repo = resolve(option('--repo') || join(packageRoot, '../..'));
const policy = readFileSync(join(packageRoot, 'POLICY.md'), 'utf8');
const targets = new Map();
const originals = new Map();
const capture = path => { if (!originals.has(path)) originals.set(path, read(path)); return originals.get(path); };
const text = path => capture(path)?.toString('utf8') || '';
function add(path, content) {
  const before = capture(path);
  targets.set(path, { path, content, expectedBefore: before ? sha(before) : null });
}
function instruction(path) { add(path, managed(text(path), policy)); }

for (const path of ['AGENTS.md', '.codex/AGENTS.md', '.claude/CLAUDE.md',
  '.gemini/GEMINI.md', '.copilot/copilot-instructions.md']) instruction(join(home, path));
add(join(home, '.agents/MAKEER-BLUEPRINTS.md'), policy);
for (const name of ['prompt-hook.mjs', 'reminder.txt', 'check-readiness.mjs']) {
  add(join(home, '.agents/build-protocol', name), readFileSync(join(packageRoot, name)));
}
for (const [adapter, path] of [['codex', '.codex/hooks.json'], ['claude', '.claude/settings.json']]) {
  const file = join(home, path);
  const command = `"${process.execPath.replaceAll('\\', '/')}" "${join(home, '.agents/build-protocol/prompt-hook.mjs').replaceAll('\\', '/')}" ${adapter}`;
  add(file, `${JSON.stringify(mergeHooks(JSON.parse(text(file) || '{}'), command, adapter === 'codex'), null, 2)}\n`);
}

// Existing editor versions have native global directories for these adapters.
add(join(home, '.roo/rules/00-makeer-blueprints.md'), policy);
add(join(home, '.continue/rules/00-makeer-blueprints.md'), `---\nname: Mega Blueprints\nalwaysApply: true\n---\n\n${policy}`);
const kiloPath = join(home, '.config/kilo/kilo.jsonc');
if (existsSync(kiloPath)) {
  const config = JSON.parse(text(kiloPath)); // Current installed file is valid JSON; fail closed on unsupported JSONC.
  const instructions = config.instructions ?? [];
  if (!Array.isArray(instructions)) throw Error('Kilo instructions is not an array.');
  const path = join(home, '.agents/MAKEER-BLUEPRINTS.md').replaceAll('\\', '/');
  config.instructions = [...new Set([...instructions, path])];
  add(kiloPath, `${JSON.stringify(config, null, 2)}\n`);
}

// Reuse the installed skill, retaining its snapshot tooling and artifact standard.
const source = join(home, '.codex/skills/non-vibe-coding');
if (!existsSync(join(source, 'SKILL.md'))) throw Error('Existing non-vibe-coding skill missing; inventory before installation.');
const skillFiles = new Map();
function collect(dir, prefix = '') {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) collect(join(dir, entry.name), name);
    else if (entry.isFile()) skillFiles.set(name, readFileSync(join(dir, entry.name)));
  }
}
collect(source);
let skill = skillFiles.get('SKILL.md').toString('utf8');
const frontmatter = skill.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
if (!frontmatter) throw Error('Skill frontmatter missing.');
const header = frontmatter[0].replace(/^description:.*$/m,
  'description: Automatically run Mega Blueprints for software builds, changes, planning, continuations, and blueprint audits, with the complete artifact and test evidence contract.');
let body = skill.slice(frontmatter[0].length).replace(/^(?:\r?\n)+/, '');
body = body.replace(/Skip formal artifact\r?\nexpansion for a truly local one-line correction unless the user explicitly\r?\nrequests this skill\./,
  'For small local corrections, account for the full checklist compactly and give\nexplicit applicability reasons; never silently skip the protocol.');
skillFiles.set('SKILL.md', `${header}\n${managed(body, policy)}`);
skillFiles.set('agents/openai.yaml', 'interface:\n  display_name: "Mega Blueprints"\n  short_description: "Complete build plans, tests, and evidence checks"\n  default_prompt: "Use $non-vibe-coding to run Mega Blueprints before building or audit an existing blueprint."\n\npolicy:\n  allow_implicit_invocation: true\n');
skillFiles.set('references/makeer-blueprints.md', policy);
skillFiles.set('references/receipt-format.md', readFileSync(join(packageRoot, 'receipt-format.md')));
skillFiles.set('scripts/check-readiness.mjs', readFileSync(join(packageRoot, 'check-readiness.mjs')));
for (const base of ['.codex', '.agents', '.claude']) {
  for (const [name, content] of skillFiles) add(join(home, base, 'skills/non-vibe-coding', name), content);
}

// The current repository's instructions also travel with its source checkout.
const claudePath = join(repo, 'CLAUDE.md');
const claude = managed(text(claudePath), policy);
add(claudePath, claude);
const agentsPath = join(repo, 'AGENTS.md');
const agents = text(agentsPath), marker = '--- project-doc mirror from CLAUDE.md ---';
if (!agents.includes(marker)) throw Error('Repository mirror marker missing.');
add(agentsPath, `${agents.slice(0, agents.indexOf(marker) + marker.length)}\n\n${claude}`);

// Cursor only has a documented UI setting for global User Rules. This rule
// covers this repository; do not claim it changes Cursor's global account state.
add(join(repo, '.cursor/rules/00-makeer-blueprints.mdc'),
  `---\ndescription: Automatic Mega Blueprints build and audit contract\nalwaysApply: true\n---\n\n${policy}`);
const copilot = join(repo, '.github/copilot-instructions.md');
instruction(copilot);
add(join(repo, '.continue/rules/00-makeer-blueprints.md'),
  `---\nname: Mega Blueprints\nalwaysApply: true\n---\n\n${policy}`);

const changes = [...targets.values()].filter(t => !read(t.path)?.equals(Buffer.from(t.content)));
if (!args.includes('--apply')) {
  process.stdout.write(`${JSON.stringify({ mode: 'DRY_RUN', changes: changes.map(t => ({ path: t.path,
    exists: existsSync(t.path), afterSha256: sha(t.content) })) }, null, 2)}\n`);
} else {
  const receipt = applyTargets([...targets.values()], {
    backupRoot: join(home, '.agents/backups/makeer-blueprints'), allowedRoots: [home, repo],
  });
  process.stdout.write(`${JSON.stringify({ mode: 'APPLIED', ...receipt })}\n`);
}
