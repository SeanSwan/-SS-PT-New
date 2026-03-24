#!/usr/bin/env node
/**
 * migrate-console-to-logger.mjs
 * Automated codemod: replaces console.log/console.warn with logger.log/logger.warn
 * in frontend source files. Preserves console.error (always prints in prod).
 *
 * Usage: node scripts/migrate-console-to-logger.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative, extname } from 'path';

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT = join(process.cwd(), 'frontend', 'src');
const LOGGER_IMPORT = "import { logger } from '@/utils/logger';";

// Files/dirs to skip
const SKIP_DIRS = new Set(['node_modules', '__tests__', 'test', '.git', 'dist']);
const SKIP_FILES = new Set([
  'logger.ts', // Don't modify the logger itself
  'vite-env.d.ts',
]);
// Only process .ts, .tsx, .js, .jsx
const VALID_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx']);

// Patterns that should NOT be replaced (inside strings, comments referencing console)
// We'll do a simple line-by-line replacement to avoid breaking strings

let totalFilesModified = 0;
let totalReplacements = 0;

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

function migrateFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let modified = false;
  let replacements = 0;

  const newLines = lines.map((line) => {
    // Skip lines that are inside string literals (rough heuristic: line starts with quote or template)
    const trimmed = line.trim();

    // Skip comment-only lines
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      return line;
    }

    // Skip lines where console.log is inside a string (contains quotes around it)
    if (trimmed.includes("'console.") || trimmed.includes('"console.')) {
      return line;
    }

    let newLine = line;

    // Replace console.log → logger.log
    if (newLine.includes('console.log')) {
      newLine = newLine.replace(/\bconsole\.log\b/g, 'logger.log');
      if (newLine !== line) {
        replacements++;
        modified = true;
      }
    }

    // Replace console.warn → logger.warn
    if (newLine.includes('console.warn')) {
      newLine = newLine.replace(/\bconsole\.warn\b/g, 'logger.warn');
      if (newLine !== line) {
        replacements++;
        modified = true;
      }
    }

    // Keep console.error as-is (should always print)

    return newLine;
  });

  if (!modified) return 0;

  let newContent = newLines.join('\n');

  // Add logger import if not already present
  if (!newContent.includes("from '@/utils/logger'") &&
      !newContent.includes('from "@/utils/logger"') &&
      !newContent.includes("from '../../utils/logger'") &&
      !newContent.includes("from '../utils/logger'")) {
    // Find the last import line and add after it
    const importLines = newContent.split('\n');
    let lastImportIndex = -1;
    for (let i = 0; i < importLines.length; i++) {
      if (importLines[i].trim().startsWith('import ') || importLines[i].trim().startsWith('} from ')) {
        lastImportIndex = i;
      }
      // Stop scanning after hitting non-import code (past the import block)
      if (lastImportIndex >= 0 && !importLines[i].trim().startsWith('import ') &&
          !importLines[i].trim().startsWith('} from ') &&
          !importLines[i].trim().startsWith('//') &&
          !importLines[i].trim().startsWith('*') &&
          !importLines[i].trim().startsWith('/*') &&
          importLines[i].trim() !== '') {
        break;
      }
    }

    if (lastImportIndex >= 0) {
      importLines.splice(lastImportIndex + 1, 0, LOGGER_IMPORT);
      newContent = importLines.join('\n');
    }
  }

  if (!DRY_RUN) {
    writeFileSync(filePath, newContent, 'utf-8');
  }

  const rel = relative(process.cwd(), filePath);
  console.log(`  ${DRY_RUN ? '[DRY] ' : ''}${rel}: ${replacements} replacements`);
  totalReplacements += replacements;
  totalFilesModified++;

  return replacements;
}

console.log(`\n🔄 Console → Logger Migration ${DRY_RUN ? '(DRY RUN)' : ''}`);
console.log(`   Root: ${ROOT}\n`);

const files = walkDir(ROOT);
console.log(`Found ${files.length} source files to scan.\n`);

for (const f of files) {
  migrateFile(f);
}

console.log(`\n✅ Done! Modified ${totalFilesModified} files with ${totalReplacements} total replacements.`);
if (DRY_RUN) {
  console.log('   (Dry run — no files were actually changed. Remove --dry-run to apply.)');
}
