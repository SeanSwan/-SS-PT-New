/**
 * Admin Payment Settings Routes
 * ==============================
 * CRUD for configurable payment method details (Zelle email, Venmo handle, check payee).
 * Stored in AdminSettings model with category='payment' and JSON settings column.
 *
 * Endpoints:
 * - GET  /api/admin/payment-settings       — Admin: get all payment settings
 * - PUT  /api/admin/payment-settings       — Admin: update payment settings
 * - GET  /api/admin/payment-settings/public — Public: get non-sensitive payment info
 */
import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

const CATEGORY = 'payment';

const DEFAULTS = {
  zelleRecipient: process.env.DEFAULT_ZELLE_RECIPIENT || '',
  venmoHandle: process.env.DEFAULT_VENMO_HANDLE || '',
  checkPayeeName: process.env.DEFAULT_CHECK_PAYEE_NAME || 'SwanStudios',
};

/**
 * Helper: get the AdminSettings model
 */
async function getSettingsModel() {
  try {
    const mod = await import('../models/AdminSettings.mjs');
    return mod.default;
  } catch {
    return null;
  }
}

/**
 * Helper: get payment settings record (or create with defaults)
 */
async function getPaymentSettings() {
  const AdminSettings = await getSettingsModel();
  if (!AdminSettings) return { ...DEFAULTS };

  try {
    let record = await AdminSettings.findOne({ where: { category: CATEGORY } });
    if (!record) {
      record = await AdminSettings.create({
        category: CATEGORY,
        settings: { ...DEFAULTS },
      });
    }
    return { ...DEFAULTS, ...(record.settings || {}) };
  } catch (err) {
    logger.error('[PaymentSettings] Error reading settings:', err.message);
    return { ...DEFAULTS };
  }
}

/**
 * GET /api/admin/payment-settings/public
 * Public endpoint — returns payment config for checkout UI.
 * No auth required.
 */
router.get('/public', async (_req, res) => {
  try {
    const settings = await getPaymentSettings();
    return res.json({
      success: true,
      settings: {
        zelleRecipient: settings.zelleRecipient || '',
        venmoHandle: settings.venmoHandle || '',
        checkPayeeName: settings.checkPayeeName || 'SwanStudios',
      },
    });
  } catch (err) {
    logger.error('[PaymentSettings] Error fetching public settings:', err.message);
    return res.json({
      success: true,
      settings: { ...DEFAULTS },
    });
  }
});

/**
 * GET /api/admin/payment-settings
 *
 * Admin OR TRAINER — not admin-only, despite living under /api/admin. The header
 * used to say "Admin only" while the code below has always allowed trainers
 * (rule 75: the doc describes what the code does now). Corrected rather than
 * tightened, because tightening would gain nothing: the fields this returns are
 * the same zelle/venmo/checkPayee values that GET /public hands to anonymous
 * callers by design, so a trainer reading them learns nothing new.
 *
 * ⚠️ That equivalence is the reason this is safe, and it is not guaranteed to
 * hold. `settings` is a JSON blob — the moment a genuinely admin-only key is
 * stored in it, this route starts leaking it to every trainer. Add such a key and
 * you must tighten this check to admin-only at the same time.
 *
 * PUT below is correctly admin-only.
 */
router.get('/', protect, async (req, res) => {
  try {
    if (!['admin', 'trainer'].includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const settings = await getPaymentSettings();
    return res.json({ success: true, settings });
  } catch (err) {
    logger.error('[PaymentSettings] Error fetching admin settings:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load settings' });
  }
});

/**
 * PUT /api/admin/payment-settings
 * Admin only — update payment settings.
 */
router.put('/', protect, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { zelleRecipient, venmoHandle, checkPayeeName } = req.body;
    const AdminSettings = await getSettingsModel();
    if (!AdminSettings) {
      return res.status(500).json({ success: false, message: 'Settings model unavailable' });
    }

    let record = await AdminSettings.findOne({ where: { category: CATEGORY } });
    const newSettings = {
      zelleRecipient: zelleRecipient ?? record?.settings?.zelleRecipient ?? DEFAULTS.zelleRecipient,
      venmoHandle: venmoHandle ?? record?.settings?.venmoHandle ?? DEFAULTS.venmoHandle,
      checkPayeeName: checkPayeeName ?? record?.settings?.checkPayeeName ?? DEFAULTS.checkPayeeName,
    };

    if (record) {
      record.settings = newSettings;
      record.changed('settings', true);
      await record.save();
    } else {
      record = await AdminSettings.create({ category: CATEGORY, settings: newSettings });
    }

    console.warn(`[AUDIT] Admin ${req.user.id} (${req.user.username}) updated payment settings`);
    logger.info('[PaymentSettings] Settings updated by admin:', req.user.id);

    return res.json({ success: true, settings: newSettings });
  } catch (err) {
    logger.error('[PaymentSettings] Error updating settings:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
});

export default router;
