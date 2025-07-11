import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Avatar,
  Box,
  IconButton,
  Button,
  TextField,
  Divider,
  Menu,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { 
  Heart, 
  MessageSquare, 
  Share, 
  MoreVertical, 
  Award, 
  Dumbbell, 
  Trophy,
  User,
  Send,
  HeartOff,
  Camera,
  Target,
  Zap,
  Star,
  Clock,
  Flame,
  Weight,
  Play
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import styled from 'styled-components';

// Styled components
const PostCardWrapper = styled(Card)`
  margin-bottom: 16px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
`;

const PostHeader = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
`;

const UserInfo = styled(Box)`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const PostType = styled(Chip)`
  height: 24px;
  font-size: 0.75rem;
`;

const PostContent = styled(CardContent)`
  padding-top: 0;
`;

const PostText = styled(Typography)`
  margin-bottom: 16px;
  white-space: pre-wrap;
`;

const PostMedia = styled.img`
  width: 100%;
  max-height: 400px;
  object-fit: cover;
  border-radius: 4px;
`;

const ActionButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: 6px;
  text-transform: none;
  font-weight: normal;
`;

const CommentsList = styled(Box)`
  margin-top: 16px;
`;

const CommentItem = styled(Box)`
  display: flex;
  margin-bottom: 12px;
  gap: 12px;
`;

const CommentInput = styled(Box)`
  display: flex;
  margin-top: 16px;
  gap: 12px;
  align-items: center;
`;

const PointNotificationChip = styled(Chip)`
  background: linear-gradient(135deg, #4caf50, #66bb6a);
  color: white;
  font-weight: bold;
  animation: pointEarn 2s ease-out;
  
  @keyframes pointEarn {
    0% { transform: scale(0.8); opacity: 0; }
    50% { transform: scale(1.1); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  
  .MuiChip-icon {
    color: white;
  }
`;

const WorkoutStatsContainer = styled(Box)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin: 16px 0;
  padding: 16px;
  background: rgba(25, 118, 210, 0.04);
  border-radius: 8px;
  border-left: 4px solid #1976d2;
`;

const WorkoutStatItem = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

const TransformationImageContainer = styled(Box)`
  display: flex;
  gap: 8px;
  margin: 16px 0;
  position: relative;
`;

const TransformationImage = styled.img`
  flex: 1;
  height: 200px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.02);
  }
`;

const TransformationSlider = styled(Box)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translate(-50%, -50%) scale(1.1);
  }
`;

const TryWorkoutButton = styled(Button)`
  background: linear-gradient(135deg, #ff6b35, #f7931e);
  color: white;
  border-radius: 20px;
  padding: 8px 16px;
  margin-top: 12px;
  text-transform: none;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
  
  &:hover {
    background: linear-gradient(135deg, #e85a2b, #e0851a);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(255, 107, 53, 0.4);
  }
`;

const AchievementBadge = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #ffd700, #ffed4a);
  border-radius: 12px;
  margin: 16px 0;
  border: 2px solid #f7b32b;
`;

const PostTypeIndicator = styled(Box)<{ postType: string }>`
  position: absolute;
  top: 12px;
  right: 12px;
  background: ${props => 
    props.postType === 'workout' ? 'linear-gradient(135deg, #1976d2, #42a5f5)' :
    props.postType === 'transformation' ? 'linear-gradient(135deg, #e91e63, #f06292)' :
    props.postType === 'achievement' ? 'linear-gradient(135deg, #ff9800, #ffb74d)' :
    props.postType === 'challenge' ? 'linear-gradient(135deg, #9c27b0, #ba68c8)' :
    'linear-gradient(135deg, #757575, #9e9e9e)'
  };
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
`;

// Post type icons mapped to their components
const postTypeIcons = {
  general: User,
  workout: Dumbbell,
  achievement: Award,
  challenge: Trophy,
  transformation: Camera
};

// Post type labels
const postTypeLabels = {
  general: 'Post',
  workout: 'Workout',
  achievement: 'Achievement',
  challenge: 'Challenge',
  transformation: 'Transformation'
};

// Post type colors
const postTypeColors = {
  general: 'default',
  workout: 'primary',
  achievement: 'success',
  challenge: 'warning',
  transformation: 'secondary'
} as const;

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    photo?: string;
  };
}

interface Post {
  id: string;
  content: string;
  type: 'general' | 'workout' | 'achievement' | 'challenge' | 'transformation';
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    photo?: string;
  };
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  mediaUrl?: string;
  comments?: Comment[];
  workoutData?: {
    duration?: string;
    exerciseCount?: string;
    totalWeight?: string;
    caloriesBurned?: string;
  };
  transformationData?: {
    hasBeforeImage?: boolean;
    hasAfterImage?: boolean;
    beforeImageUrl?: string;
    afterImageUrl?: string;
  };
  achievementData?: {
    title?: string;
    description?: string;
    points?: number;
  };
  challengeData?: {
    title?: string;
    difficulty?: string;
    duration?: string;
  };
}

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onComment: (postId: string, content: string) => void;
}

/**
 * PostCard Component
 * Displays a single post in the social feed
 */
const PostCard: React.FC<PostCardProps> = ({ post, onLike, onComment }) => {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [showPointNotification, setShowPointNotification] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [transformationSliderValue, setTransformationSliderValue] = useState(50);
  
  // Menu state
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchorEl);
  
  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  
  // Get the appropriate icon for the post type
  const PostTypeIcon = postTypeIcons[post.type] || User;
  
  // Format time ago
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  
  // Handle enhanced like with point notification
  const handleEnhancedLike = async () => {
    const result = await onLike(post.id);
    
    // Show point notification if points were earned
    if (result && result.pointsAwarded) {
      setPointsEarned(result.pointsAwarded);
      setShowPointNotification(true);
      setTimeout(() => setShowPointNotification(false), 3000);
    }
  };
  
  // Handle try workout action
  const handleTryWorkout = () => {
    // This would integrate with the workout generator in a real implementation
    console.log('Opening workout generator with this workout as template...');
  };
  
  // Render workout stats
  const renderWorkoutStats = () => {
    if (!post.workoutData) return null;
    
    const stats = [
      { icon: Clock, label: 'Duration', value: post.workoutData.duration, unit: 'min' },
      { icon: Dumbbell, label: 'Exercises', value: post.workoutData.exerciseCount, unit: '' },
      { icon: Weight, label: 'Total Weight', value: post.workoutData.totalWeight, unit: 'lbs' },
      { icon: Flame, label: 'Calories', value: post.workoutData.caloriesBurned, unit: '' }
    ].filter(stat => stat.value && stat.value.trim());
    
    if (stats.length === 0) return null;
    
    return (
      <WorkoutStatsContainer>
        {stats.map(({ icon: Icon, label, value, unit }) => (
          <WorkoutStatItem key={label}>
            <Icon size={20} color="#1976d2" />
            <Typography variant="h6" fontWeight="600">
              {value}{unit}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
          </WorkoutStatItem>
        ))}
      </WorkoutStatsContainer>
    );
  };
  
  // Render transformation images
  const renderTransformationImages = () => {
    if (!post.transformationData) return null;
    
    return (
      <TransformationImageContainer>
        {post.transformationData.beforeImageUrl && (
          <TransformationImage 
            src={post.transformationData.beforeImageUrl} 
            alt="Before transformation" 
            style={{ opacity: transformationSliderValue / 100 }}
          />
        )}
        {post.transformationData.afterImageUrl && (
          <TransformationImage 
            src={post.transformationData.afterImageUrl} 
            alt="After transformation"
            style={{ opacity: 1 - (transformationSliderValue / 100) }}
          />
        )}
        <TransformationSlider>
          <Play size={16} />
        </TransformationSlider>
      </TransformationImageContainer>
    );
  };
  
  // Render achievement badge
  const renderAchievementBadge = () => {
    if (!post.achievementData) return null;
    
    return (
      <AchievementBadge>
        <Trophy size={24} color="#f7b32b" />
        <Box>
          <Typography variant="subtitle1" fontWeight="600" color="#8b4513">
            {post.achievementData.title || 'Achievement Unlocked!'}
          </Typography>
          <Typography variant="body2" color="#8b4513">
            {post.achievementData.description || 'Reached a new milestone'}
          </Typography>
        </Box>
        {post.achievementData.points && (
          <Chip 
            icon={<Star />} 
            label={`+${post.achievementData.points} pts`}
            size="small"
            style={{ background: '#f7b32b', color: 'white' }}
          />
        )}
      </AchievementBadge>
    );
  };
  
  // Handle comment submission
  const handleSubmitComment = () => {
    if (commentText.trim()) {
      onComment(post.id, commentText);
      setCommentText('');
    }
  };
  
  // Handle key press in comment input
  const handleCommentKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };
  
  // Handle menu open
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };
  
  // Handle menu close
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  return (
    <>
      <PostCardWrapper>
        <Box position="relative">
          <PostTypeIndicator postType={post.type}>
            <PostTypeIcon size={12} />
            {postTypeLabels[post.type]}
          </PostTypeIndicator>
          
          <PostHeader>
            <UserInfo>
              <Avatar 
                src={post.user.photo || undefined} 
                alt={`${post.user.firstName} ${post.user.lastName}`}
              >
                {post.user.firstName[0]}{post.user.lastName[0]}
              </Avatar>
              <Box>
                <Typography variant="subtitle1">
                  {post.user.firstName} {post.user.lastName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {timeAgo}
                </Typography>
              </Box>
            </UserInfo>
            
            <Box display="flex" alignItems="center" gap={1}>
              <PostType
                size="small"
                label={postTypeLabels[post.type]}
                icon={<PostTypeIcon size={14} />}
                variant="outlined"
                color={postTypeColors[post.type] as any}
              />
          
          <IconButton size="small" onClick={handleMenuOpen}>
            <MoreVertical size={20} />
          </IconButton>
          
          <Menu
            anchorEl={menuAnchorEl}
            open={menuOpen}
            onClose={handleMenuClose}
          >
            {/* More menu items */}
            <MenuItem onClick={handleMenuClose}>Report Post</MenuItem>
            {user && user.id === post.user.id && (
              <MenuItem onClick={handleMenuClose}>Delete Post</MenuItem>
            )}
          </Menu>
            </Box>
          </PostHeader>
        </Box>
        
        <PostContent>
          {/* Achievement Badge */}
          {post.type === 'achievement' && renderAchievementBadge()}
          
          <PostText variant="body1">
            {post.content}
          </PostText>
          
          {/* Workout Stats */}
          {post.type === 'workout' && renderWorkoutStats()}
          
          {/* Transformation Images */}
          {post.type === 'transformation' && renderTransformationImages()}
          
          {/* Regular Media */}
          {post.mediaUrl && post.type !== 'transformation' && (
            <PostMedia src={post.mediaUrl} alt="Post image" />
          )}
          
          {/* Try Workout Button for Workout Posts */}
          {post.type === 'workout' && (
            <Box display="flex" justifyContent="center">
              <TryWorkoutButton
                startIcon={<Zap size={16} />}
                onClick={handleTryWorkout}
              >
                🚀 Try This Workout
              </TryWorkoutButton>
            </Box>
          )}
        </PostContent>
      
      <Divider />
      
      <CardActions>
        <ActionButton 
          size="small" 
          startIcon={post.isLiked ? <Heart size={18} fill="#f44336" stroke="#f44336" /> : <Heart size={18} />} 
          color={post.isLiked ? "error" : "inherit"}
          onClick={handleEnhancedLike}
        >
          {post.likesCount} {post.likesCount === 1 ? 'Like' : 'Likes'}
        </ActionButton>
        
        <ActionButton 
          size="small" 
          startIcon={<MessageSquare size={18} />}
          onClick={() => setShowComments(!showComments)}
        >
          {post.commentsCount} {post.commentsCount === 1 ? 'Comment' : 'Comments'}
        </ActionButton>
        
        <ActionButton 
          size="small" 
          startIcon={<Share size={18} />}
          onClick={() => setShareDialogOpen(true)}
        >
          Share
        </ActionButton>
      </CardActions>
      
      {showComments && (
        <>
          <Divider />
          <Box padding={2}>
            {/* Comments List */}
            {post.comments && post.comments.length > 0 ? (
              <CommentsList>
                {post.comments.map(comment => (
                  <CommentItem key={comment.id}>
                    <Avatar 
                      src={comment.user.photo || undefined} 
                      alt={`${comment.user.firstName} ${comment.user.lastName}`}
                      sx={{ width: 32, height: 32 }}
                    >
                      {comment.user.firstName[0]}{comment.user.lastName[0]}
                    </Avatar>
                    <Box flex={1}>
                      <Box bgcolor="rgba(0, 0, 0, 0.04)" borderRadius={2} padding={1}>
                        <Typography variant="subtitle2">
                          {comment.user.firstName} {comment.user.lastName}
                        </Typography>
                        <Typography variant="body2">
                          {comment.content}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </Typography>
                    </Box>
                  </CommentItem>
                ))}
              </CommentsList>
            ) : (
              <Typography variant="body2" color="text.secondary" textAlign="center" my={2}>
                No comments yet. Be the first to comment!
              </Typography>
            )}
            
            {/* Comment Input */}
            <CommentInput>
              <Avatar 
                src={user?.photo || undefined} 
                alt={user?.firstName || 'User'}
                sx={{ width: 32, height: 32 }}
              >
                {user?.firstName?.[0] || 'U'}
              </Avatar>
              <TextField
                fullWidth
                size="small"
                placeholder="Write a comment..."
                variant="outlined"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={handleCommentKeyPress}
                multiline
                maxRows={4}
              />
              <IconButton 
                color="primary" 
                onClick={handleSubmitComment}
                disabled={!commentText.trim()}
              >
                <Send size={20} />
              </IconButton>
            </CommentInput>
          </Box>
        </>
      )}
      
      {/* Share Dialog */}
      <Dialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Share Post</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Share this post with friends or on other platforms.
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            value={`https://swanstudios.com/social/posts/${post.id}`}
            InputProps={{
              readOnly: true,
            }}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              navigator.clipboard.writeText(`https://swanstudios.com/social/posts/${post.id}`);
              setShareDialogOpen(false);
            }}
          >
            Copy Link
          </Button>
        </DialogActions>
      </Dialog>
    </PostCardWrapper>
    
    {/* Point Notification */}
    <Snackbar
      open={showPointNotification}
      autoHideDuration={3000}
      onClose={() => setShowPointNotification(false)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert 
        severity="success" 
        onClose={() => setShowPointNotification(false)}
        sx={{ 
          background: 'linear-gradient(135deg, #4caf50, #66bb6a)',
          color: 'white',
          '& .MuiAlert-icon': { color: 'white' }
        }}
      >
        🎉 You earned {pointsEarned} points!
      </Alert>
    </Snackbar>
  </>
  );
};

export default PostCard;
