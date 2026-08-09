#!/usr/bin/env node
/**
 * FILE: scripts/verify-until-dry/classifier.mjs
 * PURPOSE: Compute risk floors and Kimi escalation without trusting an LLM.
 * INVARIANT: Agent input may increase the tier; it can never decrease the floor.
 */

const normalize = (file) => String(file ?? '').replace(/\\/g, '/').toLowerCase();

function pathTier(file) {
  const path = normalize(file);
  if (/^scripts\/verify-until-dry\/|^scripts\/hooks\/verify-until-dry|^config\/verify-until-dry|^\.github\/workflows\/|^\.(?:agents|claude)\/skills\/verify-until-dry\//.test(path)) {
    return { tier: 3, rule: `verifier-or-ci:${path}` };
  }
  if (/^(?:render\.yaml|infra\/)|^(?:backend\/)?(?:migrations?|models?|schemas?)\//.test(path)) {
    return { tier: 3, rule: `data-or-infra:${path}` };
  }
  if (/^docs\/|\.md$/.test(path)) return { tier: 0, rule: `docs:${path}` };
  if (/(^|\/)(package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(path)) {
    return { tier: 3, rule: `dependency-contract:${path}` };
  }
  const high = /(^|[\/_.-])(auth(?:routes?|service|controller|middleware)?|authz|authorization|payments?|billing|migrations?|schema|infra|secrets?|pii)([\/_.-]|$)/;
  if (high.test(path)) return { tier: 3, rule: `high-consequence:${path}` };
  if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(path) || /^scripts\//.test(path)) {
    return { tier: 1, rule: `test-or-tool:${path}` };
  }
  if (/^(frontend|backend|shared|src|app)\//.test(path)) {
    return { tier: 2, rule: `runtime:${path}` };
  }
  return { tier: 2, rule: `unknown-runtime-floor:${path}` };
}

function diffRules(diffText) {
  const rules = [];
  const text = String(diffText ?? '');
  if (/^\+.*\b(CREATE|ALTER|DROP|TRUNCATE)\s+(TABLE|TYPE|INDEX|SCHEMA)\b/im.test(text)) {
    rules.push({ tier: 3, rule: 'diff:database-ddl' });
  }
  if (/^\+.*\b(?:process\.env|secret|private[_-]?key|authorization)\b/im.test(text)) {
    rules.push({ tier: 3, rule: 'diff:secret-or-auth-contract' });
  }
  if (/^\+.*\b(?:test|describe|it)\.(?:skip|only)\s*\(/im.test(text)
    || /^-.*\b(?:test|describe|it)\s*\(/im.test(text)) {
    rules.push({ tier: 3, rule: 'diff:test-weakening' });
  }
  return rules;
}

function surfaceSet(files) {
  const surfaces = new Set();
  for (const file of files.map(normalize)) {
    if (file.startsWith('frontend/')) surfaces.add('frontend');
    if (file.startsWith('backend/')) surfaces.add('backend');
    if (/migration|schema|model/.test(file)) surfaces.add('data');
    if (/^\.github\/|^infra\//.test(file)) surfaces.add('infra');
  }
  return surfaces;
}

export function classifyRisk(input = {}) {
  const files = Array.isArray(input.files) ? input.files : [];
  const matches = [...files.map(pathTier), ...diffRules(input.diffText)];
  let tier = matches.reduce((maximum, match) => Math.max(maximum, match.tier), 0);
  const matchedRules = matches.map((match) => match.rule);

  if (Number.isInteger(input.agentTier)) {
    if (input.agentTier > tier && input.agentTier <= 3) {
      tier = input.agentTier;
      matchedRules.push(`agent-escalation:tier-${tier}`);
    } else if (input.agentTier < tier) {
      matchedRules.push(`agent-downgrade-rejected:tier-${input.agentTier}`);
    }
  }

  let complexityScore = tier * 2;
  if (files.length > 20) complexityScore += 2;
  if (Number(input.changedLines) > 500) complexityScore += 2;
  if (surfaceSet(files).size >= 3) complexityScore += 3;
  if (input.repeatedHighFinding) complexityScore += 3;
  if (input.oscillation) complexityScore += 4;

  const kimiReasons = [];
  if (tier === 3) kimiReasons.push('tier-3');
  if (complexityScore >= 7) kimiReasons.push('complexity-threshold');
  if (input.repeatedHighFinding) kimiReasons.push('repeated-high-finding');
  if (input.oscillation) kimiReasons.push('oscillation');

  return {
    tier,
    matchedRules,
    complexityScore,
    kimiRequired: kimiReasons.length > 0,
    kimiReasons: [...new Set(kimiReasons)],
  };
}
