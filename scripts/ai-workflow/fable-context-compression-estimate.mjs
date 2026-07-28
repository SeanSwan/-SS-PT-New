#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const TEXT_EXTENSIONS = new Set([
  '.md', '.mdx', '.txt', '.json', '.jsonl', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx',
  '.css', '.scss', '.html', '.yml', '.yaml', '.toml', '.xml', '.csv'
]);

const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next', 'coverage']);

const TIER_CONFIG = {
  high: { maxLongEdge: 2576, maxVisualTokens: 4784 },
  standard: { maxLongEdge: 1568, maxVisualTokens: 1568 }
};

const DEFAULTS = {
  tier: 'high',
  columns: 120,
  charWidthPx: 7,
  lineHeightPx: 14,
  paddingPx: 32,
  maxLinesPerImage: 90,
  charsPerTextToken: 4,
  minSavedTokens: 5000,
  minSavingsPercent: 30,
  maxFiles: 250,
  json: false
};

function usage() {
  return `Usage: node scripts/ai-workflow/fable-context-compression-estimate.mjs [options] <files-or-dirs...>

Options:
  --tier=high|standard          Claude image resolution tier to estimate (default: high)
  --columns=N                   Wrapped text columns per rendered page (default: 120)
  --char-width-px=N             Monospace character width estimate (default: 7)
  --line-height-px=N            Line height estimate (default: 14)
  --padding-px=N                Page padding estimate (default: 32)
  --max-lines-per-image=N       Wrapped lines per rendered image (default: 90)
  --chars-per-text-token=N      Approximate text-token divisor (default: 4)
  --min-saved-tokens=N          Pass threshold for absolute savings (default: 5000)
  --min-savings-percent=N       Pass threshold for percent savings (default: 30)
  --max-files=N                 Directory recursion safety cap (default: 250)
  --json                        Emit JSON only
  --self-test                   Run deterministic estimator checks

This script estimates only. It does not render images and does not call a model.`;
}

function parseArgs(argv) {
  const options = { ...DEFAULTS };
  const inputs = [];

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      return { help: true, options, inputs };
    }
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--self-test') {
      return { selfTest: true, options, inputs };
    }
    if (arg.startsWith('--')) {
      const [rawKey, rawValue = ''] = arg.slice(2).split('=');
      const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      if (!(key in options)) {
        throw new Error(`Unknown option: --${rawKey}`);
      }
      if (typeof DEFAULTS[key] === 'number') {
        const value = Number(rawValue);
        if (!Number.isFinite(value) || value <= 0) {
          throw new Error(`Option --${rawKey} must be a positive number`);
        }
        options[key] = value;
      } else {
        options[key] = rawValue;
      }
      continue;
    }
    inputs.push(arg);
  }

  if (!TIER_CONFIG[options.tier]) {
    throw new Error(`--tier must be one of: ${Object.keys(TIER_CONFIG).join(', ')}`);
  }

  return { help: false, selfTest: false, options, inputs };
}

async function collectFiles(inputs, options) {
  const files = [];

  async function visit(candidate) {
    if (files.length >= options.maxFiles) return;
    const absolute = path.resolve(candidate);
    const stat = await fs.stat(absolute);
    if (stat.isDirectory()) {
      const name = path.basename(absolute);
      if (SKIP_DIRS.has(name)) return;
      const entries = await fs.readdir(absolute, { withFileTypes: true });
      for (const entry of entries) {
        if (files.length >= options.maxFiles) break;
        await visit(path.join(absolute, entry.name));
      }
      return;
    }
    if (!stat.isFile()) return;
    if (!TEXT_EXTENSIONS.has(path.extname(absolute).toLowerCase())) return;
    files.push(absolute);
  }

  for (const input of inputs) {
    await visit(input);
  }

  return [...new Set(files)].sort();
}

function visualTokensForSize(widthPx, heightPx, tier) {
  const config = TIER_CONFIG[tier];
  const rawPatchTokens = Math.ceil(widthPx / 28) * Math.ceil(heightPx / 28);
  const longEdge = Math.max(widthPx, heightPx);
  const resized = longEdge > config.maxLongEdge || rawPatchTokens > config.maxVisualTokens;
  const visualTokens = Math.min(rawPatchTokens, config.maxVisualTokens);
  return { rawPatchTokens, visualTokens, resized };
}

function wrappedLineCount(text, columns) {
  if (text.length === 0) return 1;
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  return lines.reduce((total, line) => total + Math.max(1, Math.ceil(line.length / columns)), 0);
}

function estimateRenderedPages(text, options) {
  const wrappedLines = wrappedLineCount(text, options.columns);
  const pageCount = Math.max(1, Math.ceil(wrappedLines / options.maxLinesPerImage));
  const widthPx = Math.ceil(options.paddingPx * 2 + options.columns * options.charWidthPx);
  const pages = [];

  for (let index = 0; index < pageCount; index += 1) {
    const remainingLines = wrappedLines - index * options.maxLinesPerImage;
    const pageLines = Math.min(options.maxLinesPerImage, remainingLines);
    const heightPx = Math.ceil(options.paddingPx * 2 + pageLines * options.lineHeightPx);
    pages.push({ widthPx, heightPx, lineCount: pageLines, ...visualTokensForSize(widthPx, heightPx, options.tier) });
  }

  return { wrappedLines, pages };
}

function countSensitivePatternHits(text) {
  const patterns = [
    /\bsk-(?:live|test)?_[A-Za-z0-9_-]{16,}\b/g,
    /\brk_(?:live|test)_[A-Za-z0-9_-]{16,}\b/g,
    /\bwhsec_[A-Za-z0-9_-]{16,}\b/g,
    /\bAIza[0-9A-Za-z_-]{20,}\b/g,
    /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/g,
    /postgres(?:ql)?:\/\/[^\s'"<>]+/gi,
    /\bDATABASE_URL\s*=/g,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
  ];
  return patterns.reduce((total, pattern) => total + (text.match(pattern) || []).length, 0);
}

async function estimate(files, options) {
  const fileReports = [];
  let totalChars = 0;
  let totalTextTokens = 0;
  let totalImageTokens = 0;
  let totalPages = 0;
  let totalSensitiveHits = 0;
  let resizedPages = 0;

  for (const file of files) {
    const text = await fs.readFile(file, 'utf8');
    const chars = text.length;
    const textTokens = Math.ceil(chars / options.charsPerTextToken);
    const sensitiveHits = countSensitivePatternHits(text);
    const rendered = estimateRenderedPages(text, options);
    const imageTokens = rendered.pages.reduce((sum, page) => sum + page.visualTokens, 0);
    const pageCount = rendered.pages.length;
    const fileResizedPages = rendered.pages.filter((page) => page.resized).length;

    totalChars += chars;
    totalTextTokens += textTokens;
    totalImageTokens += imageTokens;
    totalPages += pageCount;
    totalSensitiveHits += sensitiveHits;
    resizedPages += fileResizedPages;

    fileReports.push({
      path: path.relative(process.cwd(), file),
      chars,
      approximateTextTokens: textTokens,
      wrappedLines: rendered.wrappedLines,
      imagePages: pageCount,
      visualTokens: imageTokens,
      sensitivePatternHits: sensitiveHits,
      resizedPages: fileResizedPages
    });
  }

  const savedTokens = totalTextTokens - totalImageTokens;
  const savingsPercent = totalTextTokens > 0 ? (savedTokens / totalTextTokens) * 100 : 0;
  const thresholdPassed = savedTokens >= options.minSavedTokens || savingsPercent >= options.minSavingsPercent;
  const decision = totalSensitiveHits === 0 && savedTokens > 0 && thresholdPassed ? 'use-image-context-candidate' : 'use-text-context';

  return {
    generatedAt: new Date().toISOString(),
    method: 'approximate text tokens = chars / charsPerTextToken; visual tokens = patch estimate capped by tier max; provider billing may vary after resizing',
    options,
    files: fileReports,
    totals: {
      files: files.length,
      chars: totalChars,
      approximateTextTokens: totalTextTokens,
      imagePages: totalPages,
      visualTokens: totalImageTokens,
      savedTokens,
      savingsPercent: Number(savingsPercent.toFixed(2)),
      sensitivePatternHits: totalSensitiveHits,
      resizedPages
    },
    warnings: buildWarnings(totalSensitiveHits, resizedPages, savedTokens, thresholdPassed),
    decision
  };
}

function buildWarnings(sensitiveHits, resizedPages, savedTokens, thresholdPassed) {
  const warnings = [];
  if (sensitiveHits > 0) {
    warnings.push('Sensitive-pattern hits found. Do not render or send this packet until sources are scrubbed. Raw matches are intentionally not printed.');
  }
  if (resizedPages > 0) {
    warnings.push('Some estimated pages exceed native image limits and may be downscaled. Reduce max lines, columns, or font size before relying on OCR.');
  }
  if (savedTokens <= 0) {
    warnings.push('Image estimate is not cheaper than approximate text. Keep this context as text.');
  } else if (!thresholdPassed) {
    warnings.push('Savings are positive but below the protocol threshold. Keep this context as text unless Fable specifically asks for visual context.');
  }
  return warnings;
}

function printHuman(report) {
  const { totals, options } = report;
  console.log('Fable Context Compression Estimate');
  console.log(`Tier: ${options.tier}`);
  console.log(`Files: ${totals.files}`);
  console.log(`Approx text tokens: ${totals.approximateTextTokens}`);
  console.log(`Estimated image pages: ${totals.imagePages}`);
  console.log(`Estimated visual tokens: ${totals.visualTokens}`);
  console.log(`Estimated savings: ${totals.savedTokens} tokens (${totals.savingsPercent}%)`);
  console.log(`Sensitive-pattern hits: ${totals.sensitivePatternHits}`);
  console.log(`Decision: ${report.decision}`);
  if (report.warnings.length > 0) {
    console.log('Warnings:');
    for (const warning of report.warnings) {
      console.log(`- ${warning}`);
    }
  }
  console.log('Largest sources:');
  for (const file of [...report.files].sort((a, b) => b.approximateTextTokens - a.approximateTextTokens).slice(0, 10)) {
    console.log(`- ${file.path}: text ${file.approximateTextTokens}, image ${file.visualTokens}, pages ${file.imagePages}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runSelfTest() {
  assert(visualTokensForSize(1000, 1000, 'high').visualTokens === 1296, '1000x1000 high estimate mismatch');
  assert(visualTokensForSize(3840, 2160, 'high').visualTokens === 4784, '4K high cap estimate mismatch');
  assert(wrappedLineCount('abc\n', 120) === 2, 'wrapped line count preserves trailing line');
  const rendered = estimateRenderedPages('a'.repeat(120 * 181), DEFAULTS);
  assert(rendered.pages.length === 3, 'page split estimate mismatch');
  console.log('self-test passed');
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.help) {
    console.log(usage());
    return;
  }
  if (parsed.selfTest) {
    runSelfTest();
    return;
  }
  if (parsed.inputs.length === 0) {
    throw new Error(`No files or directories provided.\n\n${usage()}`);
  }
  const files = await collectFiles(parsed.inputs, parsed.options);
  if (files.length === 0) {
    throw new Error('No supported text files found.');
  }
  const report = await estimate(files, parsed.options);
  if (parsed.options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHuman(report);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});