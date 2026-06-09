import React from 'react';
import CelebrationToggles from '../../../Celebrations/CelebrationToggles';
import CreatePostCard from '../CreatePostCard';
import {
  SocialFeedCompactSections,
  SocialFeedFullSections,
} from './SocialFeedSections';
import SocialFeedPostStream from './SocialFeedPostStream';
import { FeedContainer } from '../styles/SocialFeedStyles';
import type {
  SocialFeedVariant,
  SocialFeedViewModel,
} from '../hooks/useSocialFeedViewModel';

interface SocialFeedReadyProps {
  variant: SocialFeedVariant;
  viewModel: SocialFeedViewModel;
}

const EmptySlot: React.FC = () => null;

const SectionsByVariant = {
  compact: SocialFeedCompactSections,
  full: SocialFeedFullSections,
} satisfies Record<SocialFeedVariant, React.FC<{ viewModel: SocialFeedViewModel }>>;

const CelebrationByVariant = {
  compact: EmptySlot,
  full: CelebrationToggles,
} satisfies Record<SocialFeedVariant, React.FC>;

const SocialFeedReady: React.FC<SocialFeedReadyProps> = ({ variant, viewModel }) => {
  const Sections = SectionsByVariant[variant];
  const CelebrationSlot = CelebrationByVariant[variant];

  return (
    <FeedContainer>
      <Sections viewModel={viewModel} />

      <div id="swan-create-post" ref={viewModel.createPostAnchorRef}>
        <CreatePostCard />
      </div>

      <SocialFeedPostStream
        variant={variant}
        viewModel={viewModel}
      />

      <CelebrationSlot />
    </FeedContainer>
  );
};

export default SocialFeedReady;
