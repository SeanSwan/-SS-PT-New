/**
 * FILE: ClientObservatoryFeed.tsx
 * PURPOSE: Reels-style spotlight, quick post composer, and feed preview.
 */

import React, { useState } from 'react';
import { ImagePlus, Loader2, MessageCircle, Play, Send, Sparkles } from 'lucide-react';
import {
  FeedPostPreview,
  OBSERVATORY_ASSETS,
  POST_CATEGORIES,
  QUICK_ACTIONS,
  compactNumber,
  countCollection,
  timeLabel,
} from './ClientObservatoryData';
import {
  CardInner,
  GhostButton,
  MutedText,
  PrimaryButton,
  SectionKicker,
  SectionTitle,
} from './ClientObservatoryShell.styles';
import {
  CategoryPill,
  CategoryRow,
  ComposerActions,
  ComposerCard,
  ComposerForm,
  ComposerTextarea,
  ComposerTop,
  EmptyState,
  FeatureGrid,
  FeedCard,
  FeedHeader,
  MiniAction,
  MiniActionGrid,
  PostAuthor,
  PostAvatar,
  PostBody,
  PostContent,
  PostItem,
  PostList,
  PostMedia,
  PostMeta,
  ReelCard,
  ReelChip,
  ReelImage,
  ReelOverlay,
  ReelTitle,
} from './ClientObservatoryFeed.styles';

interface ClientObservatoryFeedProps {
  feedLoading: boolean;
  posts: FeedPostPreview[];
  postText: string;
  creatingPost: boolean;
  onPostTextChange: (value: string) => void;
  onCreatePost: () => Promise<void>;
  onNavigate: (path: string) => void;
}

function postAuthor(post: FeedPostPreview): string {
  const first = post.user?.firstName;
  const last = post.user?.lastName;
  const username = post.user?.username;
  return [first, last].filter(Boolean).join(' ') || username || 'SwanStudios athlete';
}

const ClientObservatoryFeed: React.FC<ClientObservatoryFeedProps> = ({
  feedLoading,
  posts,
  postText,
  creatingPost,
  onPostTextChange,
  onCreatePost,
  onNavigate,
}) => {
  const [category, setCategory] = useState<(typeof POST_CATEGORIES)[number]>('Training');
  const trimmedPost = postText.trim();
  const canPost = trimmedPost.length >= 3 && !creatingPost;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canPost) await onCreatePost();
  };

  return (
    <>
      <FeatureGrid>
        <ReelCard aria-label="Reels spotlight">
          <ReelImage src={OBSERVATORY_ASSETS.reelArt} alt="Crystalline training reel artwork" />
          <ReelOverlay>
            <ReelChip>
              <Play size={14} aria-hidden="true" />
              Reels Spotlight
            </ReelChip>
            <div>
              <ReelTitle>Capture the next set.</ReelTitle>
              <MutedText>
                Turn today&apos;s lift, stretch, meal prep, or recovery note into a community moment.
              </MutedText>
            </div>
          </ReelOverlay>
        </ReelCard>

        <ComposerCard aria-label="Quick community post composer">
          <CardInner>
            <ComposerForm onSubmit={handleSubmit}>
              <ComposerTop>
                <div>
                  <SectionKicker>
                    <Sparkles size={14} aria-hidden="true" />
                    Quick Post
                  </SectionKicker>
                  <SectionTitle>Share training momentum</SectionTitle>
                </div>
                <GhostButton type="button" onClick={() => onNavigate('/dashboard/client/community')}>
                  Open Feed
                </GhostButton>
              </ComposerTop>

              <CategoryRow aria-label="Post category">
                {POST_CATEGORIES.map((item) => (
                  <CategoryPill
                    key={item}
                    type="button"
                    $active={item === category}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </CategoryPill>
                ))}
              </CategoryRow>

              <ComposerTextarea
                value={postText}
                onChange={(event) => onPostTextChange(event.target.value)}
                placeholder={`Post a ${category.toLowerCase()} update for your community...`}
                aria-label="Create a community post"
              />

              <ComposerActions>
                <MutedText>{trimmedPost.length}/500 characters</MutedText>
                <PrimaryButton type="submit" disabled={!canPost}>
                  {creatingPost ? <Loader2 size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
                  Post
                </PrimaryButton>
              </ComposerActions>
            </ComposerForm>
          </CardInner>
        </ComposerCard>
      </FeatureGrid>

      <MiniActionGrid aria-label="Dashboard quick actions">
        {QUICK_ACTIONS.map(({ label, Icon, path }) => (
          <MiniAction key={path} type="button" onClick={() => onNavigate(path)} aria-label={label}>
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </MiniAction>
        ))}
      </MiniActionGrid>

      <FeedCard aria-label="Community feed preview">
        <CardInner>
          <FeedHeader>
            <div>
              <SectionKicker>
                <MessageCircle size={14} aria-hidden="true" />
                Community Feed
              </SectionKicker>
              <SectionTitle>Latest orbit signals</SectionTitle>
            </div>
            <GhostButton type="button" onClick={() => onNavigate('/dashboard/client/community')}>
              View All
            </GhostButton>
          </FeedHeader>

          {feedLoading && (
            <EmptyState>Loading community updates...</EmptyState>
          )}

          {!feedLoading && posts.length === 0 && (
            <EmptyState>
              <span>
                No community posts yet. Start the first signal with the composer above.
              </span>
            </EmptyState>
          )}

          {!feedLoading && posts.length > 0 && (
            <PostList>
              {posts.slice(0, 3).map((post, index) => (
                <PostItem key={post.id || index}>
                  <PostAvatar
                    src={post.user?.photo || post.user?.profileImage || OBSERVATORY_ASSETS.profileMark}
                    alt=""
                    aria-hidden="true"
                  />
                  <PostBody>
                    <PostMeta>
                      <PostAuthor>{postAuthor(post)}</PostAuthor>
                      <span>{timeLabel(post.createdAt)}</span>
                      <span>{compactNumber(countCollection(post.likes))} likes</span>
                    </PostMeta>
                    <PostContent>{post.content || 'Shared a training update.'}</PostContent>
                  </PostBody>
                  <PostMedia
                    src={post.mediaUrl || OBSERVATORY_ASSETS.feedFallback}
                    alt=""
                    aria-hidden="true"
                  />
                </PostItem>
              ))}
            </PostList>
          )}

          {!feedLoading && posts.length > 0 && (
            <ComposerActions style={{ marginTop: '0.9rem' }}>
              <MutedText>{compactNumber(posts.length)} visible updates in this preview</MutedText>
              <GhostButton type="button" onClick={() => onNavigate('/dashboard/client/community')}>
                <ImagePlus size={16} aria-hidden="true" />
                Create More
              </GhostButton>
            </ComposerActions>
          )}
        </CardInner>
      </FeedCard>
    </>
  );
};

export default ClientObservatoryFeed;
