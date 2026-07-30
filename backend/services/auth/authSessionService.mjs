/**
 * Shared JWT session issuance for non-password authentication.
 *
 * Provider tokens never become SwanStudios sessions. After a provider identity
 * is verified, this service issues the same access/refresh token shape used by
 * password login and persists only the refresh-token hash.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getClientIp } from '../geoIpService.mjs';
import { getWaiverAccessStatus } from '../../middleware/waiverGate.mjs';
import { getJwtSecret, resolveJwtSecret } from '../../utils/jwtSecretGuard.mjs';
import logger from '../../utils/logger.mjs';

const accessExpiry = () => process.env.JWT_EXPIRES_IN || '24h';
const refreshExpiry = () => process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const getRefreshSecret = () => resolveJwtSecret(
  'JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET || getJwtSecret(),
);

const signAccessToken = (user) => jwt.sign({
  id: user.id, role: user.role, tokenType: 'access', tokenId: uuidv4(),
}, getJwtSecret(), { expiresIn: accessExpiry() });

const signRefreshToken = (user) => jwt.sign({
  id: user.id, tokenType: 'refresh', tokenId: uuidv4(),
}, getRefreshSecret(), { expiresIn: refreshExpiry() });

export function serializeAuthUser(user) {
  const serialized = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    username: user.username,
    role: user.role,
    photo: user.photo,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isOnboardingComplete: user.isOnboardingComplete === true,
  };
  if (user.fitnessGoal) serialized.fitnessGoal = user.fitnessGoal;
  if (user.trainingExperience) serialized.trainingExperience = user.trainingExperience;
  if (user.specialties) serialized.specialties = user.specialties;
  if (user.lastActive) serialized.lastActive = user.lastActive;
  if (user.availableSessions !== undefined) serialized.availableSessions = user.availableSessions;
  if (user.clientSource) serialized.clientSource = user.clientSource;
  if (user.sessionBillingMode) serialized.sessionBillingMode = user.sessionBillingMode;
  return serialized;
}

async function serializeWithWaiver(user) {
  const serialized = serializeAuthUser(user);
  try {
    const status = await getWaiverAccessStatus(user);
    return {
      ...serialized,
      waiverRequired: status.required,
      hasLinkedWaiver: status.hasLinkedWaiver,
      waiverStatus: status.waiverStatus,
      waiverRecordId: status.waiverRecordId || null,
      waiverSignedAt: status.waiverSignedAt || null,
    };
  } catch (error) {
    logger.warn('Unable to enrich federated auth user with waiver status', {
      userId: user.id, role: user.role, error: error.message,
    });
    const required = ['client', 'user'].includes(user.role);
    return {
      ...serialized,
      waiverRequired: required,
      hasLinkedWaiver: !required,
      waiverStatus: required ? 'unverified' : 'not_required',
      waiverRecordId: null,
      waiverSignedAt: null,
    };
  }
}

export async function issueAuthSession(user, request) {
  const token = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await user.update({
    failedLoginAttempts: 0,
    lastLogin: new Date(),
    lastActive: new Date(),
    lastLoginIP: getClientIp(request),
    refreshTokenHash: await bcrypt.hash(refreshToken, 10),
  });
  return {
    success: true,
    user: await serializeWithWaiver(user),
    token,
    refreshToken,
  };
}