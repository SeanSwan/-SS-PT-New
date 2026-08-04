/**
 * Migration: enforce payment idempotency keys.
 *
 * Fails closed if duplicate active keys already exist; production must resolve
 * those rows before adding uniqueness so checkout/session-credit races cannot
 * create duplicate orders or print attempts.
 */

const ORDERS_TABLE = 'orders';
const PRINT_ORDERS_TABLE = 'print_orders';
const ORDER_INDEX = 'idx_orders_idempotency_key';
const PRINT_ORDER_INDEX = 'idx_print_orders_idempotency_key';

async function assertNoDuplicateKeys(queryInterface, tableName, fieldName) {
  const [rows] = await queryInterface.sequelize.query(`
    SELECT "${fieldName}" AS key, COUNT(*)::int AS count
    FROM "${tableName}"
    WHERE "${fieldName}" IS NOT NULL
    GROUP BY "${fieldName}"
    HAVING COUNT(*) > 1
    LIMIT 10;
  `);

  if (rows.length > 0) {
    const keys = rows.map((row) => row.key).join(', ');
    throw new Error(`Cannot add ${tableName}.${fieldName} unique index; duplicate keys exist: ${keys}`);
  }
}

export async function up(queryInterface, Sequelize) {
  const printOrders = await queryInterface.describeTable(PRINT_ORDERS_TABLE);
  if (!printOrders.idempotency_key) {
    await queryInterface.addColumn(PRINT_ORDERS_TABLE, 'idempotency_key', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  }

  await assertNoDuplicateKeys(queryInterface, ORDERS_TABLE, 'idempotencyKey');
  await assertNoDuplicateKeys(queryInterface, PRINT_ORDERS_TABLE, 'idempotency_key');

  await queryInterface.sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "${ORDER_INDEX}"
    ON "${ORDERS_TABLE}" ("idempotencyKey")
    WHERE "idempotencyKey" IS NOT NULL;
  `);

  await queryInterface.sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "${PRINT_ORDER_INDEX}"
    ON "${PRINT_ORDERS_TABLE}" ("idempotency_key")
    WHERE "idempotency_key" IS NOT NULL;
  `);
}

export async function down(queryInterface) {
  await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "${PRINT_ORDER_INDEX}";`);
  await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "${ORDER_INDEX}";`);

  const printOrders = await queryInterface.describeTable(PRINT_ORDERS_TABLE);
  if (printOrders.idempotency_key) {
    await queryInterface.removeColumn(PRINT_ORDERS_TABLE, 'idempotency_key');
  }
}
