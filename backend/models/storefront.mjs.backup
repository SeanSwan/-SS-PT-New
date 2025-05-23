// /backend/models/StorefrontItem.mjs
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

/**
 * StorefrontItem Model
 *
 * This model stores items offered in the storefront.
 * It supports two package types:
 *   - "fixed": A one-time purchase package (with a fixed number of sessions).
 *   - "monthly": A recurring package (with details like months and sessions per week).
 *
 * Fields:
 *   - packageType: ENUM('fixed', 'monthly') — distinguishes the package type.
 *   - name: Name of the package.
 *   - description: A short description.
 *   - sessions: (fixed packages only) The number of sessions.
 *   - pricePerSession: The price per session.
 *   - months: (monthly packages only) The number of months.
 *   - sessionsPerWeek: (monthly packages only) The number of sessions per week.
 *   - totalSessions: (optional) Total sessions (calculated or stored for monthly packages).
 *   - totalCost: (optional) Total cost (calculated or stored for monthly packages).
 *   - imageUrl: (optional) URL to package image.
 *   - theme: (optional) Theme for styling (cosmic, purple, ruby, emerald).
 */
class StorefrontItem extends Model {}

StorefrontItem.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // 'fixed' for one-time packages or 'monthly' for recurring packages.
  packageType: {
    type: DataTypes.ENUM('fixed', 'monthly'),
    allowNull: false,
    defaultValue: 'fixed',
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // For fixed packages (e.g., 8 sessions).
  sessions: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // Common field: Price per session.
  pricePerSession: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  // For monthly packages.
  months: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  sessionsPerWeek: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // Optional fields that can be pre-calculated.
  totalSessions: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  totalCost: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  // Additional fields for UI/UX
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  theme: {
    type: DataTypes.ENUM('cosmic', 'purple', 'ruby', 'emerald'),
    allowNull: true,
    defaultValue: 'cosmic',
  },
}, {
  sequelize,
  modelName: 'StorefrontItem',
  tableName: 'storefront_items',
  timestamps: true,
  hooks: {
    // Calculate totalSessions and totalCost if not provided
    beforeValidate: (item) => {
      // For monthly packages, calculate total sessions if not provided
      if (item.packageType === 'monthly' && item.months && item.sessionsPerWeek && !item.totalSessions) {
        // Assuming 4 weeks per month for calculation
        item.totalSessions = item.months * item.sessionsPerWeek * 4;
      }

      // Calculate total cost if not provided
      if (!item.totalCost) {
        if (item.packageType === 'fixed' && item.sessions && item.pricePerSession) {
          item.totalCost = item.sessions * item.pricePerSession;
        } else if (item.packageType === 'monthly' && item.totalSessions && item.pricePerSession) {
          item.totalCost = item.totalSessions * item.pricePerSession;
        }
      }
    }
  }
});

// Static method to create hardcoded package items
StorefrontItem.seedPackages = async function() {
  // Check if any items exist
  const count = await this.count();
  if (count > 0) {
    console.log('Storefront items already exist. Skipping seed.');
    return;
  }

  // Create fixed packages
  const fixedPackages = [
    {
      packageType: 'fixed',
      sessions: 8,
      pricePerSession: 175,
      name: "Gold Glimmer",
      description: "An introductory 8-session package to ignite your transformation.",
      theme: "cosmic"
    },
    {
      packageType: 'fixed',
      sessions: 20,
      pricePerSession: 165,
      name: "Platinum Pulse",
      description: "Elevate your performance with 20 dynamic sessions.",
      theme: "purple"
    },
    {
      packageType: 'fixed',
      sessions: 50,
      pricePerSession: 150,
      name: "Rhodium Rise",
      description: "Unleash your inner champion with 50 premium sessions.",
      theme: "emerald"
    },
  ];

  // Create monthly packages
  const monthlyPackages = [
    { 
      packageType: 'monthly',
      months: 3, 
      sessionsPerWeek: 4, 
      pricePerSession: 155,
      name: 'Silver Storm', 
      description: 'High intensity 3-month program at 4 sessions per week.',
      theme: "cosmic"
    },
    { 
      packageType: 'monthly',
      months: 6, 
      sessionsPerWeek: 4, 
      pricePerSession: 145,
      name: 'Gold Grandeur', 
      description: 'Maximize your potential with 6 months at 4 sessions per week.',
      theme: "purple"
    },
    { 
      packageType: 'monthly',
      months: 9, 
      sessionsPerWeek: 4, 
      pricePerSession: 140,
      name: 'Platinum Prestige', 
      description: 'The best value – 9 months at 4 sessions per week.',
      theme: "ruby"
    },
    { 
      packageType: 'monthly',
      months: 12, 
      sessionsPerWeek: 4, 
      pricePerSession: 135,
      name: 'Rhodium Reign', 
      description: 'The ultimate value – 12 months at 4 sessions per week at an unbeatable rate.',
      theme: "emerald"
    },
  ];

  // Combine and create all packages
  const allPackages = [...fixedPackages, ...monthlyPackages];
  await this.bulkCreate(allPackages);
  
  console.log(`Successfully seeded ${allPackages.length} storefront items.`);
};

export default StorefrontItem;