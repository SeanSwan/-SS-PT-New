import React from 'react';
import {
  BodyText2,
  CenterBox,
  ContainedButton,
  EmptyFeedMessage,
  FeedContainer,
  Heading6,
  Spinner,
} from '../styles/SocialFeedStyles';

export const SocialFeedLoadingState: React.FC = () => (
  <FeedContainer>
    <CenterBox>
      <Spinner />
    </CenterBox>
  </FeedContainer>
);

interface SocialFeedErrorStateProps {
  onRetry: () => void;
}

export const SocialFeedErrorState: React.FC<SocialFeedErrorStateProps> = ({ onRetry }) => (
  <FeedContainer>
    <EmptyFeedMessage>
      <Heading6 $color="var(--accent-gold, #C6A84B)" $gutterBottom>
        Error loading feed
      </Heading6>
      <BodyText2 $color="var(--text-primary, #E0ECF4)" $paragraph>
        Something went wrong while loading your social feed.
      </BodyText2>
      <ContainedButton onClick={onRetry}>
        Retry
      </ContainedButton>
    </EmptyFeedMessage>
  </FeedContainer>
);
