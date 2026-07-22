/**
 * AcquisitionEvent.mjs — P0-4 (SWA-29) the funnel event stream (MEASUREMENT-CHARTER.md).
 *
 * One row per funnel step: `{ event, ref?, meta_json, ts }`. Small, non-identifying payload
 * only — the sanitizer in acquisitionTelemetry.mjs is the sole writer and guarantees no PII /
 * no raw amounts reach `meta_json`. Indexed on (event, ts) for the last-7-day rollup query.
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class AcquisitionEvent extends Model {}

AcquisitionEvent.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    event: { type: DataTypes.STRING(48), allowNull: false },
    ref: { type: DataTypes.STRING(64), allowNull: true },
    metaJson: { type: DataTypes.JSONB, allowNull: false, defaultValue: {}, field: 'meta_json' },
    ts: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'AcquisitionEvent',
    tableName: 'acquisition_events',
    timestamps: false,
    underscored: true,
    indexes: [{ fields: ['event'] }, { fields: ['ts'] }, { fields: ['event', 'ts'] }],
  }
);

export default AcquisitionEvent;
