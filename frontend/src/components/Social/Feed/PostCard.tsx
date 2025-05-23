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
  DialogActions
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
  HeartOff
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

// Post type icons mapped to their components
const postTypeIcons = {
  general: User,
  workout: Dumbbell,
  achievement: Award,
  challenge: Trophy
};

// Post type labels
const postTypeLabels = {
  general: 'Post',
  workout: 'Workout',
  achievement: 'Achievement',
  challenge: 'Challenge'
};

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
  type: 'general' | 'workout' | 'achievement' | 'challenge';
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
  
  // Menu state
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchorEl);
  
  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  
  // Get the appropriate icon for the post type
  const PostTypeIcon = postTypeIcons[post.type] || User;
  
  // Format time ago
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  
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
    <PostCardWrapper>
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
            color={
              post.type === 'achievement' ? 'success' :
              post.type === 'workout' ? 'primary' :
              post.type === 'challenge' ? 'warning' : 'default'
            }
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
      
      <PostContent>
        <PostText variant="body1">
          {post.content}
        </PostText>
        
        {post.mediaUrl && (
          <PostMedia src={post.mediaUrl} alt="Post image" />
        )}
      </PostContent>
      
      <Divider />
      
      <CardActions>
        <ActionButton 
          size="small" 
          startIcon={post.isLiked ? <Heart size={18} fill="#f44336" stroke="#f44336" /> : <Heart size={18} />} 
          color={post.isLiked ? "error" : "inherit"}
          onClick={() => onLike(post.id)}
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
  );
};

export default PostCard;
