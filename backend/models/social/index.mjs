import Friendship from './Friendship.mjs';
import SocialPost from './SocialPost.mjs';
import SocialComment from './SocialComment.mjs';
import SocialLike from './SocialLike.mjs';
import Challenge from './Challenge.mjs';
import ChallengeParticipant from './ChallengeParticipant.mjs';
import ChallengeTeam from './ChallengeTeam.mjs';
import PostReport from './PostReport.mjs';
import ModerationAction from './ModerationAction.mjs';
import Hashtag from './Hashtag.mjs';
import PostHashtag from './PostHashtag.mjs';
import UserHashtagFollow from './UserHashtagFollow.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: Hashtag Associations
// PURPOSE: Many-to-many links between posts and hashtags
// ─────────────────────────────────────────────────────────────
SocialPost.belongsToMany(Hashtag, {
  through: PostHashtag,
  foreignKey: 'postId',
  otherKey: 'hashtagId',
  as: 'hashtags',
  constraints: false
});

Hashtag.belongsToMany(SocialPost, {
  through: PostHashtag,
  foreignKey: 'hashtagId',
  otherKey: 'postId',
  as: 'posts',
  constraints: false
});

UserHashtagFollow.belongsTo(Hashtag, { foreignKey: 'hashtagId', as: 'hashtag', constraints: false });
Hashtag.hasMany(UserHashtagFollow, { foreignKey: 'hashtagId', as: 'followers', constraints: false });

// Export all models individually
export {
  Friendship,
  SocialPost,
  SocialComment,
  SocialLike,
  Challenge,
  ChallengeParticipant,
  ChallengeTeam,
  PostReport,
  ModerationAction,
  Hashtag,
  PostHashtag,
  UserHashtagFollow
};

// Export as default
export default {
  Friendship,
  SocialPost,
  SocialComment,
  SocialLike,
  Challenge,
  ChallengeParticipant,
  ChallengeTeam,
  PostReport,
  ModerationAction,
  Hashtag,
  PostHashtag,
  UserHashtagFollow
};
