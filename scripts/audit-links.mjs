import fs from 'fs';
import path from 'path';

const repo = process.cwd();
const exclude = new Set(['node_modules', '.git', 'dist', 'build', 'test-results']);
const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
const broken = [];

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (exclude.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) { walk(full); continue; }
    if (!ent.name.endsWith('.md')) continue;
    const relfile = path.relative(repo, full).split(path.sep).join('/');
    let text;
    try { text = fs.readFileSync(full, 'utf8'); } catch { continue; }
    let m;
    linkRe.lastIndex = 0;
    while ((m = linkRe.exec(text)) !== null) {
      const target = m[2].trim();
      if (!target || /^(http|https|mailto|tel|#|<)/.test(target)) continue;
      const clean = target.split('#')[0].split(' ')[0];
      if (!clean || clean.startsWith('[')) continue;
      const resolved = path.resolve(path.dirname(full), clean);
      if (!fs.existsSync(resolved)) {
        let cat = 'OTHER';
        const rl = relfile.toLowerCase();
        if (rl.includes('archive') || rl.includes('deprecated')) cat = 'ARCHIVE';
        else if (
          relfile.startsWith('docs/ai-workflow/AI-HANDOFF/') ||
          ['docs/MASTER-HANDBOOK.md', 'CLAUDE.md', 'docs/ai-workflow/SKILLS-INFRASTRUCTURE.md'].includes(relfile)
        ) cat = 'ACTIVE';
        else if (relfile.startsWith('docs/ai-workflow/')) cat = 'WORKFLOW';
        broken.push({ file: relfile, link: clean, category: cat });
      }
    }
  }
}

walk(repo);

for (const cat of ['ACTIVE', 'WORKFLOW', 'OTHER', 'ARCHIVE']) {
  const items = broken.filter(b => b.category === cat);
  if (!items.length) continue;
  console.log(`\n=== ${cat} (${items.length} broken links) ===`);
  const byFile = {};
  for (const b of items) (byFile[b.file] = byFile[b.file] || []).push(b.link);
  for (const f of Object.keys(byFile).sort()) {
    console.log(`  ${f}:`);
    for (const l of byFile[f]) console.log(`    -> ${l}`);
  }
}

// Top targets
const byTarget = {};
for (const b of broken) (byTarget[b.link] = byTarget[b.link] || []).push(b.file);
console.log('\n=== TOP MISSING TARGETS ===');
Object.entries(byTarget)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 25)
  .forEach(([t, files]) => {
    console.log(`  (${files.length}x) ${t}`);
  });

console.log(`\nTOTAL: ${broken.length} broken links in ${new Set(broken.map(b => b.file)).size} files`);
