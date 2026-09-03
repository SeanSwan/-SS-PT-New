/**
 * Client Resolver — Fuzzy Name Matching
 * =======================================
 * Resolves natural language client references ("Jackie", "J. Smith") to
 * database client records using Levenshtein distance fuzzy matching.
 *
 * Pipeline position: ... → ZodValidator → RbacChecker → **ClientResolver** → ...
 *
 * Resolution rules:
 * - 0 matches → error with suggestions
 * - 1 match → auto-resolve
 * - 2+ matches → ask user to disambiguate
 * - Checks isActive === true (rejects soft-deleted)
 * - Returns client snapshot with version for optimistic locking
 */
import { QueryTypes } from 'sequelize';
import logger from '../../utils/logger.mjs';
import { toPositiveInteger } from './positiveInteger.mjs';

// ── Levenshtein Distance ────────────────────────────────────────────────────

function levenshtein(a, b) {
  const la = a.length, lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  // Use single-row optimization for memory efficiency
  let prev = Array.from({ length: lb + 1 }, (_, j) => j);
  let curr = new Array(lb + 1);

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[lb];
}

/**
 * Score how well a client matches a reference string.
 * Lower score = better match. Returns null if no match.
 *
 * @param {Object} client - { id, firstName, lastName, email }
 * @param {string} ref - Reference string from user input
 * @returns {{ score: number, matchType: string }|null}
 */
function scoreMatch(client, ref) {
  const refLower = ref.toLowerCase().trim();
  const firstName = (client.firstName || '').toLowerCase();
  const lastName = (client.lastName || '').toLowerCase();
  const fullName = `${firstName} ${lastName}`.trim();
  const email = (client.email || '').toLowerCase();

  // Exact match on full name
  if (fullName === refLower) return { score: 0, matchType: 'exact_full' };

  // Exact match on first name
  if (firstName === refLower) return { score: 0.1, matchType: 'exact_first' };

  // Exact match on last name
  if (lastName === refLower) return { score: 0.1, matchType: 'exact_last' };

  // ID reference ("client 61", "#61")
  const idMatch = refLower.match(/(?:client\s*#?\s*|#)(\d+)/);
  if (idMatch && parseInt(idMatch[1]) === client.id) {
    return { score: 0, matchType: 'id_match' };
  }

  // Email prefix match
  if (email.split('@')[0] === refLower) return { score: 0.2, matchType: 'email_prefix' };

  // Starts-with matching
  if (firstName.startsWith(refLower) || lastName.startsWith(refLower)) {
    return { score: 0.3, matchType: 'starts_with' };
  }

  // Fuzzy matching with Levenshtein distance
  const firstDist = levenshtein(refLower, firstName);
  const lastDist = levenshtein(refLower, lastName);
  const fullDist = levenshtein(refLower, fullName);

  const bestDist = Math.min(firstDist, lastDist, fullDist);
  const bestRef = fullDist === bestDist ? fullName : (firstDist <= lastDist ? firstName : lastName);
  const threshold = Math.ceil(bestRef.length * 0.35); // 35% tolerance

  if (bestDist <= threshold) {
    return { score: 0.5 + (bestDist / bestRef.length), matchType: 'fuzzy' };
  }

  // Contains matching (last resort)
  if (fullName.includes(refLower) || refLower.includes(firstName) || refLower.includes(lastName)) {
    return { score: 0.7, matchType: 'contains' };
  }

  return null; // No match
}

/**
 * Resolve a client reference to a database record.
 *
 * @param {string} clientRef - Name/ID/email from user input
 * @param {Object} sequelize - Sequelize instance
 * @param {Object} [options]
 * @param {number} [options.trainerId] - Restrict to trainer's own clients
 * @param {number} [options.maxSuggestions=3] - Max disambiguation suggestions
 * @returns {Promise<{ resolved: Object|null, suggestions: Object[], error: string|null }>}
 */
export async function resolveClient(clientRef, sequelize, options = {}) {
  const { trainerId, maxSuggestions = 3 } = options;
  // The SAME coercion the command lane uses. These were two different rules: `parseInt` is
  // lenient by design — it reads as far as it can and ignores the rest — so `'12px'` became
  // trainer 12 here while the lane refused it, and `'1e3'` became trainer 1. Nothing
  // exploitable came of the divergence, and only because the lane's guard happens to run
  // first: the safety was a property of the call ORDER, not of either function.
  const scopedTrainerId = toPositiveInteger(trainerId);
  const hasTrainerScope = scopedTrainerId !== null;

  // "Unscoped by design" and "unscoped because the id was garbage" used to be the same
  // value, and the same value meant NO SCOPE CLAUSE — so a caller that asked to be scoped
  // and supplied an unusable id got the admin-wide query instead. That is fail-OPEN, and it
  // is the asymmetry a review named: `assertAssignmentOrAdmin` returns false when it cannot
  // parse a requester id, while this returned everybody. Asking for a scope that cannot be
  // computed is now a refusal, and only omitting the option entirely means unscoped.
  const scopeRequested = trainerId !== undefined && trainerId !== null;
  if (scopeRequested && !hasTrainerScope) {
    logger.warn('[ClientResolver] Scope requested with an unusable trainer id — denying', {
      trainerIdType: typeof trainerId,
    });
    return { resolved: null, suggestions: [], error: 'No accessible active client found with that ID.' };
  }

  if (!clientRef || typeof clientRef !== 'string') {
    return { resolved: null, suggestions: [], error: 'No client reference provided' };
  }

  // Input validation: cap length to prevent abuse / regex DoS
  if (clientRef.length > 100) {
    return { resolved: null, suggestions: [], error: 'Client reference is too long. Please use a name or ID.' };
  }

  try {
    // Check if it's a direct ID reference
    const directId = clientRef.match(/^(?:client\s*#?\s*|#)?(\d+)$/i);
    if (directId) {
      const id = parseInt(directId[1]);
      const replacements = { id };
      let trainerScopeSql = '';
      if (hasTrainerScope) {
        replacements.trainerId = scopedTrainerId;
        trainerScopeSql = `
           AND EXISTS (
             SELECT 1
               FROM client_trainer_assignments cta
              WHERE cta."clientId" = "Users".id
                AND cta."trainerId" = :trainerId
                AND cta.status = 'active'
           )`;
      }
      const [rows] = await sequelize.query(
        `SELECT id, "firstName", "lastName", email, "isActive", version
         FROM "Users" WHERE id = :id AND role = 'client' AND "isActive" = true${trainerScopeSql} LIMIT 1`,
        { replacements, type: QueryTypes.SELECT }
      );
      if (rows && rows.id) {
        if (!rows.isActive) {
          return { resolved: null, suggestions: [], error: `Client #${id} is deactivated.` };
        }
        return {
          resolved: { id: rows.id, firstName: rows.firstName, lastName: rows.lastName, version: rows.version },
          suggestions: [],
          error: null,
        };
      }
      return {
        resolved: null,
        suggestions: [],
        error: hasTrainerScope ? 'No accessible active client found with that ID.' : `No client found with ID #${id}.`,
      };
    }

    // Fetch active clients for fuzzy matching
    let query = `SELECT id, "firstName", "lastName", email, "isActive", version
                 FROM "Users" WHERE "isActive" = true AND role = 'client'`;
    const replacements = {};

    if (hasTrainerScope) {
      // Trainer command scope must stay inside assigned active clients.
      replacements.trainerId = scopedTrainerId;
      query += ` AND EXISTS (
                   SELECT 1
                     FROM client_trainer_assignments cta
                    WHERE cta."clientId" = "Users".id
                      AND cta."trainerId" = :trainerId
                      AND cta.status = 'active'
                 )`;
    }

    query += ' ORDER BY "lastName", "firstName" LIMIT 50';

    const clients = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
    });

    // AI Village consensus: Log when limit is hit so we know to implement pg_trgm
    if (clients && clients.length === 50) {
      logger.warn('[ClientResolver] Client list truncated at 50 — consider database-side fuzzy matching', {
        trainerId,
        refLength: clientRef.length,
      });
    }

    if (!clients || clients.length === 0) {
      return { resolved: null, suggestions: [], error: 'No active clients found in the system.' };
    }

    // Score all clients against the reference
    const scored = [];
    for (const client of clients) {
      const result = scoreMatch(client, clientRef);
      if (result) {
        scored.push({ client, ...result });
      }
    }

    // Sort by score (lower = better)
    scored.sort((a, b) => a.score - b.score);

    if (scored.length === 0) {
      // No matches — suggest closest names by Levenshtein
      const suggestions = clients
        .map(c => ({
          ...c,
          dist: levenshtein(clientRef.toLowerCase(), `${c.firstName} ${c.lastName}`.toLowerCase()),
        }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, maxSuggestions)
        .map(c => ({ id: c.id, name: `${c.firstName} ${c.lastName}` }));

      return {
        resolved: null,
        suggestions,
        error: `No client named "${clientRef}" found. Did you mean: ${suggestions.map(s => s.name).join(', ')}?`,
      };
    }

    // Single clear winner (score gap > 0.3 from second)
    if (scored.length === 1 || (scored.length >= 2 && scored[1].score - scored[0].score > 0.3)) {
      const winner = scored[0].client;
      logger.info('[ClientResolver] Resolved client', {
        resolvedId: winner.id,
        matchType: scored[0].matchType,
        score: scored[0].score,
      });
      return {
        resolved: {
          id: winner.id,
          firstName: winner.firstName,
          lastName: winner.lastName,
          version: winner.version,
        },
        suggestions: [],
        error: null,
      };
    }

    // Multiple close matches — ask user to disambiguate
    const topMatches = scored.slice(0, maxSuggestions).map(s => ({
      id: s.client.id,
      name: `${s.client.firstName} ${s.client.lastName}`,
      matchType: s.matchType,
    }));

    return {
      resolved: null,
      suggestions: topMatches,
      error: `Multiple clients match "${clientRef}". Which one did you mean: ${topMatches.map(m => `${m.name} (#${m.id})`).join(', ')}?`,
    };

  } catch (err) {
    logger.error('[ClientResolver] Database query failed', { error: err.message, refLength: clientRef.length });
    return { resolved: null, suggestions: [], error: 'Failed to look up client. Please try again.' };
  }
}
