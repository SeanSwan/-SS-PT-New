/**
 * Swan Coach Cortex brain vault contract helper.
 *
 * Purpose: keep the behavior-neutral markdown brain complete enough for
 * Claude, Codex, ChatGPT, and future Hermes ingestion before runtime code
 * reads from it.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

export const COACH_BRAIN_ROOT = path.join(repoRoot, 'docs', 'ai-workflow', 'coach-brain');

export const COACH_BRAIN_REQUIRED_FILES = [
  'README.md',
  '00-cortex-contract.md',
  '01-sean-style-intake.md',
  '02-sean-training-doctrine.md',
  '03-nasm-swan-programming-rules.md',
  '04-guided-generation-flow.md',
  '05-client-output-privacy.md',
  '06-full-plan-pdf-contract.md',
  '07-implementation-roadmap.md',
  '08-joint-integrity-and-release.md',
  '09-brain-map-diagram.md',
];

function parseValue(rawValue) {
  const trimmed = String(rawValue || '').trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1).split(',').map((item) => item.trim()).filter(Boolean);
  }
  return trimmed.replace(/^['"]|['"]$/g, '');
}

export function parseFrontmatter(content, relativePath = 'unknown') {
  const normalizedContent = content.replace(/^\uFEFF/, '');
  if (!normalizedContent.startsWith('---\n')) {
    throw new Error(`${relativePath} is missing YAML frontmatter`);
  }

  const endIndex = normalizedContent.indexOf('\n---', 4);
  if (endIndex === -1) {
    throw new Error(`${relativePath} has unterminated YAML frontmatter`);
  }

  const rawFrontmatter = normalizedContent.slice(4, endIndex).trim();
  return rawFrontmatter.split('\n').reduce((acc, line) => {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return acc;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1);
    if (key) acc[key] = parseValue(value);
    return acc;
  }, {});
}

export function inspectCoachBrainVault(root = COACH_BRAIN_ROOT) {
  const missingFiles = COACH_BRAIN_REQUIRED_FILES.filter((relativePath) => (
    !fs.existsSync(path.join(root, relativePath))
  ));

  const files = COACH_BRAIN_REQUIRED_FILES
    .filter((relativePath) => !missingFiles.includes(relativePath))
    .map((relativePath) => {
      const absolutePath = path.join(root, relativePath);
      const content = fs.readFileSync(absolutePath, 'utf8');
      return {
        relativePath,
        absolutePath,
        content,
        frontmatter: parseFrontmatter(content, relativePath),
      };
    });

  return {
    root,
    missingFiles,
    files,
    byPath: new Map(files.map((file) => [file.relativePath, file])),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = inspectCoachBrainVault();
  if (result.missingFiles.length > 0) {
    console.error(`Missing coach-brain files: ${result.missingFiles.join(', ')}`);
    process.exitCode = 1;
  } else {
    console.log(`Coach brain contract OK: ${result.files.length} files in ${result.root}`);
  }
}
