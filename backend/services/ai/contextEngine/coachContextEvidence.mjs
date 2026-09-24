/**
 * SCU S5 — evidence-aware context boundary.
 *
 * The existing context engine is a read layer that intentionally degrades
 * individual domains. This adapter makes that degradation explicit before a
 * model or planner sees the context: healthy values carry a database source
 * and timestamp; unavailable values carry no freshness claim and block any
 * plan that depends on them.
 */
const VALID_STATUSES = new Set(['ok', 'degraded', 'deferred']);

function safeIso(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function buildCoachEvidenceEnvelope({
  dataQuality = [],
  accessVia = null,
  generatedAt = new Date().toISOString(),
  contextVersion = 'coach-context-v1',
} = {}) {
  const observedAt = safeIso(generatedAt) || new Date().toISOString();
  const quality = Array.isArray(dataQuality) ? dataQuality : [];
  const domains = {};

  for (const entry of quality) {
    const domain = String(entry?.domain || '').trim();
    if (!domain) continue;
    const status = VALID_STATUSES.has(entry?.status) ? entry.status : 'deferred';
    domains[domain] = {
      status,
      source: status === 'ok' ? 'database' : 'unavailable',
      asOf: status === 'ok' ? observedAt : null,
    };
  }

  return {
    schemaVersion: 1,
    contextVersion: String(contextVersion || 'coach-context-v1').slice(0, 80),
    accessVia: accessVia ? String(accessVia).slice(0, 40) : null,
    generatedAt: observedAt,
    domains,
  };
}

export function evaluateRequiredDomains({ evidence, requiredDomains = [] } = {}) {
  const domains = evidence?.domains && typeof evidence.domains === 'object' ? evidence.domains : {};
  const blockedDomains = [];
  for (const rawDomain of Array.isArray(requiredDomains) ? requiredDomains : []) {
    const domain = String(rawDomain || '').trim();
    if (domain && domains[domain]?.status !== 'ok' && !blockedDomains.includes(domain)) {
      blockedDomains.push(domain);
    }
  }
  return {
    allowed: blockedDomains.length === 0,
    blockedDomains,
    reasonCode: blockedDomains.length ? 'REQUIRED_DOMAIN_UNAVAILABLE' : null,
  };
}
