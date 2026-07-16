/**
 * ACCESSIBLE CLIENT IDENTITY PRIVACY
 * ==================================
 * Source: staff-authenticated AI chat and command messages.
 * Sink protected: any prompt text sent to an external model provider.
 *
 * Loads only identities the requester may legitimately see, then replaces
 * names/contact values locally with anonymous client tokens. Admins scan the
 * client roster; trainers scan active assignments plus legacy session-history
 * relationships. A roster-query failure rejects so callers can fail closed.
 *
 * This helper never logs message text or identity values.
 */
import { QueryTypes } from 'sequelize';
import logger from '../../utils/logger.mjs';

const STAFF_ROLES = new Set(['admin', 'trainer']);
const COMMON_SINGLE_NAME_WORDS = new Set([
  'bill', 'faith', 'grant', 'grace', 'hope', 'joy', 'mark', 'may', 'rose', 'will',
]);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeTerm = (value) => String(value ?? '').trim().toLocaleLowerCase();

const addTerm = (terms, value, clientId, kind) => {
  const display = String(value ?? '').trim();
  const key = normalizeTerm(display);
  if (!key) return;
  const current = terms.get(key) ?? { display, kind, clientIds: new Set() };
  current.clientIds.add(clientId);
  terms.set(key, current);
};

const addNameTerms = (terms, identity) => {
  const first = String(identity.firstName ?? '').trim();
  const last = String(identity.lastName ?? '').trim();
  if (first && last) {
    addTerm(terms, `${first} ${last}`, identity.id, 'name');
    addTerm(terms, `${last}, ${first}`, identity.id, 'name');
  }
  if (first.length >= 3 && !COMMON_SINGLE_NAME_WORDS.has(first.toLocaleLowerCase())) {
    addTerm(terms, first, identity.id, 'name');
  }
  if (last.length >= 3 && !COMMON_SINGLE_NAME_WORDS.has(last.toLocaleLowerCase())) {
    addTerm(terms, last, identity.id, 'name');
  }
};

const addContactTerms = (terms, identity) => {
  const email = String(identity.email ?? '').trim();
  const phone = String(identity.phone ?? '').trim();
  if (email) addTerm(terms, email, identity.id, 'contact');
  if (!phone) return;

  addTerm(terms, phone, identity.id, 'phone');
  const digits = phone.replace(/\D/g, '');
  const nationalDigits = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (nationalDigits.length !== 10) return;
  addTerm(terms, digits, identity.id, 'phone');
  addTerm(terms, nationalDigits, identity.id, 'phone');
  addTerm(terms, `(${nationalDigits.slice(0, 3)}) ${nationalDigits.slice(3, 6)}-${nationalDigits.slice(6)}`, identity.id, 'phone');
  const dashed = `${nationalDigits.slice(0, 3)}-${nationalDigits.slice(3, 6)}-${nationalDigits.slice(6)}`;
  addTerm(terms, dashed, identity.id, 'phone');
  addTerm(terms, `+1 ${dashed}`, identity.id, 'phone');
};

const buildTerms = (identities) => {
  const terms = new Map();
  for (const identity of identities) {
    if (!Number.isSafeInteger(Number(identity?.id)) || Number(identity.id) <= 0) continue;
    addNameTerms(terms, identity);
    addContactTerms(terms, identity);
  }
  return [...terms.values()].sort((a, b) => b.display.length - a.display.length);
};

const replacementFor = (term) => {
  if (term.clientIds.size !== 1) return 'Client';
  return `Client #${[...term.clientIds][0]}`;
};

const patternFor = (term) => {
  const escaped = escapeRegExp(term.display);
  if (term.kind === 'name') {
    return new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?<possessive>['']s)?(?![\\p{L}\\p{N}_])`, 'giu');
  }
  if (term.kind === 'phone') return new RegExp(`(?<!\\d)${escaped}(?!\\d)`, 'gi');
  return new RegExp(escaped, 'gi');
};

const createSanitizeFunction = (identities) => {
  const terms = buildTerms(identities);
  return (message) => {
    let sanitizedMessage = typeof message === 'string' ? message : '';
    let identitiesStripped = 0;

    for (const term of terms) {
      const replacement = replacementFor(term);
      sanitizedMessage = sanitizedMessage.replace(patternFor(term), (...args) => {
        identitiesStripped += 1;
        const groups = args.at(-1);
        return groups?.possessive ? `${replacement}'s` : replacement;
      });
    }

    return { sanitizedMessage, identitiesStripped };
  };
};

const loadAccessibleIdentities = async (requester, sequelize) => {
  if (!sequelize?.query) throw new Error('identity redaction unavailable');
  const select = `SELECT u.id, u."firstName", u."lastName", u.email, u.phone
    FROM "Users" u
    WHERE u.role IN ('client', 'user')`;

  if (requester.role === 'admin') {
    return sequelize.query(`${select} ORDER BY u.id`, { type: QueryTypes.SELECT });
  }

  return sequelize.query(
    `${select}
       AND (
         EXISTS (
           SELECT 1 FROM client_trainer_assignments cta
           WHERE cta."clientId" = u.id
             AND cta."trainerId" = :trainerId
             AND cta.status = 'active'
         )
         OR EXISTS (
           SELECT 1 FROM sessions s
           WHERE s."userId" = u.id AND s."trainerId" = :trainerId
         )
       )
     ORDER BY u.id`,
    { replacements: { trainerId: requester.id }, type: QueryTypes.SELECT },
  );
};

export async function createAccessibleClientIdentitySanitizer({ requester, sequelize } = {}) {
  if (!STAFF_ROLES.has(requester?.role)) {
    return { sanitize: createSanitizeFunction([]), identityCount: 0 };
  }

  try {
    const identities = await loadAccessibleIdentities(requester, sequelize);
    const safeIdentities = Array.isArray(identities) ? identities : [];
    return {
      sanitize: createSanitizeFunction(safeIdentities),
      identityCount: safeIdentities.length,
    };
  } catch (error) {
    logger.error('[AccessibleClientIdentityPrivacy] Identity roster load failed', {
      requesterId: requester?.id ?? null,
      requesterRole: requester?.role ?? null,
      errorName: error?.name ?? 'Error',
    });
    throw new Error('identity redaction unavailable', { cause: error });
  }
}

export default { createAccessibleClientIdentitySanitizer };
