require('dotenv').config({ path: '../.env' });

// TLS against Render's Postgres is the default and is unchanged. Only the
// migration shadow check (a throwaway container with no TLS) sets PGSSLMODE=disable;
// without the opt-out that job fails at connect time instead of testing migrations.
const sslDisabled = ['disable', 'false', '0', 'off'].includes(
  String(process.env.PGSSLMODE || '').trim().toLowerCase()
);

module.exports = {
  development: {
    username: process.env.PG_USER || 'swanadmin',
    password: process.env.PG_PASSWORD || 'postgres',
    database: process.env.PG_DB || 'swanstudios',
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    dialect: 'postgres',
    logging: console.log
  },
  test: {
    username: process.env.PG_USER || 'swanadmin',
    password: process.env.PG_PASSWORD || 'postgres',
    database: process.env.PG_DB_TEST || 'swanstudios_test',
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    dialect: 'postgres',
    logging: false
  },
  production: {
    // Use the DATABASE_URL environment variable provided by Render
    // This is needed for Sequelize CLI migrations to work properly
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: sslDisabled
      ? { ssl: false }
      : {
          ssl: {
            require: true,
            rejectUnauthorized: false // Required for Render PostgreSQL
          }
        },
    logging: false,
    pool: {
      max: 15,
      min: 2,
      acquire: 30000,
      idle: 10000
    }
  }
};
