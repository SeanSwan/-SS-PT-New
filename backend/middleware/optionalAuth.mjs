/**
 * Optional Authentication Middleware
 *
 * Sets req.user if a valid JWT token is present in the Authorization header,
 * but proceeds as anonymous (req.user = null) if no token or invalid token.
 * Unlike the `protect` middleware, this NEVER returns 401/403.
 *
 * Use case: Routes that serve different content for authenticated vs anonymous
 * users (e.g., video library shows free tier to anon, full library to subscribers).
 */
import { getUser } from '../models/index.mjs';
import logger from '../utils/logger.mjs';
import { toStringId } from '../utils/idUtils.mjs';
import { isJwtSecretConfigurationError } from '../utils/jwtSecretGuard.mjs';
import { verifyAccessToken } from './authMiddleware.mjs';

export const optionalAuth = async (req, res, next) => {
  req.user = null;

  try {
    // Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next();
    }

    // U-05: shared verification boundary. This middleware previously verified
    // the signature ONLY — with one secret shared by every token family, a
    // refresh or force-password-change token authenticated here. Family check
    // + revocation now apply; failures fall through to anonymous as before.
    const decoded = await verifyAccessToken(token);

    // Fetch user from DB (lazy loading pattern)
    const User = getUser();
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return next();
    }

    // Attach user to request
    req.user = {
      id: toStringId(user.id),
      role: user.role,
      username: user.username,
      email: user.email,
      tokenId: decoded.tokenId ?? null,
      tokenExp: decoded.exp ?? null,
    };

    return next();
  } catch (err) {
    if (isJwtSecretConfigurationError(err)) {
      logger.warn('optionalAuth: JWT secret is not configured, proceeding as anonymous', {
        path: req.path,
      });
      return next();
    }

    // Swallow JWT-specific errors silently — anonymous is fine
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError'
      || err.name === 'TokenFamilyError' || err.name === 'TokenRevokedError') {
      return next();
    }

    // Log unexpected errors as a warning but still proceed anonymous
    logger.warn('optionalAuth: unexpected error, proceeding as anonymous', {
      error: err.message,
      path: req.path,
    });

    return next();
  }
};
