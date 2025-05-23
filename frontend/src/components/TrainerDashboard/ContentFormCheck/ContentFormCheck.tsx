/**
 * ContentFormCheck.tsx
 * Content management and form check component for the Trainer Dashboard
 * Implements the "Content & Form Checks" section described in the SwanStudios Platform architecture
 */
import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { 
  Video, 
  Upload, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Share, 
  Grid, 
  List, 
  CheckCircle, 
  AlertTriangle, 
  ChevronDown, 
  Plus,
  Clock,
  Tag,
  Eye,
  MoreVertical,
  MessageCircle,
  Play,
  Pause,
  ChevronsLeft,
  ChevronsRight,
  AlignJustify,
  Heart,
  Bookmark,
  BarChart2,
  PenTool,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Camera,
  LifeBuoy,
  PlusCircle,
  Activity
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import YoloAnalysisService, { AnalysisData } from '../../../services/yolo-analysis-service';

// Styled Components
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 2rem;
  background: #0a0a1a;
  min-height: 100vh;
  color: white;

  @media (max-width: 768px) {
    padding: 1rem;
    gap: 1rem;
  }
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const HeaderTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 600;
  margin: 0;
  color: #00ffff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 1rem;
`;

const TabsContainer = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 0.5rem;
  margin-bottom: 1.5rem;
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  border: none;
  background: ${props => props.active ? 'linear-gradient(135deg, #00ffff, #7851a9)' : 'transparent'};
  color: ${props => props.active ? '#0a0a1a' : 'white'};
  font-weight: ${props => props.active ? '600' : '400'};
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:hover {
    background: ${props => props.active ? 'linear-gradient(135deg, #00ffff, #7851a9)' : 'rgba(255, 255, 255, 0.1)'};
  }
  
  @media (max-width: 768px) {
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
    
    svg {
      width: 16px;
      height: 16px;
    }
  }
`;

const ActionButton = styled.button`
  background: linear-gradient(135deg, #00ffff, #00c8ff);
  border: none;
  border-radius: 8px;
  padding: 0.6rem 1.2rem;
  color: #0a0a1a;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 255, 255, 0.4);
    
    &::before {
      left: 100%;
    }
  }

  &:active {
    transform: translateY(0);
  }
`;

const SearchFilterContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const SearchInputContainer = styled.div`
  position: relative;
  flex: 1;
`;

const SearchInput = styled.input`
  width: 100%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 0.6rem 1rem 0.6rem 2.5rem;
  color: white;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
  
  &:focus {
    outline: none;
    border-color: #00ffff;
    background: rgba(255, 255, 255, 0.1);
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
  }
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.5);
  pointer-events: none;
`;

const FilterButton = styled.button`
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 0.6rem 1rem;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  font-weight: 500;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
  }
`;

const ViewToggleContainer = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  overflow: hidden;
`;

const ViewToggleButton = styled.button<{ active: boolean }>`
  background: ${props => props.active ? 'rgba(255, 255, 255, 0.15)' : 'transparent'};
  border: none;
  padding: 0.6rem 1rem;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => props.active ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.1)'};
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ContentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ContentCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    border-color: rgba(0, 255, 255, 0.3);
  }
`;

const ContentListItem = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  gap: 1rem;
  align-items: center;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(0, 255, 255, 0.3);
  }
`;

const ContentThumbnail = styled.div<{ backgroundImage?: string }>`
  aspect-ratio: 16/9;
  background: ${props => props.backgroundImage ? `url(${props.backgroundImage}) no-repeat center/cover` : 'linear-gradient(135deg, #1a1a2e, #16213e)'};
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    opacity: 0.7;
  }
`;

const ListThumbnail = styled.div<{ backgroundImage?: string }>`
  width: 100px;
  height: 60px;
  border-radius: 8px;
  background: ${props => props.backgroundImage ? `url(${props.backgroundImage}) no-repeat center/cover` : 'linear-gradient(135deg, #1a1a2e, #16213e)'};
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    opacity: 0.7;
  }
`;

const ContentInfo = styled.div`
  padding: 1rem;
  flex: 1;
`;

const ContentTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: white;
`;

const ContentMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const ContentTag = styled.span`
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 20px;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  color: #00ffff;
  margin-right: 0.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
`;

const ContentActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
`;

const ActionIcon = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }
`;

const StatusIndicator = styled.div<{ status: 'pending' | 'reviewed' | 'shared' }>`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: ${props => {
    switch (props.status) {
      case 'pending': return 'rgba(241, 196, 15, 0.8)';
      case 'reviewed': return 'rgba(46, 204, 113, 0.8)';
      case 'shared': return 'rgba(52, 152, 219, 0.8)';
      default: return 'rgba(255, 255, 255, 0.8)';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'pending': return '#000';
      case 'reviewed': return '#fff';
      case 'shared': return '#fff';
      default: return '#000';
    }
  }};
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const TabContent = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
`;

const VideoViewerContainer = styled.div`
  background: #0a0a0a;
  border-radius: 12px;
  margin: 1.5rem 0;
  display: grid;
  grid-template-columns: 3fr 1fr;
  gap: 1.5rem;
  overflow: hidden;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const VideoPlayerSection = styled.div`
  padding: 1.5rem;
`;

const VideoPlayer = styled.div`
  aspect-ratio: 16/9;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  margin-bottom: 1rem;
  
  video {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

const VideoControls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
`;

const VideoPlaybackControls = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const VideoPlaybackButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  
  &.play-pause {
    width: 48px;
    height: 48px;
    background: rgba(0, 255, 255, 0.2);
    
    &:hover {
      background: rgba(0, 255, 255, 0.3);
    }
  }
`;

const VideoProgress = styled.div`
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  position: relative;
  cursor: pointer;
  margin-top: 1rem;
  
  &:hover {
    height: 8px;
    margin-top: calc(1rem - 1px);
  }
`;

const VideoProgressFill = styled.div<{ width: string }>`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: ${props => props.width};
  background: linear-gradient(90deg, #00ffff, #7851a9);
  border-radius: 3px;
`;

const VideoAnnotationSection = styled.div`
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.02);
  border-left: 1px solid rgba(255, 255, 255, 0.05);
  
  @media (max-width: 1024px) {
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }
`;

const AnnotationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const AnnotationTitle = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
`;

const AnnotationTabs = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 1rem;
`;

const AnnotationTab = styled.button<{ active: boolean }>`
  padding: 0.5rem 1rem;
  border: none;
  background: ${props => props.active ? 'rgba(0, 255, 255, 0.2)' : 'transparent'};
  color: ${props => props.active ? '#00ffff' : 'white'};
  font-weight: ${props => props.active ? '600' : '400'};
  cursor: pointer;
  flex: 1;
  font-size: 0.85rem;
  
  &:hover {
    background: ${props => props.active ? 'rgba(0, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)'};
  }
`;

const AnnotationTools = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const AnnotationTool = styled.button<{ active?: boolean }>`
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid ${props => props.active ? '#00ffff' : 'rgba(255, 255, 255, 0.15)'};
  background: ${props => props.active ? 'rgba(0, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => props.active ? '#00ffff' : 'white'};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.active ? 'rgba(0, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.1)'};
    border-color: ${props => props.active ? '#00ffff' : 'rgba(255, 255, 255, 0.3)'};
  }
`;

const CommentsList = styled.div`
  margin-top: 1rem;
  overflow-y: auto;
  max-height: 300px;
`;

const CommentItem = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
`;

const CommentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const CommentAuthor = styled.div`
  font-weight: 600;
  font-size: 0.9rem;
`;

const CommentTime = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
`;

const CommentText = styled.div`
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
`;

const CommentTimestamp = styled.div`
  font-size: 0.75rem;
  color: #00ffff;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: rgba(0, 255, 255, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background: rgba(0, 255, 255, 0.2);
  }
`;

const CommentInput = styled.div`
  margin-top: 1rem;
  position: relative;
`;

const StyledTextarea = styled.textarea`
  width: 100%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 0.75rem;
  color: white;
  font-size: 0.9rem;
  resize: none;
  min-height: 80px;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
  
  &:focus {
    outline: none;
    border-color: #00ffff;
    background: rgba(255, 255, 255, 0.1);
  }
`;

const CommentActions = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
`;

const AIAnalysisContainer = styled.div`
  margin-top: 1rem;
`;

const AIAnalysisHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const AIAnalysisTitle = styled.h4`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #00ffff;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const AIAnalysisButton = styled.button`
  background: linear-gradient(135deg, #7851a9, #00ffff);
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  color: white;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 255, 255, 0.3);
  }
`;

const AIAnalysisResult = styled.div`
  background: rgba(120, 81, 169, 0.1);
  border: 1px solid rgba(120, 81, 169, 0.3);
  border-radius: 8px;
  padding: 1rem;
`;

const AIAnalysisItem = styled.div`
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  &:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
`;

const AIAnalysisItemTitle = styled.div`
  font-weight: 600;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const AIAnalysisItemDescription = styled.div`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
`;

const PoseDetectionControls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const PoseDetectionTool = styled.button`
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  color: white;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
`;

const EmptyStateTitle = styled.h2`
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  color: white;
`;

const EmptyStateDescription = styled.p`
  margin: 0 0 1.5rem 0;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.6);
  max-width: 500px;
`;

const DropZone = styled.div`
  border: 2px dashed rgba(0, 255, 255, 0.3);
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1.5rem;
  
  &:hover {
    border-color: #00ffff;
    background: rgba(0, 255, 255, 0.05);
  }
`;

const DropZoneIcon = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(0, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem auto;
  
  svg {
    color: #00ffff;
  }
`;

const DropZoneTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: white;
`;

const DropZoneDescription = styled.p`
  margin: 0 0 1.5rem 0;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
`;

const FileInputLabel = styled.label`
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 8px;
  padding: 0.6rem 1.2rem;
  color: #00ffff;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(0, 255, 255, 0.2);
    transform: translateY(-2px);
  }
`;

const FileInput = styled.input`
  display: none;
`;

// Mock data with more realistic content
const mockContent = [
  {
    id: 1,
    title: 'Deadlift Form Check',
    type: 'form_check',
    client: 'Sarah Johnson',
    uploadDate: '2024-05-14T09:30:00Z',
    duration: '1:24',
    status: 'pending',
    thumbnail: undefined,
    views: 3,
    comments: 0,
    tags: ['form_check', 'strength'],
    clientMessage: 'Please check my deadlift form. I feel some lower back strain.'
  },
  {
    id: 2,
    title: 'Proper Squat Technique',
    type: 'instructional',
    client: null, // Trainer's own content
    uploadDate: '2024-05-10T15:45:00Z',
    duration: '4:16',
    status: 'shared',
    thumbnail: undefined,
    views: 42,
    comments: 5,
    tags: ['technique', 'legs', 'basics'],
    description: 'Comprehensive guide to proper squat form for all levels.'
  },
  {
    id: 3,
    title: 'Overhead Press Check',
    type: 'form_check',
    client: 'Mike Chen',
    uploadDate: '2024-05-13T11:15:00Z',
    duration: '0:58',
    status: 'reviewed',
    thumbnail: undefined,
    views: 2,
    comments: 3,
    tags: ['form_check', 'shoulders'],
    clientMessage: 'Is my overhead press form correct? Trying to prevent shoulder impingement.'
  },
  {
    id: 4,
    title: 'Full Body Mobility Routine',
    type: 'instructional',
    client: null, // Trainer's own content
    uploadDate: '2024-05-08T10:20:00Z',
    duration: '8:45',
    status: 'shared',
    thumbnail: undefined,
    views: 87,
    comments: 11,
    tags: ['mobility', 'flexibility', 'recovery'],
    description: 'Complete mobility routine to improve joint health and prevent injury.'
  },
  {
    id: 5,
    title: 'Bench Press Form Check',
    type: 'form_check',
    client: 'John Davis',
    uploadDate: '2024-05-12T14:05:00Z',
    duration: '1:12',
    status: 'pending',
    thumbnail: undefined,
    views: 1,
    comments: 0,
    tags: ['form_check', 'chest'],
    clientMessage: 'Working on increasing my bench press. Please check my form and bar path.'
  },
  {
    id: 6,
    title: 'Core Strengthening Exercises',
    type: 'instructional',
    client: null, // Trainer's own content
    uploadDate: '2024-04-30T09:15:00Z',
    duration: '6:22',
    status: 'shared',
    thumbnail: undefined,
    views: 63,
    comments: 7,
    tags: ['core', 'strength', 'tutorial'],
    description: 'Six essential core exercises for a stronger, more stable trunk.'
  }
];

// Mock comments for form check videos
const mockComments = [
  {
    id: 1,
    contentId: 3, // Overhead Press Check
    author: 'Alex Thompson',
    role: 'trainer',
    text: "Your elbow position is good, but try to keep your core engaged throughout the movement. You're arching your back slightly at the top.",
    timestamp: '0:22',
    time: '2024-05-13T14:30:00Z'
  },
  {
    id: 2,
    contentId: 3, // Overhead Press Check
    author: 'Alex Thompson',
    role: 'trainer',
    text: "Watch your breathing - exhale on the press up, inhale as you lower the weight. This will help with stabilization.",
    timestamp: '0:35',
    time: '2024-05-13T14:32:00Z'
  },
  {
    id: 3,
    contentId: 3, // Overhead Press Check
    author: 'Alex Thompson',
    role: 'trainer',
    text: "Overall, your overhead press form is looking good. Just keep those shoulders down and away from your ears during the movement.",
    timestamp: null,
    time: '2024-05-13T14:34:00Z'
  }
];

// Mock AI analysis results
const mockAIAnalysis = {
  contentId: 3, // Overhead Press Check
  timestamp: '2024-05-13T15:10:00Z',
  analyzed: true,
  results: [
    {
      type: 'form_issue',
      title: 'Back Arch Detected',
      description: "Excessive lumbar arch detected at 0:32-0:38. Recommend focusing on core engagement to maintain neutral spine.",
      confidence: 0.92,
      timeRange: '0:32-0:38'
    },
    {
      type: 'movement_pattern',
      title: 'Bar Path Analysis',
      description: "Bar path shows slight forward drift on ascent. Ideal bar path should be vertical or slightly behind the head.",
      confidence: 0.85,
      timeRange: '0:15-0:45'
    },
    {
      type: 'joint_angle',
      title: 'Elbow Position',
      description: "Elbow angles measured at 85-90 degrees at bottom position. This is within optimal range.",
      confidence: 0.97,
      timeRange: '0:10-0:50'
    }
  ],
  overallAssessment: "Good form with minor improvements needed. Focus on core engagement to prevent back arching during the press.",
  detectedExercise: 'Overhead Press',
  repCount: 6,
  averageRangeOfMotion: '92%'
};

const ContentFormCheck: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'content' | 'form_checks'>('form_checks');
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'reviewed' | 'shared'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState(mockContent);
  const [selectedContent, setSelectedContent] = useState<any | null>(null);
  const [comments, setComments] = useState(mockComments);
  const [newComment, setNewComment] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<AnalysisData | null>(null);
  const [analysisSessionId, setAnalysisSessionId] = useState<string | null>(null);
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [videoIsPlaying, setVideoIsPlaying] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [activeAnnotationTab, setActiveAnnotationTab] = useState<'comments' | 'ai_analysis'>('comments');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    // Simulate loading content
    setLoading(true);
    setTimeout(() => {
      setContent(mockContent);
      setLoading(false);
    }, 1000);
  }, []);
  
  useEffect(() => {
    // If a content item is selected, fetch its comments and AI analysis
    if (selectedContent) {
      // In a real app, this would be an API call
      const contentComments = mockComments.filter(comment => comment.contentId === selectedContent.id);
      setComments(contentComments);
      
      // Reset any previous analysis state
      setAiAnalysis(null);
      setAnalysisSessionId(null);
      setIsAnalyzing(false);
      
      // Clean up any existing WebSocket connection
      if (webSocket && webSocket.readyState === WebSocket.OPEN) {
        webSocket.close();
        setWebSocket(null);
      }
      
      // Clear any pending timeouts or intervals
      if (window.yoloAnalysisInterval) {
        clearInterval(window.yoloAnalysisInterval);
        window.yoloAnalysisInterval = null;
      }
      
      if (window.yoloAnalysisTimeout) {
        clearTimeout(window.yoloAnalysisTimeout);
        window.yoloAnalysisTimeout = null;
      }
      
      // In a real implementation, we would check if this content already has analysis data
      // and load it instead of showing mock data for a specific ID
      if (selectedContent.id === 3) { // Only the Overhead Press has mock AI analysis for demo
        // We won't immediately set the analysis, but keep it null until the user requests it
      }
    }
    
    // Cleanup when component unmounts
    return () => {
      if (webSocket && webSocket.readyState === WebSocket.OPEN) {
        webSocket.close();
      }
      
      if (analysisSessionId) {
        YoloAnalysisService.stopAnalysisSession(analysisSessionId)
          .catch(err => console.error('Error stopping analysis session:', err));
      }
      
      if (window.yoloAnalysisInterval) {
        clearInterval(window.yoloAnalysisInterval);
        window.yoloAnalysisInterval = null;
      }
      
      if (window.yoloAnalysisTimeout) {
        clearTimeout(window.yoloAnalysisTimeout);
        window.yoloAnalysisTimeout = null;
      }
    };
  }, [selectedContent, webSocket, analysisSessionId]);
  
  const filteredContent = content.filter(item => {
    // Filter by search term
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (item.client && item.client.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filter by tab (content type)
    const matchesTab = activeTab === 'content' ? item.type === 'instructional' : item.type === 'form_check';
    
    // Filter by status
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    
    return matchesSearch && matchesTab && matchesStatus;
  });
  
  const handleContentSelect = (contentItem: any) => {
    setSelectedContent(contentItem);
  };
  
  const handleCloseViewer = () => {
    // Clean up WebSocket connection and analysis session when closing the viewer
    if (webSocket && webSocket.readyState === WebSocket.OPEN) {
      webSocket.close();
      setWebSocket(null);
    }
    
    if (analysisSessionId) {
      YoloAnalysisService.stopAnalysisSession(analysisSessionId)
        .catch(err => console.error('Error stopping analysis session:', err));
      setAnalysisSessionId(null);
    }
    
    // Clear any pending timeouts or intervals
    if (window.yoloAnalysisInterval) {
      clearInterval(window.yoloAnalysisInterval);
      window.yoloAnalysisInterval = null;
    }
    
    if (window.yoloAnalysisTimeout) {
      clearTimeout(window.yoloAnalysisTimeout);
      window.yoloAnalysisTimeout = null;
    }
    
    setSelectedContent(null);
    setCurrentVideoTime(0);
    setVideoIsPlaying(false);
    setNewComment('');
    setAiAnalysis(null);
  };
  
  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    // In a real app, this would be an API call
    const newCommentObj = {
      id: Date.now(),
      contentId: selectedContent.id,
      author: `${user?.firstName} ${user?.lastName}`,
      role: 'trainer',
      text: newComment,
      timestamp: formatTime(currentVideoTime),
      time: new Date().toISOString()
    };
    
    setComments([...comments, newCommentObj]);
    setNewComment('');
  };
  
  const handleRunAIAnalysis = async () => {
    setIsAnalyzing(true);
    setActiveAnnotationTab('ai_analysis');
    
    try {
      // Get video element
      const videoElement = document.querySelector('video');
      
      // Determine exercise type from content title
      const exerciseName = YoloAnalysisService.extractExerciseName(selectedContent.title);
      
      // Start analysis session with YOLO MCP Server
      const sessionResponse = await YoloAnalysisService.startAnalysisSession(
        user?.id || 'unknown',
        exerciseName
      );
      
      if (sessionResponse.success) {
        setAnalysisSessionId(sessionResponse.session_id);
        
        // Establish WebSocket connection for real-time analysis
        const socket = YoloAnalysisService.createWebSocketConnection(
          sessionResponse.session_id,
          (data) => {
            if (data.metrics) {
              // Transform YOLO metrics to UI format
              const analysisData = YoloAnalysisService.transformYoloMetrics(
                data.metrics,
                selectedContent.id
              );
              setAiAnalysis(analysisData);
              
              // Update state based on analysis (for real implementation)
              setIsAnalyzing(data.metrics.exercise_name ? false : true);
            }
          }
        );
        
        setWebSocket(socket);
        
        // Handle WebSocket connection events
        socket.onopen = () => {
          console.log('WebSocket connection established');
        };
        
        socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsAnalyzing(false);
        };
        
        socket.onclose = () => {
          console.log('WebSocket connection closed');
          setIsAnalyzing(false);
        };
        
        // In a real implementation, capture and send video frames
        // For demo purposes, we'll simulate the process
        
        const simulateFrames = () => {
          // Keep the WebSocket alive with a ping
          if (socket.readyState === WebSocket.OPEN) {
            YoloAnalysisService.sendPing(socket);
          }
          
          // In a real implementation with a video element:
          if (videoElement && socket.readyState === WebSocket.OPEN) {
            try {
              // Create a canvas to capture the current frame
              const canvas = document.createElement('canvas');
              canvas.width = videoElement.videoWidth || 640;
              canvas.height = videoElement.videoHeight || 360;
              const ctx = canvas.getContext('2d');
              
              // Draw the current video frame to the canvas
              if (ctx && videoElement.videoWidth > 0) {
                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                // Get the frame data as base64
                const frameData = canvas.toDataURL('image/jpeg');
                // Send to the YOLO server
                YoloAnalysisService.sendVideoFrame(socket, frameData, true);
              }
            } catch (error) {
              console.error('Error capturing video frame:', error);
            }
          }
        };
        
        // Start sending frames every 200ms
        const frameInterval = setInterval(simulateFrames, 200);
        
        // For demo purposes, also set a timeout to stop after 3 seconds
        // and load mock data if no real data is received
        const analysisTimeout = setTimeout(() => {
          if (isAnalyzing) {
            // If still analyzing, use mock data
            setAiAnalysis({
              ...mockAIAnalysis,
              detectedExercise: exerciseName.charAt(0).toUpperCase() + exerciseName.slice(1).replace('_', ' ')
            });
            setIsAnalyzing(false);
          }
        }, 5000);
        
        // Store intervals for cleanup
        window.yoloAnalysisInterval = frameInterval;
        window.yoloAnalysisTimeout = analysisTimeout;
      } else {
        console.error('Failed to start YOLO analysis session:', sessionResponse.message);
        setIsAnalyzing(false);
      }
    } catch (error) {
      console.error('Error running AI analysis:', error);
      setIsAnalyzing(false);
    }
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // In a real app, this would upload the file to the server
      // For now, we'll just simulate a successful upload
      
      const file = e.target.files[0];
      const isFormCheck = activeTab === 'form_checks';
      
      // Create a new content item
      const newContentItem = {
        id: Date.now(),
        title: file.name.replace(/\.[^/.]+$/, ""),
        type: isFormCheck ? 'form_check' : 'instructional',
        client: isFormCheck ? 'New Client' : null,
        uploadDate: new Date().toISOString(),
        duration: '0:00', // Would be determined by the server
        status: isFormCheck ? 'pending' : 'shared',
        thumbnail: undefined,
        views: 0,
        comments: 0,
        tags: isFormCheck ? ['form_check', 'new'] : ['instructional', 'new'],
        clientMessage: isFormCheck ? 'New form check submission' : '',
        description: isFormCheck ? '' : 'New instructional video'
      };
      
      setContent([newContentItem, ...content]);
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };
  
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  const renderContent = () => {
    if (loading) {
      return (
        <EmptyState>
          <Loading />
          <EmptyStateTitle>Loading content...</EmptyStateTitle>
        </EmptyState>
      );
    }
    
    if (filteredContent.length === 0) {
      return (
        <EmptyState>
          <Video size={48} color="rgba(255, 255, 255, 0.2)" />
          <EmptyStateTitle>No {activeTab === 'content' ? 'content' : 'form checks'} found</EmptyStateTitle>
          <EmptyStateDescription>
            {activeTab === 'content' 
              ? "You haven't created any content yet. Upload your first instructional video!"
              : "No form check submissions yet. They'll appear here when clients submit videos."}
          </EmptyStateDescription>
          
          <FileInputLabel htmlFor="content-upload">
            <Upload size={16} />
            Upload {activeTab === 'content' ? 'Content' : 'Form Check'}
            <FileInput 
              id="content-upload" 
              type="file" 
              accept="video/*" 
              onChange={handleFileUpload}
              ref={fileInputRef}
            />
          </FileInputLabel>
        </EmptyState>
      );
    }
    
    return viewType === 'grid' ? renderGridView() : renderListView();
  };
  
  const renderGridView = () => {
    return (
      <ContentGrid>
        {filteredContent.map(item => (
          <ContentCard key={item.id} onClick={() => handleContentSelect(item)}>
            <ContentThumbnail backgroundImage={item.thumbnail}>
              <Video size={32} color="white" />
              <StatusIndicator status={item.status as any}>
                {item.status === 'pending' ? (
                  <>
                    <Clock size={12} />
                    Pending
                  </>
                ) : item.status === 'reviewed' ? (
                  <>
                    <CheckCircle size={12} />
                    Reviewed
                  </>
                ) : (
                  <>
                    <Share size={12} />
                    Shared
                  </>
                )}
              </StatusIndicator>
            </ContentThumbnail>
            
            <ContentInfo>
              <ContentTitle>{item.title}</ContentTitle>
              {item.client && (
                <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  From: {item.client}
                </div>
              )}
              
              <div style={{ marginTop: '0.5rem' }}>
                {item.tags.map((tag, index) => (
                  <ContentTag key={index}>
                    <Tag size={12} />
                    {tag}
                  </ContentTag>
                ))}
              </div>
              
              <ContentMeta>
                <div>
                  <MetaItem>
                    <Clock size={14} />
                    {item.duration}
                  </MetaItem>
                </div>
                
                <div>
                  <MetaItem style={{ marginRight: '0.75rem' }}>
                    <Eye size={14} />
                    {item.views}
                  </MetaItem>
                  <MetaItem>
                    <MessageCircle size={14} />
                    {item.comments}
                  </MetaItem>
                </div>
              </ContentMeta>
            </ContentInfo>
          </ContentCard>
        ))}
      </ContentGrid>
    );
  };
  
  const renderListView = () => {
    return (
      <ContentList>
        {filteredContent.map(item => (
          <ContentListItem key={item.id} onClick={() => handleContentSelect(item)}>
            <ListThumbnail backgroundImage={item.thumbnail}>
              <Video size={24} color="white" />
              <StatusIndicator status={item.status as any}>
                {item.status === 'pending' ? (
                  <>
                    <Clock size={10} />
                    Pending
                  </>
                ) : item.status === 'reviewed' ? (
                  <>
                    <CheckCircle size={10} />
                    Reviewed
                  </>
                ) : (
                  <>
                    <Share size={10} />
                    Shared
                  </>
                )}
              </StatusIndicator>
            </ListThumbnail>
            
            <ContentInfo>
              <ContentTitle>{item.title}</ContentTitle>
              {item.client && (
                <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  From: {item.client}
                </div>
              )}
              
              <div style={{ marginTop: '0.25rem' }}>
                {item.tags.slice(0, 2).map((tag, index) => (
                  <ContentTag key={index}>
                    <Tag size={12} />
                    {tag}
                  </ContentTag>
                ))}
                {item.tags.length > 2 && (
                  <ContentTag>+{item.tags.length - 2} more</ContentTag>
                )}
              </div>
            </ContentInfo>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem' }}>
                {formatDate(item.uploadDate)}
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <MetaItem>
                  <Clock size={14} />
                  {item.duration}
                </MetaItem>
                <MetaItem>
                  <Eye size={14} />
                  {item.views}
                </MetaItem>
                <MetaItem>
                  <MessageCircle size={14} />
                  {item.comments}
                </MetaItem>
              </div>
            </div>
            
            <ContentActions>
              <ActionIcon>
                <Edit size={16} />
              </ActionIcon>
              <ActionIcon>
                <Share size={16} />
              </ActionIcon>
              <ActionIcon>
                <MoreVertical size={16} />
              </ActionIcon>
            </ContentActions>
          </ContentListItem>
        ))}
      </ContentList>
    );
  };
  
  const renderVideoViewer = () => {
    if (!selectedContent) return null;
    
    return (
      <VideoViewerContainer>
        <VideoPlayerSection>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <ContentTitle>{selectedContent.title}</ContentTitle>
              {selectedContent.client && (
                <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Submitted by: {selectedContent.client}
                </div>
              )}
            </div>
            
            <StatusIndicator status={selectedContent.status as any}>
              {selectedContent.status === 'pending' ? (
                <>
                  <Clock size={12} />
                  Pending Review
                </>
              ) : selectedContent.status === 'reviewed' ? (
                <>
                  <CheckCircle size={12} />
                  Reviewed
                </>
              ) : (
                <>
                  <Share size={12} />
                  Shared
                </>
              )}
            </StatusIndicator>
          </div>
          
          <VideoPlayer>
            {/* In a production app, this would be a real video player with proper source */}
            <video 
              playsInline 
              controls 
              muted 
              poster="/api/placeholder/640/360" 
              id="formCheckVideo"
              autoPlay={videoIsPlaying}
              onTimeUpdate={(e) => setCurrentVideoTime(e.currentTarget.currentTime)}
            >
              {/* For demo purposes, we're using a sample video */}
              <source src="#" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </VideoPlayer>
          
          <VideoProgress>
            <VideoProgressFill width={`${(currentVideoTime / 60) * 100}%`} />
          </VideoProgress>
          
          <VideoControls>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)' }}>
              {formatTime(currentVideoTime)} / {selectedContent.duration}
            </div>
            
            <VideoPlaybackControls>
              <VideoPlaybackButton>
                <SkipBack size={16} />
              </VideoPlaybackButton>
              <VideoPlaybackButton 
                className="play-pause" 
                onClick={() => {
                  const video = document.getElementById('formCheckVideo') as HTMLVideoElement;
                  if (video) {
                    if (videoIsPlaying) {
                      video.pause();
                    } else {
                      video.play();
                    }
                    setVideoIsPlaying(!videoIsPlaying);
                  }
                }}
              >
                {videoIsPlaying ? <Pause size={20} /> : <Play size={20} />}
              </VideoPlaybackButton>
              <VideoPlaybackButton>
                <SkipForward size={16} />
              </VideoPlaybackButton>
            </VideoPlaybackControls>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <VideoPlaybackButton>
                <Maximize size={16} />
              </VideoPlaybackButton>
            </div>
          </VideoControls>
          
          {/* Client message for form checks */}
          {selectedContent.type === 'form_check' && selectedContent.clientMessage && (
            <div style={{ 
              marginTop: '1.5rem', 
              padding: '1rem', 
              background: 'rgba(255, 255, 255, 0.05)', 
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Client Message:</div>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                {selectedContent.clientMessage}
              </div>
            </div>
          )}
          
          {/* Description for instructional videos */}
          {selectedContent.type === 'instructional' && selectedContent.description && (
            <div style={{ 
              marginTop: '1.5rem', 
              padding: '1rem', 
              background: 'rgba(255, 255, 255, 0.05)', 
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Description:</div>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                {selectedContent.description}
              </div>
            </div>
          )}
        </VideoPlayerSection>
        
        <VideoAnnotationSection>
          <AnnotationHeader>
            <AnnotationTitle>Review Tools</AnnotationTitle>
          </AnnotationHeader>
          
          <AnnotationTabs>
            <AnnotationTab 
              active={activeAnnotationTab === 'comments'} 
              onClick={() => setActiveAnnotationTab('comments')}
            >
              Comments
            </AnnotationTab>
            <AnnotationTab 
              active={activeAnnotationTab === 'ai_analysis'} 
              onClick={() => setActiveAnnotationTab('ai_analysis')}
            >
              AI Analysis
            </AnnotationTab>
          </AnnotationTabs>
          
          {activeAnnotationTab === 'comments' ? (
            <>
              <AnnotationTools>
                <AnnotationTool active={activeTool === 'pen'} onClick={() => setActiveTool('pen')}>
                  <PenTool size={18} />
                </AnnotationTool>
                <AnnotationTool active={activeTool === 'line'} onClick={() => setActiveTool('line')}>
                  <AlignJustify size={18} />
                </AnnotationTool>
                <AnnotationTool active={activeTool === 'angle'} onClick={() => setActiveTool('angle')}>
                  <Activity size={18} />
                </AnnotationTool>
                <AnnotationTool active={activeTool === 'circle'} onClick={() => setActiveTool('circle')}>
                  <Circle size={18} />
                </AnnotationTool>
              </AnnotationTools>
              
              <CommentsList>
                {comments.length > 0 ? (
                  comments.map(comment => (
                    <CommentItem key={comment.id}>
                      <CommentHeader>
                        <CommentAuthor>{comment.author}</CommentAuthor>
                        <CommentTime>{formatDate(comment.time)}</CommentTime>
                      </CommentHeader>
                      <CommentText>{comment.text}</CommentText>
                      {comment.timestamp && (
                        <CommentTimestamp>
                          <Clock size={12} />
                          {comment.timestamp}
                        </CommentTimestamp>
                      )}
                    </CommentItem>
                  ))
                ) : (
                  <div style={{ 
                    padding: '1rem', 
                    textAlign: 'center', 
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '0.9rem'
                  }}>
                    No comments yet. Add your first comment.
                  </div>
                )}
              </CommentsList>
              
              <CommentInput>
                <StyledTextarea 
                  placeholder="Add a comment or feedback..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <CommentActions>
                  <div>
                    <VideoPlaybackButton onClick={() => {
                      setNewComment(prev => `${prev}${prev ? ' ' : ''}[${formatTime(currentVideoTime)}]`);
                    }}>
                      <Clock size={16} />
                    </VideoPlaybackButton>
                  </div>
                  <ActionButton onClick={handleAddComment}>
                    <MessageCircle size={16} />
                    Add Comment
                  </ActionButton>
                </CommentActions>
              </CommentInput>
            </>
          ) : (
            <AIAnalysisContainer>
              <AIAnalysisHeader>
                <AIAnalysisTitle>
                  <BarChart2 size={18} />
                  YOLO Pose Analysis
                </AIAnalysisTitle>
                
                {!aiAnalysis && !isAnalyzing && (
                  <AIAnalysisButton onClick={handleRunAIAnalysis}>
                    <Activity size={16} />
                    Run Analysis
                  </AIAnalysisButton>
                )}
              </AIAnalysisHeader>
              
              {isAnalyzing ? (
                <div style={{ 
                  padding: '2rem', 
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '8px'
                }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <Camera size={32} color="rgba(255, 255, 255, 0.4)" />
                  </div>
                  <div style={{ marginBottom: '0.5rem', fontWeight: 600 }}>
                    Analyzing video...
                  </div>
                  <div style={{ 
                    fontSize: '0.85rem', 
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginBottom: '1rem'
                  }}>
                    YOLO pose detection in progress
                  </div>
                  <div style={{ 
                    height: '4px', 
                    width: '80%', 
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '2px',
                    margin: '0 auto',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      left: '0',
                      top: '0',
                      bottom: '0',
                      width: '30%',
                      background: 'linear-gradient(90deg, #00ffff, #7851a9)',
                      borderRadius: '2px',
                      animation: 'progress 2s infinite ease-in-out'
                    }} />
                  </div>
                </div>
              ) : aiAnalysis ? (
                <>
                  <AIAnalysisResult>
                    {aiAnalysis.results.map((result: any, index: number) => (
                      <AIAnalysisItem key={index}>
                        <AIAnalysisItemTitle>
                          {result.type === 'form_issue' ? (
                            <AlertTriangle size={16} color="#f1c40f" />
                          ) : result.type === 'movement_pattern' ? (
                            <Activity size={16} color="#3498db" />
                          ) : (
                            <BarChart2 size={16} color="#2ecc71" />
                          )}
                          {result.title}
                        </AIAnalysisItemTitle>
                        <AIAnalysisItemDescription>
                          {result.description}
                        </AIAnalysisItemDescription>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          fontSize: '0.75rem',
                          color: 'rgba(255, 255, 255, 0.5)',
                          marginTop: '0.25rem'
                        }}>
                          <div>Time: {result.timeRange}</div>
                          <div>Confidence: {(result.confidence * 100).toFixed(0)}%</div>
                        </div>
                      </AIAnalysisItem>
                    ))}
                    
                    <div style={{ 
                      background: 'rgba(120, 81, 169, 0.2)',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      marginTop: '1rem',
                      fontSize: '0.9rem'
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                        Overall Assessment:
                      </div>
                      <div>{aiAnalysis.overallAssessment}</div>
                    </div>
                  </AIAnalysisResult>
                  
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    marginTop: '1rem'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                        Exercise Detected
                      </div>
                      <div style={{ fontWeight: 600 }}>
                        {aiAnalysis.detectedExercise}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                        Rep Count
                      </div>
                      <div style={{ fontWeight: 600 }}>
                        {aiAnalysis.repCount}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                        Range of Motion
                      </div>
                      <div style={{ fontWeight: 600 }}>
                        {aiAnalysis.averageRangeOfMotion}
                      </div>
                    </div>
                  </div>
                  
                  <PoseDetectionControls>
                    <PoseDetectionTool>
                      <BarChart2 size={16} />
                      Show Angles
                    </PoseDetectionTool>
                    <PoseDetectionTool>
                      <Activity size={16} />
                      Track Movement
                    </PoseDetectionTool>
                    <PoseDetectionTool>
                      <Play size={16} />
                      Overlay Skeleton
                    </PoseDetectionTool>
                  </PoseDetectionControls>
                </>
              ) : (
                <div style={{ 
                  padding: '2rem', 
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '8px'
                }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <LifeBuoy size={32} color="rgba(255, 255, 255, 0.4)" />
                  </div>
                  <div style={{ marginBottom: '0.5rem', fontWeight: 600 }}>
                    No AI Analysis Available
                  </div>
                  <div style={{ 
                    fontSize: '0.85rem', 
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginBottom: '1rem'
                  }}>
                    Run AI analysis to get automatic form feedback and exercise detection.
                  </div>
                </div>
              )}
            </AIAnalysisContainer>
          )}
        </VideoAnnotationSection>
      </VideoViewerContainer>
    );
  };
  
  const renderUploadZone = () => {
    return (
      <DropZone>
        <DropZoneIcon>
          <Upload size={30} />
        </DropZoneIcon>
        <DropZoneTitle>
          Upload New {activeTab === 'content' ? 'Content' : 'Form Check'}
        </DropZoneTitle>
        <DropZoneDescription>
          {activeTab === 'content' 
            ? "Share instructional videos with your clients. They'll be accessible in their dashboard."
            : "Upload form check videos from your clients for analysis and feedback."}
        </DropZoneDescription>
        <FileInputLabel htmlFor="dropzone-upload">
          <Upload size={16} />
          {activeTab === 'content' ? 'Select Content to Upload' : 'Select Form Check to Upload'}
          <FileInput 
            id="dropzone-upload" 
            type="file" 
            accept="video/*" 
            onChange={handleFileUpload}
            ref={fileInputRef}
          />
        </FileInputLabel>
      </DropZone>
    );
  };
  
  return (
    <PageContainer>
      <PageHeader>
        <HeaderTitle>Content & Form Checks</HeaderTitle>
        <HeaderActions>
          <ActionButton onClick={() => fileInputRef.current?.click()}>
            <Upload size={18} />
            Upload
            <FileInput 
              type="file" 
              accept="video/*" 
              onChange={handleFileUpload}
              ref={fileInputRef}
            />
          </ActionButton>
        </HeaderActions>
      </PageHeader>
      
      <TabsContainer>
        <Tab 
          active={activeTab === 'form_checks'} 
          onClick={() => setActiveTab('form_checks')}
        >
          <Video size={20} />
          Form Checks
        </Tab>
        <Tab 
          active={activeTab === 'content'} 
          onClick={() => setActiveTab('content')}
        >
          <Upload size={20} />
          My Content
        </Tab>
      </TabsContainer>
      
      <SearchFilterContainer>
        <SearchInputContainer>
          <SearchIcon size={18} />
          <SearchInput 
            placeholder={`Search ${activeTab === 'content' ? 'content' : 'form checks'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchInputContainer>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <FilterButton onClick={() => setFilterStatus(
            filterStatus === 'all' ? 'pending' : 
            filterStatus === 'pending' ? 'reviewed' :
            filterStatus === 'reviewed' ? 'shared' : 'all'
          )}>
            <Filter size={18} />
            {filterStatus === 'all' ? 'All Status' : `${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}`}
          </FilterButton>
          
          <ViewToggleContainer>
            <ViewToggleButton active={viewType === 'grid'} onClick={() => setViewType('grid')}>
              <Grid size={18} />
            </ViewToggleButton>
            <ViewToggleButton active={viewType === 'list'} onClick={() => setViewType('list')}>
              <List size={18} />
            </ViewToggleButton>
          </ViewToggleContainer>
        </div>
      </SearchFilterContainer>
      
      {selectedContent ? renderVideoViewer() : renderContent()}
      
      {!selectedContent && !loading && filteredContent.length > 0 && renderUploadZone()}
      
      {selectedContent && (
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <ActionButton onClick={handleCloseViewer}>
            Back to {activeTab === 'content' ? 'Content' : 'Form Checks'}
          </ActionButton>
        </div>
      )}
    </PageContainer>
  );
};

// Loading component
const Loading = () => (
  <div style={{ 
    width: '40px', 
    height: '40px', 
    border: '3px solid rgba(0, 255, 255, 0.1)', 
    borderTop: '3px solid #00ffff',
    borderRadius: '50%',
    margin: '0 0 1rem 0',
    animation: 'spin 1s infinite linear'
  }} />
);

// Circle component since we can't import it from lucide-react
const Circle = ({ size = 24, ...props }: { size?: number, [key: string]: any }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
  </svg>
);

export default ContentFormCheck;