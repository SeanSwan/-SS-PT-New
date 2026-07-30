/**
 * Federated account resolution and explicit linking policy.
 *
 * Immutable provider subjects own federation. Matching email alone never links
 * an existing account: the member must first authenticate that account and use
 * the protected linking flow, preventing verified-email account takeover.
 */
import { randomBytes } from 'node:crypto';
import { Op, col, fn, where as sqlWhere } from 'sequelize';
import sequelize from '../../database.mjs';
import User from '../../models/User.mjs';
import AuthIdentity from '../../models/AuthIdentity.mjs';

const serviceError = (code, message, status = 400) => Object.assign(new Error(message), { code, status });

export function decideFederatedAccountAction({
  identityUserId = null, matchingEmailUserId = null, email = null, emailVerified = false,
}) {
  if (identityUserId) return { action: 'login', userId: identityUserId };
  if (matchingEmailUserId) return { action: 'link_required', userId: matchingEmailUserId };
  if (!email) return { action: 'reject', code: 'PROVIDER_EMAIL_REQUIRED' };
  if (!emailVerified) return { action: 'reject', code: 'PROVIDER_EMAIL_UNVERIFIED' };
  return { action: 'create' };
}

const ensureUserMayAuthenticate = (user) => {
  if (!user) throw serviceError('AUTH_USER_NOT_FOUND', 'Account is unavailable', 401);
  if (user.isActive === false || (user.accountStatus && user.accountStatus !== 'active')) {
    throw serviceError('AUTH_USER_INACTIVE', 'Account is inactive', 401);
  }
  if (user.isLocked) throw serviceError('AUTH_USER_LOCKED', 'Account is locked', 401);
  return user;
};

const normalizedEmail = (email) => typeof email === 'string' ? email.trim().toLowerCase() : null;
const findUserByEmail = (email, transaction) => email ? User.findOne({
  where: sqlWhere(fn('LOWER', col('email')), email), transaction,
}) : null;

const usernameBase = (email, provider) => {
  const local = email?.split('@')[0] || `${provider}-member`;
  const cleaned = local.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20);
  return cleaned.length >= 3 ? cleaned : `${provider}-member`;
};

async function uniqueUsername(email, provider, transaction) {
  const base = usernameBase(email, provider);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const suffix = randomBytes(4).toString('hex');
    const candidate = `${base}-${suffix}`.slice(0, 32);
    const exists = await User.findOne({ where: { username: candidate }, attributes: ['id'], transaction });
    if (!exists) return candidate;
  }
  throw serviceError('USERNAME_ALLOCATION_FAILED', 'Unable to create account identifier', 503);
}

const identityValues = (provider, profile, userId) => ({
  userId,
  provider,
  providerSubject: profile.subject,
  emailVerifiedAt: profile.emailVerified ? new Date() : null,
  lastUsedAt: new Date(),
});

async function linkIdentity({ provider, profile, userId, transaction }) {
  const user = ensureUserMayAuthenticate(await User.findByPk(userId, { transaction }));
  const subjectIdentity = await AuthIdentity.findOne({
    where: { provider, providerSubject: profile.subject }, transaction,
  });
  if (subjectIdentity && subjectIdentity.userId !== user.id) {
    throw serviceError('PROVIDER_IDENTITY_ALREADY_LINKED', 'This provider account is already linked', 409);
  }
  const providerIdentity = await AuthIdentity.findOne({ where: { userId: user.id, provider }, transaction });
  if (providerIdentity && providerIdentity.providerSubject !== profile.subject) {
    throw serviceError('USER_PROVIDER_ALREADY_LINKED', `A ${provider} account is already linked`, 409);
  }
  if (!providerIdentity) await AuthIdentity.create(identityValues(provider, profile, user.id), { transaction });
  else await providerIdentity.update({ lastUsedAt: new Date() }, { transaction });
  return user;
}

async function loginOrCreate({ provider, profile, transaction }) {
  const identity = await AuthIdentity.findOne({
    where: { provider, providerSubject: profile.subject }, transaction,
  });
  if (identity) {
    await identity.update({ lastUsedAt: new Date() }, { transaction });
    return ensureUserMayAuthenticate(await User.findByPk(identity.userId, { transaction }));
  }

  const email = normalizedEmail(profile.email);
  const matchingUser = await findUserByEmail(email, transaction);
  const decision = decideFederatedAccountAction({
    identityUserId: null,
    matchingEmailUserId: matchingUser?.id || null,
    email,
    emailVerified: profile.emailVerified === true,
  });
  if (decision.action === 'link_required') {
    throw serviceError('ACCOUNT_LINK_REQUIRED', 'Sign in with your existing method, then link this provider', 409);
  }
  if (decision.action === 'reject') {
    throw serviceError(decision.code, 'This provider cannot create a SwanStudios account', 422);
  }

  const user = await User.create({
    firstName: profile.firstName?.trim() || 'Swan',
    lastName: profile.lastName?.trim() || 'Member',
    email,
    username: await uniqueUsername(email, provider, transaction),
    password: randomBytes(48).toString('base64url'),
    photo: profile.photo || null,
    role: 'user',
    clientSource: 'external',
    isOnboardingComplete: false,
  }, { transaction });
  await AuthIdentity.create(identityValues(provider, profile, user.id), { transaction });
  return user;
}

export async function resolveFederatedAccount({ provider, profile, mode = 'login', userId = null }) {
  if (!profile?.subject) throw serviceError('PROVIDER_SUBJECT_REQUIRED', 'Provider identity is invalid', 422);
  return sequelize.transaction((transaction) => mode === 'link'
    ? linkIdentity({ provider, profile, userId, transaction })
    : loginOrCreate({ provider, profile, transaction }));
}