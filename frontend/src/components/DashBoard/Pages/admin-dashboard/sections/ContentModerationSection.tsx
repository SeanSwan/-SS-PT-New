/**
 * ContentModerationSection.tsx
 * ============================
 * 
 * Comprehensive Content Moderation Interface for Admin Dashboard
 * Manages user-generated content, social posts, and community guidelines
 * Styled with Stellar Command Center theme
 * 
 * Features:
 * - Real database integration with backend APIs
 * - Social post moderation and review
 * - Automated content flagging system
 * - User comment management
 * - Community guidelines enforcement
 * - Bulk moderation actions
 * - Content analytics and reporting
 * - User warning and suspension system
 * - WCAG AA accessibility compliance
 * 
 * Backend Integration:
 * - /api/admin/content/posts (GET, PUT, DELETE)
 * - /api/admin/content/comments (GET, PUT, DELETE)
 * - /api/admin/content/reports (GET, POST)
 * - /api/admin/content/moderate (POST)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import {
  MessageSquare, Flag, Eye, EyeOff, Trash2, CheckCircle,
  Search, Filter, Download, RefreshCw, MoreVertical,
  AlertTriangle, Shield, User, Clock, ThumbsUp,
  ThumbsDown, Heart, Share2, Image, Video, X,
  Users, BarChart3, TrendingUp, Calendar
} from 'lucide-react';

// === STYLED COMPONENTS ===
const ManagementContainer = styled.div`
  padding: 0;
`;

const ActionBar = styled(motion.div)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: rgba(30, 58, 138, 0.2);
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 0.75rem 1rem;
  padding-left: 2.5rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.875rem;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }
  
  &:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2);
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.6);
`;

const FilterSelect = styled.select`
  padding: 0.75rem 1rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.875rem;
  min-width: 150px;
  
  &:focus {
    outline: none;
    border-color: #00ffff;
  }
  
  option {
    background: #1e3a8a;
    color: #ffffff;
  }
`;

const CommandButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(45deg, #3b82f6 0%, #00ffff 100%);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #ffffff;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: linear-gradient(45deg, #2563eb 0%, #00e6ff 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
  
  &:focus {
    outline: 2px solid #00ffff;
    outline-offset: 2px;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ContentGrid = styled.div`
  display: grid;
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    gap: 1rem;
  }
`;

const ContentCard = styled(motion.div)`
  background: rgba(30, 58, 138, 0.2);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  padding: 1.5rem;
  transition: all 0.3s ease;
  position: relative;
  
  &:hover {
    background: rgba(30, 58, 138, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(59, 130, 246, 0.2);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${props => {
      switch (props.status) {
        case 'flagged': return 'linear-gradient(90deg, #ef4444, #f59e0b)';
        case 'pending': return 'linear-gradient(90deg, #f59e0b, #eab308)';
        case 'approved': return 'linear-gradient(90deg, #10b981, #00ffff)';
        case 'hidden': return 'linear-gradient(90deg, #6b7280, #9ca3af)';
        default: return 'linear-gradient(90deg, #3b82f6, #8b5cf6)';
      }
    }};
  }
`;

const ContentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const UserAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #00ffff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
  color: #0a0a0f;
  flex-shrink: 0;
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const UserName = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: #ffffff;
`;

const PostDate = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  &.flagged {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
  
  &.pending {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }
  
  &.approved {
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }
  
  &.hidden {
    background: rgba(107, 114, 128, 0.2);
    color: #6b7280;
    border: 1px solid rgba(107, 114, 128, 0.3);
  }
`;

const ContentBody = styled.div`
  margin: 1rem 0;
`;

const ContentText = styled.div`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
  margin-bottom: 1rem;
`;

const ContentMedia = styled.div`
  display: flex;
  gap: 0.5rem;
  margin: 1rem 0;
`;

const MediaPreview = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ContentMetrics = styled.div`
  display: flex;
  gap: 1rem;
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const MetricItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
`;

const ModerationFlags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 1rem 0;
`;

const FlagItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  font-size: 0.75rem;
  color: #ef4444;
`;

const ActionMenu = styled.div`
  position: relative;
`;

const ActionButton = styled(motion.button)`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.6);
  }
`;

const ActionDropdown = styled(motion.div)`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background: rgba(10, 10, 15, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 0.5rem 0;
  min-width: 180px;
  z-index: 1000;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
`;

const ActionItem = styled(motion.button)`
  width: 100%;
  padding: 0.75rem 1rem;
  text-align: left;
  background: none;
  border: none;
  color: #ffffff;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(59, 130, 246, 0.1);
  }
  
  &.danger {
    color: #ef4444;
    
    &:hover {
      background: rgba(239, 68, 68, 0.1);
    }
  }
  
  &.success {
    color: #10b981;
    
    &:hover {
      background: rgba(16, 185, 129, 0.1);
    }
  }
`;

const StatsBar = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled(motion.div)`
  background: rgba(30, 58, 138, 0.2);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  padding: 1.5rem;
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #00ffff;
  margin-bottom: 0.5rem;
`;

const StatTitle = styled.div`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const QuickActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const QuickActionButton = styled(motion.button)`
  flex: 1;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  
  &.approve {
    background: rgba(16, 185, 129, 0.1);
    border-color: rgba(16, 185, 129, 0.3);
    color: #10b981;
    
    &:hover {
      background: rgba(16, 185, 129, 0.2);
    }
  }
  
  &.reject {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
    color: #ef4444;
    
    &:hover {
      background: rgba(239, 68, 68, 0.2);
    }
  }
  
  &.hide {
    background: rgba(107, 114, 128, 0.1);
    border-color: rgba(107, 114, 128, 0.3);
    color: #6b7280;
    
    &:hover {
      background: rgba(107, 114, 128, 0.2);
    }
  }
`;

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 1rem;
  color: #ef4444;
  text-align: center;
  margin: 2rem 0;
`;

const LoadingSpinner = styled(motion.div)`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.7);
`;

// === INTERFACES ===
interface ContentItem {
  id: string;
  type: 'post' | 'comment' | 'media';
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  status: 'pending' | 'approved' | 'flagged' | 'hidden';
  createdAt: string;
  metrics: {
    likes: number;
    comments: number;
    shares: number;
    reports: number;
  };
  flags: string[];
  media: Array<{
    type: 'image' | 'video';
    url: string;
    thumbnail?: string;
  }>;
  moderationHistory: Array<{
    action: string;
    moderator: string;
    timestamp: string;
    reason?: string;
  }>;
}

interface ContentStats {
  totalContent: number;
  pendingReview: number;
  flaggedContent: number;
  approvedToday: number;
  totalReports: number;
}

// === MAIN COMPONENT ===
const ContentModerationSection: React.FC = () => {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [stats, setStats] = useState<ContentStats>({
    totalContent: 0,
    pendingReview: 0,
    flaggedContent: 0,
    approvedToday: 0,
    totalReports: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // API call helper with error handling
  const makeApiCall = async (url: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...getAuthHeaders(),
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API call failed for ${url}:`, error);
      throw error;
    }
  };

  // Fetch content from backend
  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Fetching content for moderation...');

      const response = await makeApiCall('/api/admin/content/posts', {
        method: 'GET'
      });

      if (response.success && response.data) {
        const posts = response.data.posts || [];
        
        // Format posts for frontend
        const formattedContent = posts.map((post: any) => ({
          id: post.id,
          type: post.type || 'post',
          content: post.content,
          author: {
            id: post.userId,
            name: post.userName,
            avatar: post.userAvatar
          },
          status: post.status,
          createdAt: post.createdAt,
          metrics: post.engagement || {
            likes: 0,
            comments: 0,
            shares: 0,
            reports: post.reportsCount || 0
          },
          flags: post.moderationFlags || [],
          media: post.media || [],
          moderationHistory: []
        }));

        setContent(formattedContent);

        // Set stats from response
        if (response.data.summary) {
          setStats({
            totalContent: response.data.summary.total || 0,
            pendingReview: response.data.summary.pending || 0,
            flaggedContent: response.data.summary.flagged || 0,
            approvedToday: response.data.summary.approved || 0,
            totalReports: formattedContent.reduce((sum: number, c: any) => sum + c.metrics.reports, 0)
          });
        }

        console.log(`✅ Successfully loaded ${formattedContent.length} content items`);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('❌ Error fetching content:', error);
      setError(`Failed to load content: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Set empty state on error
      setContent([]);
      setStats({
        totalContent: 0,
        pendingReview: 0,
        flaggedContent: 0,
        approvedToday: 0,
        totalReports: 0
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Load content on component mount
  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Filter content based on search and filters
  const filteredContent = content.filter(item => {
    const matchesSearch = item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.author.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Handle moderation actions
  const handleModerateContent = async (contentId: string, action: string, reason?: string) => {
    try {
      console.log(`🔄 ${action}ing content ${contentId}...`);

      const response = await makeApiCall('/api/admin/content/moderate', {
        method: 'POST',
        body: JSON.stringify({
          contentType: 'post', // Default to post, could be enhanced to detect type
          contentId: contentId,
          action: action,
          reason: reason || `Content ${action}ed by admin`,
          notifyUser: true
        })
      });

      if (response.success) {
        console.log(`✅ Successfully ${action}ed content ${contentId}`);
        await fetchContent(); // Refresh content list
        setActiveActionMenu(null);
      } else {
        throw new Error(response.message || `Failed to ${action} content`);
      }
    } catch (error) {
      console.error(`❌ Error ${action}ing content:`, error);
      setError(`Failed to ${action} content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleApproveContent = (contentId: string) => handleModerateContent(contentId, 'approve');
  const handleRejectContent = (contentId: string) => handleModerateContent(contentId, 'reject');
  const handleHideContent = (contentId: string) => handleModerateContent(contentId, 'hide');
  const handleDeleteContent = async (contentId: string) => {
    if (!window.confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
      return;
    }
    
    try {
      console.log(`🗑️ Deleting content ${contentId}...`);

      const response = await makeApiCall(`/api/admin/content/posts/${contentId}`, {
        method: 'DELETE',
        body: JSON.stringify({
          reason: 'Content deleted by admin',
          notifyUser: true
        })
      });

      if (response.success) {
        console.log(`✅ Successfully deleted content ${contentId}`);
        await fetchContent();
        setActiveActionMenu(null);
      } else {
        throw new Error(response.message || 'Failed to delete content');
      }
    } catch (error) {
      console.error('❌ Error deleting content:', error);
      setError(`Failed to delete content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleViewUser = (userId: string) => {
    console.log('View user profile:', userId);
    setActiveActionMenu(null);
  };

  const handleViewReports = (contentId: string) => {
    console.log('View content reports:', contentId);
    setActiveActionMenu(null);
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'post': return <MessageSquare size={16} />;
      case 'comment': return <MessageSquare size={16} />;
      case 'media': return <Image size={16} />;
      default: return <MessageSquare size={16} />;
    }
  };

  if (loading) {
    return (
      <ManagementContainer>
        <LoadingSpinner
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw size={32} color="#00ffff" style={{ marginRight: '1rem' }} />
          Loading content for moderation...
        </LoadingSpinner>
      </ManagementContainer>
    );
  }

  if (error) {
    return (
      <ManagementContainer>
        <ErrorMessage>
          <AlertTriangle size={24} style={{ marginBottom: '0.5rem' }} />
          <div>{error}</div>
          <CommandButton
            style={{ marginTop: '1rem' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchContent}
          >
            <RefreshCw size={16} />
            Retry
          </CommandButton>
        </ErrorMessage>
      </ManagementContainer>
    );
  }

  return (
    <ManagementContainer>
      {/* Stats Overview */}
      <StatsBar
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <StatCard whileHover={{ scale: 1.02 }}>
          <StatNumber>{stats.totalContent}</StatNumber>
          <StatTitle>Total Content</StatTitle>
        </StatCard>
        <StatCard whileHover={{ scale: 1.02 }}>
          <StatNumber>{stats.pendingReview}</StatNumber>
          <StatTitle>Pending Review</StatTitle>
        </StatCard>
        <StatCard whileHover={{ scale: 1.02 }}>
          <StatNumber>{stats.flaggedContent}</StatNumber>
          <StatTitle>Flagged Content</StatTitle>
        </StatCard>
        <StatCard whileHover={{ scale: 1.02 }}>
          <StatNumber>{stats.approvedToday}</StatNumber>
          <StatTitle>Approved Today</StatTitle>
        </StatCard>
        <StatCard whileHover={{ scale: 1.02 }}>
          <StatNumber>{stats.totalReports}</StatNumber>
          <StatTitle>Total Reports</StatTitle>
        </StatCard>
      </StatsBar>

      {/* Action Bar */}
      <ActionBar
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <SearchContainer>
          <div style={{ position: 'relative', flex: 1 }}>
            <SearchIcon>
              <Search size={16} />
            </SearchIcon>
            <SearchInput
              type="text"
              placeholder="Search content by text or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <FilterSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="flagged">Flagged</option>
            <option value="hidden">Hidden</option>
          </FilterSelect>
          
          <FilterSelect
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="post">Posts</option>
            <option value="comment">Comments</option>
            <option value="media">Media</option>
          </FilterSelect>
        </SearchContainer>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <CommandButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchContent}
          >
            <RefreshCw size={16} />
            Refresh
          </CommandButton>
          
          <CommandButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download size={16} />
            Export
          </CommandButton>
          
          <CommandButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Shield size={16} />
            Guidelines
          </CommandButton>
        </div>
      </ActionBar>

      {/* Content Grid */}
      <ContentGrid>
        <AnimatePresence>
          {filteredContent.map((item, index) => (
            <ContentCard
              key={item.id}
              status={item.status}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ scale: 1.01 }}
            >
              <ContentHeader>
                <UserInfo>
                  <UserAvatar>
                    {getUserInitials(item.author.name)}
                  </UserAvatar>
                  <UserDetails>
                    <UserName>{item.author.name}</UserName>
                    <PostDate>
                      {getContentTypeIcon(item.type)}
                      {getTimeAgo(item.createdAt)}
                    </PostDate>
                  </UserDetails>
                </UserInfo>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <StatusBadge className={item.status}>
                    {item.status}
                  </StatusBadge>
                  
                  <ActionMenu>
                    <ActionButton
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setActiveActionMenu(
                        activeActionMenu === item.id ? null : item.id
                      )}
                    >
                      <MoreVertical size={16} />
                    </ActionButton>
                    
                    <AnimatePresence>
                      {activeActionMenu === item.id && (
                        <ActionDropdown
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          transition={{ duration: 0.15 }}
                        >
                          <ActionItem
                            className="success"
                            whileHover={{ x: 4 }}
                            onClick={() => handleApproveContent(item.id)}
                          >
                            <CheckCircle size={16} />
                            Approve
                          </ActionItem>
                          <ActionItem
                            whileHover={{ x: 4 }}
                            onClick={() => handleHideContent(item.id)}
                          >
                            <EyeOff size={16} />
                            Hide
                          </ActionItem>
                          <ActionItem
                            whileHover={{ x: 4 }}
                            onClick={() => handleViewUser(item.author.id)}
                          >
                            <User size={16} />
                            View User
                          </ActionItem>
                          <ActionItem
                            whileHover={{ x: 4 }}
                            onClick={() => handleViewReports(item.id)}
                          >
                            <Flag size={16} />
                            View Reports
                          </ActionItem>
                          <ActionItem
                            className="danger"
                            whileHover={{ x: 4 }}
                            onClick={() => handleDeleteContent(item.id)}
                          >
                            <Trash2 size={16} />
                            Delete
                          </ActionItem>
                        </ActionDropdown>
                      )}
                    </AnimatePresence>
                  </ActionMenu>
                </div>
              </ContentHeader>

              <ContentBody>
                <ContentText>{item.content}</ContentText>
                
                {item.media.length > 0 && (
                  <ContentMedia>
                    {item.media.slice(0, 3).map((media, i) => (
                      <MediaPreview key={i}>
                        {media.type === 'image' ? <Image size={24} /> : <Video size={24} />}
                      </MediaPreview>
                    ))}
                    {item.media.length > 3 && (
                      <MediaPreview>
                        +{item.media.length - 3}
                      </MediaPreview>
                    )}
                  </ContentMedia>
                )}
              </ContentBody>

              {item.flags.length > 0 && (
                <ModerationFlags>
                  {item.flags.map((flag, i) => (
                    <FlagItem key={i}>
                      <Flag size={12} />
                      {flag.replace('-', ' ')}
                    </FlagItem>
                  ))}
                </ModerationFlags>
              )}

              <ContentMetrics>
                <MetricItem>
                  <ThumbsUp size={16} />
                  {item.metrics.likes}
                </MetricItem>
                <MetricItem>
                  <MessageSquare size={16} />
                  {item.metrics.comments}
                </MetricItem>
                <MetricItem>
                  <Share2 size={16} />
                  {item.metrics.shares}
                </MetricItem>
                {item.metrics.reports > 0 && (
                  <MetricItem style={{ color: '#ef4444' }}>
                    <Flag size={16} />
                    {item.metrics.reports} reports
                  </MetricItem>
                )}
              </ContentMetrics>

              {item.status === 'pending' || item.status === 'flagged' ? (
                <QuickActions>
                  <QuickActionButton
                    className="approve"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleApproveContent(item.id)}
                  >
                    <CheckCircle size={14} />
                    Approve
                  </QuickActionButton>
                  <QuickActionButton
                    className="hide"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleHideContent(item.id)}
                  >
                    <EyeOff size={14} />
                    Hide
                  </QuickActionButton>
                  <QuickActionButton
                    className="reject"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleRejectContent(item.id)}
                  >
                    <X size={14} />
                    Reject
                  </QuickActionButton>
                </QuickActions>
              ) : null}
            </ContentCard>
          ))}
        </AnimatePresence>
      </ContentGrid>
      
      {filteredContent.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            textAlign: 'center',
            padding: '3rem',
            color: 'rgba(255, 255, 255, 0.6)'
          }}
        >
          <MessageSquare size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h3>No content found</h3>
          <p>Try adjusting your search or filters, or check back later for new content to moderate.</p>
        </motion.div>
      )}
    </ManagementContainer>
  );
};

export default ContentModerationSection;
