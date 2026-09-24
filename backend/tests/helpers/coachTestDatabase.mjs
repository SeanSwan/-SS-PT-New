/** Explicit disposable-Postgres connection. Never reads application .env/DB URLs.
 * Test runner supplies the port of its owned container; fixed loopback/test DB.
 */
import { Sequelize } from 'sequelize';
const port = Number(process.env.SWAN_COACH_TEST_PORT);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('Set SWAN_COACH_TEST_PORT to the owned disposable container port');
const database = 'coach_test_20260906';
const sequelize = new Sequelize(database, 'coach_test_admin', '', {
  dialect: 'postgres', host: '127.0.0.1', port, logging: false,
  pool: { max: 25, min: 0, acquire: 10000, idle: 1000 },
  dialectOptions: { connectionTimeoutMillis: 3000 },
});
export default sequelize;
