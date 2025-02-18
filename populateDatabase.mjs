import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'postgres',
  logging: console.log, // Enable Sequelize logging to see SQL queries
});

const Guard = sequelize.define('Guard', {
  name: { type: DataTypes.STRING, allowNull: false },
  groupId: { type: DataTypes.STRING, allowNull: false },
  image_url: { type: DataTypes.STRING, allowNull: true },
  rating: { type: DataTypes.INTEGER, validate: { min: 1, max: 5 } },
  seniority: { type: DataTypes.INTEGER, comment: 'Seniority in number of years' },
  number: { type: DataTypes.STRING, validate: { is: /^\+?[1-9]\d{1,14}$/i } },
  address: { type: DataTypes.STRING, allowNull: true },
  cover_percentage: { type: DataTypes.INTEGER, validate: { min: 0, max: 100 } },
  rank: { type: DataTypes.STRING, allowNull: false },
  checkInTime: { type: DataTypes.DATE },
});

const Property = sequelize.define('Property', {
  name: { type: DataTypes.STRING, allowNull: false },
  address: { type: DataTypes.STRING, allowNull: false },
  image_url: { type: DataTypes.STRING },
  number: { type: DataTypes.STRING, validate: { is: /^\+?[1-9]\d{1,14}$/i } },
  emergency_number: { type: DataTypes.STRING, validate: { is: /^\+?[1-9]\d{1,14}$/i } },
  rating: { type: DataTypes.INTEGER, validate: { min: 1, max: 5 } },
  tow: { type: DataTypes.BOOLEAN, defaultValue: false },
  client_since: { type: DataTypes.DATE, allowNull: false },
});

const createDummyData = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    await sequelize.sync({ force: true }); // This will drop and recreate all tables
    console.log('Database synchronized successfully.');

    await Guard.bulkCreate([
      {
        name: 'John Doe',
        groupId: 'group1',
        image_url: 'https://example.com/john.jpg',
        rating: 5,
        seniority: 3,
        number: '+1234567890',
        address: '123 Main St, City, Country',
        cover_percentage: 80,
        rank: 'Captain',
        checkInTime: new Date(),
      },
      // Add more guards here
    ]);

    await Property.bulkCreate([
      {
        name: 'Building A',
        address: '123 Main St, City, Country',
        image_url: 'https://example.com/buildingA.jpg',
        number: '+1234567890',
        emergency_number: '+0987654321',
        rating: 4,
        tow: true,
        client_since: new Date(),
      },
      // Add more properties here
    ]);

    console.log('Dummy data created!');
  } catch (error) {
    console.error('Error creating dummy data:', error);
  } finally {
    await sequelize.close();
  }
};

createDummyData();


// node populateDatabase.mjs