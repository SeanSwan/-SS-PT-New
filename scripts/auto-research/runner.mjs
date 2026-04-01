/**
 * ============================================================================
 * FILE: runner.mjs
 * PURPOSE: Auto-research loop — Karpathy-style skill optimization
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Runs a skill prompt N times against eval criteria, scores results,
 * then uses an AI model to mutate the prompt toward higher scores.
 * Repeats until convergence or max generations reached.
 *
 * USAGE:
 *   node scripts/auto-research/runner.mjs --skill verification-before-completion
 *   node scripts/auto-research/runner.mjs --skill debugging --generations 5 --runs 3
 *   node scripts/auto-research/runner.mjs --list   # list available evals
 *
 * THREE INGREDIENTS (Karpathy):
 * 1. Objective metric — binary yes/no eval criteria (evals/*.eval.json)
 * 2. Measurement tool — this runner scores skill output against criteria
 * 3. Something to change — the skill SKILL.md prompt text
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { evalSuite } from './eval-suite.mjs';
import { mutatePrompt } from './prompt-mutator.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVALS_DIR = path.join(__dirname, 'evals');
const RESULTS_DIR = path.join(__dirname, 'results');
const SKILLS_DIR = path.join(__dirname, '..', '..', '.claude', 'skills');

// ─────────────────────────────────────────────────────────────
// SECTION: CLI Argument Parsing
// ─────────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    skill: null,
    generations: 3,
    runs: 5,
    list: false,
    dryRun: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--skill': opts.skill = args[++i]; break;
      case '--generations': opts.generations = parseInt(args[++i], 10); break;
      case '--runs': opts.runs = parseInt(args[++i], 10); break;
      case '--list': opts.list = true; break;
      case '--dry-run': opts.dryRun = true; break;
      case '--verbose': opts.verbose = true; break;
      default:
        console.error(`Unknown argument: ${args[i]}`);
        process.exit(1);
    }
  }

  return opts;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Eval Discovery
// ─────────────────────────────────────────────────────────────
function listEvals() {
  if (!fs.existsSync(EVALS_DIR)) {
    console.log('No evals directory found. Create evals in scripts/auto-research/evals/');
    return [];
  }

  const evalFiles = fs.readdirSync(EVALS_DIR)
    .filter(f => f.endsWith('.eval.json'));

  if (evalFiles.length === 0) {
    console.log('No eval files found. Create .eval.json files in scripts/auto-research/evals/');
    return [];
  }

  return evalFiles.map(f => {
    const data = JSON.parse(fs.readFileSync(path.join(EVALS_DIR, f), 'utf8'));
    return { file: f, ...data };
  });
}

// ─────────────────────────────────────────────────────────────
// SECTION: Skill Prompt Reader
// ─────────────────────────────────────────────────────────────
function readSkillPrompt(skillName) {
  const skillPath = path.join(SKILLS_DIR, skillName, 'SKILL.md');
  if (!fs.existsSync(skillPath)) {
    throw new Error(`Skill not found: ${skillPath}`);
  }
  return fs.readFileSync(skillPath, 'utf8');
}

function writeSkillPrompt(skillName, content) {
  const skillPath = path.join(SKILLS_DIR, skillName, 'SKILL.md');
  // Backup original before overwriting
  const backupPath = path.join(RESULTS_DIR, `${skillName}-original-backup.md`);
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(skillPath, backupPath);
  }
  fs.writeFileSync(skillPath, content, 'utf8');
}

// ─────────────────────────────────────────────────────────────
// SECTION: Result Storage
// ─────────────────────────────────────────────────────────────
function saveResult(skillName, generation, result) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultPath = path.join(RESULTS_DIR, `${skillName}-gen${generation}-${timestamp}.json`);
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
  return resultPath;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Main Runner Loop
// ─────────────────────────────────────────────────────────────
async function runOptimizationLoop(opts) {
  const evalDef = listEvals().find(e => e.skill === opts.skill);
  if (!evalDef) {
    console.error(`No eval definition found for skill: ${opts.skill}`);
    console.error('Available evals:', listEvals().map(e => e.skill).join(', ') || '(none)');
    process.exit(1);
  }

  console.log(`\n🔬 Auto-Research: Optimizing "${opts.skill}"`);
  console.log(`   Generations: ${opts.generations} | Runs per gen: ${opts.runs}`);
  console.log(`   Criteria: ${evalDef.criteria.length} (total weight: ${evalDef.criteria.reduce((s, c) => s + (c.weight || 1), 0)})`);
  console.log('');

  let currentPrompt = readSkillPrompt(opts.skill);
  let bestScore = -1;
  let bestPrompt = currentPrompt;
  const history = [];

  for (let gen = 1; gen <= opts.generations; gen++) {
    console.log(`── Generation ${gen}/${opts.generations} ──────────────────────────`);

    // Run eval suite N times with current prompt
    const scores = [];
    for (let run = 1; run <= opts.runs; run++) {
      if (opts.verbose) console.log(`  Run ${run}/${opts.runs}...`);

      const result = await evalSuite.evaluate(opts.skill, currentPrompt, evalDef);
      scores.push(result);

      if (opts.verbose) {
        console.log(`    Score: ${result.totalScore}/${result.maxScore} (${(result.totalScore / result.maxScore * 100).toFixed(1)}%)`);
      }
    }

    // Aggregate scores across runs
    const avgScore = scores.reduce((s, r) => s + r.totalScore, 0) / scores.length;
    const maxPossible = scores[0].maxScore;
    const pct = (avgScore / maxPossible * 100).toFixed(1);

    console.log(`  Average score: ${avgScore.toFixed(1)}/${maxPossible} (${pct}%)`);

    // Track history
    const genResult = {
      generation: gen,
      avgScore,
      maxPossible,
      pct: parseFloat(pct),
      runs: scores,
      promptLength: currentPrompt.length,
    };
    history.push(genResult);

    // Save result
    const resultPath = saveResult(opts.skill, gen, genResult);
    if (opts.verbose) console.log(`  Saved: ${resultPath}`);

    // Track best
    if (avgScore > bestScore) {
      bestScore = avgScore;
      bestPrompt = currentPrompt;
      console.log(`  ★ New best! (${pct}%)`);
    }

    // Mutate prompt for next generation (skip on last gen)
    if (gen < opts.generations) {
      if (opts.dryRun) {
        console.log('  [dry-run] Skipping mutation');
      } else {
        console.log('  Mutating prompt...');
        const failedCriteria = scores
          .flatMap(s => s.criteriaResults.filter(c => !c.passed))
          .map(c => c.description);

        currentPrompt = await mutatePrompt(currentPrompt, {
          skill: opts.skill,
          avgScore,
          maxPossible,
          failedCriteria: [...new Set(failedCriteria)],
          history: history.map(h => ({ gen: h.generation, pct: h.pct })),
        });
        console.log(`  Prompt mutated (${currentPrompt.length} chars)`);
      }
    }

    console.log('');
  }

  // Final report
  console.log('═══════════════════════════════════════════════════');
  console.log(`🏆 Best score: ${bestScore.toFixed(1)}/${history[0].maxPossible} (${(bestScore / history[0].maxPossible * 100).toFixed(1)}%)`);
  console.log(`   Progression: ${history.map(h => `${h.pct}%`).join(' → ')}`);

  // Write best prompt back if it improved
  if (bestScore > history[0].avgScore && !opts.dryRun) {
    writeSkillPrompt(opts.skill, bestPrompt);
    console.log(`   ✅ Best prompt written to ${opts.skill}/SKILL.md`);
  } else {
    console.log('   ℹ️  No improvement — original prompt preserved');
  }

  return { history, bestScore, bestPrompt };
}

// ─────────────────────────────────────────────────────────────
// SECTION: Entry Point
// ─────────────────────────────────────────────────────────────
const opts = parseArgs();

if (opts.list) {
  const evals = listEvals();
  if (evals.length > 0) {
    console.log('Available evals:');
    evals.forEach(e => {
      console.log(`  ${e.skill} — ${e.criteria.length} criteria, ${e.iterations || 10} default iterations`);
    });
  }
  process.exit(0);
}

if (!opts.skill) {
  console.error('Usage: node scripts/auto-research/runner.mjs --skill <skill-name> [--generations N] [--runs N]');
  console.error('       node scripts/auto-research/runner.mjs --list');
  process.exit(1);
}

runOptimizationLoop(opts).catch(err => {
  console.error('Auto-research failed:', err.message);
  process.exit(1);
});
