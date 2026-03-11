import { DataTypes, Model, Op } from 'sequelize';
import sequelize from '../database.mjs';

class PhotoVote extends Model {}

PhotoVote.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    photoId: { type: DataTypes.INTEGER, allowNull: false, field: 'photo_id' },
    visitorId: { type: DataTypes.INTEGER, allowNull: true, field: 'visitor_id' },
    sessionHash: { type: DataTypes.STRING(64), allowNull: true, field: 'session_hash' },
    voteType: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      field: 'vote_type',
      comment: '1 = thumbs up, -1 = thumbs down',
    },
  },
  {
    sequelize,
    modelName: 'PhotoVote',
    tableName: 'gallery_photo_votes',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['photo_id'] },
      { fields: ['visitor_id'] },
      { fields: ['photo_id', 'visitor_id'], unique: true, where: { visitor_id: { [Op.ne]: null } } },
      { fields: ['photo_id', 'session_hash'], unique: true, where: { session_hash: { [Op.ne]: null } } },
    ],
  }
);

PhotoVote.associate = (models) => {
  PhotoVote.belongsTo(models.GalleryPhoto, { foreignKey: 'photoId', as: 'photo' });
  PhotoVote.belongsTo(models.GalleryVisitor, { foreignKey: 'visitorId', as: 'visitor' });
};

export default PhotoVote;
