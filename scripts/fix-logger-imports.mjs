#!/usr/bin/env node
/**
 * fix-logger-imports.mjs
 * Repairs broken imports caused by migrate-console-to-logger.mjs injecting
 * `import { logger } from '@/utils/logger';` inside multi-line import blocks.
 *
 * The bug: the codemod detected `import {` as an import line and inserted
 * the logger import on the NEXT line, breaking the multi-line destructure.
 *
 * Fix: remove the misplaced logger import, find the correct insertion point
 * (after the last COMPLETE import statement), and re-insert it there.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative, extname } from 'path';

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT = join(process.cwd(), 'frontend', 'src');
const LOGGER_IMPORT = "import { logger } from '@/utils/logger';";

const SKIP_DIRS = new Set(['node_modules', '__tests__', 'test', '.git', 'dist']);
const SKIP_FILES = new Set(['logger.ts']);
const VALID_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx']);

let totalFixed = 0;

function walkDir(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...walkDir(full));
    } else if (VALID_EXTS.has(extname(entry)) && !SKIP_FILES.has(entry)) {
      files.push(full);
    }
  }
  return files;
}

function isInsideMultiLineImport(lines, loggerLineIndex) {
  // Walk backwards from the logger import line to see if we're inside an unclosed import { ... }
  let braceDepth = 0;
  for (let i = loggerLineIndex - 1; i >= 0; i--) {
    const line = lines[i];
    // Count closing braces (going backwards, a } means we found the end of a block)
    for (const ch of line) {
      if (ch === '}') braceDepth++;
      if (ch === '{') braceDepth--;
    }
    // If we hit a line that starts with 'import' and braceDepth < 0, we're inside a multi-line import
    if (braceDepth < 0 && /^\s*import\s/.test(line)) {
      return true;
    }
    // If braceDepth is 0 or positive and we hit a non-import, non-blank line, stop
    if (braceDepth >= 0 && line.trim() !== '' && !/^\s*import\s/.test(line) && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
      return false;
    }
  }
  return false;
}

function findLastCompleteImportIndex(lines) {
  // Find the index of the last line that completes an import statement
  let lastCompleteImport = -1;
  let inMultiLineImport = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (inMultiLineImport) {
      // Look for the closing of the multi-line import: `} from '...'`
      if (/\}\s*from\s+['"]/.test(lines[i])) {
        lastCompleteImport = i;
        inMultiLineImport = false;
      }
      continue;
    }

    // Single-line import: import ... from '...'  OR  import '...'
    if (/^\s*import\s/.test(lines[i])) {
      if (/from\s+['"]/.test(lines[i]) || /^import\s+['"]/.test(trimmed)) {
        // Check if it has an unclosed brace
        const openBraces = (lines[i].match(/\{/g) || []).length;
        const closeBraces = (lines[i].match(/\}/g) || []).length;
        if (openBraces > closeBraces) {
          inMultiLineImport = true;
        } else {
          lastCompleteImport = i;
        }
      } else {
        // Opening of multi-line import like `import {`
        const openBraces = (lines[i].match(/\{/g) || []).length;
        const closeBraces = (lines[i].match(/\}/g) || []).length;
        if (openBraces > closeBraces) {
          inMultiLineImport = true;
        }
      }
    }

    // Stop scanning once we're past the import block
    if (lastCompleteImport >= 0 && !inMultiLineImport &&
        trimmed !== '' && !trimmed.startsWith('import ') && !trimmed.startsWith('import{') &&
        !trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('/*') &&
        trimmed !== LOGGER_IMPORT) {
      break;
    }
  }

  return lastCompleteImport;
}

function fixFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');

  // Only process files that have the logger import
  if (!content.includes(LOGGER_IMPORT)) return false;

  const lines = content.split('\n');

  // Find the logger import line
  const loggerIndex = lines.findIndex(l => l.trim() === LOGGER_IMPORT);
  if (loggerIndex === -1) return false;

  // Check if it's inside a multi-line import
  if (!isInsideMultiLineImport(lines, loggerIndex)) return false;

  // Remove the misplaced logger import
  lines.splice(loggerIndex, 1);

  // Find the correct insertion point
  const insertAfter = findLastCompleteImportIndex(lines);
  if (insertAfter === -1) {
    console.warn(`  WARN: Could not find import block in ${relative(process.cwd(), filePath)}`);
    return false;
  }

  // Insert the logger import after the last complete import
  lines.splice(insertAfter + 1, 0, LOGGER_IMPORT);

  const newContent = lines.join('\n');

  if (!DRY_RUN) {
    writeFileSync(filePath, newContent, 'utf-8');
  }

  const rel = relative(process.cwd(), filePath);
  console.log(`  ${DRY_RUN ? '[DRY] ' : ''}FIXED: ${rel} (moved logger import from line ${loggerIndex + 1} to after line ${insertAfter + 1})`);
  totalFixed++;
  return true;
}

console.log(`\n🔧 Fix Logger Imports ${DRY_RUN ? '(DRY RUN)' : ''}`);
console.log(`   Root: ${ROOT}\n`);

const files = walkDir(ROOT);
console.log(`Scanning ${files.length} source files...\n`);

for (const f of files) {
  fixFile(f);
}

console.log(`\n✅ Fixed ${totalFixed} files.`);
if (DRY_RUN) {
  console.log('   (Dry run — no files were actually changed. Remove --dry-run to apply.)');
}
