/**
 * ┌─── MODEL: VideoSession ────────────────────────────────────┐
 * │ PURPOSE: Tracks video chat sessions for remote assessments. │
 * │ Links to Session (appointment) and User (client/trainer).  │
 * │ Stores LiveKit room info, recording URLs, and status.      │
 * │ CEO RULING: 2026-04-07 — LiveKit, R2 recordings, AES-256. │
 * └────────────────────────────────────────────────────────────┘
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class VideoSession extends Model {}

VideoSession.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'FK to Session (scheduled appointment). Null for ad-hoc calls.',
    },
    trainerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'The trainer/admin initiating the call',
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'The client joining the call',
    },
    livekitRoomName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'LiveKit room identifier',
    },
    livekitRoomSid: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'LiveKit room SID returned after creation',
    },
    status: {
      type: DataTypes.ENUM('pending', 'active', 'completed', 'cancelled'),
      defaultValue: 'pending',
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    endedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    durationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Calculated after session ends',
    },
    recordingUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'R2 URL for session recording (AES-256 at rest)',
    },
    assessmentType: {
      type: DataTypes.ENUM('movement_screen', 'postural_analysis', 'performance_test', 'general'),
      defaultValue: 'general',
    },
    trainerNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Trainer notes from the session',
    },
    joinToken: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'LiveKit join token for the client (short-lived)',
    },
  },
  {
    sequelize,
    modelName: 'VideoSession',
    tableName: 'video_sessions',
    timestamps: true,
    indexes: [
      { fields: ['trainerId'] },
      { fields: ['clientId'] },
      { fields: ['sessionId'] },
      { fields: ['status'] },
    ],
  }
);

export default VideoSession;
