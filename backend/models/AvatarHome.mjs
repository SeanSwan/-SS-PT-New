/**
 * ┌─── MODEL: AvatarHome ──────────────────────────────────────┐
 * │ PURPOSE: Stores 3D avatar customization and virtual home    │
 * │          state. Unlocks at Level 10 (progressive disclosure)│
 * │ CEO RULING: 2026-04-07 — 3D unlocks at Lv10, GLB assets,  │
 * │          WebGPU renderer, Minimalist Mode toggle.           │
 * └────────────────────────────────────────────────────────────┘
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class AvatarHome extends Model {}

AvatarHome.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      comment: 'One home per user',
    },
    unlocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'True when user reaches Level 10',
    },
    unlockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // ── Avatar Customization ──
    avatarBodyType: {
      type: DataTypes.ENUM('athletic', 'average', 'muscular', 'slim', 'curvy'),
      defaultValue: 'athletic',
    },
    avatarSkinTone: {
      type: DataTypes.STRING(7),
      defaultValue: '#C68642',
      comment: 'Hex color for skin tone',
    },
    avatarHairStyle: {
      type: DataTypes.STRING(30),
      defaultValue: 'short',
      comment: 'Hair style identifier',
    },
    avatarHairColor: {
      type: DataTypes.STRING(7),
      defaultValue: '#2C1B0E',
    },
    avatarOutfit: {
      type: DataTypes.STRING(30),
      defaultValue: 'starter_workout',
      comment: 'Outfit identifier — unlocked through progression',
    },

    // ── Home State ──
    homeTier: {
      type: DataTypes.ENUM('starter', 'mid', 'premium', 'luxury'),
      defaultValue: 'starter',
      comment: 'Overall home quality tier — upgrades with level',
    },
    activeRoom: {
      type: DataTypes.ENUM('bedroom', 'kitchen', 'training_room'),
      defaultValue: 'training_room',
      comment: 'Currently displayed room',
    },
    furniture: {
      type: DataTypes.JSON,
      defaultValue: {
        bedroom: { bed: 'starter_bed', decor: 'basic_poster' },
        kitchen: { fridge: 'starter_fridge', table: 'basic_table' },
        training_room: { equipment: 'starter_rack', mat: 'basic_mat' },
      },
      comment: 'Furniture items per room — upgraded through progression',
    },

    // ── Preferences ──
    minimalistMode: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'When true, shows 2D data grid instead of 3D world (WCAG 2.2)',
    },
    cameraAngle: {
      type: DataTypes.STRING(20),
      defaultValue: 'default',
      comment: 'Saved camera position preference',
    },
  },
  {
    sequelize,
    modelName: 'AvatarHome',
    tableName: 'avatar_homes',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['userId'] },
    ],
  }
);

export default AvatarHome;
