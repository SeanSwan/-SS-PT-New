import fs from 'fs';
import path from 'path';

const repo = process.cwd();
const exclude = new Set(['node_modules', '.git', 'dist', 'build', 'test-results']);
const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;

// Build index: filename -> absolute path (for all files in repo)
const fileIndex = new Map(); // basename -> [absPaths]
function indexFiles(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (exclude.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) { indexFiles(full); continue; }
    const base = ent.name;
    if (!fileIndex.has(base)) fileIndex.set(base, []);
    fileIndex.get(base).push(full);
  }
}
indexFiles(repo);

// Known file relocations (target basename -> correct absolute path)
const knownRelocations = {
  'SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md': path.join(repo, 'AI-Village-Documentation/SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md'),
  'PHASE-0-DESIGN-APPROVAL.md': path.join(repo, 'docs/ai-workflow/archive/phase-0/PHASE-0-DESIGN-APPROVAL.md'),
  'AI-ROLE-PROMPTS.md': path.join(repo, 'docs/ai-workflow/archive/old-versions/AI-ROLE-PROMPTS.md'),
  'DEVELOPMENT_GUIDE.md': path.join(repo, 'docs/current/DEVELOPMENT_GUIDE.md'),
  'FEATURE-TEMPLATE.md': path.join(repo, 'docs/ai-workflow/templates/FEATURE-TEMPLATE.md'),
  'GAMIFICATION-MASTER-PROMPT.md': path.join(repo, 'docs/ai-workflow/archive/old-versions/GAMIFICATION-MASTER-PROMPT.md'),
  'ENHANCED-PERSONAL-TRAINING-PROMPT.md': path.join(repo, 'docs/ai-workflow/archive/old-versions/ENHANCED-PERSONAL-TRAINING-PROMPT.md'),
  'DEPLOYMENT_CHECKLIST_REAL_STRIPE_ANALYTICS.md': path.join(repo, 'docs/current/deployment/DEPLOYMENT_CHECKLIST_REAL_STRIPE_ANALYTICS.md'),
  'DEPLOYMENT_COMMANDS.md': path.join(repo, 'docs/current/deployment/DEPLOYMENT_COMMANDS.md'),
  'STRIPE_DATA_VERIFICATION_GUIDE.md': path.join(repo, 'docs/current/guides/STRIPE_DATA_VERIFICATION_GUIDE.md'),
  'MOBILE_PWA_TESTING_GUIDE.md': path.join(repo, 'docs/current/guides/MOBILE_PWA_TESTING_GUIDE.md'),
};

// Stats
let fixed = 0;
let converted = 0;
let filesChanged = 0;

function processFile(filePath) {
  let text;
  try { text = fs.readFileSync(filePath, 'utf8'); } catch { return; }

  const fileDir = path.dirname(filePath);
  let changed = false;

  const newText = text.replace(linkRe, (match, label, target) => {
    const trimTarget = target.trim();

    // Skip external, anchor, and empty links
    if (!trimTarget || /^(http|https|mailto|tel|#|<)/.test(trimTarget)) return match;

    // Skip template/placeholder links
    if (trimTarget === 'url') {
      converted++;
      changed = true;
      return `${label} (\`${trimTarget}\`)`;
    }

    const clean = trimTarget.split('#')[0].split(' ')[0];
    if (!clean || clean.startsWith('[')) return match;

    // Check if target resolves correctly
    const resolved = path.resolve(fileDir, clean);
    if (fs.existsSync(resolved)) return match; // Link is fine

    // Try to fix: check known relocations first
    const basename = path.basename(clean);

    if (knownRelocations[basename]) {
      const correctAbs = knownRelocations[basename];
      if (fs.existsSync(correctAbs)) {
        const correctRel = path.relative(fileDir, correctAbs).split(path.sep).join('/');
        // Preserve any fragment
        const fragment = trimTarget.includes('#') ? '#' + trimTarget.split('#').slice(1).join('#') : '';
        fixed++;
        changed = true;
        return `[${label}](${correctRel}${fragment})`;
      }
    }

    // Try file index lookup
    if (fileIndex.has(basename)) {
      const candidates = fileIndex.get(basename);
      if (candidates.length === 1) {
        // Unambiguous match
        const correctRel = path.relative(fileDir, candidates[0]).split(path.sep).join('/');
        const fragment = trimTarget.includes('#') ? '#' + trimTarget.split('#').slice(1).join('#') : '';
        fixed++;
        changed = true;
        return `[${label}](${correctRel}${fragment})`;
      }
      // Multiple matches — try to pick the one closest to the original path intent
      const origParts = clean.split('/');
      let bestMatch = null;
      let bestScore = -1;
      for (const cand of candidates) {
        const candRel = path.relative(repo, cand).split(path.sep).join('/');
        const candParts = candRel.split('/');
        // Score: count matching path segments from the end
        let score = 0;
        for (let i = 1; i <= Math.min(origParts.length, candParts.length); i++) {
          if (origParts[origParts.length - i] === candParts[candParts.length - i]) score++;
          else break;
        }
        if (score > bestScore) { bestScore = score; bestMatch = cand; }
      }
      if (bestMatch && bestScore >= 1) {
        const correctRel = path.relative(fileDir, bestMatch).split(path.sep).join('/');
        const fragment = trimTarget.includes('#') ? '#' + trimTarget.split('#').slice(1).join('#') : '';
        fixed++;
        changed = true;
        return `[${label}](${correctRel}${fragment})`;
      }
    }

    // Target truly doesn't exist — convert to plain text
    converted++;
    changed = true;
    return `${label} (\`${trimTarget}\`)`;
  });

  if (changed) {
    fs.writeFileSync(filePath, newText, 'utf8');
    filesChanged++;
    const rel = path.relative(repo, filePath).split(path.sep).join('/');
    console.log(`  patched: ${rel}`);
  }
}

// Process all markdown files
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (exclude.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) { walk(full); continue; }
    if (ent.name.endsWith('.md')) processFile(full);
  }
}

console.log('Fixing broken markdown links...\n');
walk(repo);

console.log(`\nDone.`);
console.log(`  Links fixed (path corrected): ${fixed}`);
console.log(`  Links converted (target missing): ${converted}`);
console.log(`  Files changed: ${filesChanged}`);
