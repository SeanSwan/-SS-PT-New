import React from 'react';
import { FactionLeaderboard, PartyCreateJoin, PartyHPBar } from '../../RPG';
import ActivityTicker from '../ActivityTicker';
import FeedCoverStudio from './FeedCoverStudio';
import NotificationBell from '../NotificationBell';
import TrendingHashtags from '../TrendingHashtags';
import {
  FullFeedStats,
  FullGamificationHeader,
  RecentActivityBanner,
} from './SocialFeedPanels';
import { FeedTopBar } from '../styles/SocialFeedStyles';
import type { SocialFeedViewModel } from '../hooks/useSocialFeedViewModel';

interface SocialFeedSectionsProps {
  viewModel: SocialFeedViewModel;
}

const SocialFeedNotificationBar: React.FC = () => (
  <FeedTopBar>
    <NotificationBell />
  </FeedTopBar>
);

const SocialFeedProfileHeader: React.FC<SocialFeedSectionsProps> = ({ viewModel }) => {
  if (!viewModel.profileData) return null;

  return (
    <FullGamificationHeader
      firstName={viewModel.firstName}
      streakDays={viewModel.profileData.streakDays}
      points={viewModel.profileData.points || 0}
    />
  );
};

const SocialFeedRecentActivity: React.FC<SocialFeedSectionsProps> = ({ viewModel }) => {
  if (!viewModel.recentActivity) return null;
  return <RecentActivityBanner message={viewModel.recentActivity} />;
};

const SocialFeedStatsGate: React.FC<SocialFeedSectionsProps> = ({ viewModel }) => {
  if (viewModel.posts.length === 0) return null;
  return <FullFeedStats stats={viewModel.feedStats} />;
};

const SocialFeedActivityTicker: React.FC<SocialFeedSectionsProps> = ({ viewModel }) => {
  if (viewModel.activityEvents.length === 0) return null;
  return <ActivityTicker events={viewModel.activityEvents} />;
};

const SocialFeedFactionGate: React.FC<SocialFeedSectionsProps> = ({ viewModel }) => {
  if (viewModel.factions.length === 0) return null;
  return <FactionLeaderboard factions={viewModel.factions} />;
};

const SocialFeedPartyGate: React.FC<SocialFeedSectionsProps> = ({ viewModel }) => {
  if (viewModel.party) {
    return (
      <PartyHPBar
        party={viewModel.party}
        myRole={viewModel.myRole}
        onLeave={viewModel.leaveParty}
      />
    );
  }

  return (
    <PartyCreateJoin
      onCreate={viewModel.createParty}
      onJoin={viewModel.joinParty}
    />
  );
};

export const SocialFeedFullSections: React.FC<SocialFeedSectionsProps> = ({ viewModel }) => (
  <>
    <SocialFeedNotificationBar />
    <SocialFeedProfileHeader viewModel={viewModel} />
    <SocialFeedRecentActivity viewModel={viewModel} />
    <SocialFeedStatsGate viewModel={viewModel} />
    <SocialFeedActivityTicker viewModel={viewModel} />
    <SocialFeedFactionGate viewModel={viewModel} />
    <SocialFeedPartyGate viewModel={viewModel} />
    <TrendingHashtags />
  </>
);

export const SocialFeedCompactSections: React.FC<SocialFeedSectionsProps> = ({ viewModel }) => (
  <>
    <SocialFeedRecentActivity viewModel={viewModel} />
    <FeedCoverStudio
      stats={viewModel.feedStats}
      isLive={viewModel.tickerConnected || viewModel.activityEvents.length > 0}
      onCreatePostFocus={viewModel.handleCreatePostFocus}
    />
    <SocialFeedActivityTicker viewModel={viewModel} />
  </>
);
