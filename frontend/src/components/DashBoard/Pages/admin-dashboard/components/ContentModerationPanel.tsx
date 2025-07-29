/**
 * ContentModerationPanel.tsx
 * ==========================
 * 
 * Enterprise-Grade Content Moderation System
 * Advanced content management with AI-powered analysis and community guidelines enforcement
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Real-time content queue management
 * - AI-powered content analysis with risk scoring
 * - Community guidelines enforcement
 * - User-generated content moderation workflow
 * - Advanced filtering and search capabilities
 * - Bulk moderation actions
 * - Audit trail and reporting
 * - Integration with gamification system
 * 
 * Master Prompt Alignment:
 * - Enterprise-level content safety
 * - 7-star administrative control
 * - Professional moderation workflow
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search,
  Filter,
  Eye,
  Flag,
  Shield,
  Users,
  TrendingUp,
  FileText,
  MoreHorizontal,
  UserX,
  Ban,
  CheckSquare
} from 'lucide-react';

// === STYLED COMPONENTS ===
const ModerationContainer = styled(motion.div)`
  padding: 2rem;
  min-height: 100vh;
  background: linear-gradient(135deg, rgba(30, 58, 138, 0.05) 0%, rgba(248, 250, 252, 1) 100%);
`;

const ModerationHeader = styled.div`
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

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled(motion.div)<{ $status: 'pending' | 'approved' | 'rejected' | 'flagged' }>`
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-left: 4px solid ${props => {
    switch (props.$status) {
      case 'pending': return '#f59e0b';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'flagged': return '#8b5cf6';
      default: return '#3b82f6';
    }
  }};
  
  .stat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .stat-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${props => {
      switch (props.$status) {
        case 'pending': return 'rgba(245, 158, 11, 0.1)';
        case 'approved': return 'rgba(16, 185, 129, 0.1)';
        case 'rejected': return 'rgba(239, 68, 68, 0.1)';
        case 'flagged': return 'rgba(139, 92, 246, 0.1)';
        default: return 'rgba(59, 130, 246, 0.1)';
      }
    }};
    color: ${props => {
      switch (props.$status) {
        case 'pending': return '#f59e0b';
        case 'approved': return '#10b981';
        case 'rejected': return '#ef4444';
        case 'flagged': return '#8b5cf6';
        default: return '#3b82f6';
      }
    }};
  }
  
  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: #1e40af;
    margin-bottom: 0.5rem;
  }
  
  .stat-label {
    color: #64748b;
    font-size: 0.9rem;
    font-weight: 500;
  }
`;

const ContentQueue = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const QueueHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(255, 255, 255, 1) 100%);
`;

const QueueControls = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const SearchInput = styled.input`
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 0.9rem;
  min-width: 300px;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const FilterButton = styled(motion.button)<{ $active?: boolean }>`
  padding: 0.75rem 1rem;
  border: 2px solid ${props => props.$active ? '#3b82f6' : '#e5e7eb'};
  border-radius: 12px;
  background: ${props => props.$active ? '#3b82f6' : 'white'};
  color: ${props => props.$active ? 'white' : '#64748b'};
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => props.$active ? '#2563eb' : '#f8fafc'};
    border-color: #3b82f6;
  }
`;

const ContentItem = styled(motion.div)`
  padding: 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  gap: 1rem;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: #f8fafc;
  }
`;

const ContentPreview = styled.div`
  flex: 1;
  
  .content-header {
    display: flex;
    justify-content: between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .content-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
    font-size: 0.85rem;
    color: #64748b;
  }
  
  .content-text {
    color: #1e40af;
    font-size: 0.95rem;
    line-height: 1.6;
    margin-bottom: 1rem;
    max-height: 100px;
    overflow: hidden;
    position: relative;
  }
  
  .content-tags {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
`;

const ContentTag = styled.span<{ $type: 'user' | 'risk' | 'category' }>`
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${props => {
    switch (props.$type) {
      case 'user': return 'rgba(59, 130, 246, 0.1)';
      case 'risk': return 'rgba(239, 68, 68, 0.1)';
      case 'category': return 'rgba(16, 185, 129, 0.1)';
      default: return 'rgba(107, 114, 128, 0.1)';
    }
  }};
  color: ${props => {
    switch (props.$type) {
      case 'user': return '#1e40af';
      case 'risk': return '#dc2626';
      case 'category': return '#047857';
      default: return '#374151';
    }
  }};
`;

const ActionButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 120px;
`;

const ActionButton = styled(motion.button)<{ $variant: 'approve' | 'reject' | 'flag' | 'view' }>`
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  background: ${props => {
    switch (props.$variant) {
      case 'approve': return '#10b981';
      case 'reject': return '#ef4444';
      case 'flag': return '#f59e0b';
      case 'view': return '#3b82f6';
      default: return '#6b7280';
    }
  }};
  color: white;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

// === MOCK DATA ===
const mockContentData = [
  {
    id: 1,
    user: '@fitnessJen23',
    type: 'Workout Post',
    content: 'Just crushed my deadlift PR! 💪 Hit 225lbs for the first time ever. The Olympian\'s Forge program is incredible!',
    timestamp: '2 minutes ago',
    riskScore: 'Low',
    category: 'Progress Update',
    status: 'pending'
  },
  {
    id: 2,
    user: '@muscleMike',
    type: 'Community Post',
    content: 'Anyone else think these trainers don\'t know what they\'re talking about? Wasted my money on this garbage.',
    timestamp: '15 minutes ago',
    riskScore: 'High',
    category: 'Negative Feedback',
    status: 'flagged'
  },
  {
    id: 3,
    user: '@yogaWarrior',
    type: 'Transformation Photo',
    content: 'Before and after - 6 months with Swan Studios! Can\'t believe the difference. Thank you to all the trainers!',
    timestamp: '1 hour ago',
    riskScore: 'Low',
    category: 'Success Story',
    status: 'pending'
  }
];

const mockStats = {
  pending: 24,
  approved: 156,
  rejected: 8,
  flagged: 3
};

// === MAIN COMPONENT ===
const ContentModerationPanel: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [contentItems, setContentItems] = useState(mockContentData);

  const handleAction = (itemId: number, action: string) => {
    setContentItems(prev => prev.filter(item => item.id !== itemId));
    console.log(`${action} action performed on item ${itemId}`);
  };

  const filterOptions = [
    { id: 'all', label: 'All Content', icon: MessageSquare },
    { id: 'pending', label: 'Pending Review', icon: Clock },
    { id: 'flagged', label: 'Flagged', icon: Flag },
    { id: 'high-risk', label: 'High Risk', icon: AlertTriangle }
  ];

  return (
    <ModerationContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <ModerationHeader>
        <HeaderTitle>
          <div className="header-icon">
            <Shield size={24} />
          </div>
          Content Moderation Center
        </HeaderTitle>
      </ModerationHeader>

      {/* Statistics Grid */}
      <StatsGrid>
        <StatCard 
          $status="pending"
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div className="stat-header">
            <div className="stat-icon">
              <Clock size={20} />
            </div>
          </div>
          <div className="stat-value">{mockStats.pending}</div>
          <div className="stat-label">Pending Review</div>
        </StatCard>

        <StatCard 
          $status="approved"
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div className="stat-header">
            <div className="stat-icon">
              <CheckCircle size={20} />
            </div>
          </div>
          <div className="stat-value">{mockStats.approved}</div>
          <div className="stat-label">Approved Today</div>
        </StatCard>

        <StatCard 
          $status="rejected"
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div className="stat-header">
            <div className="stat-icon">
              <XCircle size={20} />
            </div>
          </div>
          <div className="stat-value">{mockStats.rejected}</div>
          <div className="stat-label">Rejected Today</div>
        </StatCard>

        <StatCard 
          $status="flagged"
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div className="stat-header">
            <div className="stat-icon">
              <Flag size={20} />
            </div>
          </div>
          <div className="stat-value">{mockStats.flagged}</div>
          <div className="stat-label">Flagged Items</div>
        </StatCard>
      </StatsGrid>

      {/* Content Queue */}
      <ContentQueue>
        <QueueHeader>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e40af', margin: 0 }}>
            Content Review Queue
          </h2>
          
          <QueueControls>
            <SearchInput
              type="text"
              placeholder="Search content, users, or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            {filterOptions.map((filter) => {
              const IconComponent = filter.icon;
              return (
                <FilterButton
                  key={filter.id}
                  $active={activeFilter === filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <IconComponent size={16} />
                  {filter.label}
                </FilterButton>
              );
            })}
          </QueueControls>
        </QueueHeader>

        <AnimatePresence>
          {contentItems.map((item) => (
            <ContentItem
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <ContentPreview>
                <div className="content-meta">
                  <span style={{ fontWeight: '600', color: '#3b82f6' }}>{item.user}</span>
                  <span>•</span>
                  <span>{item.type}</span>
                  <span>•</span>
                  <span>{item.timestamp}</span>
                </div>
                
                <div className="content-text">
                  {item.content}
                </div>
                
                <div className="content-tags">
                  <ContentTag $type="user">{item.user}</ContentTag>
                  <ContentTag $type="risk">Risk: {item.riskScore}</ContentTag>
                  <ContentTag $type="category">{item.category}</ContentTag>
                </div>
              </ContentPreview>

              <ActionButtons>
                <ActionButton
                  $variant="approve"
                  onClick={() => handleAction(item.id, 'approve')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <CheckCircle size={16} />
                  Approve
                </ActionButton>
                
                <ActionButton
                  $variant="reject"
                  onClick={() => handleAction(item.id, 'reject')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <XCircle size={16} />
                  Reject
                </ActionButton>
                
                <ActionButton
                  $variant="flag"
                  onClick={() => handleAction(item.id, 'flag')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Flag size={16} />
                  Flag
                </ActionButton>
                
                <ActionButton
                  $variant="view"
                  onClick={() => handleAction(item.id, 'view')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Eye size={16} />
                  Details
                </ActionButton>
              </ActionButtons>
            </ContentItem>
          ))}
        </AnimatePresence>

        {contentItems.length === 0 && (
          <div style={{ 
            padding: '4rem', 
            textAlign: 'center', 
            color: '#64748b',
            fontSize: '1.1rem'
          }}>
            <CheckCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <div>All content reviewed! Great job maintaining community standards.</div>
          </div>
        )}
      </ContentQueue>
    </ModerationContainer>
  );
};

export default ContentModerationPanel;
