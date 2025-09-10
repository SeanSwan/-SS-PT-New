/**
 * SwanStudios Community Feed Component
 * ===================================
 * 
 * Professional community feed with real-time updates and engaging interactions
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Star, 
  Sun, 
  Plus,
  Image as ImageIcon,
  Video,
  Smile
} from 'lucide-react';

// Professional styled components
const FeedContainer = styled(motion.div)`
  background: ${({ theme }) => theme.gradients?.card || 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))'};
  backdrop-filter: blur(24px);
  border: 1px solid ${({ theme }) => theme.borders?.elegant || 'rgba(255,255,255,0.12)'};
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.15),
    0 8px 16px rgba(0, 0, 0, 0.1);
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    border-radius: 16px;
  }
`;

const FeedHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
`;

const FeedTitle = styled.h2`
  color: ${({ theme }) => theme.text?.primary || 'white'};
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
    justify-content: center;
  }
`;

const CreatePostSection = styled.div`
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(255,255,255,0.1)'};
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const PostInput = styled.textarea`
  width: 100%;
  min-height: 100px;
  background: ${({ theme }) => theme.background?.primary || 'rgba(0,0,0,0.3)'};
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(255,255,255,0.1)'};
  border-radius: 12px;
  padding: 1rem;
  color: ${({ theme }) => theme.text?.primary || 'white'};
  font-family: inherit;
  font-size: 1rem;
  line-height: 1.5;
  resize: vertical;
  transition: all 0.3s ease;
  
  &::placeholder {
    color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.5)'};
  }
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors?.primary + '20' || 'rgba(59, 130, 246, 0.2)'};
  }
`;

const PostActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const PostOptions = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
`;

const PostOptionButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(255,255,255,0.1)'};
  border-radius: 8px;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  
  &:hover {
    background: ${({ theme }) => theme.colors?.primary + '20' || 'rgba(59, 130, 246, 0.2)'};
    border-color: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
    color: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
    transform: translateY(-1px);
  }
`;

const PostButton = styled(motion.button)`
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const PostsStream = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const PostCard = styled(motion.div)`
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
  border: 1px solid ${({ theme }) => theme.borders?.elegant || 'rgba(255,255,255,0.1)'};
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    border-color: ${({ theme }) => theme.colors?.primary + '40' || 'rgba(59, 130, 246, 0.4)'};
  }
`;

const PostHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem 1.5rem 0;
`;

const PostAuthorImage = styled.div<{ $image?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ $image, theme }) => 
    $image ? `url(${$image})` : theme.gradients?.primary || 'linear-gradient(135deg, #3B82F6, #8B5CF6)'
  };
  background-size: cover;
  background-position: center;
  border: 2px solid ${({ theme }) => theme.colors?.primary + '40' || 'rgba(59, 130, 246, 0.4)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
`;

const PostAuthorInfo = styled.div`
  flex: 1;
`;

const PostAuthorName = styled.h4`
  color: ${({ theme }) => theme.text?.primary || 'white'};
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
`;

const PostTimestamp = styled.p`
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
  font-size: 0.9rem;
  margin: 0;
`;

const PostContent = styled.div`
  padding: 1rem 1.5rem;
`;

const PostText = styled.p`
  color: ${({ theme }) => theme.text?.primary || 'white'};
  font-size: 1rem;
  line-height: 1.6;
  margin: 0 0 1rem;
  word-wrap: break-word;
`;

const PostFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem 1.5rem;
  border-top: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(255,255,255,0.1)'};
  margin-top: 1rem;
  padding-top: 1rem;
`;

const PostInteractions = styled.div`
  display: flex;
  gap: 1.5rem;
  align-items: center;
`;

const InteractionButton = styled(motion.button)<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: ${({ $active, theme }) => 
    $active ? theme.colors?.primary || '#3B82F6' : theme.text?.secondary || 'rgba(255,255,255,0.7)'
  };
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors?.primary + '10' || 'rgba(59, 130, 246, 0.1)'};
    color: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
    transform: scale(1.05);
  }
`;

// Mock posts data
const mockPosts = [
  {
    id: 1,
    author: {
      name: 'Alex Rivera',
      username: 'alex_fit',
      image: null,
      initials: 'AR'
    },
    content: '🌟 Just completed my morning workout! There\'s something magical about starting the day with movement and positive energy. Feeling grateful for this amazing SwanStudios community! ✨',
    timestamp: '2 hours ago',
    interactions: {
      likes: 24,
      comments: 8,
      shares: 3
    },
    userInteractions: {
      liked: false,
      commented: false,
      shared: false
    }
  },
  {
    id: 2,
    author: {
      name: 'Luna Wellness',
      username: 'luna_health',
      image: null,
      initials: 'LW'
    },
    content: '💪 Progress update: Finally achieved my goal of 10 push-ups in a row! Six months ago, I could barely do one. Consistency and the supportive SwanStudios community made all the difference. Keep going everyone! 🚀',
    timestamp: '4 hours ago',
    interactions: {
      likes: 42,
      comments: 15,
      shares: 7
    },
    userInteractions: {
      liked: true,
      commented: false,
      shared: false
    }
  },
  {
    id: 3,
    author: {
      name: 'Marcus Strong',
      username: 'marcus_power',
      image: null,
      initials: 'MS'
    },
    content: '🎯 Reminder: Your fitness journey is unique to you. Don\'t compare your chapter 1 to someone else\'s chapter 20. Focus on your progress, celebrate small wins, and keep moving forward. You\'ve got this! 💛',
    timestamp: '6 hours ago',
    interactions: {
      likes: 67,
      comments: 23,
      shares: 12
    },
    userInteractions: {
      liked: true,
      commented: true,
      shared: false
    }
  }
];

const CommunityFeed: React.FC = () => {
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [posts, setPosts] = useState(mockPosts);

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || isPosting) return;
    
    setIsPosting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newPost = {
      id: Date.now(),
      author: {
        name: 'You',
        username: 'your_username',
        image: null,
        initials: 'YU'
      },
      content: newPostContent,
      timestamp: 'Just now',
      interactions: {
        likes: 0,
        comments: 0,
        shares: 0
      },
      userInteractions: {
        liked: false,
        commented: false,
        shared: false
      }
    };
    
    setPosts(prev => [newPost, ...prev]);
    setNewPostContent('');
    setIsPosting(false);
  };

  const handleInteraction = (postId: number, type: 'likes' | 'comments' | 'shares') => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const interactionKey = type === 'likes' ? 'liked' : type === 'comments' ? 'commented' : 'shared';
        const wasActive = post.userInteractions[interactionKey];
        
        return {
          ...post,
          interactions: {
            ...post.interactions,
            [type]: wasActive ? post.interactions[type] - 1 : post.interactions[type] + 1
          },
          userInteractions: {
            ...post.userInteractions,
            [interactionKey]: !wasActive
          }
        };
      }
      return post;
    }));
  };

  return (
    <FeedContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <FeedHeader>
        <FeedTitle>
          <Star size={24} />
          Community Feed
        </FeedTitle>
      </FeedHeader>
      
      {/* Create New Post */}
      <CreatePostSection>
        <PostInput
          placeholder="Share your positive energy with the SwanStudios community... ✨"
          value={newPostContent}
          onChange={(e) => setNewPostContent(e.target.value)}
          maxLength={500}
        />
        <PostActions>
          <PostOptions>
            <PostOptionButton whileHover={{ scale: 1.05 }}>
              <ImageIcon size={18} />
              Photo
            </PostOptionButton>
            <PostOptionButton whileHover={{ scale: 1.05 }}>
              <Video size={18} />
              Video
            </PostOptionButton>
            <PostOptionButton whileHover={{ scale: 1.05 }}>
              <Smile size={18} />
              Feeling
            </PostOptionButton>
          </PostOptions>
          <PostButton
            onClick={handleCreatePost}
            disabled={!newPostContent.trim() || isPosting}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isPosting ? 'Posting...' : 'Share'}
          </PostButton>
        </PostActions>
      </CreatePostSection>
      
      {/* Posts Stream */}
      <PostsStream>
        <AnimatePresence>
          {posts.map((post, index) => (
            <PostCard
              key={post.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <PostHeader>
                <PostAuthorImage $image={post.author.image}>
                  {!post.author.image && post.author.initials}
                </PostAuthorImage>
                <PostAuthorInfo>
                  <PostAuthorName>{post.author.name}</PostAuthorName>
                  <PostTimestamp>@{post.author.username} • {post.timestamp}</PostTimestamp>
                </PostAuthorInfo>
              </PostHeader>
              
              <PostContent>
                <PostText>{post.content}</PostText>
              </PostContent>
              
              <PostFooter>
                <PostInteractions>
                  <InteractionButton
                    $active={post.userInteractions.liked}
                    onClick={() => handleInteraction(post.id, 'likes')}
                    whileHover={{ scale: 1.1 }}
                  >
                    <Heart size={18} />
                    {post.interactions.likes}
                  </InteractionButton>
                  <InteractionButton
                    $active={post.userInteractions.commented}
                    onClick={() => handleInteraction(post.id, 'comments')}
                    whileHover={{ scale: 1.1 }}
                  >
                    <MessageCircle size={18} />
                    {post.interactions.comments}
                  </InteractionButton>
                  <InteractionButton
                    onClick={() => handleInteraction(post.id, 'shares')}
                    whileHover={{ scale: 1.1 }}
                  >
                    <Share2 size={18} />
                    {post.interactions.shares}
                  </InteractionButton>
                </PostInteractions>
              </PostFooter>
            </PostCard>
          ))}
        </AnimatePresence>
      </PostsStream>
    </FeedContainer>
  );
};

export default CommunityFeed;