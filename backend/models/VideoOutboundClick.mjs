/**
 * VideoOutboundClick Model - YouTube Funnel Analytics
 * ====================================================
 * Tracks user clicks on outbound YouTube links (watch, subscribe, playlist, channel)
 * for CTR analysis and funnel optimization.
 */

import { DataTypes } from 'sequelize';
import sequelize from '../database.mjs';

class VideoOutboundClick extends sequelize.Sequelize.Model {}

VideoOutboundClick.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  video_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'video_catalog', key: 'id' },
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' },
  },
  click_type: {
    type: DataTypes.ENUM('watch_on_youtube', 'subscribe', 'playlist', 'channel'),
    allowNull: false,
  },
  clicked_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  session_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
}, {
  sequelize,
  tableName: 'video_outbound_clicks',
  timestamps: true,
  indexes: [
    { fields: ['video_id', 'click_type', { attribute: 'clicked_at', order: 'DESC' }] },
    { fields: ['clicked_at'] },
  ],
});

export default VideoOutboundClick;
