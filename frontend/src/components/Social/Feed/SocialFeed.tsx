import React from 'react';
import SocialFeedReady from './components/SocialFeedReady';
import {
  SocialFeedErrorState,
  SocialFeedLoadingState,
} from './components/SocialFeedState';
import {
  useSocialFeedViewModel,
  type SocialFeedVariant,
} from './hooks/useSocialFeedViewModel';

interface SocialFeedProps {
  variant?: SocialFeedVariant;
}

const SocialFeed: React.FC<SocialFeedProps> = ({ variant = 'full' }) => {
  const viewModel = useSocialFeedViewModel();

  if (viewModel.isLoading) {
    return <SocialFeedLoadingState />;
  }

  if (viewModel.error) {
    return <SocialFeedErrorState onRetry={() => void viewModel.refreshPosts()} />;
  }

  return (
    <SocialFeedReady
      variant={variant}
      viewModel={viewModel}
    />
  );
};

export default SocialFeed;
