/**
 * Cart schema-recovery helpers.
 *
 * Purpose:
 * - Keep cart endpoints operational when a deployment has partial cart schema
 *   drift (for example, ShoppingCart model fields ahead of DB columns).
 * - Recover from missing-column read/write failures using a minimal raw SQL path.
 */

import crypto from 'crypto';

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
  'lastcheckoutattempt',
  'userid',
  'user_id'
];

const RECOVERABLE_CART_ITEM_COLUMNS = [
  'cartid',
  'cart_id',
  'storefrontitemid',
  'storefront_item_id',
  'quantity',
  'price',
  'cart_items',
  'storefront_items'
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
 * Detect recoverable cart-related schema/type drift errors from Sequelize/PG.
 */
function isRecoverableCartDbError(error) {
  if (!error) return false;

  const code = error?.parent?.code || error?.original?.code || error?.code;
  const text = `${error?.message || ''} ${error?.parent?.message || ''} ${error?.original?.message || ''}`.toLowerCase();

  const isMissingColumn =
    code === '42703' || // Postgres undefined_column
    (text.includes('column') && text.includes('does not exist')) ||
    text.includes('unknown column');

  const isTypeDrift =
    code === '22P02' || // invalid_text_representation
    code === '42804' || // datatype_mismatch
    (text.includes('operator does not exist') && text.includes('uuid') && text.includes('integer')) ||
    (text.includes('invalid input syntax') && text.includes('uuid'));

  return {
    isRecoverable: isMissingColumn || isTypeDrift,
    text
  };
}

/**
 * Detect recoverable shopping-cart schema errors.
 */
export function isRecoverableCartSchemaError(error) {
  const { isRecoverable, text } = isRecoverableCartDbError(error);
  if (!isRecoverable) return false;

  return RECOVERABLE_SHOPPING_CART_COLUMNS.some((name) => text.includes(name))
    || text.includes('shopping_carts')
    || text.includes('cart');
}

/**
 * Detect recoverable cart-item/storefront schema errors.
 */
export function isRecoverableCartItemsSchemaError(error) {
  const { isRecoverable, text } = isRecoverableCartDbError(error);
  if (!isRecoverable) return false;

  return RECOVERABLE_CART_ITEM_COLUMNS.some((name) => text.includes(name))
    || text.includes('cart item')
    || text.includes('storefront');
}

function deterministicUuidFromUserId(userIdText) {
  const hash = crypto.createHash('md5').update(`cart-user-${userIdText}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

function toSqlIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

async function getTableColumnMeta(sequelize, tableName) {
  const [columns] = await sequelize.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = :tableName;
  `, {
    replacements: { tableName }
  });

  return Array.isArray(columns) ? columns : [];
}

async function resolveColumnMeta(sequelize, tableName, candidates, fallbackDataType = null) {
  const columns = await getTableColumnMeta(sequelize, tableName);
  const lowerToMeta = new Map(
    columns
      .filter((row) => row?.column_name)
      .map((row) => [String(row.column_name).toLowerCase(), row])
  );

  for (const candidate of candidates) {
    const found = lowerToMeta.get(String(candidate).toLowerCase());
    if (found) {
      return {
        columnName: found.column_name,
        dataType: found.data_type || fallbackDataType,
        expression: toSqlIdentifier(found.column_name)
      };
    }
  }

  if (candidates.length === 0) return null;

  return {
    columnName: candidates[0],
    dataType: fallbackDataType,
    expression: toSqlIdentifier(candidates[0])
  };
}

function normalizePositiveInteger(value, fallback = 1) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function normalizeFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

async function resolveStorefrontTable(StorefrontItem) {
  const tableNameRef = StorefrontItem.getTableName();
  if (typeof tableNameRef === 'string') {
    return { tableName: tableNameRef, tableSql: toSqlIdentifier(tableNameRef) };
  }

  const tableName = tableNameRef?.tableName || 'storefront_items';
  const schema = tableNameRef?.schema;

  if (schema) {
    return {
      tableName,
      tableSql: `${toSqlIdentifier(schema)}.${toSqlIdentifier(tableName)}`
    };
  }

  return { tableName, tableSql: toSqlIdentifier(tableName) };
}

async function resolveShoppingCartUserColumnMeta(sequelize) {
  const resolved = await resolveColumnMeta(
    sequelize,
    'shopping_carts',
    ['userId', 'user_id', 'userid'],
    'integer'
  );

  if (!resolved) {
    return { expression: '"userId"', columnName: 'userId', dataType: 'integer' };
  }

  return resolved;
}

async function findOrCreateActiveCartRaw(sequelize, userId) {
  const userIdText = String(userId);
  const userColumnMeta = await resolveShoppingCartUserColumnMeta(sequelize);
  const userColumn = userColumnMeta.expression;
  const isUuidColumn = userColumnMeta.dataType === 'uuid';
  const userUuid = deterministicUuidFromUserId(userIdText);
  const userLookupValue = isUuidColumn ? userUuid : userIdText;

  const [existingRows] = await sequelize.query(`
    SELECT id, status
    FROM shopping_carts
    WHERE (${userColumn})::text = :userLookupValue
      AND status = 'active'
    ORDER BY id DESC
    LIMIT 1;
  `, {
    replacements: { userLookupValue }
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
    VALUES (${isUuidColumn ? ':userUuid' : ':userId'}, 'active', NOW(), NOW())
    RETURNING id, status;
  `, {
    replacements: { userId, userUuid }
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

async function findCartItemsWithStorefrontRaw(sequelize, StorefrontItem, cartId, storefrontAttributes) {
  const cartIdText = String(cartId);
  const cartIdColumn = await resolveColumnMeta(sequelize, 'cart_items', ['cartId', 'cart_id', 'cartid']);
  const storefrontIdColumn = await resolveColumnMeta(
    sequelize,
    'cart_items',
    ['storefrontItemId', 'storefront_item_id', 'storefrontitemid']
  );
  const quantityColumn = await resolveColumnMeta(sequelize, 'cart_items', ['quantity']);
  const priceColumn = await resolveColumnMeta(sequelize, 'cart_items', ['price']);

  if (!cartIdColumn || !storefrontIdColumn) {
    return [];
  }

  const cartItemSelect = [
    'id',
    `${storefrontIdColumn.expression} AS "storefrontItemId"`,
    `${quantityColumn?.expression || '1'} AS "quantity"`,
    `${priceColumn?.expression || '0'} AS "price"`
  ];

  const [rawCartItems] = await sequelize.query(`
    SELECT ${cartItemSelect.join(', ')}
    FROM cart_items
    WHERE (${cartIdColumn.expression})::text = :cartIdText
    ORDER BY id ASC;
  `, {
    replacements: { cartIdText }
  });

  if (!Array.isArray(rawCartItems) || rawCartItems.length === 0) {
    return [];
  }

  const storefrontIds = Array.from(
    new Set(
      rawCartItems
        .map((row) => normalizePositiveInteger(row.storefrontItemId, 0))
        .filter((id) => id > 0)
    )
  );

  const { tableName: storefrontTableName, tableSql: storefrontTableSql } = await resolveStorefrontTable(StorefrontItem);
  const storefrontTableColumns = await getTableColumnMeta(sequelize, storefrontTableName);
  const storefrontColumnSet = new Set(storefrontTableColumns.map((row) => String(row.column_name).toLowerCase()));

  const preferredStorefrontColumns = (Array.isArray(storefrontAttributes) ? storefrontAttributes : ['id', 'name', 'price'])
    .filter((column) => storefrontColumnSet.has(String(column).toLowerCase()));

  if (!preferredStorefrontColumns.some((column) => String(column).toLowerCase() === 'id') && storefrontColumnSet.has('id')) {
    preferredStorefrontColumns.unshift('id');
  }

  const storefrontById = new Map();
  if (storefrontIds.length > 0 && preferredStorefrontColumns.length > 0) {
    const storefrontSelect = preferredStorefrontColumns
      .map((column) => `${toSqlIdentifier(column)} AS ${toSqlIdentifier(column)}`)
      .join(', ');

    const [storefrontRows] = await sequelize.query(`
      SELECT ${storefrontSelect}
      FROM ${storefrontTableSql}
      WHERE id IN (:storefrontIds);
    `, {
      replacements: { storefrontIds }
    });

    for (const row of storefrontRows || []) {
      const id = normalizePositiveInteger(row.id, 0);
      if (id > 0) storefrontById.set(id, row);
    }
  }

  return rawCartItems.map((row) => {
    const storefrontItemId = normalizePositiveInteger(row.storefrontItemId, 0);
    return {
      id: normalizePositiveInteger(row.id, 0),
      cartId: normalizePositiveInteger(cartId, cartId),
      quantity: normalizePositiveInteger(row.quantity, 1),
      price: normalizeFiniteNumber(row.price, 0),
      storefrontItemId: storefrontItemId > 0 ? storefrontItemId : null,
      storefrontItem: storefrontItemId > 0 ? (storefrontById.get(storefrontItemId) || null) : null
    };
  });
}

/**
 * Resilient cart-item loader:
 * 1) Try model-level include query
 * 2) If schema drift/type drift is detected, fallback to raw SQL
 */
export async function safeLoadCartItemsWithStorefront({
  CartItem,
  StorefrontItem,
  cartId,
  storefrontAttributes = ['id', 'name', 'price'],
  logger = console
}) {
  try {
    return await CartItem.findAll({
      where: { cartId },
      include: [{
        model: StorefrontItem,
        as: 'storefrontItem',
        attributes: storefrontAttributes,
        required: false
      }]
    });
  } catch (error) {
    if (!isRecoverableCartItemsSchemaError(error)) {
      throw error;
    }

    logger.warn('[CartSchemaRecovery] CartItem.findAll failed due to schema drift. Using raw SQL fallback.', {
      message: error.message
    });

    return findCartItemsWithStorefrontRaw(
      CartItem.sequelize,
      StorefrontItem,
      cartId,
      storefrontAttributes
    );
  }
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
