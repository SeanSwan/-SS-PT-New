import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, Star, Sparkles } from 'lucide-react';

const FeedContainer = styled(motion.div)`
  background: ${({ theme }) => theme.gradients?.card || 'rgba(255,255,255,0.05)'};
  backdrop-filter: blur(20px);
  border: 1px solid ${({ theme }) => theme.borders?.elegant || 'rgba(255,255,255,0.1)'};
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
`;

const FeedHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const FeedTitle = styled.h2`
  color: ${({ theme }) => theme.text?.primary || 'white'};
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PostComposer = styled.div`
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.1)'};
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 2rem;
`;

const PostInput = styled.textarea`
  width: 100%;
  min-height: 100px;
  background: ${({ theme }) => theme.background?.primary || '#0a0a1a'};
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(255,255,255,0.2)'};
  border-radius: 8px;
  padding: 1rem;
  color: ${({ theme }) => theme.text?.primary || 'white'};
  font-family: inherit;
  resize: vertical;
  
  &::placeholder {
    color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.5)'};
  }
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors?.primary || '#00ffff'};
  }
`;

const PostButton = styled.button`
  background: ${({ theme }) => theme.gradients?.primary || 'linear-gradient(135deg, #00ffff, #7851a9)'};
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 1rem;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const PostCard = styled(motion.div)`
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(255,255,255,0.1)'};
`;

const PostHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const PostAuthor = styled.div`
  flex: 1;
`;

const PostAuthorName = styled.h4`
  color: ${({ theme }) => theme.text?.primary || 'white'};
  margin: 0;
  font-size: 1rem;
`;

const PostTime = styled.p`
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
  margin: 0;
  font-size: 0.8rem;
`;

const PostContent = styled.p`
  color: ${({ theme }) => theme.text?.primary || 'white'};
  line-height: 1.6;
  margin-bottom: 1rem;
`;

const PostActions = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.1)'};
    color: ${({ theme }) => theme.colors?.primary || '#00ffff'};
  }
`;

const mockPosts = [
  {
    id: 1,
    author: 'Alex Fitness',
    time: '2 hours ago',
    content: "Just completed an amazing workout session! 💪 Feeling stronger every day. The journey to better health is so rewarding. Who else crushed their goals today?",
    likes: 24,
    comments: 5
  },
  {
    id: 2,
    author: 'Sarah Wellness',
    time: '4 hours ago',
    content: "Beautiful morning yoga session in the park! 🧘‍♀️ There's something magical about connecting with nature while moving your body. Namaste! ✨",
    likes: 31,
    comments: 8
  },
  {
    id: 3,
    author: 'Mike Strong',
    time: '1 day ago',
    content: "New personal record on deadlifts today! 🎉 Six months of consistent training and proper nutrition really pays off. Keep pushing, everyone!",
    likes: 42,
    comments: 12
  }
];

/**
 * Optimized Community Feed Component
 * Shows recent posts from the SwanStudios community
 */
const CommunityFeed: React.FC = () => {
  const [newPost, setNewPost] = useState('');
  const [posts, setPosts] = useState(mockPosts);

  const handlePostSubmit = () => {
    if (!newPost.trim()) return;
    
    const post = {
      id: Date.now(),
      author: 'You',
      time: 'Just now',
      content: newPost,
      likes: 0,
      comments: 0
    };
    
    setPosts(prev => [post, ...prev]);
    setNewPost('');
  };

  const handleLike = (postId: number) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, likes: post.likes + 1 }
        : post
    ));
  };

  return (
    <FeedContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <FeedHeader>
        <FeedTitle>
          <Sparkles size={24} />
          Community Feed
        </FeedTitle>
      </FeedHeader>

      <PostComposer>
        <PostInput
          placeholder="Share your fitness journey with the community... ✨"
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          maxLength={500}
        />
        <PostButton onClick={handlePostSubmit}>
          Share Post
        </PostButton>
      </PostComposer>

      <div>
        {posts.map((post, index) => (
          <PostCard
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <PostHeader>
              <PostAuthor>
                <PostAuthorName>{post.author}</PostAuthorName>
                <PostTime>{post.time}</PostTime>
              </PostAuthor>
            </PostHeader>
            
            <PostContent>{post.content}</PostContent>
            
            <PostActions>
              <ActionButton onClick={() => handleLike(post.id)}>
                <Heart size={16} />
                {post.likes}
              </ActionButton>
              <ActionButton>
                <MessageCircle size={16} />
                {post.comments}
              </ActionButton>
              <ActionButton>
                <Share2 size={16} />
                Share
              </ActionButton>
            </PostActions>
          </PostCard>
        ))}
      </div>
    </FeedContainer>
  );
};

export default React.memo(CommunityFeed);
