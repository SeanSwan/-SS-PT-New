/**
 * ┌─── MODEL: OlympicEvent ───────────────────────────────────────┐
 * │ PURPOSE: Stores Virtual Olympics performance recordings for    │
 * │          Ghost Racing — async competitive events where users   │
 * │          race against other users' recorded performances.      │
 * │ CEO RULING: 2026-04-07 — Ghost Racing (async), NOT real-time  │
 * │          multiplayer. 3 events: Pull-ups, Push-ups, Sprint.   │
 * └───────────────────────────────────────────────────────────────┘
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class OlympicEvent extends Model {}

OlympicEvent.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'FK to Users — who performed this',
    },
    eventType: {
      type: DataTypes.ENUM('pullups', 'pushups', 'sprint'),
      allowNull: false,
      comment: 'Which Olympic event',
    },
    score: {
      type: DataTypes.FLOAT,
      allowNull: false,
      comment: 'Primary metric: reps for pullups/pushups, seconds for sprint',
    },
    timeSeries: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Per-second performance data for Ghost Racing replay: [{ t: seconds, value: repCount|distance }]',
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Total time in seconds',
    },
    isPersonalBest: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'True if this was a PR at time of recording',
    },
    xpAwarded: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'XP earned from this performance',
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Extra data: bodyweight, notes, device info',
    },
  },
  {
    sequelize,
    modelName: 'OlympicEvent',
    tableName: 'olympic_events',
    timestamps: true,
    indexes: [
      { fields: ['userId', 'eventType'] },
      { fields: ['eventType', 'score'] },
      { fields: ['eventType', 'isPersonalBest'] },
    ],
  }
);

export default OlympicEvent;
