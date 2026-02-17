/**
 * Cart schema-recovery helpers.
 *
 * Purpose:
 * - Keep cart endpoints operational when a deployment has partial cart schema
 *   drift (for example, ShoppingCart model fields ahead of DB columns).
 * - Recover from missing-column read/write failures using a minimal raw SQL path.
 */

const RECOVERABLE_SHOPPING_CART_COLUMNS = [
  'paymentintentid',
  'checkoutsessionid',
  'paymentstatus',
  'completedat',
  'lastactivityat',
  'checkoutsessionexpired',
  'sessionsgranted',
  'stripesessiondata',
  'customerinfo',
  'subtotal',
  'tax',
  'lastcheckoutattempt'
];

/**
 * Normalize authenticated user ID into an integer required by cart tables.
 */
export function normalizeAuthenticatedUserId(userId) {
  const parsed = Number.parseInt(String(userId), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid authenticated userId for cart routes: ${userId}`);
  }
  return parsed;
}

/**
 * Detect recoverable missing-column database errors from Sequelize/PG.
 */
export function isRecoverableCartSchemaError(error) {
  if (!error) return false;

  const code = error?.parent?.code || error?.original?.code || error?.code;
  const text = `${error?.message || ''} ${error?.parent?.message || ''} ${error?.original?.message || ''}`.toLowerCase();

  const isMissingColumn =
    code === '42703' || // Postgres undefined_column
    (text.includes('column') && text.includes('does not exist')) ||
    text.includes('unknown column');

  if (!isMissingColumn) return false;

  return RECOVERABLE_SHOPPING_CART_COLUMNS.some((name) => text.includes(name));
}

async function resolveShoppingCartUserColumnExpression(sequelize) {
  const [columns] = await sequelize.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'shopping_carts'
      AND column_name IN ('userId', 'user_id')
    ORDER BY column_name DESC;
  `);

  const names = (columns || []).map((row) => row.column_name);
  if (names.includes('userId')) return '"userId"';
  if (names.includes('user_id')) return 'user_id';

  // Default to canonical camel-case column.
  return '"userId"';
}

async function findOrCreateActiveCartRaw(sequelize, userId) {
  const userColumn = await resolveShoppingCartUserColumnExpression(sequelize);

  const [existingRows] = await sequelize.query(`
    SELECT id, status
    FROM shopping_carts
    WHERE ${userColumn} = :userId
      AND status = 'active'
    ORDER BY id DESC
    LIMIT 1;
  `, {
    replacements: { userId }
  });

  if (existingRows && existingRows.length > 0) {
    return [{
      id: existingRows[0].id,
      status: existingRows[0].status || 'active',
      userId
    }, false];
  }

  const [insertedRows] = await sequelize.query(`
    INSERT INTO shopping_carts (${userColumn}, status, "createdAt", "updatedAt")
    VALUES (:userId, 'active', NOW(), NOW())
    RETURNING id, status;
  `, {
    replacements: { userId }
  });

  const inserted = insertedRows?.[0];
  if (!inserted?.id) {
    throw new Error('Failed to create fallback active shopping cart');
  }

  return [{
    id: inserted.id,
    status: inserted.status || 'active',
    userId
  }, true];
}

/**
 * Resilient cart loader:
 * 1) Try model-level findOrCreate
 * 2) If missing-column schema drift is detected, fallback to raw SQL
 */
export async function safeFindOrCreateActiveCart(ShoppingCart, userId, logger = console) {
  const normalizedUserId = normalizeAuthenticatedUserId(userId);

  try {
    return await ShoppingCart.findOrCreate({
      where: {
        userId: normalizedUserId,
        status: 'active'
      },
      defaults: {
        userId: normalizedUserId
      },
      // Restrict selected/inserted fields to columns guaranteed by legacy schema.
      attributes: ['id', 'status', 'userId'],
      fields: ['userId', 'status']
    });
  } catch (error) {
    if (!isRecoverableCartSchemaError(error)) {
      throw error;
    }

    logger.warn('[CartSchemaRecovery] ShoppingCart.findOrCreate failed due to schema drift. Using raw SQL fallback.', {
      message: error.message
    });

    return findOrCreateActiveCartRaw(ShoppingCart.sequelize, normalizedUserId);
  }
}

