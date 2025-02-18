import path from 'path';
import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Resolve __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Sequelize
const sequelize = new Sequelize(
  process.env.PG_DB,
  process.env.PG_USER,
  String(process.env.PG_PASSWORD),
  {
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    dialect: 'postgres',
    logging: false,
  }
);

// Models Definition
const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: true }, // Optional email
  role: { type: DataTypes.STRING, defaultValue: 'user' }, // Default role
});

// Example: Define more models here (uncomment as needed)
/*
const Property = sequelize.define('Property', {
  name: { type: DataTypes.STRING, allowNull: false },
  address: { type: DataTypes.STRING, allowNull: false },
  clientSince: { type: DataTypes.DATE, allowNull: true },
});

const Guard = sequelize.define('Guard', {
  name: { type: DataTypes.STRING, allowNull: false },
  rank: { type: DataTypes.STRING, allowNull: true },
});
*/

// Add associations between models here if required
// Example: Property.hasMany(Guard); Guard.belongsTo(Property);

// Populate the Database
const populateDatabase = async () => {
  try {
    // Authenticate and sync models
    await sequelize.authenticate();
    console.log('Database connection established.');
    await sequelize.sync({ force: true }); // Reset the database

    // Add Dummy Data
    await User.create({
      username: 'admin',
      password: 'password123', // In production, always hash passwords
      role: 'admin',
    });

    // Example: Add more dummy data
    /*
    await Property.create({
      name: 'Corporate HQ',
      address: '123 Main Street, Cityville',
      clientSince: new Date('2020-01-01'),
    });

    await Guard.create({
      name: 'Jane Doe',
      rank: 'Captain',
    });
    */

    console.log('Dummy data added successfully.');
  } catch (error) {
    console.error('Error populating database:', error);
  } finally {
    await sequelize.close();
    console.log('Database connection closed.');
  }
};

populateDatabase();