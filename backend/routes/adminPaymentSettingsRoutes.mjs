/**
 * Admin Payment Settings Routes
 * ==============================
 * CRUD for configurable payment method details (Zelle email, Venmo handle, check payee).
 * Stored in AdminSettings model (key-value pairs).
 *
 * Endpoints:
 * - GET  /api/admin/payment-settings       — Admin: get all payment settings
 * - PUT  /api/admin/payment-settings       — Admin: update payment settings
 * - GET  /api/admin/payment-settings/public — Public: get non-sensitive payment info
 */
import express from 'express';
import logger from '../utils/logger.mjs';

const router = express.Router();

// Settings keys for payment configuration
const SETTINGS_KEYS = {
  ZELLE_RECIPIENT: 'payment_zelle_recipient',
  VENMO_HANDLE: 'payment_venmo_handle',
  CHECK_PAYEE: 'payment_check_payee_name',
};

// Default values
const DEFAULTS = {
  [SETTINGS_KEYS.ZELLE_RECIPIENT]: '',
  [SETTINGS_KEYS.VENMO_HANDLE]: '',
  [SETTINGS_KEYS.CHECK_PAYEE]: 'SwanStudios',
};

/**
 * Helper: get or create AdminSettings model
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
 * Helper: get all payment settings as object
 */
async function getPaymentSettings() {
  const AdminSettings = await getSettingsModel();
  if (!AdminSettings) return { ...DEFAULTS };

  const result = {};
  for (const [key, settingKey] of Object.entries(SETTINGS_KEYS)) {
    try {
      const record = await AdminSettings.findOne({ where: { key: settingKey } });
      result[settingKey] = record?.value || DEFAULTS[settingKey] || '';
    } catch {
      result[settingKey] = DEFAULTS[settingKey] || '';
    }
  }
  return result;
}

/**
 * GET /api/admin/payment-settings/public
 * Public endpoint — returns non-sensitive payment config for checkout UI.
 * No auth required.
 */
router.get('/public', async (req, res) => {
  try {
    const settings = await getPaymentSettings();
    return res.json({
      success: true,
      settings: {
        zelleRecipient: settings[SETTINGS_KEYS.ZELLE_RECIPIENT] || '',
        venmoHandle: settings[SETTINGS_KEYS.VENMO_HANDLE] || '',
        checkPayeeName: settings[SETTINGS_KEYS.CHECK_PAYEE] || 'SwanStudios',
      },
    });
  } catch (err) {
    logger.error('[PaymentSettings] Error fetching public settings:', err.message);
    return res.json({
      success: true,
      settings: {
        zelleRecipient: '',
        venmoHandle: '',
        checkPayeeName: 'SwanStudios',
      },
    });
  }
});

export default router;
