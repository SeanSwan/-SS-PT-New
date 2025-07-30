/**
 * AdminSocialManagementView.tsx
 * =============================
 * 
 * Comprehensive Social Media Administration System
 * Advanced social content management, analytics, and community oversight
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Social content overview dashboard with real-time metrics
 * - User-generated content management and moderation
 * - Social analytics integration with engagement tracking
 * - Community management tools and guidelines enforcement
 * - Bulk moderation actions and automated workflows
 * - Real-time social feed monitoring
 * - Social commerce integration and tracking
 * - Advanced user behavior analytics
 * 
 * Master Prompt Alignment:
 * - Enterprise-grade social media management
 * - AAA 7-star administrative control
 * - Professional community oversight
 * - Gamification system integration
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { 
  MessageSquare, 
  Users, 
  Heart, 
  Share2, 
  TrendingUp,
  Eye,
  Flag,
  Shield,
  BarChart3,
  Activity,
  RefreshCw,
  Search,
  Filter,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  UserCheck,
  Ban,
  Trash2,
  Edit,
  Calendar,
  Map,
  Settings,
  Award,
  Star,
  MessageCircle
} from 'lucide-react';

// === STYLED COMPONENTS ===
const SocialContainer = styled(motion.div)`
  padding: 2rem;
  min-height: 100vh;
  background: linear-gradient(135deg, rgba(30, 58, 138, 0.05) 0%, rgba(248, 250, 252, 1) 100%);
`;

const SocialHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(59, 130, 246, 0.2);
`;

const HeaderTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #0ea5e9 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 1rem;
  
  .header-icon {
    background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
    border-radius: 12px;
    padding: 0.75rem;
    color: white;
    box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const ActionButton = styled(motion.button)<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  border: 2px solid ${props => {
    switch (props.$variant) {
      case 'primary': return '#3b82f6';
      case 'danger': return '#ef4444';
      default: return '#e5e7eb';
    }
  }};
  background: ${props => {
    switch (props.$variant) {
      case 'primary': return '#3b82f6';
      case 'danger': return '#ef4444';
      default: return 'white';
    }
  }};
  color: ${props => props.$variant === 'primary' || props.$variant === 'danger' ? 'white' : '#64748b'};
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => {
      switch (props.$variant) {
        case 'primary': return '#2563eb';
        case 'danger': return '#dc2626';
        default: return '#f8fafc';
      }
    }};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const MetricCard = styled(motion.div)<{ $status?: 'positive' | 'negative' | 'neutral' }>`
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-left: 4px solid ${props => {
    switch (props.$status) {
      case 'positive': return '#10b981';
      case 'negative': return '#ef4444';
      default: return '#3b82f6';
    }
  }};
  
  .metric-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .metric-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${props => {
      switch (props.$status) {
        case 'positive': return 'rgba(16, 185, 129, 0.1)';
        case 'negative': return 'rgba(239, 68, 68, 0.1)';
        default: return 'rgba(59, 130, 246, 0.1)';
      }
    }};
    color: ${props => {
      switch (props.$status) {
        case 'positive': return '#10b981';
        case 'negative': return '#ef4444';
        default: return '#3b82f6';
      }
    }};
  }
  
  .metric-value {
    font-size: 2rem;
    font-weight: 700;
    color: #1e40af;
    margin-bottom: 0.5rem;
  }
  
  .metric-label {
    color: #64748b;
    font-size: 0.9rem;
    font-weight: 500;
    margin-bottom: 0.75rem;
  }
  
  .metric-change {
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-weight: 500;
    color: ${props => {
      switch (props.$status) {
        case 'positive': return '#047857';
        case 'negative': return '#dc2626';
        default: return '#64748b';
      }
    }};
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const PostsSection = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const SectionHeader = styled.div`
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(255, 255, 255, 1) 100%);
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SearchAndFilters = styled.div`
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  gap: 1rem;
  align-items: center;
  
  .search-input {
    flex: 1;
    padding: 0.75rem 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: white;
    font-size: 0.9rem;
    
    &:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
  }
`;

const FilterButton = styled(motion.button)<{ $active?: boolean }>`
  padding: 0.5rem 1rem;
  border: 1px solid ${props => props.$active ? '#3b82f6' : '#e5e7eb'};
  background: ${props => props.$active ? '#3b82f6' : 'white'};
  color: ${props => props.$active ? 'white' : '#64748b'};
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => props.$active ? '#2563eb' : '#f8fafc'};
    border-color: ${props => props.$active ? '#2563eb' : '#3b82f6'};
  }
`;

const PostCard = styled(motion.div)`
  padding: 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  gap: 1rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: #f8fafc;
  }
  
  &:last-child {
    border-bottom: none;
  }
  
  .post-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #1e40af);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 1.2rem;
    flex-shrink: 0;
  }
  
  .post-content {
    flex: 1;
    
    .post-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
      
      .post-user {
        .user-name {
          font-weight: 600;
          color: #1e40af;
          margin-bottom: 0.25rem;
        }
        
        .post-time {
          font-size: 0.8rem;
          color: #9ca3af;
        }
      }
      
      .post-actions {
        display: flex;
        gap: 0.5rem;
      }
    }
    
    .post-text {
      color: #374151;
      line-height: 1.6;
      margin-bottom: 1rem;
    }
    
    .post-metrics {
      display: flex;
      gap: 1.5rem;
      margin-bottom: 1rem;
      
      .metric {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
        color: #64748b;
        
        .metric-icon {
          width: 16px;
          height: 16px;
        }
      }
    }
    
    .post-status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
      
      &.approved {
        background: rgba(16, 185, 129, 0.1);
        color: #047857;
      }
      
      &.pending {
        background: rgba(245, 158, 11, 0.1);
        color: #d97706;
      }
      
      &.flagged {
        background: rgba(239, 68, 68, 0.1);
        color: #dc2626;
      }
    }
  }
`;

const ActionIcon = styled(motion.button)<{ $variant?: 'approve' | 'reject' | 'flag' | 'edit' }>`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  background: ${props => {
    switch (props.$variant) {
      case 'approve': return 'rgba(16, 185, 129, 0.1)';
      case 'reject': return 'rgba(239, 68, 68, 0.1)';
      case 'flag': return 'rgba(245, 158, 11, 0.1)';
      case 'edit': return 'rgba(59, 130, 246, 0.1)';
      default: return 'rgba(107, 114, 128, 0.1)';
    }
  }};
  color: ${props => {
    switch (props.$variant) {
      case 'approve': return '#047857';
      case 'reject': return '#dc2626';
      case 'flag': return '#d97706';
      case 'edit': return '#1e40af';
      default: return '#374151';
    }
  }};
  
  &:hover {
    transform: scale(1.1);
    background: ${props => {
      switch (props.$variant) {
        case 'approve': return 'rgba(16, 185, 129, 0.2)';
        case 'reject': return 'rgba(239, 68, 68, 0.2)';
        case 'flag': return 'rgba(245, 158, 11, 0.2)';
        case 'edit': return 'rgba(59, 130, 246, 0.2)';
        default: return 'rgba(107, 114, 128, 0.2)';
      }
    }};
  }
`;

const ActivitySidebar = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  height: fit-content;
`;

const ActivityItem = styled.div`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  
  &:last-child {
    border-bottom: none;
  }
  
  .activity-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }
  
  .activity-content {
    flex: 1;
    
    .activity-text {
      font-size: 0.9rem;
      color: #374151;
      margin-bottom: 0.25rem;
    }
    
    .activity-time {
      font-size: 0.8rem;
      color: #9ca3af;
    }
  }
`;

// === MOCK DATA ===
const mockSocialMetrics = {
  totalPosts: 2847,
  postsToday: 47,
  totalUsers: 1239,
  activeUsers: 892,
  totalEngagement: 15624,
  engagementRate: 8.4,
  pendingModeration: 12,
  flaggedContent: 3
};

const mockPosts = [
  {
    id: 1,
    user: {
      name: 'Sarah Johnson',
      avatar: 'SJ',
      id: 'user_123'
    },
    content: 'Just completed my first workout with the AI trainer! The personalized recommendations were incredible. Feeling stronger already! 💪 #SwanStudios #FitnessJourney',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    likes: 24,
    comments: 8,
    shares: 3,
    views: 156,
    status: 'approved' as const
  },
  {
    id: 2,
    user: {
      name: 'Mike Chen',
      avatar: 'MC',
      id: 'user_456'
    },
    content: 'The nutrition planning feature is a game-changer! Generated a perfect meal plan that fits my dietary restrictions and fitness goals. Thank you SwanStudios team!',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    likes: 18,
    comments: 12,
    shares: 6,
    views: 203,
    status: 'approved' as const
  },
  {
    id: 3,
    user: {
      name: 'Anonymous User',
      avatar: 'AU',
      id: 'user_789'
    },
    content: 'This platform is terrible and overpriced. Complete waste of money. Do not recommend to anyone!!!',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    likes: 2,
    comments: 0,
    shares: 0,
    views: 45,
    status: 'flagged' as const
  },
  {
    id: 4,
    user: {
      name: 'Emma Davis',
      avatar: 'ED',
      id: 'user_101'
    },
    content: 'Love the gamification system! Just unlocked my first achievement and earned 500 points. The community challenges keep me motivated every day.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    likes: 31,
    comments: 15,
    shares: 8,
    views: 278,
    status: 'pending' as const
  }
];

const mockRecentActivity = [
  {
    id: 1,
    type: 'post_approved',
    content: 'Post by Sarah Johnson approved',
    timestamp: new Date(Date.now() - 1000 * 60 * 10),
    icon: CheckCircle
  },
  {
    id: 2,
    type: 'user_flagged',
    content: 'Content flagged for review',
    timestamp: new Date(Date.now() - 1000 * 60 * 25),
    icon: Flag
  },
  {
    id: 3,
    type: 'comment_removed',
    content: 'Inappropriate comment removed',
    timestamp: new Date(Date.now() - 1000 * 60 * 40),
    icon: Trash2
  },
  {
    id: 4,
    type: 'user_verified',
    content: 'New user verification completed',
    timestamp: new Date(Date.now() - 1000 * 60 * 55),
    icon: UserCheck
  }
];

// === MAIN COMPONENT ===
const AdminSocialManagementView: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'flagged'>('all');
  const [filteredPosts, setFilteredPosts] = useState(mockPosts);

  // Filter posts based on search and status
  useEffect(() => {
    let filtered = mockPosts;
    
    if (searchTerm) {
      filtered = filtered.filter(post => 
        post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.user.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(post => post.status === statusFilter);
    }
    
    setFilteredPosts(filtered);
  }, [searchTerm, statusFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setRefreshing(false);
  };

  const handlePostAction = (postId: number, action: 'approve' | 'reject' | 'flag') => {
    console.log(`${action} post ${postId}`);
    // Here you would implement the actual API call
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return timestamp.toLocaleDateString();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle size={12} />;
      case 'pending': return <Clock size={12} />;
      case 'flagged': return <Flag size={12} />;
      default: return null;
    }
  };

  return (
    <SocialContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <SocialHeader>
        <HeaderTitle>
          <div className="header-icon">
            <MessageSquare size={24} />
          </div>
          Social Media Command Center
        </HeaderTitle>
        
        <HeaderActions>
          <ActionButton
            onClick={handleRefresh}
            disabled={refreshing}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </ActionButton>
          
          <ActionButton
            $variant="primary"
            onClick={() => console.log('Export social data')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <BarChart3 size={16} />
            Export Analytics
          </ActionButton>
        </HeaderActions>
      </SocialHeader>

      {/* Social Metrics Grid */}
      <MetricsGrid>
        <MetricCard 
          $status="neutral"
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div className="metric-header">
            <div className="metric-icon">
              <MessageSquare size={20} />
            </div>
          </div>
          <div className="metric-value">{mockSocialMetrics.totalPosts.toLocaleString()}</div>
          <div className="metric-label">Total Posts</div>
          <div className="metric-change">
            <TrendingUp size={12} />
            +{mockSocialMetrics.postsToday} today
          </div>
        </MetricCard>

        <MetricCard 
          $status="positive"
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div className="metric-header">
            <div className="metric-icon">
              <Users size={20} />
            </div>
          </div>
          <div className="metric-value">{mockSocialMetrics.activeUsers}</div>
          <div className="metric-label">Active Users</div>
          <div className="metric-change">
            <TrendingUp size={12} />
            72% of total users
          </div>
        </MetricCard>

        <MetricCard 
          $status="positive"
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div className="metric-header">
            <div className="metric-icon">
              <Heart size={20} />
            </div>
          </div>
          <div className="metric-value">{mockSocialMetrics.totalEngagement.toLocaleString()}</div>
          <div className="metric-label">Total Engagement</div>
          <div className="metric-change">
            <TrendingUp size={12} />
            {mockSocialMetrics.engagementRate}% rate
          </div>
        </MetricCard>

        <MetricCard 
          $status={mockSocialMetrics.pendingModeration > 10 ? "negative" : "neutral"}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div className="metric-header">
            <div className="metric-icon">
              <Shield size={20} />
            </div>
          </div>
          <div className="metric-value">{mockSocialMetrics.pendingModeration}</div>
          <div className="metric-label">Pending Moderation</div>
          <div className="metric-change">
            <AlertTriangle size={12} />
            {mockSocialMetrics.flaggedContent} flagged
          </div>
        </MetricCard>
      </MetricsGrid>

      {/* Content Management */}
      <ContentGrid>
        <PostsSection>
          <SectionHeader>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e40af', margin: 0 }}>
              Content Management
            </h2>
            
            <ActionButton
              onClick={() => console.log('Bulk actions')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Settings size={16} />
              Bulk Actions
            </ActionButton>
          </SectionHeader>

          <SearchAndFilters>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Search posts, users, or content..."
                className="search-input"
                style={{ paddingLeft: '2.5rem' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <FilterButton
              $active={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              All
            </FilterButton>
            
            <FilterButton
              $active={statusFilter === 'approved'}
              onClick={() => setStatusFilter('approved')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Approved
            </FilterButton>
            
            <FilterButton
              $active={statusFilter === 'pending'}
              onClick={() => setStatusFilter('pending')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Pending
            </FilterButton>
            
            <FilterButton
              $active={statusFilter === 'flagged'}
              onClick={() => setStatusFilter('flagged')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Flagged
            </FilterButton>
          </SearchAndFilters>

          <AnimatePresence>
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="post-avatar">
                  {post.user.avatar}
                </div>
                
                <div className="post-content">
                  <div className="post-header">
                    <div className="post-user">
                      <div className="user-name">{post.user.name}</div>
                      <div className="post-time">{formatTimestamp(post.timestamp)}</div>
                    </div>
                    
                    <div className="post-actions">
                      <ActionIcon
                        $variant="approve"
                        onClick={() => handlePostAction(post.id, 'approve')}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Approve Post"
                      >
                        <CheckCircle size={14} />
                      </ActionIcon>
                      
                      <ActionIcon
                        $variant="flag"
                        onClick={() => handlePostAction(post.id, 'flag')}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Flag Post"
                      >
                        <Flag size={14} />
                      </ActionIcon>
                      
                      <ActionIcon
                        $variant="reject"
                        onClick={() => handlePostAction(post.id, 'reject')}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Remove Post"
                      >
                        <Trash2 size={14} />
                      </ActionIcon>
                      
                      <ActionIcon
                        $variant="edit"
                        onClick={() => console.log(`Edit post ${post.id}`)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="View Details"
                      >
                        <MoreHorizontal size={14} />
                      </ActionIcon>
                    </div>
                  </div>
                  
                  <div className="post-text">
                    {post.content}
                  </div>
                  
                  <div className="post-metrics">
                    <div className="metric">
                      <Heart className="metric-icon" />
                      {post.likes}
                    </div>
                    <div className="metric">
                      <MessageCircle className="metric-icon" />
                      {post.comments}
                    </div>
                    <div className="metric">
                      <Share2 className="metric-icon" />
                      {post.shares}
                    </div>
                    <div className="metric">
                      <Eye className="metric-icon" />
                      {post.views}
                    </div>
                  </div>
                  
                  <div className={`post-status ${post.status}`}>
                    {getStatusIcon(post.status)}
                    {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                  </div>
                </div>
              </PostCard>
            ))}
          </AnimatePresence>
        </PostsSection>

        <ActivitySidebar>
          <SectionHeader>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1e40af', margin: 0 }}>
              Recent Activity
            </h3>
          </SectionHeader>
          
          {mockRecentActivity.map((activity) => (
            <ActivityItem key={activity.id}>
              <div className="activity-icon">
                <activity.icon size={16} />
              </div>
              <div className="activity-content">
                <div className="activity-text">{activity.content}</div>
                <div className="activity-time">{formatTimestamp(activity.timestamp)}</div>
              </div>
            </ActivityItem>
          ))}
        </ActivitySidebar>
      </ContentGrid>
    </SocialContainer>
  );
};

export default AdminSocialManagementView;
