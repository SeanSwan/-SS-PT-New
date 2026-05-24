/**
 * PageView Model
 * ==============
 * Persists anonymized page view data to PostgreSQL.
 * Complements the in-memory PAGE_VIEW_CACHE (which provides real-time "Live Now" data)
 * by storing permanent visitor history that survives deploys.
 *
 * Written to via buffered batch inserts (every 15s or 50 records) — never on every request.
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class PageView extends Model {}

PageView.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ip: {
      type: DataTypes.STRING(45),
      allowNull: false,
      comment: 'Legacy column name. Stores anonymized visitor key, never raw IP.',
    },
    page: { type: DataTypes.STRING(500), allowNull: true },
    referrer: { type: DataTypes.STRING(500), allowNull: true },
    userAgent: { type: DataTypes.STRING(500), allowNull: true, field: 'user_agent' },
    country: { type: DataTypes.STRING(100), allowNull: true },
    countryCode: { type: DataTypes.STRING(2), allowNull: true, field: 'country_code' },
    region: { type: DataTypes.STRING(100), allowNull: true },
    city: { type: DataTypes.STRING(100), allowNull: true },
    pageCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, field: 'page_count' },
    pages: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    firstSeen: { type: DataTypes.DATE, allowNull: false, field: 'first_seen' },
    lastSeen: { type: DataTypes.DATE, allowNull: false, field: 'last_seen' },
  },
  {
    sequelize,
    modelName: 'PageView',
    tableName: 'page_views',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['ip'] },
      { fields: ['last_seen'] },
      { fields: ['country_code'] },
      { fields: ['created_at'] },
    ],
  }
);

export default PageView;
