import React, { useState, useRef } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Avatar,
  Box,
  TextField,
  Button,
  IconButton,
  Divider,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  FormHelperText,
  CircularProgress,
  Chip,
  Menu,
  Fab,
  Tooltip
} from '@mui/material';
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
import styled from 'styled-components';

// Styled components
const CreatePostCardWrapper = styled(Card)`
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
`;

const PostInputWrapper = styled(Box)`
  display: flex;
  gap: 12px;
`;

const MediaPreviewWrapper = styled(Box)`
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

const RemoveMediaButton = styled(IconButton)`
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  &:hover {
    background-color: rgba(0, 0, 0, 0.7);
  }
`;

const FormFooter = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
`;

const VisibilitySelect = styled(Box)`
  display: flex;
  align-items: center;
`;

const PostTypeSelector = styled(Box)`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const PostTypeChip = styled(Chip)<{ selected?: boolean }>`
  cursor: pointer;
  border: 2px solid ${props => props.selected ? '#1976d2' : 'transparent'};
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const FloatingCreateButton = styled(Fab)`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
  background: linear-gradient(135deg, #1976d2, #42a5f5);
  color: white;
  
  &:hover {
    background: linear-gradient(135deg, #1565c0, #1e88e5);
    transform: scale(1.1);
  }
`;

const PointPreviewChip = styled(Chip)`
  background: linear-gradient(135deg, #4caf50, #66bb6a);
  color: white;
  font-weight: bold;
  
  .MuiChip-icon {
    color: white;
  }
`;

const TransformationImageContainer = styled(Box)`
  display: flex;
  gap: 16px;
  margin-top: 16px;
`;

const TransformationImageBox = styled(Box)`
  flex: 1;
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #1976d2;
    background-color: rgba(25, 118, 210, 0.04);
  }
`;

const WorkoutStatsContainer = styled(Box)`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
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
  const handleVisibilityChange = (event: SelectChangeEvent<string>) => {
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
      console.log(`🎉 You earned ${result.pointsAwarded} points!`);
    }
    
    // Reset form
    resetForm();
  };
  
  return (
    <>
      <CreatePostCardWrapper>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6">
              {showCreateOptions ? 'Create Post' : 'Quick Post'}
            </Typography>
            <PointPreviewChip
              icon={<Star />}
              label={`+${currentPostType.points} points`}
              size="small"
            />
          </Box>
          
          {showCreateOptions && (
            <PostTypeSelector>
              {postTypeOptions.map((option) => (
                <PostTypeChip
                  key={option.value}
                  icon={option.icon}
                  label={option.label}
                  selected={postType === option.value}
                  onClick={() => setPostType(option.value as any)}
                  variant={postType === option.value ? 'filled' : 'outlined'}
                  color={postType === option.value ? 'primary' : 'default'}
                />
              ))}
            </PostTypeSelector>
          )}
          
          {showCreateOptions && (
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary">
                {currentPostType.description}
              </Typography>
            </Box>
          )}
        
        <PostInputWrapper>
          <Avatar 
            src={user?.photo || undefined} 
            alt={user?.firstName || 'User'}
          >
            {user?.firstName?.[0] || 'U'}
          </Avatar>
          
          <Box flex={1}>
            <TextField
              fullWidth
              multiline
              rows={showCreateOptions ? 4 : 3}
              placeholder={
                postType === 'workout' ? `Share your workout achievements...` :
                postType === 'transformation' ? `Tell your transformation story...` :
                postType === 'achievement' ? `What milestone did you reach?` :
                postType === 'challenge' ? `Describe your challenge...` :
                `What's on your mind, ${user?.firstName || 'there'}?`
              }
              variant="outlined"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              disabled={isCreatingPost}
            />
            
            {/* Workout Stats Section */}
            {showCreateOptions && postType === 'workout' && (
              <WorkoutStatsContainer>
                <TextField
                  size="small"
                  label="Duration (min)"
                  value={workoutStats.duration}
                  onChange={(e) => handleWorkoutStatsChange('duration', e.target.value)}
                  type="number"
                />
                <TextField
                  size="small"
                  label="Exercises"
                  value={workoutStats.exerciseCount}
                  onChange={(e) => handleWorkoutStatsChange('exerciseCount', e.target.value)}
                  type="number"
                />
                <TextField
                  size="small"
                  label="Total Weight (lbs)"
                  value={workoutStats.totalWeight}
                  onChange={(e) => handleWorkoutStatsChange('totalWeight', e.target.value)}
                  type="number"
                />
                <TextField
                  size="small"
                  label="Calories Burned"
                  value={workoutStats.caloriesBurned}
                  onChange={(e) => handleWorkoutStatsChange('caloriesBurned', e.target.value)}
                  type="number"
                />
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
                    <Box>
                      <Camera size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                      <Typography variant="body2">Before Photo</Typography>
                    </Box>
                  )}
                </TransformationImageBox>
                
                <TransformationImageBox onClick={() => afterImageRef.current?.click()}>
                  {afterPreview ? (
                    <img src={afterPreview} alt="After" style={{ width: '100%', maxHeight: '150px', objectFit: 'cover' }} />
                  ) : (
                    <Box>
                      <Camera size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                      <Typography variant="body2">After Photo</Typography>
                    </Box>
                  )}
                </TransformationImageBox>
              </TransformationImageContainer>
            )}
            
            {mediaPreview && (
              <MediaPreviewWrapper>
                <MediaPreview src={mediaPreview} alt="Upload preview" />
                <RemoveMediaButton onClick={handleRemoveMedia} size="small">
                  <X size={16} />
                </RemoveMediaButton>
              </MediaPreviewWrapper>
            )}
            
            <FormFooter>
              <Box display="flex" gap={1} alignItems="center">
                {!showCreateOptions && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Plus size={16} />}
                    onClick={() => setShowCreateOptions(true)}
                    disabled={isCreatingPost}
                  >
                    More Options
                  </Button>
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
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Image size={16} />}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isCreatingPost}
                    >
                      Add Image
                    </Button>
                  </>
                )}
                
                <VisibilitySelect>
                  <FormControl size="small" variant="outlined" sx={{ minWidth: 120, ml: 1 }}>
                    <Select
                      value={visibility}
                      onChange={handleVisibilityChange}
                      disabled={isCreatingPost}
                      renderValue={(selected) => {
                        const option = visibilityOptions.find(opt => opt.value === selected);
                        return (
                          <Box display="flex" alignItems="center" gap={1}>
                            {option?.icon}
                            <Typography variant="body2">{option?.label}</Typography>
                          </Box>
                        );
                      }}
                    >
                      {visibilityOptions.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          <Box display="flex" alignItems="center" gap={1}>
                            {option.icon}
                            <Typography>{option.label}</Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>Who can see your post</FormHelperText>
                  </FormControl>
                </VisibilitySelect>
              </Box>
              
              <Box display="flex" alignItems="center" gap={1}>
                {showCreateOptions && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setShowCreateOptions(false)}
                    disabled={isCreatingPost}
                  >
                    Simple Mode
                  </Button>
                )}
                
                <Button
                  variant="contained"
                  color="primary"
                  endIcon={isCreatingPost ? <CircularProgress size={16} color="inherit" /> : <Send size={16} />}
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
                </Button>
              </Box>
            </FormFooter>
          </Box>
        </PostInputWrapper>
      </CardContent>
    </CreatePostCardWrapper>
    
    {/* Floating Create Button */}
    {!showCreateOptions && (
      <Tooltip title="Create an enhanced post with more options">
        <FloatingCreateButton
          onClick={() => setShowCreateOptions(true)}
          disabled={isCreatingPost}
        >
          <Plus size={24} />
        </FloatingCreateButton>
      </Tooltip>
    )}
  </>
  );
};

export default CreatePostCard;
