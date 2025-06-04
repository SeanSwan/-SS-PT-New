import { DataTypes } from 'sequelize';
import db from '../../database.mjs';

const Friendship = db.define('Friendship', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  requesterId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  recipientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'declined', 'blocked'),
    defaultValue: 'pending',
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'Friendships',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['requesterId', 'recipientId'],
      name: 'unique_friendship'
    }
  ]
});

// Class methods
Friendship.sendFriendRequest = async function(requesterId, recipientId) {
  // Check if a request already exists in either direction
  const existingRequest = await this.findOne({
    where: {
      [db.Sequelize.Op.or]: [
        { requesterId, recipientId },
        { requesterId: recipientId, recipientId: requesterId }
      ]
    }
  });

  if (existingRequest) {
    throw new Error('A friendship request already exists between these users');
  }

  return this.create({
    requesterId,
    recipientId,
    status: 'pending'
  });
};

// Instance methods
Friendship.prototype.accept = async function() {
  this.status = 'accepted';
  return this.save();
};

Friendship.prototype.decline = async function() {
  this.status = 'declined';
  return this.save();
};

Friendship.prototype.block = async function() {
  this.status = 'blocked';
  return this.save();
};

export default Friendship;
