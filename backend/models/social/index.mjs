import Friendship from './Friendship.mjs';
import SocialPost from './SocialPost.mjs';
import SocialComment from './SocialComment.mjs';
import SocialLike from './SocialLike.mjs';
// SWA-96 merge (2026-08-13): Challenge/ChallengeParticipant/ChallengeTeam retired.
// The canonical challenge family lives in the root models (`challenges` table, 18 live
// rows, /api/v1/gamification lane). These PascalCase twins mapped to empty tables and
// their only route consumer (routes/social/challenges.mjs legacy endpoints) is removed.
import PostReport from './PostReport.mjs';
import ModerationAction from './ModerationAction.mjs';
import Hashtag from './Hashtag.mjs';
import PostHashtag from './PostHashtag.mjs';
import UserHashtagFollow from './UserHashtagFollow.mjs';
import Faction from './Faction.mjs';
import FactionMembership from './FactionMembership.mjs';
import Party from './Party.mjs';
import PartyMember from './PartyMember.mjs';
import SocialGroup from './SocialGroup.mjs';
import SocialGroupMember from './SocialGroupMember.mjs';

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

// ─────────────────────────────────────────────────────────────
// SECTION: Faction & Party Associations
// PURPOSE: RPG faction allegiance + party/linkshell groups
// ─────────────────────────────────────────────────────────────
Faction.hasMany(FactionMembership, { foreignKey: 'factionId', as: 'memberships', constraints: false });
FactionMembership.belongsTo(Faction, { foreignKey: 'factionId', as: 'faction', constraints: false });

Party.hasMany(PartyMember, { foreignKey: 'partyId', as: 'members', constraints: false });
PartyMember.belongsTo(Party, { foreignKey: 'partyId', as: 'party', constraints: false });

// ─────────────────────────────────────────────────────────────
// SECTION: Social Group Associations
// PURPOSE: First-class community groups with their own post feed
// ─────────────────────────────────────────────────────────────
SocialGroup.hasMany(SocialGroupMember, { foreignKey: 'groupId', as: 'members', constraints: false });
SocialGroupMember.belongsTo(SocialGroup, { foreignKey: 'groupId', as: 'group', constraints: false });
SocialGroup.hasMany(SocialPost, { foreignKey: 'groupId', as: 'posts', constraints: false });
SocialPost.belongsTo(SocialGroup, { foreignKey: 'groupId', as: 'group', constraints: false });

// Export all models individually
export {
  Friendship,
  SocialPost,
  SocialComment,
  SocialLike,
  PostReport,
  ModerationAction,
  Hashtag,
  PostHashtag,
  UserHashtagFollow,
  Faction,
  FactionMembership,
  Party,
  PartyMember,
  SocialGroup,
  SocialGroupMember
};

// Export as default
export default {
  Friendship,
  SocialPost,
  SocialComment,
  SocialLike,
  PostReport,
  ModerationAction,
  Hashtag,
  PostHashtag,
  UserHashtagFollow,
  Faction,
  FactionMembership,
  Party,
  PartyMember,
  SocialGroup,
  SocialGroupMember
};
