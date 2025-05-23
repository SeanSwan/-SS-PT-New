// /backend/models/StorefrontItem.mjs
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

/**
 * StorefrontItem Model (Updated to match migration)
 * Uses STRING for ENUM types with validation, FLOAT for currency.
 * Includes Stripe and isActive fields.
 */
class StorefrontItem extends Model {
   // NOTE: Seeding logic is best handled by dedicated seeder files in `backend/seeders/`
   // The file `backend/seeders/20250320045205-storefront-items.cjs` should be updated
   // to match this model's schema (DECIMAL types, new columns, etc.) if you use it.
   static async seedPackages() {
     console.warn("DEPRECATED: StorefrontItem.seedPackages() in model. Use dedicated seeder files instead.");
   }
}

StorefrontItem.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  packageType: {
    type: DataTypes.STRING, // Model uses STRING
    allowNull: false,
    defaultValue: 'fixed',
    validate: {
      isIn: {
        args: [['fixed', 'monthly']], // Enforced by model
        msg: "Package type must be 'fixed' or 'monthly'"
      }
    },
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
        notEmpty: { msg: "Name cannot be empty"}
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
   price: {
     type: DataTypes.DECIMAL(10, 2), // Changed to DECIMAL for production precision
     allowNull: true,
     validate: {
         isDecimal: { msg: "Price must be a valid decimal number"}, 
         min: 0 // Optional: Ensure non-negative
     }
   },
  sessions: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
        isInt: { msg: "Sessions must be an integer"},
        min: 0
    }
  },
  pricePerSession: {
    type: DataTypes.DECIMAL(10, 2), // Changed to DECIMAL for production precision
    allowNull: false, // Required if applicable
     validate: {
         isDecimal: { msg: "Price per session must be a valid decimal number"},
         min: {
           args: 140,
           msg: "Price per session must be at least $140"
         },
         notNull: { msg: "Price per session is required" } // Add notNull if always required
     }
  },
  months: {
    type: DataTypes.INTEGER,
    allowNull: true,
     validate: {
        isInt: { msg: "Months must be an integer"},
        min: 0
    }
  },
  sessionsPerWeek: {
    type: DataTypes.INTEGER,
    allowNull: true,
     validate: {
        isInt: { msg: "Sessions per week must be an integer"},
        min: 0
    }
  },
  totalSessions: {
    type: DataTypes.INTEGER,
    allowNull: true,
     validate: {
        isInt: { msg: "Total sessions must be an integer"},
        min: 0
    }
  },
  totalCost: {
    type: DataTypes.DECIMAL(10, 2), // Changed to DECIMAL for production precision
    allowNull: true, // Calculated by hooks
     validate: {
         isDecimal: { msg: "Total cost must be a valid decimal number"},
         min: 0
     }
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      // Custom validator that allows relative paths starting with / or full URLs
      customUrl: function(value) {
        if (value === null || value === undefined || value === '') {
          return; // Allow null/empty values
        }
        // Allow relative paths starting with / or full URLs
        if (value.startsWith('/') || /^https?:\/\/.+/.test(value)) {
          return;
        }
        throw new Error('Image URL must be a valid URL or relative path starting with /');
      }
    }
  },
  theme: {
    type: DataTypes.STRING, // Model uses STRING
    allowNull: true,
    defaultValue: 'cosmic',
    validate: {
      isIn: {
        args: [['cosmic', 'purple', 'ruby', 'emerald']], // Enforced by model
        msg: "Invalid theme specified"
      }
    }
  },
  // Added Fields
  stripeProductId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  stripePriceId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    validate: {
      isInt: { msg: "Display order must be an integer" },
      min: 0
    }
  },
  // createdAt and updatedAt are managed by Sequelize because timestamps: true
}, {
  sequelize,
  modelName: 'StorefrontItem',
  tableName: 'storefront_items',
  timestamps: true, // Enable timestamps
  hooks: {
    beforeValidate: (item) => { // Removed TypeScript annotation for compatibility
      // Calculate totalSessions if applicable
      if (item.packageType === 'monthly' && item.months && item.sessionsPerWeek && (item.totalSessions === null || typeof item.totalSessions === 'undefined')) {
        item.totalSessions = item.months * item.sessionsPerWeek * 4;
      }

      // Calculate totalCost if applicable and not already set
      const sessionsNum = typeof item.sessions === 'string' ? parseInt(item.sessions, 10) : item.sessions;
      const pricePerSessionNum = typeof item.pricePerSession === 'string' ? parseFloat(item.pricePerSession) : item.pricePerSession;
      const totalSessionsNum = typeof item.totalSessions === 'string' ? parseInt(item.totalSessions, 10) : item.totalSessions;

      if ((item.totalCost === null || typeof item.totalCost === 'undefined') && !isNaN(pricePerSessionNum)) {
         if (item.packageType === 'fixed' && !isNaN(sessionsNum) && sessionsNum > 0) {
            item.totalCost = parseFloat((sessionsNum * pricePerSessionNum).toFixed(2));
         } else if (item.packageType === 'monthly' && !isNaN(totalSessionsNum) && totalSessionsNum > 0) {
            item.totalCost = parseFloat((totalSessionsNum * pricePerSessionNum).toFixed(2));
         }
       }

       // Set 'price' field to 'totalCost' if 'price' is missing and 'totalCost' has been calculated
       if ((item.price === null || typeof item.price === 'undefined') && item.totalCost !== null && typeof item.totalCost !== 'undefined') {
         item.price = item.totalCost;
       }
    }
  }
});

export default StorefrontItem;