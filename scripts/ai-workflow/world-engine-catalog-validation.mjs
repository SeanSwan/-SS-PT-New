const EXPECTED_WORLD_IDS = Object.freeze([
  'world.natural-sublime.glacier-cathedral',
  'world.natural-sublime.evergreen-dominion',
  'world.natural-sublime.emerald-canopy',
  'world.natural-sublime.cascade-vault',
  'world.natural-sublime.prairie-horizon',
  'world.natural-sublime.alpine-apex',
  'world.cosmic.webb-deep-field',
  'world.cosmic.nebula-drift',
  'world.cosmic.exo-eden',
  'world.constructed-tech.grid-runner',
  'world.constructed-tech.neon-meridian',
  'world.constructed-tech.chrome-sovereign',
  'world.constructed-tech.signal-city',
  'world.miniature-play.tiny-metropolis',
  'world.miniature-play.pocket-worlds',
  'world.miniature-play.voxel-realm',
  'world.cinematic-reality.film-frame',
  'world.cinematic-reality.archive-editorial',
]);

const WFX_FIELDS = Object.freeze([
  'Job / payoff',
  'Budget / maturity',
  'Backend rungs',
  'Full / Lean / Still',
  'Recovery',
  'A11y /',
  'Wrong tool',
]);

const PSY_FIELDS = Object.freeze([
  'Definition - researcher - source',
  'Evidence strength / caveat',
  'Audience / context',
  'Swan anchor',
  'World Engine use',
  'Accessibility + ethical failure',
  'Target KPI / counter-metric',
  'Falsifier',
  'Stop',
]);

function exactSequence(prefix, count) {
  return Array.from(
    { length: count },
    (_, index) => `${prefix}-${String(index + 1).padStart(2, '0')}`,
  );
}

function sections(text, headingPattern) {
  const matches = [...String(text ?? '').matchAll(headingPattern)];
  return matches.map((match, index) => ({
    match,
    heading: match[0],
    body: String(text ?? '').slice(
      match.index,
      matches[index + 1]?.index ?? String(text ?? '').length,
    ),
  }));
}

function sequenceErrors(errors, label, actual, expected) {
  const mismatches = expected
    .map((id, index) => actual[index] === id ? null : `${index + 1}:${actual[index] ?? 'missing'}->${id}`)
    .filter(Boolean);
  if (actual.length !== expected.length || mismatches.length) {
    errors.push(
      `${label} headings must be the exact ordered unique sequence; ${mismatches.join(', ') || `found ${actual.length}`}`,
    );
  }
}

function rowValue(body, field) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const labelPattern = field.endsWith('/') ? `${escaped}\\s+[^|]+` : escaped;
  return body.match(new RegExp(
    `^\\|\\s*${labelPattern}\\s*\\|\\s*(.*?)\\s*\\|\\s*$`,
    'mi',
  ))?.[1] ?? null;
}

function isSubstantive(value) {
  const plain = String(value ?? '')
    .replace(/[`*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length >= 12
    && /[a-z0-9]/i.test(plain)
    && !/^(?:n\/?a|none|tbd|todo|placeholder|not applicable)$/i.test(plain);
}

function requireSubstantiveRows(errors, label, body, fields) {
  const missing = fields.filter((field) => !isSubstantive(rowValue(body, field)));
  if (missing.length) {
    errors.push(`${label} requires substantive table values: ${missing.join(', ')}`);
  }
}

function auditWorldEntries(errors, text) {
  const entries = sections(text, /^###\s+(\d+)\.\s+([^\r\n]+)$/gm);
  const numbers = entries.map(({ match }) => Number(match[1]));
  const expectedNumbers = EXPECTED_WORLD_IDS.map((_, index) => index + 1);
  if (numbers.length !== expectedNumbers.length
      || numbers.some((number, index) => number !== expectedNumbers[index])) {
    errors.push(`world headings must be numbered exactly 1-18; found [${numbers.join(', ')}]`);
  }

  for (const [index, entry] of entries.entries()) {
    const expectedId = EXPECTED_WORLD_IDS[index];
    const ids = [...entry.body.matchAll(/\bworld\.[a-z0-9-]+\.[a-z0-9-]+\b/g)]
      .map((match) => match[0]);
    if (ids.length !== 1 || ids[0] !== expectedId) {
      errors.push(
        `world entry ${index + 1} must contain only stable ID ${expectedId}; found [${ids.join(', ')}]`,
      );
    }

    const goldMarkers = [...entry.heading.matchAll(/Gold exemplar\s+\d+\s+of\s+2/gi)];
    const expectedGold = index === 0 ? 'Gold exemplar 1 of 2'
      : index === 10 ? 'Gold exemplar 2 of 2' : null;
    if (expectedGold && !entry.heading.includes(expectedGold)) {
      errors.push(`world entry ${index + 1} must carry its own ${expectedGold} marker`);
    }
    if (!expectedGold && goldMarkers.length) {
      errors.push(`world entry ${index + 1} has an unauthorized gold exemplar marker`);
    }

    const antiCheese = [...entry.body.matchAll(/\*\*Anti-cheese:\*\*\s*([^\r\n]*)/gi)];
    if (antiCheese.length !== 1 || !isSubstantive(antiCheese[0]?.[1])) {
      errors.push(`world entry ${index + 1} requires one substantive anti-cheese value`);
    }
  }
}

function auditTechniqueEntries(errors, text) {
  const entries = sections(text, /^##\s+(WFX-\d{2})\b[^\r\n]*$/gm);
  sequenceErrors(
    errors,
    'technique catalog',
    entries.map(({ match }) => match[1]),
    exactSequence('WFX', 13),
  );
  for (const entry of entries) {
    requireSubstantiveRows(errors, entry.match[1], entry.body, WFX_FIELDS);
  }
}

function auditPsychologyEntries(errors, text) {
  const entries = sections(text, /^###\s+(PSY-\d{2})\b[^\r\n]*$/gm);
  sequenceErrors(
    errors,
    'psychology catalog',
    entries.map(({ match }) => match[1]),
    exactSequence('PSY', 10),
  );
  for (const entry of entries) {
    if (!/\[HYPOTHESIS\]/.test(entry.heading)) {
      errors.push(`${entry.match[1]} heading must retain [HYPOTHESIS]`);
    }
    requireSubstantiveRows(errors, entry.match[1], entry.body, PSY_FIELDS);
  }
}

export function auditCatalogIntegrity(bundle) {
  const errors = [];
  auditWorldEntries(errors, bundle.worlds ?? '');
  auditTechniqueEntries(errors, bundle.techniques ?? '');
  auditPsychologyEntries(errors, bundle.psychology ?? '');
  return errors;
}
