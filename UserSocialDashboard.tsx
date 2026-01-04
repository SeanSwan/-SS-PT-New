import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import apiService from '../../../../services/api.service';

// Icons
import { MessageSquare, User, Trophy, Target, Zap, Dumbbell, Star, Heart, Plus, CheckCircle, X, ThumbsUp, Send } from 'lucide-react';
import GlowButton from '../../../ui/buttons/GlowButton';
import { useToast } from '../../../hooks/use-toast';

// --- STYLED COMPONENTS ---

const DashboardContainer = styled(motion.div)`
  padding: 2rem;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  min-height: 100vh;
  color: white;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #ffffff, #00ffff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const MainLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;

  @media (min-width: 1024px) {
    grid-template-columns: 2fr 1fr;
  }
`;

const FeedSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const SidebarSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Card = styled.div`
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(59, 130, 246, 0.2);
`;

const PlaceholderBox = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  border: 1px dashed rgba(255, 255, 255, 0.1);
`;

const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  
  &:last-child {
    border-bottom: none;
  }
`;

const BadgeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  margin-top: 1rem;
`;

const BadgePlaceholder = styled.div`
  aspect-ratio: 1;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
`;

const GoalItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 0.5rem;
`;

const GoalInput = styled.input`
  width: 100%;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.75rem;
  color: white;
  margin-top: 0.5rem;
  
  &:focus {
    outline: none;
    border-color: #34d399;
  }
`;

const FeedItem = styled(motion.div)`
  background: rgba(30, 41, 59, 0.4);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(59, 130, 246, 0.1);
  margin-bottom: 1rem;
`;

const FeedItemActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`;

const ActionButton = styled.button<{ active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: none;
  color: ${props => props.active ? props.theme.colors.info || '#0ea5e9' : 'rgba(255, 255, 255, 0.6)'};
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
`;

const CommentSection = styled(motion.div)`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`;

const CommentItem = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const CommentInputContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const UserSocialDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State for Feed
  const [feed, setFeed] = useState<any[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);

  // State for Comments
  const [activeCommentSection, setActiveCommentSection] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  // State for Goals
  const [goals, setGoals] = useState<{id: string, text: string, completed: boolean}[]>([]);
  const [newGoal, setNewGoal] = useState("");
  const [showGoalInput, setShowGoalInput] = useState(false);

  // Logic to determine if user is a client (has sessions or specific role)
  // Adjust 'client' role check based on your actual auth logic
  const isClient = user?.role === 'client' || (user?.sessionsRemaining && user.sessionsRemaining > 0);

  useEffect(() => {
    const fetchFeed = async () => {
      setLoadingFeed(true);
      try {
        const res = await apiService.get('/api/feed');
        setFeed(res.data);
      } catch (error) {
        console.error("Failed to fetch feed", error);
        toast({ title: "Error", description: "Could not load the activity feed.", variant: "destructive" });
      } finally {
        setLoadingFeed(false);
      }
    };

    const fetchGoals = async () => {
      try {
        const res = await apiService.get('/api/goals');
        setGoals(res.data);
      } catch (error) {
        console.error("Failed to fetch goals", error);
      }
    };

    fetchFeed();
    fetchGoals();
  }, [toast]);

  const handleAddGoal = async () => {
    if (!newGoal.trim()) return;
    try {
      const res = await apiService.post('/api/goals', { text: newGoal });
      setGoals([res.data, ...goals]);
      setNewGoal("");
      setShowGoalInput(false);
      toast({ title: "Goal Added", description: "Your new goal has been tracked." });
    } catch (error) {
      toast({ title: "Error", description: "Could not add goal.", variant: "destructive" });
    }
  };

  const toggleGoal = async (id: string) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;

    try {
      const updatedGoal = await apiService.put(`/api/goals/${id}`, { completed: !goal.completed });
      setGoals(goals.map(g => g.id === id ? updatedGoal.data : g));
    } catch (error) {
      toast({ title: "Error", description: "Could not update goal.", variant: "destructive" });
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      await apiService.delete(`/api/goals/${id}`);
      setGoals(goals.filter(g => g.id !== id));
      toast({ title: "Goal Removed", description: "Your goal has been deleted." });
    } catch (error) {
      toast({ title: "Error", description: "Could not delete goal.", variant: "destructive" });
    }
  };

  const handleLike = async (feedItemId: string) => {
    // Optimistic UI update
    setFeed(currentFeed =>
      currentFeed.map(item => {
        if (item.id === feedItemId) {
          return {
            ...item,
            isLiked: !item.isLiked,
            likeCount: item.isLiked ? item.likeCount - 1 : item.likeCount + 1,
          };
        }
        return item;
      })
    );

    try {
      await apiService.post('/api/feed/like', { feedItemId });
    } catch (error) {
      toast({ title: "Error", description: "Could not update like.", variant: "destructive" });
      // Revert optimistic update on error
      // (For brevity, a full revert isn't shown, but would be needed in a production app)
    }
  };

  const toggleCommentSection = async (feedItemId: string) => {
    if (activeCommentSection === feedItemId) {
      setActiveCommentSection(null);
      setComments([]);
    } else {
      setActiveCommentSection(feedItemId);
      try {
        const res = await apiService.get(`/api/feed/${feedItemId}/comments`);
        setComments(res.data);
      } catch (error) {
        toast({ title: "Error", description: "Could not load comments.", variant: "destructive" });
      }
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !activeCommentSection) return;
    try {
      const res = await apiService.post(`/api/feed/${activeCommentSection}/comments`, { content: newComment });
      setComments([...comments, res.data]);
      setNewComment('');
      // Update comment count on the feed item
      setFeed(feed.map(item => 
        item.id === activeCommentSection 
          ? { ...item, commentCount: (item.commentCount || 0) + 1 } 
          : item
      ));
    } catch (error) {
      toast({ title: "Error", description: "Could not post comment.", variant: "destructive" });
    }
  };

  return (
    <DashboardContainer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Header>
        <div>
          <PageTitle>Welcome back, {user?.firstName || 'User'}!</PageTitle>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
            Your Social Hub & Community
          </p>
        </div>
        
        {isClient && (
          <GlowButton 
            text="Enter Training Mode"
            icon={<Dumbbell size={18} />}
            theme="cyan"
            onClick={() => navigate('/dashboard/client')}
          />
        )}
      </Header>

      <MainLayout>
        {/* LEFT COLUMN: SOCIAL FEED */}
        <FeedSection>
          {/* Post Composer */}
          <Card>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#3b82f6' }} />
              <input 
                type="text" 
                placeholder="Share your latest win..." 
                style={{ 
                  flex: 1, 
                  background: 'rgba(0,0,0,0.2)', 
                  border: 'none', 
                  padding: '0.75rem', 
                  borderRadius: '8px',
                  color: 'white'
                }} 
              />
            </div>
          </Card>

          {/* Feed Placeholder */}
          <Card>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={20} color="#00ffff" /> Community Activity
            </h3>
            
            {loadingFeed ? (
              <PlaceholderBox>Loading feed...</PlaceholderBox>
            ) : (
              <div>
                {feed.map((item) => (
                  <FeedItem 
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: item.type === 'workout' ? '#3b82f6' : '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.type === 'workout' ? <Dumbbell size={16} color="white" /> : <Trophy size={16} color="white" />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.user.firstName} <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.6)' }}>{item.title}</span></div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{new Date(item.timestamp).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)' }}>{item.content}</p>
                    <FeedItemActions>
                      <ActionButton active={item.isLiked} onClick={() => handleLike(item.id)}>
                        <ThumbsUp size={16} fill={item.isLiked ? '#0ea5e9' : 'none'} color={item.isLiked ? '#0ea5e9' : 'currentColor'} />
                        <span>{item.likeCount}</span>
                      </ActionButton>
                      <ActionButton onClick={() => toggleCommentSection(item.id)}>
                        <MessageSquare size={16} />
                        <span>{item.commentCount || 0}</span>
                      </ActionButton>
                    </FeedItemActions>

                    <AnimatePresence>
                      {activeCommentSection === item.id && (
                        <CommentSection
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          {comments.map(comment => (
                            <CommentItem key={comment.id}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1e293b', flexShrink: 0 }} />
                              <div>
                                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{comment.User.firstName}</span>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>{comment.content}</p>
                              </div>
                            </CommentItem>
                          ))}
                          <CommentInputContainer>
                            <input
                              type="text"
                              placeholder="Write a comment..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                              style={{
                                flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                padding: '0.5rem', borderRadius: '6px', color: 'white'
                              }}
                            />
                            <button onClick={handlePostComment} style={{ background: '#3b82f6', border: 'none', borderRadius: '6px', padding: '0 0.75rem', cursor: 'pointer' }}>
                              <Send size={16} color="white" />
                            </button>
                          </CommentInputContainer>
                        </CommentSection>
                      )}
                    </AnimatePresence>
                  </FeedItem>
                ))}
              </div>
            )}
          </Card>
        </FeedSection>

        {/* RIGHT COLUMN: GAMIFICATION & WIDGETS */}
        <SidebarSection>
          {/* User Stats / Gamification */}
          <Card>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trophy size={20} color="#fbbf24" /> Your Level: 5
            </h3>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '1rem' }}>
              <div style={{ width: '60%', height: '100%', background: '#fbbf24', borderRadius: '4px' }} />
            </div>
            <StatRow>
              <span>XP Points</span>
              <span style={{ fontWeight: 'bold', color: '#fbbf24' }}>2,450</span>
            </StatRow>
            <StatRow>
              <span>Workout Streak</span>
              <span style={{ fontWeight: 'bold', color: '#10b981' }}>{isClient ? '5 Days' : '0 Days'}</span>
            </StatRow>
            
            <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>Recent Badges</h4>
            <BadgeGrid>
              <BadgePlaceholder>🥇</BadgePlaceholder>
              <BadgePlaceholder>💪</BadgePlaceholder>
              <BadgePlaceholder>🔥</BadgePlaceholder>
              <BadgePlaceholder>🚀</BadgePlaceholder>
            </BadgeGrid>
          </Card>

          {/* Non-Client Widget: Motivation */}
          <Card>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={20} color="#f472b6" /> Daily Motivation
            </h3>
            <p style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.8)' }}>
              "The only bad workout is the one that didn't happen."
            </p>
          </Card>

          {/* Life Goals Widget */}
          <Card>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Target size={20} color="#34d399" /> Life Goals Tracker
            </h3>
            
            <div style={{ marginBottom: '1rem' }}>
              {goals.map(goal => (
                <GoalItem key={goal.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div 
                      onClick={() => toggleGoal(goal.id)}
                      style={{ 
                        cursor: 'pointer',
                        color: goal.completed ? '#34d399' : 'rgba(255,255,255,0.3)' 
                      }}
                    >
                      <CheckCircle size={20} />
                    </div>
                    <span style={{ 
                      textDecoration: goal.completed ? 'line-through' : 'none',
                      color: goal.completed ? 'rgba(255,255,255,0.5)' : 'white'
                    }}>
                      {goal.text}
                    </span>
                  </div>
                  <X size={16} style={{ cursor: 'pointer', opacity: 0.5 }} onClick={() => deleteGoal(goal.id)} />
                </GoalItem>
              ))}
            </div>

            {showGoalInput ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <GoalInput 
                  autoFocus
                  placeholder="Enter a new goal..." 
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
                />
                <button onClick={handleAddGoal} style={{ marginTop: '0.5rem', background: '#34d399', border: 'none', borderRadius: '8px', padding: '0 1rem', cursor: 'pointer' }}><Plus color="black" /></button>
              </div>
            ) : (
              <button 
                onClick={() => setShowGoalInput(true)}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  background: 'rgba(52, 211, 153, 0.1)', 
                  border: '1px dashed rgba(52, 211, 153, 0.5)', 
                  borderRadius: '8px',
                  color: '#34d399',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <Plus size={16} /> Add New Goal
              </button>
            )}
          </Card>
        </SidebarSection>
      </MainLayout>
    </DashboardContainer>
  );
};

export default UserSocialDashboard;