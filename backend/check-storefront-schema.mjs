import { Sequelize, QueryTypes } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'swanstudios',
  process.env.DB_USER || 'swanadmin',
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

async function checkSchema() {
  const cols = await sequelize.query(
    `SELECT column_name, data_type, character_maximum_length, is_nullable
     FROM information_schema.columns
     WHERE table_name = 'storefront_items'
     ORDER BY ordinal_position`,
    { type: QueryTypes.SELECT }
  );

  console.log('Storefront Items Table Columns:');
  console.log(JSON.stringify(cols, null, 2));

  await sequelize.close();
}

checkSchema();
