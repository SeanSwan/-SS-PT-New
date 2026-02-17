import React, { useState, useRef } from 'react';
import {
  Image,
  Send,
  X,
  User,
  Users,
  Globe,
  Plus,
  Dumbbell,
  Camera,
  Trophy,
  Target,
  Star
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useSocialFeed } from '../../../hooks/social/useSocialFeed';
import styled, { keyframes } from 'styled-components';

// ── CSS spinner keyframe ──────────────────────────────────────────────
const spin = keyframes`
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// ── Styled components (all native HTML – zero MUI) ───────────────────

const CreatePostCardWrapper = styled.div`
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  background: rgba(10, 10, 26, 0.85);
  color: #e0e0e0;
`;

const CardBody = styled.div`
  padding: 16px;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const Heading6 = styled.h6`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #ffffff;
`;

const BodyText = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
`;

const AvatarCircle = styled.div`
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #7851A9, #00FFFF);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 1rem;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const PostInputWrapper = styled.div`
  display: flex;
  gap: 12px;
`;

const FlexColumn = styled.div`
  flex: 1;
  min-width: 0;
`;

const StyledTextarea = styled.textarea<{ $rows?: number }>`
  width: 100%;
  min-height: ${props => (props.$rows || 3) * 24}px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.06);
  color: #e0e0e0;
  font-family: inherit;
  font-size: 0.95rem;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }

  &:focus {
    border-color: #00FFFF;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.06);
  color: #e0e0e0;
  font-family: inherit;
  font-size: 0.875rem;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }

  &:focus {
    border-color: #00FFFF;
  }
`;

const StyledInputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const InputLabel = styled.label`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
`;

const MediaPreviewWrapper = styled.div`
  position: relative;
  margin-top: 16px;
  border-radius: 8px;
  overflow: hidden;
  max-height: 200px;
`;

const MediaPreview = styled.img`
  width: 100%;
  max-height: 200px;
  object-fit: cover;
`;

const RemoveMediaButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.7);
  }
`;

const FormFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  flex-wrap: wrap;
  gap: 8px;
`;

const FooterLeft = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`;

const FooterRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const VisibilitySelectWrapper = styled.div`
  display: flex;
  flex-direction: column;
  margin-left: 8px;
`;

const NativeSelect = styled.select`
  appearance: none;
  min-width: 120px;
  padding: 6px 28px 6px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.06)
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")
    no-repeat right 8px center;
  color: #e0e0e0;
  font-family: inherit;
  font-size: 0.875rem;
  cursor: pointer;
  outline: none;
  min-height: 44px;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: #00FFFF;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  option {
    background: #1a1a2e;
    color: #e0e0e0;
  }
`;

const SelectHelperText = styled.span`
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 2px;
`;

const PostTypeSelector = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const PostTypeChip = styled.span<{ $selected?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.8125rem;
  cursor: pointer;
  user-select: none;
  min-height: 44px;
  border: 2px solid ${props => props.$selected ? '#00FFFF' : 'rgba(255, 255, 255, 0.2)'};
  background: ${props => props.$selected ? 'rgba(0, 255, 255, 0.12)' : 'transparent'};
  color: ${props => props.$selected ? '#00FFFF' : '#e0e0e0'};
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const PointPreviewChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.8125rem;
  font-weight: bold;
  background: linear-gradient(135deg, #4caf50, #66bb6a);
  color: white;
  white-space: nowrap;
`;

const FloatingCreateButton = styled.button`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
  background: linear-gradient(135deg, #7851A9, #00FFFF);
  color: white;
  border: none;
  border-radius: 50%;
  width: 56px;
  height: 56px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 255, 255, 0.3);
  transition: transform 0.2s ease, background 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, #6a44a0, #00e0e0);
    transform: scale(1.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const TransformationImageContainer = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 16px;
`;

const TransformationImageBox = styled.div`
  flex: 1;
  border: 2px dashed rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #00FFFF;
    background-color: rgba(0, 255, 255, 0.04);
  }
`;

const WorkoutStatsContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
`;

const OutlinedButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: transparent;
  color: #e0e0e0;
  font-family: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
  min-height: 44px;
  transition: background-color 0.2s ease, border-color 0.2s ease;
  white-space: nowrap;

  &:hover {
    background-color: rgba(255, 255, 255, 0.06);
    border-color: #00FFFF;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ContainedButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border-radius: 6px;
  border: none;
  background: linear-gradient(135deg, #7851A9, #00FFFF);
  color: white;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: opacity 0.2s ease, box-shadow 0.2s ease;
  white-space: nowrap;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 255, 255, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Spinner = styled.span`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
`;

const DescriptionRow = styled.div`
  margin-bottom: 16px;
`;

const PlaceholderContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  opacity: 0.6;
`;

/**
 * CreatePostCard Component
 * Allows users to create new posts for the social feed
 */
const CreatePostCard: React.FC = () => {
  const { user } = useAuth();
  const { createPost, isCreatingPost } = useSocialFeed();
  const [postContent, setPostContent] = useState('');
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('friends');
  const [postType, setPostType] = useState<'general' | 'workout' | 'transformation' | 'achievement' | 'challenge'>('general');
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [beforeImage, setBeforeImage] = useState<File | null>(null);
  const [afterImage, setAfterImage] = useState<File | null>(null);
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);
  const [workoutStats, setWorkoutStats] = useState({
    duration: '',
    exerciseCount: '',
    totalWeight: '',
    caloriesBurned: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const beforeImageRef = useRef<HTMLInputElement>(null);
  const afterImageRef = useRef<HTMLInputElement>(null);

  // Visibility options with icons
  const visibilityOptions = [
    { value: 'public', label: 'Public', icon: <Globe size={16} /> },
    { value: 'friends', label: 'Friends', icon: <Users size={16} /> },
    { value: 'private', label: 'Only Me', icon: <User size={16} /> }
  ];

  // Post type options with icons and point values
  const postTypeOptions = [
    {
      value: 'general',
      label: 'General Post',
      icon: <User size={16} />,
      points: 10,
      description: 'Share your thoughts or updates'
    },
    {
      value: 'workout',
      label: 'Workout Share',
      icon: <Dumbbell size={16} />,
      points: 25,
      description: 'Share your completed workout'
    },
    {
      value: 'transformation',
      label: 'Transformation',
      icon: <Camera size={16} />,
      points: 50,
      description: 'Before & after progress photos'
    },
    {
      value: 'achievement',
      label: 'Achievement',
      icon: <Trophy size={16} />,
      points: 30,
      description: 'Celebrate a fitness milestone'
    },
    {
      value: 'challenge',
      label: 'Challenge',
      icon: <Target size={16} />,
      points: 20,
      description: 'Create or complete a challenge'
    }
  ];

  // Get current post type info
  const currentPostType = postTypeOptions.find(type => type.value === postType) || postTypeOptions[0];

  // Handle visibility change
  const handleVisibilityChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setVisibility(event.target.value as 'public' | 'friends' | 'private');
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (file.size > maxSize) {
        alert('File size exceeds 5MB limit');
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('Only image files are allowed');
        return;
      }

      setMedia(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle remove media
  const handleRemoveMedia = () => {
    setMedia(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle before image for transformation posts
  const handleBeforeImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setBeforeImage(file);

      const reader = new FileReader();
      reader.onload = () => {
        setBeforePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle after image for transformation posts
  const handleAfterImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setAfterImage(file);

      const reader = new FileReader();
      reader.onload = () => {
        setAfterPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle workout stats change
  const handleWorkoutStatsChange = (field: string, value: string) => {
    setWorkoutStats(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Reset form to initial state
  const resetForm = () => {
    setPostContent('');
    setMedia(null);
    setMediaPreview(null);
    setBeforeImage(null);
    setAfterImage(null);
    setBeforePreview(null);
    setAfterPreview(null);
    setPostType('general');
    setWorkoutStats({
      duration: '',
      exerciseCount: '',
      totalWeight: '',
      caloriesBurned: ''
    });
    setShowCreateOptions(false);

    // Clear file inputs
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (beforeImageRef.current) beforeImageRef.current.value = '';
    if (afterImageRef.current) afterImageRef.current.value = '';
  };

  // Handle post submission
  const handleCreatePost = async () => {
    // Validation based on post type
    if (postType === 'transformation') {
      if (!postContent.trim() && !beforeImage && !afterImage) {
        return; // Transformation posts need content or images
      }
    } else if (postType === 'workout') {
      if (!postContent.trim() && !Object.values(workoutStats).some(stat => stat.trim())) {
        return; // Workout posts need content or stats
      }
    } else {
      if (!postContent.trim() && !media) {
        return; // Regular posts need content or media
      }
    }

    // Prepare post data based on type
    let postData: any = {
      content: postContent,
      type: postType,
      visibility
    };

    // Handle different post types
    if (postType === 'transformation') {
      // For transformation posts, we'll use the before image as the main media
      // and include metadata about the transformation
      if (beforeImage) {
        postData.media = beforeImage;
      }
      postData.transformationData = {
        hasBeforeImage: !!beforeImage,
        hasAfterImage: !!afterImage,
        // In a real implementation, you'd upload both images separately
        // For now, we'll include the transformation info in metadata
      };
    } else if (postType === 'workout') {
      if (media) {
        postData.media = media;
      }
      postData.workoutData = workoutStats;
    } else {
      if (media) {
        postData.media = media;
      }
    }

    const result = await createPost(postData);

    // Show point notification if points were awarded
    if (result && result.pointsAwarded) {
      // This would trigger a toast notification in a real implementation
      console.log(`You earned ${result.pointsAwarded} points!`);
    }

    // Reset form
    resetForm();
  };

  return (
    <>
      <CreatePostCardWrapper>
        <CardBody>
          <CardHeader>
            <Heading6>
              {showCreateOptions ? 'Create Post' : 'Quick Post'}
            </Heading6>
            <PointPreviewChip>
              <Star size={14} />
              +{currentPostType.points} points
            </PointPreviewChip>
          </CardHeader>

          {showCreateOptions && (
            <PostTypeSelector>
              {postTypeOptions.map((option) => (
                <PostTypeChip
                  key={option.value}
                  $selected={postType === option.value}
                  onClick={() => setPostType(option.value as any)}
                >
                  {option.icon}
                  {option.label}
                </PostTypeChip>
              ))}
            </PostTypeSelector>
          )}

          {showCreateOptions && (
            <DescriptionRow>
              <BodyText>
                {currentPostType.description}
              </BodyText>
            </DescriptionRow>
          )}

          <PostInputWrapper>
            <AvatarCircle>
              {user?.photo ? (
                <img src={user.photo} alt={user?.firstName || 'User'} />
              ) : (
                user?.firstName?.[0] || 'U'
              )}
            </AvatarCircle>

            <FlexColumn>
              <StyledTextarea
                $rows={showCreateOptions ? 4 : 3}
                placeholder={
                  postType === 'workout' ? `Share your workout achievements...` :
                  postType === 'transformation' ? `Tell your transformation story...` :
                  postType === 'achievement' ? `What milestone did you reach?` :
                  postType === 'challenge' ? `Describe your challenge...` :
                  `What's on your mind, ${user?.firstName || 'there'}?`
                }
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                disabled={isCreatingPost}
              />

              {/* Workout Stats Section */}
              {showCreateOptions && postType === 'workout' && (
                <WorkoutStatsContainer>
                  <StyledInputGroup>
                    <InputLabel>Duration (min)</InputLabel>
                    <StyledInput
                      value={workoutStats.duration}
                      onChange={(e) => handleWorkoutStatsChange('duration', e.target.value)}
                      type="number"
                      placeholder="0"
                    />
                  </StyledInputGroup>
                  <StyledInputGroup>
                    <InputLabel>Exercises</InputLabel>
                    <StyledInput
                      value={workoutStats.exerciseCount}
                      onChange={(e) => handleWorkoutStatsChange('exerciseCount', e.target.value)}
                      type="number"
                      placeholder="0"
                    />
                  </StyledInputGroup>
                  <StyledInputGroup>
                    <InputLabel>Total Weight (lbs)</InputLabel>
                    <StyledInput
                      value={workoutStats.totalWeight}
                      onChange={(e) => handleWorkoutStatsChange('totalWeight', e.target.value)}
                      type="number"
                      placeholder="0"
                    />
                  </StyledInputGroup>
                  <StyledInputGroup>
                    <InputLabel>Calories Burned</InputLabel>
                    <StyledInput
                      value={workoutStats.caloriesBurned}
                      onChange={(e) => handleWorkoutStatsChange('caloriesBurned', e.target.value)}
                      type="number"
                      placeholder="0"
                    />
                  </StyledInputGroup>
                </WorkoutStatsContainer>
              )}

              {/* Transformation Images Section */}
              {showCreateOptions && postType === 'transformation' && (
                <TransformationImageContainer>
                  <input
                    ref={beforeImageRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleBeforeImageSelect}
                  />
                  <input
                    ref={afterImageRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleAfterImageSelect}
                  />

                  <TransformationImageBox onClick={() => beforeImageRef.current?.click()}>
                    {beforePreview ? (
                      <img src={beforePreview} alt="Before" style={{ width: '100%', maxHeight: '150px', objectFit: 'cover' }} />
                    ) : (
                      <PlaceholderContent>
                        <Camera size={32} />
                        <BodyText>Before Photo</BodyText>
                      </PlaceholderContent>
                    )}
                  </TransformationImageBox>

                  <TransformationImageBox onClick={() => afterImageRef.current?.click()}>
                    {afterPreview ? (
                      <img src={afterPreview} alt="After" style={{ width: '100%', maxHeight: '150px', objectFit: 'cover' }} />
                    ) : (
                      <PlaceholderContent>
                        <Camera size={32} />
                        <BodyText>After Photo</BodyText>
                      </PlaceholderContent>
                    )}
                  </TransformationImageBox>
                </TransformationImageContainer>
              )}

              {mediaPreview && (
                <MediaPreviewWrapper>
                  <MediaPreview src={mediaPreview} alt="Upload preview" />
                  <RemoveMediaButton onClick={handleRemoveMedia}>
                    <X size={16} />
                  </RemoveMediaButton>
                </MediaPreviewWrapper>
              )}

              <FormFooter>
                <FooterLeft>
                  {!showCreateOptions && (
                    <OutlinedButton
                      onClick={() => setShowCreateOptions(true)}
                      disabled={isCreatingPost}
                    >
                      <Plus size={16} />
                      More Options
                    </OutlinedButton>
                  )}

                  {(showCreateOptions && postType !== 'transformation') && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                      />
                      <OutlinedButton
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isCreatingPost}
                      >
                        <Image size={16} />
                        Add Image
                      </OutlinedButton>
                    </>
                  )}

                  <VisibilitySelectWrapper>
                    <NativeSelect
                      value={visibility}
                      onChange={handleVisibilityChange}
                      disabled={isCreatingPost}
                    >
                      {visibilityOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </NativeSelect>
                    <SelectHelperText>Who can see your post</SelectHelperText>
                  </VisibilitySelectWrapper>
                </FooterLeft>

                <FooterRight>
                  {showCreateOptions && (
                    <OutlinedButton
                      onClick={() => setShowCreateOptions(false)}
                      disabled={isCreatingPost}
                    >
                      Simple Mode
                    </OutlinedButton>
                  )}

                  <ContainedButton
                    onClick={handleCreatePost}
                    disabled={
                      isCreatingPost ||
                      (
                        postType === 'transformation' ?
                          (!postContent.trim() && !beforeImage && !afterImage) :
                        postType === 'workout' ?
                          (!postContent.trim() && !Object.values(workoutStats).some(stat => stat.trim())) :
                          (!postContent.trim() && !media)
                      )
                    }
                  >
                    {isCreatingPost ? 'Posting...' : `Post (+${currentPostType.points} pts)`}
                    {isCreatingPost ? <Spinner /> : <Send size={16} />}
                  </ContainedButton>
                </FooterRight>
              </FormFooter>
            </FlexColumn>
          </PostInputWrapper>
        </CardBody>
      </CreatePostCardWrapper>

      {/* Floating Create Button */}
      {!showCreateOptions && (
        <FloatingCreateButton
          onClick={() => setShowCreateOptions(true)}
          disabled={isCreatingPost}
          title="Create an enhanced post with more options"
        >
          <Plus size={24} />
        </FloatingCreateButton>
      )}
    </>
  );
};

export default CreatePostCard;
