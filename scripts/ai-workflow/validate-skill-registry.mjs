/**
 * Skill Registry Validator
 * ========================
 * Enumerates the two repo-local skill surfaces from disk instead of trusting
 * hand-maintained counts. It validates portable entrypoint casing, canonical
 * folder/name identity, duplicate names, and meaningful YAML frontmatter.
 *
 * Usage:
 *   node scripts/ai-workflow/validate-skill-registry.mjs
 *   node scripts/ai-workflow/validate-skill-registry.mjs --json
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const roots = ['.claude/skills', '.agents/skills'];
const portableWorkflowSkills = new Set(['wayfinder', 'goal-contract', 'worktree-isolation', 'guided-setup']);

function unquote(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFrontmatter(text, source) {
  const normalized = text.replace(/^\uFEFF/, '').replaceAll('\r\n', '\n');
  if (!normalized.startsWith('---\n')) throw new Error(`${source}: missing YAML frontmatter`);
  const end = normalized.indexOf('\n---\n', 4);
  if (end === -1) throw new Error(`${source}: unterminated YAML frontmatter`);
  const lines = normalized.slice(4, end).split('\n');
  const values = {};

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, raw] = match;
    if (/^[>|][+-]?$/.test(raw)) {
      const chunks = [];
      while (index + 1 < lines.length) {
        const next = lines[index + 1];
        if (next === '') {
          chunks.push('');
          index += 1;
          continue;
        }
        const indented = next.match(/^\s+(.*)$/);
        if (!indented) break;
        chunks.push(indented[1]);
        index += 1;
      }
      values[key] = raw.startsWith('>')
        ? chunks.join(' ').replace(/\s+/g, ' ').trim()
        : chunks.join('\n').trim();
    } else {
      values[key] = unquote(raw);
    }
  }
  return values;
}

function inspectRoot(relativeRoot) {
  const absoluteRoot = resolve(repoRoot, relativeRoot);
  const entries = [];
  const errors = [];
  const directories = readdirSync(absoluteRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const directory of directories) {
    const names = readdirSync(join(absoluteRoot, directory.name));
    if (!names.includes('SKILL.md')) {
      const caseVariant = names.find((name) => name.toLowerCase() === 'skill.md');
      errors.push(`${relativeRoot}/${directory.name}: expected exact SKILL.md${caseVariant ? `, found ${caseVariant}` : ''}`);
      continue;
    }
    const relativePath = `${relativeRoot}/${directory.name}/SKILL.md`;
    try {
      const skillText = readFileSync(resolve(repoRoot, relativePath), 'utf8');
      const lineCount = skillText.replaceAll('\r\n', '\n').split('\n').length;
      if (portableWorkflowSkills.has(directory.name) && lineCount > 300) {
        errors.push(`${relativePath}: ${lineCount} lines exceeds the 300-line portable workflow skill budget`);
      }
      const metadata = parseFrontmatter(skillText, relativePath);
      if (!metadata.name) errors.push(`${relativePath}: missing frontmatter name`);
      if (!metadata.description || /^[>|][+-]?$/.test(metadata.description)) errors.push(`${relativePath}: missing meaningful frontmatter description`);
      if (metadata.name && metadata.name !== directory.name) {
        errors.push(`${relativePath}: frontmatter name ${metadata.name} does not match folder ${directory.name}`);
      }
      entries.push({ name: metadata.name ?? directory.name, folder: directory.name, path: relativePath, description: metadata.description ?? '' });
    } catch (error) {
      errors.push(error.message);
    }
  }
  return { root: relativeRoot, entries, errors };
}

/**
 * Set-equality between installed skills and the skills CLAUDE.md actually names.
 *
 * WHY: on 2026-08-14 the routing table advertised 23 skills while 42 were
 * installed — 43% invisible, including the very skills that prevent stale-copy
 * clobbers. It also routed to two skills that no longer existed under those
 * names. The table IS the router: a skill absent from it is a skill the agent
 * never reaches. This is the mechanism behind "my skills don't fire."
 *
 * Existence validation (the rest of this file) passed the whole time, because
 * existence is not advertisement. Prose is deliberately ignored — only the
 * NAME set is compared, so descriptions stay hand-written and useful.
 */
export function buildAdvertisingReport() {
  const errors = [];
  const constitution = resolve(repoRoot, 'CLAUDE.md');
  if (!existsSync(constitution)) return { errors: ['CLAUDE.md not found — cannot verify skill advertising'], undocumented: [], phantom: [] };
  const text = readFileSync(constitution, 'utf8');

  // Default-exposed skills are what MUST be advertised.
  const installed = inspectRoot(roots[0]).entries.map((e) => e.name);
  // But a routing target is only phantom if it exists in NEITHER root:
  // `.agents/skills` legitimately holds reference libraries the router loads
  // on demand (seedance-loop-prompt, frontend-design, ui-ux-pro-max). Comparing
  // against `.claude/skills` alone flags those as missing when they are fine.
  const installedSet = new Set([
    ...installed,
    ...inspectRoot(roots[1]).entries.map((e) => e.name),
  ]);
  // A skill is advertised if it appears as `name` in a table/prose reference.
  const advertised = new Set(
    [...text.matchAll(/`([a-z0-9][a-z0-9-]{2,})`/g)].map((m) => m[1]),
  );

  const undocumented = installed.filter((n) => !advertised.has(n)).sort();
  const phantom = [...advertised]
    .filter((n) => /^(seedance|swan|hermes|grill|closeout|canonical|repo-hygiene|prompt-watcher|attack|copy-tournament|skill-harvest|chromie|fable|dead-file|cross-env|test-delta|stale-check|agent-lane|lesson-recall|design-dialogue|linear-todo|cost-guard|goal-contract|guided-setup|worktree-isolation|wayfinder|create-with-context)/.test(n))
    .filter((n) => !installedSet.has(n) && !n.endsWith('.md') && !n.endsWith('.mjs'))
    .sort();

  for (const n of undocumented) errors.push(`skill "${n}" is installed but never named in CLAUDE.md — it is invisible to routing`);
  for (const n of phantom) errors.push(`CLAUDE.md routes to "${n}", which is not installed in .claude/skills/`);
  return { errors, undocumented, phantom };
}

export function buildSkillRegistryReport() {
  const inventory = roots.map(inspectRoot);
  const errors = inventory.flatMap((item) => item.errors);
  for (const item of inventory) {
    const seen = new Map();
    for (const entry of item.entries) {
      if (seen.has(entry.name)) errors.push(`${item.root}: duplicate canonical skill name ${entry.name} in ${seen.get(entry.name)} and ${entry.folder}`);
      else seen.set(entry.name, entry.folder);
    }
  }
  const claudeNames = new Set(inventory[0].entries.map((entry) => entry.name));
  const agentNames = new Set(inventory[1].entries.map((entry) => entry.name));
  const shared = [...claudeNames].filter((name) => agentNames.has(name)).sort();
  return {
    generatedFrom: 'filesystem',
    roots: Object.fromEntries(inventory.map((item) => [item.root, item.entries])),
    counts: Object.fromEntries(inventory.map((item) => [item.root, item.entries.length])),
    shared,
    errors,
  };
}

function main() {
  const report = buildSkillRegistryReport();
  // --check adds the advertising set-equality gate. Kept opt-in so the existing
  // entrypoint validation keeps its current contract for callers that rely on it.
  const ads = process.argv.includes('--check') ? buildAdvertisingReport() : { errors: [], undocumented: [], phantom: [] };
  if (process.argv.includes('--json')) console.log(JSON.stringify({ ...report, advertising: ads }, null, 2));
  else {
    for (const [root, entries] of Object.entries(report.roots)) console.log(`${root}: ${entries.length} valid skill entrypoints`);
    console.log(`shared names: ${report.shared.length}`);
    if (process.argv.includes('--check')) {
      console.log(`advertising: ${ads.undocumented.length} installed-but-undocumented, ${ads.phantom.length} documented-but-missing`);
    }
    const all = [...report.errors, ...ads.errors];
    if (all.length) {
      console.error('Skill registry validation failed:');
      for (const error of all) console.error(`- ${error}`);
      if (ads.errors.length) console.error('\nThe routing table IS the router — an unadvertised skill never fires. Add it to CLAUDE.md, then re-run.');
    } else console.log('OK: skill registry entrypoints and frontmatter are valid.');
  }
  process.exitCode = report.errors.length + ads.errors.length ? 1 : 0;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();