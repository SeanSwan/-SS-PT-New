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
  CircularProgress
} from '@mui/material';
import { Image, Send, X, Eye, EyeOff, User, Users, Globe } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Visibility options with icons
  const visibilityOptions = [
    { value: 'public', label: 'Public', icon: <Globe size={16} /> },
    { value: 'friends', label: 'Friends', icon: <Users size={16} /> },
    { value: 'private', label: 'Only Me', icon: <User size={16} /> }
  ];
  
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
  
  // Handle post submission
  const handleCreatePost = async () => {
    if (!postContent.trim() && !media) {
      return; // Don't submit empty posts
    }
    
    await createPost({
      content: postContent,
      type: 'general',
      visibility,
      media
    });
    
    // Reset form
    setPostContent('');
    setMedia(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <CreatePostCardWrapper>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Create Post
        </Typography>
        
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
              rows={3}
              placeholder={`What's on your mind, ${user?.firstName || 'there'}?`}
              variant="outlined"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              disabled={isCreatingPost}
            />
            
            {mediaPreview && (
              <MediaPreviewWrapper>
                <MediaPreview src={mediaPreview} alt="Upload preview" />
                <RemoveMediaButton onClick={handleRemoveMedia} size="small">
                  <X size={16} />
                </RemoveMediaButton>
              </MediaPreviewWrapper>
            )}
            
            <FormFooter>
              <Box display="flex" gap={1}>
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
              
              <Button
                variant="contained"
                color="primary"
                endIcon={isCreatingPost ? <CircularProgress size={16} color="inherit" /> : <Send size={16} />}
                onClick={handleCreatePost}
                disabled={isCreatingPost || (!postContent.trim() && !media)}
              >
                {isCreatingPost ? 'Posting...' : 'Post'}
              </Button>
            </FormFooter>
          </Box>
        </PostInputWrapper>
      </CardContent>
    </CreatePostCardWrapper>
  );
};

export default CreatePostCard;
