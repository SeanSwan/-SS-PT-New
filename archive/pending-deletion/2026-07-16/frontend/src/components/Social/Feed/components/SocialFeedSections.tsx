import React from 'react';
import { FactionLeaderboard, PartyCreateJoin, PartyHPBar } from '../../RPG';
import ActivityTicker from '../ActivityTicker';
import FeedCoverStudio from './FeedCoverStudio';
import NotificationBell from '../NotificationBell';
import TrendingHashtags from '../TrendingHashtags';
import { RecentActivityBanner } from './SocialFeedPanels';
import UserDashboardBannerMediaLayer from '../../../UserDashboard/components/UserDashboardBannerMediaLayer';
import SocialCoverEditor from './SocialCoverEditor';
import { useSocialCoverBanner } from '../hooks/useSocialCoverBanner';
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

const SocialFeedRecentActivity: React.FC<SocialFeedSectionsProps> = ({ viewModel }) => {
  if (!viewModel.recentActivity) return null;
  return <RecentActivityBanner message={viewModel.recentActivity} />;
};

/* Merge M1: the cover studio is the shared section lead for BOTH variants.
   Its metric rail owns the feed numbers (the old FullFeedStats and
   FullGamificationHeader duplicated facts the page sidebar + Coach dock
   already carry — retired per the no-duplicate-facts card standard). */
const SocialFeedCover: React.FC<SocialFeedSectionsProps> = ({ viewModel }) => {
  /* M5b: the user's REAL banner composition (crossfade/mosaic/photo) becomes
     the cover backdrop. Sticky-carousel is hard-disabled on /social — its
     fixed-position strip collides with the page chrome. Null -> the cover
     keeps its decorative panels. */
  /* M6a: the editor is embedded right here — "Edit cover" expands it below
     the cover (lazy: the heavy useProfile machinery mounts only while
     editing). Closing bumps refreshKey so the live cover refetches once. */
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [coverRefreshKey, setCoverRefreshKey] = React.useState(0);
  const coverBanner = useSocialCoverBanner(coverRefreshKey);
  const bannerLayer = coverBanner ? (
    <UserDashboardBannerMediaLayer
      backgroundImage={coverBanner.backgroundImage}
      bannerObjectPosition={coverBanner.bannerObjectPosition}
      bannerObjectFit={coverBanner.bannerObjectFit}
      bannerImageScale={coverBanner.bannerImageScale}
      bannerCollagePhotos={coverBanner.bannerCollagePhotos}
      bannerCollageLayout={coverBanner.bannerCollageLayout}
      bannerStickyCarousel={false}
    />
  ) : null;

  return (
    <>
      <FeedCoverStudio
        stats={viewModel.feedStats}
        isLive={viewModel.tickerConnected || viewModel.activityEvents.length > 0}
        onCreatePostFocus={viewModel.handleCreatePostFocus}
        identity={viewModel.identity}
        bannerLayer={bannerLayer}
        onEditCover={() => setEditorOpen((open) => !open)}
      />
      {editorOpen && (
        <SocialCoverEditor
          onClose={() => {
            setEditorOpen(false);
            setCoverRefreshKey((key) => key + 1);
          }}
        />
      )}
    </>
  );
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
    <SocialFeedCover viewModel={viewModel} />
    <SocialFeedRecentActivity viewModel={viewModel} />
    <SocialFeedActivityTicker viewModel={viewModel} />
    <SocialFeedFactionGate viewModel={viewModel} />
    <SocialFeedPartyGate viewModel={viewModel} />
    <TrendingHashtags />
  </>
);

export const SocialFeedCompactSections: React.FC<SocialFeedSectionsProps> = ({ viewModel }) => (
  <>
    <SocialFeedRecentActivity viewModel={viewModel} />
    <SocialFeedCover viewModel={viewModel} />
    <SocialFeedActivityTicker viewModel={viewModel} />
  </>
);
