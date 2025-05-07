import Friendship from './Friendship.mjs';
import SocialPost from './SocialPost.mjs';
import SocialComment from './SocialComment.mjs';
import SocialLike from './SocialLike.mjs';
import Challenge from './Challenge.mjs';
import ChallengeParticipant from './ChallengeParticipant.mjs';
import ChallengeTeam from './ChallengeTeam.mjs';
import db from '../../database.mjs';

// Define associations between social models
const setupSocialAssociations = () => {
  // SocialPost associations
  SocialPost.belongsTo(db.models.User, { as: 'user', foreignKey: 'userId' });
  SocialPost.hasMany(SocialComment, { as: 'comments', foreignKey: 'postId', onDelete: 'CASCADE' });
  
  // SocialComment associations
  SocialComment.belongsTo(SocialPost, { as: 'post', foreignKey: 'postId' });
  SocialComment.belongsTo(db.models.User, { as: 'user', foreignKey: 'userId' });
  
  // Friendship associations
  Friendship.belongsTo(db.models.User, { as: 'requester', foreignKey: 'requesterId' });
  Friendship.belongsTo(db.models.User, { as: 'recipient', foreignKey: 'recipientId' });
  
  // Challenge associations
  Challenge.belongsTo(db.models.User, { as: 'creator', foreignKey: 'creatorId' });
  Challenge.hasMany(ChallengeParticipant, { as: 'participants', foreignKey: 'challengeId', onDelete: 'CASCADE' });
  Challenge.hasMany(ChallengeTeam, { as: 'teams', foreignKey: 'challengeId', onDelete: 'CASCADE' });
  
  // ChallengeParticipant associations
  ChallengeParticipant.belongsTo(Challenge, { as: 'challenge', foreignKey: 'challengeId' });
  ChallengeParticipant.belongsTo(db.models.User, { as: 'user', foreignKey: 'userId' });
  ChallengeParticipant.belongsTo(ChallengeTeam, { as: 'team', foreignKey: 'teamId' });
  
  // ChallengeTeam associations
  ChallengeTeam.belongsTo(Challenge, { as: 'challenge', foreignKey: 'challengeId' });
  ChallengeTeam.belongsTo(db.models.User, { as: 'captain', foreignKey: 'captainId' });
  ChallengeTeam.hasMany(ChallengeParticipant, { as: 'members', foreignKey: 'teamId' });
  
  // User associations with social features
  db.models.User.hasMany(SocialPost, { as: 'posts', foreignKey: 'userId' });
  db.models.User.hasMany(SocialComment, { as: 'comments', foreignKey: 'userId' });
  db.models.User.hasMany(ChallengeParticipant, { as: 'challengeParticipation', foreignKey: 'userId' });
  db.models.User.hasMany(ChallengeTeam, { as: 'captainedTeams', foreignKey: 'captainId' });
};

export {
  Friendship,
  SocialPost,
  SocialComment,
  SocialLike,
  Challenge,
  ChallengeParticipant,
  ChallengeTeam,
  setupSocialAssociations
};

export default {
  Friendship,
  SocialPost,
  SocialComment,
  SocialLike,
  Challenge,
  ChallengeParticipant,
  ChallengeTeam,
  setupSocialAssociations
};
