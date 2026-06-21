/**
 * FILE: ClientObservatoryFeed.tsx
 * PURPOSE: Reels-style spotlight, quick post composer, and feed preview.
 */

import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, MessageCircle, Play, Send, Sparkles } from 'lucide-react';
import {
  FeedPostPreview,
  OBSERVATORY_ASSETS,
  POST_CATEGORIES,
  type QuickAction,
  compactNumber,
  safeClientOverviewPoints,
} from './ClientObservatoryData';
import { normalizeFeedPostPreviews } from './ClientObservatoryFeed.preview';
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
  HiddenFileInput,
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
  PostReceipt,
  PostReceiptBadge,
  PostReceiptMessage,
  ReelCard,
  ReelChip,
  ReelImage,
  ReelOverlay,
  ReelTitle,
} from './ClientObservatoryFeed.styles';
import { prepareObservatoryPost, safeObservatoryPostReceiptMessage } from './ClientObservatoryPostIntent';

interface ClientObservatoryFeedProps {
  feedLoading: boolean;
  posts: FeedPostPreview[];
  postText: string;
  creatingPost: boolean;
  postReceipt?: {
    pointsAwarded: number;
    message: string;
  } | null;
  quickActions: QuickAction[];
  onPostTextChange: (value: string) => void;
  onCreatePost: (input: {
    content: string;
    type: string;
    visibility: 'friends';
    media: File | null;
  }) => Promise<void>;
  onNavigate: (path: string) => void;
}

const ClientObservatoryFeed: React.FC<ClientObservatoryFeedProps> = ({
  feedLoading,
  posts,
  postText,
  creatingPost,
  postReceipt,
  quickActions,
  onPostTextChange,
  onCreatePost,
  onNavigate,
}) => {
  const [category, setCategory] = useState<(typeof POST_CATEGORIES)[number]>('Training');
  const [isReelMode, setIsReelMode] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const trimmedPost = postText.trim();
  const canPost = trimmedPost.length >= 3 && !creatingPost;
  const previewPosts = normalizeFeedPostPreviews(posts).slice(0, 3);
  const receiptPointsAwarded = safeClientOverviewPoints(postReceipt?.pointsAwarded);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canPost) return;
    const preparedPost = prepareObservatoryPost(trimmedPost, category, isReelMode);

    await onCreatePost({
      content: preparedPost.content,
      type: preparedPost.type,
      visibility: 'friends',
      media: mediaFile,
    });
    setMediaFile(null);
    setIsReelMode(false);
    setCategory('Training');
  };

  const handleCategorySelect = (item: (typeof POST_CATEGORIES)[number]) => {
    setCategory(item);
    setIsReelMode(false);
  };

  const handleCreateReel = () => {
    setCategory('Progress');
    setIsReelMode(true);
  };

  const handleMediaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMediaFile(event.target.files?.[0] || null);
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
            <PrimaryButton type="button" onClick={handleCreateReel}>
              <Play size={16} aria-hidden="true" />
              Create Reel
            </PrimaryButton>
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
              </ComposerTop>

              <CategoryRow aria-label="Post category">
                {POST_CATEGORIES.map((item) => (
                  <CategoryPill
                    key={item}
                    type="button"
                    $active={item === category && !isReelMode}
                    onClick={() => handleCategorySelect(item)}
                  >
                    {item}
                  </CategoryPill>
                ))}
                <CategoryPill
                  type="button"
                  $active={isReelMode}
                  onClick={handleCreateReel}
                >
                  Reel
                </CategoryPill>
              </CategoryRow>

              <ComposerTextarea
                value={postText}
                onChange={(event) => onPostTextChange(event.target.value)}
                placeholder={isReelMode
                  ? 'Caption your training reel before posting...'
                  : `Post a ${category.toLowerCase()} update for your community...`}
                aria-label="Create a community post"
              />

              {postReceipt && receiptPointsAwarded > 0 && (
                <PostReceipt role="status" aria-live="polite">
                  <PostReceiptBadge>+{receiptPointsAwarded} XP</PostReceiptBadge>
                  <PostReceiptMessage>
                    {safeObservatoryPostReceiptMessage(postReceipt.message)}
                  </PostReceiptMessage>
                </PostReceipt>
              )}

              <ComposerActions>
                <MutedText>{mediaFile ? mediaFile.name : `${trimmedPost.length}/500 characters`}</MutedText>
                <HiddenFileInput
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  aria-label="Attach media to quick post"
                  onChange={handleMediaChange}
                />
                <GhostButton type="button" onClick={() => fileInputRef.current?.click()}>
                  <ImagePlus size={16} aria-hidden="true" />
                  Add Media
                </GhostButton>
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
        {quickActions.map(({ label, Icon, path }) => (
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
          </FeedHeader>

          {feedLoading && (
            <EmptyState>Loading community updates...</EmptyState>
          )}

          {!feedLoading && previewPosts.length === 0 && (
            <EmptyState>
              <span>
                No community posts yet. Start the first signal with the composer above.
              </span>
            </EmptyState>
          )}

          {!feedLoading && previewPosts.length > 0 && (
            <PostList>
              {previewPosts.map((post) => (
                <PostItem key={post.key}>
                  <PostAvatar
                    src={post.avatarUrl || OBSERVATORY_ASSETS.profileMark}
                    alt=""
                    aria-hidden="true"
                  />
                  <PostBody>
                    <PostMeta>
                      <PostAuthor>{post.author}</PostAuthor>
                      <span>{post.timeAgo}</span>
                      <span>{post.likesLabel} likes</span>
                    </PostMeta>
                    <PostContent>{post.content}</PostContent>
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

          {!feedLoading && previewPosts.length > 0 && (
            <ComposerActions $top="0.9rem">
              <MutedText>{compactNumber(previewPosts.length)} visible updates in this preview</MutedText>
            </ComposerActions>
          )}
        </CardInner>
      </FeedCard>
    </>
  );
};

export default ClientObservatoryFeed;
