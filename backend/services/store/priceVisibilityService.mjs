/**
 * ============================================================================
 * FILE: priceVisibilityService.mjs
 * PURPOSE: Per-user storefront price visibility (Launch Charter P1-1, §5).
 *
 * Sean's rule: package/session prices are HIDDEN from everyone — guests AND
 * logged-in users/clients/trainers — until an admin grants that specific user
 * the `store-prices` feature flag from the Feature Access dashboard. Admins
 * always see prices. Enforcement is SERVER-SIDE: public storefront endpoints
 * strip price fields for non-granted callers; purchase endpoints refuse.
 *
 * DESIGN:
 * - Soft auth: public GETs must work logged-out, so we decode a Bearer token
 *   if present (same secret + tokenType check as authMiddleware.protect) and
 *   treat any failure as anonymous — never a 401 on a public route.
 * - FAIL CLOSED: any error while resolving visibility → prices hidden.
 * - Reuses the existing UserFeatureFlag admin-grant system (content-studio
 *   precedent) — no new tables, no migration.
 *
 * CONSUMERS: storeFrontRoutes.mjs, cartRoutes.mjs, sessionPackageRoutes.mjs,
 *            v2PaymentRoutes.mjs, featureFlagController.mjs (key registry).
 * TESTS: backend/tests/api/storefrontPriceGating.test.mjs
 * ============================================================================
 */
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../../utils/jwtSecretGuard.mjs';
import logger from '../../utils/logger.mjs';

export const PRICE_ACCESS_FEATURE_KEY = 'store-prices';

const PRICE_FIELDS = ['totalCost', 'displayPrice', 'pricePerSession', 'price', 'priceDetails'];

/**
 * Sean's intent is specifically TRAINING SESSION/PACKAGE prices ("I didn't
 * want people to know what the price of the sessions were"). Ordinary physical
 * products (supplements/merch) are normal public e-commerce and keep their
 * prices. Gate only training packages.
 */
export const isPriceGatedItem = (mappedItem) =>
  mappedItem?.itemKind === 'training_package';

let UserFeatureFlag = null;
let User = null;

const getModels = async () => {
  if (!UserFeatureFlag) {
    UserFeatureFlag = (await import('../../models/UserFeatureFlag.mjs')).default;
  }
  if (!User) {
    User = (await import('../../models/User.mjs')).default;
  }
  return { UserFeatureFlag, User };
};

/**
 * Null out every price-bearing field on a mapStorefrontItem() result,
 * including nested variant prices. Field keys stay present so existing
 * frontend mappers keep working; values become null.
 */
export const stripItemPrices = (mappedItem) => {
  if (!mappedItem || typeof mappedItem !== 'object') return mappedItem;
  const stripped = { ...mappedItem };
  for (const field of PRICE_FIELDS) {
    if (field in stripped) stripped[field] = null;
  }
  if (Array.isArray(stripped.variants)) {
    stripped.variants = stripped.variants.map((variant) => ({ ...variant, price: null }));
  }
  return stripped;
};

/**
 * Best-effort identification on PUBLIC routes. Mirrors protect()'s
 * verification (getJwtSecret + tokenType === 'access') but NEVER errors —
 * missing/invalid/expired token simply means anonymous.
 */
export const decodeSoftAuthUserId = (req) => {
  const header = req?.headers?.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    if (decoded?.tokenType !== 'access' || !decoded?.id) return null;
    return decoded.id;
  } catch {
    return null;
  }
};

/**
 * Does this user (already-loaded model or {id, role}) see prices?
 * Admin: always. Everyone else: only with an enabled `store-prices` flag.
 */
export const isPriceAccessGranted = async (user) => {
  if (!user?.id) return false;
  if (user.role === 'admin') return true;
  try {
    const { UserFeatureFlag: FlagModel } = await getModels();
    const flag = await FlagModel.findOne({
      where: { userId: user.id, featureKey: PRICE_ACCESS_FEATURE_KEY, enabled: true },
      attributes: ['id'],
    });
    return Boolean(flag);
  } catch (error) {
    logger.warn('[priceVisibility] flag lookup failed — failing closed', { error: error.message });
    return false;
  }
};

/**
 * Resolve visibility for any request. Uses req.user when a protected route
 * already attached it; otherwise soft-decodes the Bearer token. FAIL CLOSED.
 */
export const resolvePriceVisibility = async (req) => {
  try {
    if (req?.user?.id) return isPriceAccessGranted(req.user);
    const userId = decodeSoftAuthUserId(req);
    if (!userId) return false;
    const { User: UserModel } = await getModels();
    const user = await UserModel.findByPk(userId, { attributes: ['id', 'role'] });
    return isPriceAccessGranted(user);
  } catch (error) {
    logger.warn('[priceVisibility] resolution failed — failing closed', { error: error.message });
    return false;
  }
};
