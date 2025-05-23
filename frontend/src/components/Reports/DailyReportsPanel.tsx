// File: frontend/src/components/Reports/EnhancedDailyReportsPanel.tsx

import React, { useState, useCallback, useEffect } from 'react';
import styled, { css } from 'styled-components';
import { format } from 'date-fns';
import { DailyReport, DailyReportStatus, SecurityCode, AIOptions } from '../../types/reports';
import { AIReportAssistant } from './AIReportAssistant';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import {
  Check, Edit, Calendar, Clock, AlertTriangle, Shield, CheckCircle, Info, Lock,
  FileCheck, FileText, PanelLeftClose, PanelLeftOpen, Sparkles, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';

// --------- Styled components remain the same as in your original file ---------
// I'm keeping all your existing styled components intact
const Section = styled.div`
  margin-bottom: 2rem;
  background-color: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
`;

const SectionHeader = styled.div`
  padding: 1.25rem;
  background-color: #191919;
  border-bottom: 2px solid #333;
`;

const SectionTitle = styled.h3`
  font-size: clamp(1.1rem, 3vw, 1.25rem);
  margin: 0;
  font-weight: 600;
  color: #e5c76b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ReportTabs = styled(Tabs)`
  margin-bottom: 0;
`;

const ReportTabsList = styled(TabsList)`
  display: flex;
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: #666 #2a2a2a;
  padding: 1rem;
  margin-bottom: 0;
  gap: 0.5rem;
  background-color: #212121;
  border-bottom: 1px solid #333;
  
  &::-webkit-scrollbar {
    height: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #2a2a2a;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #666;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #888;
  }
  
  & > * {
    flex-shrink: 0;
  }
`;

interface ReportTabsTriggerProps {
  $completed?: boolean;
}

const ReportTabsTrigger = styled(TabsTrigger)<ReportTabsTriggerProps>`
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
  padding: 0.75rem 1rem;
  background-color: #2a2a2a;
  color: #ccc;
  border: 1px solid #444;
  
  &[data-state="active"] {
    background-color: ${props => props.$completed ? 'rgba(46, 125, 50, 0.2)' : 'rgba(0, 112, 243, 0.15)'};
    color: ${props => props.$completed ? '#2ecc71' : '#3498db'};
    font-weight: 600;
    border-color: ${props => props.$completed ? 'rgba(46, 125, 50, 0.5)' : 'rgba(0, 112, 243, 0.5)'};
  }
  
  @media (max-width: 768px) {
    font-size: 0.875rem;
    padding: 0.6rem 0.8rem;
  }
  
  &::after {
    content: '';
    display: ${props => props.$completed ? 'block' : 'none'};
    position: absolute;
    top: 4px;
    right: 4px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${props => props.$completed ? '#2ecc71' : 'transparent'};
  }
`;

const ReportTabsContent = styled(TabsContent)`
  background-image: url('/src/assets/marble-texture.png');
  background-size: cover;
  background-position: center;
  position: relative;
  padding: clamp(0.75rem, 3vw, 1.5rem);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(20, 20, 20, 0.85);
    z-index: 0;
  }
  
  & > * {
    position: relative;
    z-index: 1;
  }
`;

const ProgressContainer = styled.div`
  margin-bottom: 1.5rem;
  padding: 1.25rem;
  background-color: #212121;
`;

const ProgressDetails = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const ProgressText = styled.span`
  font-size: 0.875rem;
  color: #ccc;
  flex-basis: calc(50% - 0.25rem);
  text-align: right;
  
  &:first-child {
    text-align: left;
  }
  
  @media (max-width: 480px) {
    flex-basis: 100%;
    text-align: left;
    
    &:last-child {
      font-weight: 600;
      text-align: right;
      color: #e5c76b;
    }
  }
`;

const ProgressBar = styled.div`
  height: 8px;
  background-color: #2a2a2a;
  border-radius: 4px;
  overflow: hidden;
`;

interface ProgressFillProps {
  $progress: number;
  $completed?: boolean;
}

const ProgressFill = styled.div<ProgressFillProps>`
  height: 100%;
  width: ${props => `${props.$progress}%`};
  background-color: ${props => props.$completed ? '#2ecc71' : '#3498db'};
  transition: width 0.3s ease-in-out;
`;

const TextAreaContainer = styled.div`
  position: relative;
  margin: 1.5rem 0;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 200px;
  padding: 1rem;
  padding-bottom: 2rem;
  background-color: rgba(0, 0, 0, 0.3);
  color: #e0e0e0;
  border: 1px solid #444;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.6;
  resize: vertical;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
  
  &:focus {
    outline: none;
    border-color: #e5c76b;
    box-shadow: 0 0 0 2px rgba(229, 199, 107, 0.2);
  }
  
  &::placeholder {
    color: #777;
  }
  
  @media (max-width: 640px) {
    min-height: 180px;
    font-size: 0.9rem;
  }
`;

interface CharCountProps {
  $isLow: boolean;
}

const CharCount = styled.div<CharCountProps>`
  position: absolute;
  bottom: 0.75rem;
  right: 0.75rem;
  font-size: 0.75rem;
  color: ${props => props.$isLow ? '#e74c3c' : '#999'};
  background-color: rgba(0, 0, 0, 0.6);
  padding: 0.125rem 0.35rem;
  border-radius: 4px;
  z-index: 1;
`;

const AIPromptIndicator = styled.div`
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  font-size: 0.75rem;
  color: #e5c76b;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: opacity 0.3s ease;
  opacity: 0;
  animation: fadeIn 0.5s ease-in forwards;
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ControlsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  align-items: center;
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const ControlGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  
  & > select {
    flex-grow: 1;
    min-width: 150px;
  }
`;

const ControlLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
  color: #e0e0e0;
`;

const Select = styled.select`
  padding: 0.5rem;
  background-color: #2a2a2a;
  color: #e0e0e0;
  border: 1px solid #444;
  border-radius: 4px;
  font-size: 0.875rem;
  width: 100%;
  
  &:focus {
    outline: none;
    border-color: #e5c76b;
    box-shadow: 0 0 0 2px rgba(229, 199, 107, 0.2);
  }
  
  option {
    background-color: #2a2a2a;
    color: #e0e0e0;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 1.5rem;
`;

const ExpandedButtonGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  flex-grow: 1;
  justify-content: flex-start;
`;

const StyledButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: ${props => props.variant === 'default' ? '#e5c76b' : 'transparent'};
  color: ${props => props.variant === 'default' ? '#1a1a1a' : '#e0e0e0'};
  border: 1px solid ${props => props.variant === 'default' ? '#e5c76b' : '#444'};
  
  &:hover:not(:disabled) {
    background-color: ${props => props.variant === 'default' ? '#d4b65c' : 'rgba(229, 199, 107, 0.15)'};
    border-color: ${props => props.variant === 'default' ? '#d4b65c' : '#e5c76b'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface SecurityCodeBadgeProps {
  code: string;
}

const SecurityCodeBadge = styled(Badge)<SecurityCodeBadgeProps>`
  padding: 0.35rem 0.5rem;
  font-size: 0.75rem;
  background-color: ${props => {
    switch(props.code) {
      case 'Code 4': return 'rgba(46, 204, 113, 0.2)';
      case 'Code 3': return 'rgba(241, 196, 15, 0.2)';
      case 'Code 2': return 'rgba(230, 126, 34, 0.2)';
      case 'Code 1': return 'rgba(231, 76, 60, 0.2)';
      default: return 'rgba(189, 195, 199, 0.2)';
    }
  }};
  color: ${props => {
    switch(props.code) {
      case 'Code 4': return '#2ecc71';
      case 'Code 3': return '#f1c40f';
      case 'Code 2': return '#e67e22';
      case 'Code 1': return '#e74c3c';
      default: return '#bdc3c7';
    }
  }};
`;

const CardSection = styled.div`
  position: relative;
  background-image: url('/src/assets/marble-texture.png');
  background-size: ${() => 100 + Math.random() * 50}%;
  background-position: ${() => {
    const positions = ['top left', 'center', 'top right', 'bottom left', 'bottom right', '30% 70%', '70% 30%'];
    return positions[Math.floor(Math.random() * positions.length)];
  }};
  border-radius: 8px;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 0;
  }
  
  & > * {
    position: relative;
    z-index: 1;
  }
`;

const SummarySection = styled(CardSection)`
  margin-top: 2rem;
  padding: 1.5rem;
  
  @media (max-width: 640px) {
    padding: 1rem;
  }
`;

const SummarySectionTitle = styled.h4`
  font-size: 1.125rem;
  margin-bottom: 1rem;
  color: #e5c76b;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SignatureSection = styled(CardSection)`
  margin-top: 1.5rem;
  padding: 1.5rem;
  
  @media (max-width: 640px) {
    padding: 1rem;
  }
`;

const InputGroup = styled.div`
  margin-bottom: 1rem;
`;

const InputLabel = styled(Label)`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #e0e0e0;
`;

const TextInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  background-color: rgba(0, 0, 0, 0.3);
  color: #e0e0e0;
  border: 1px solid #444;
  border-radius: 4px;
  font-size: 0.95rem;
  
  &:focus {
    outline: none;
    border-color: #e5c76b;
    box-shadow: 0 0 0 2px rgba(229, 199, 107, 0.2);
  }
  
  &::placeholder {
    color: #777;
  }
  
  @media (max-width: 640px) {
    padding: 0.5rem;
    font-size: 0.875rem;
  }
`;

const AIOptionsSection = styled(CardSection)`
  margin-top: 2rem;
  padding: 1.5rem;
  background-position: 65% 35%;
  
  @media (max-width: 640px) {
    padding: 1rem;
  }
`;

const CheckboxGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0.375rem;
  border-radius: 4px;
  color: #e0e0e0;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: rgba(229, 199, 107, 0.1);
  }
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #e5c76b;
`;

const TemplateListContainer = styled.div`
  margin-top: 1rem;
  padding: 0.75rem;
  border: 1px solid #444;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.3);
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
  
  &.expanded {
    max-height: 300px;
    overflow-y: auto;
  }
`;

const TemplateItem = styled.div`
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid #444;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: rgba(0, 0, 0, 0.3);
  
  &:hover {
    border-color: #e5c76b;
    background-color: rgba(229, 199, 107, 0.1);
  }
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const TemplateTitle = styled.div`
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: #e0e0e0;
`;

const TemplatePreview = styled.div`
  font-size: 0.75rem;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

interface CollapseButtonProps {
  $expanded: boolean;
}

const CollapseButton = styled.button<CollapseButtonProps>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  padding: 0.5rem;
  font-size: 0.875rem;
  color: #e5c76b;
  cursor: pointer;
  margin-left: auto;
  
  &:hover {
    text-decoration: underline;
  }
`;

const AutosaveIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #999;
  animation: pulse 2s infinite;
  margin-left: 0.5rem;
  
  @keyframes pulse {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
  }
`;

interface WordCountBadgeProps {
  $count: number;
}

const WordCountBadge = styled.div<WordCountBadgeProps>`
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: 0.5rem;
  background-color: ${props => {
    if (props.$count < 50) return 'rgba(231, 76, 60, 0.2)';
    if (props.$count < 100) return 'rgba(241, 196, 15, 0.2)';
    return 'rgba(46, 204, 113, 0.2)';
  }};
  color: ${props => {
    if (props.$count < 50) return '#e74c3c';
    if (props.$count < 100) return '#f1c40f';
    return '#2ecc71';
  }};
`;

const TabsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: #212121;
  border-bottom: 1px solid #333;
`;

const TabsHeaderTitle = styled.div`
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #e0e0e0;
`;

const ReportHeaderTitle = styled.div`
  font-weight: 600;
  font-size: 1.125rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #e5c76b;
  margin-bottom: 1rem;
`;

// ------- Component interfaces and implementation --------
interface EnhancedDailyReportsPanelProps {
  dailyReports: DailyReport[];
  onReportChange: (day: string, content: string, status?: string, securityCode?: string) => void;
  dateRange: { start: Date; end: Date };
  summaryNotes: string;
  onSummaryChange: (text: string) => void;
  signature: string;
  onSignatureChange: (text: string) => void;
  aiOptions: AIOptions;
  onAIOptionChange: (options: Partial<AIOptions>) => void;
  contactEmail?: string;
  onContactEmailChange?: (email: string) => void;
}

/**
 * Enhanced Daily Reports Panel Component with Defense Theme
 * A comprehensive panel for creating and managing security daily reports with AI assistance
 * Styled with a Defense theme using marble texture backgrounds
 */
const EnhancedDailyReportsPanel: React.FC<EnhancedDailyReportsPanelProps> = ({
  dailyReports, onReportChange, dateRange, summaryNotes, onSummaryChange,
  signature, onSignatureChange, aiOptions, onAIOptionChange, contactEmail = '', onContactEmailChange,
}) => {
  // State and Callbacks
  const [activeDay, setActiveDay] = useState<string>(dailyReports[0]?.day || 'Monday');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isAutosaving, setIsAutosaving] = useState<boolean>(false);
  const [showTemplates, setShowTemplates] = useState<boolean>(false);
  const [typingAI, setTypingAI] = useState<boolean>(false);
  const [templateType, setTemplateType] = useState<'standard' | 'detailed' | 'incident'>('standard');
  const [contactEmailValue, setContactEmailValue] = useState<string>(contactEmail);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  useEffect(() => { 
    setContactEmailValue(contactEmail); 
  }, [contactEmail]);
  
  const handleContactEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => { 
    setContactEmailValue(e.target.value); 
    if (onContactEmailChange) { 
      onContactEmailChange(e.target.value); 
    } 
  };
  
  const getActiveReport = useCallback(() => { 
    return dailyReports.find(report => report.day === activeDay) || dailyReports[0]; 
  }, [activeDay, dailyReports]);
  
  const triggerAutosave = useCallback(() => { 
    setIsAutosaving(true); 
    const timer = setTimeout(() => setIsAutosaving(false), 1500); 
    return () => clearTimeout(timer); 
  }, []);
  
  const handleContentChange = useCallback((day: string, content: string) => { 
    const report = dailyReports.find(r => r.day === day); 
    const status = (report?.status === 'Completed') ? 'In Progress' : report?.status || 'In Progress'; 
    onReportChange(day, content, status, report?.securityCode); 
    triggerAutosave(); 
    
    if (aiOptions.enabled && aiOptions.suggestContent && content.length > 100) { 
      setTypingAI(true); 
      setTimeout(() => { 
        setTypingAI(false); 
      }, 5000); 
    } 
  }, [dailyReports, onReportChange, triggerAutosave, aiOptions.enabled, aiOptions.suggestContent]);
  
  const handleStatusChange = useCallback((day: string, status: string) => { 
    const report = dailyReports.find(r => r.day === day); 
    if (report) { 
      onReportChange(
        day, 
        report.content || '', // Ensure content is never undefined
        status as DailyReportStatus, // Type assertion for safety
        report.securityCode
      ); 
      triggerAutosave(); 
    } 
  }, [dailyReports, onReportChange, triggerAutosave]);
  
  const handleSecurityCodeChange = useCallback((day: string, code: string) => { 
    const report = dailyReports.find(r => r.day === day); 
    if (report) { 
      onReportChange(
        day, 
        report.content || '', // Ensure content is never undefined
        report.status, 
        code as SecurityCode // Type assertion for safety
      ); 
      triggerAutosave(); 
    } 
  }, [dailyReports, onReportChange, triggerAutosave]);
  
  const markAsCompleted = useCallback((day: string) => { 
    const report = dailyReports.find(r => r.day === day); 
    if (report) { 
      handleStatusChange(day, 'Completed'); 
      const reportIndex = dailyReports.findIndex(r => r.day === day); 
      const nextIncompleteReport = dailyReports.slice(reportIndex + 1).find(r => r.status !== 'Completed'); 
      if (nextIncompleteReport) { 
        setActiveDay(nextIncompleteReport.day); 
      } 
    } 
  }, [dailyReports, handleStatusChange, setActiveDay]);
  
  const generateReport = useCallback(async (day: string) => { 
    setIsGenerating(true);
    // AI logic would go here
    setTimeout(() => {
      setIsGenerating(false);
    }, 1500);
  }, [aiOptions.enabled, dailyReports, dateRange, onReportChange]);
  
  const generateSummary = useCallback(async () => { 
    setIsGenerating(true);
    // AI logic would go here
    setTimeout(() => {
      setIsGenerating(false);
    }, 1500);
  }, [aiOptions.enabled, dailyReports, dateRange, onSummaryChange]);

  // Calculations
  const completionPercentage = Math.round((dailyReports.filter(report => report.status === 'Completed').length / dailyReports.length) * 100);
  const isCompletionFinished = completionPercentage === 100;
  
  const getWordCount = (text: string | undefined) => { 
    if (!text) return 0; 
    return text.trim().split(/\s+/).length; 
  };
  
  const isContentSufficient = (content: string | undefined) => { 
    return getWordCount(content) >= 50; 
  };
  
  const activeReport = getActiveReport();
  const wordCount = getWordCount(activeReport?.content);

  return (
    <Section>
      <SectionHeader>
        <SectionTitle>
          <FileText size={20} /> Daily Security Reports
          {isAutosaving && (
            <AutosaveIndicator>
              <RefreshCw size={14} className="animate-spin" /> Saving...
            </AutosaveIndicator>
          )}
        </SectionTitle>
      </SectionHeader>

      <ProgressContainer>
        <ProgressDetails>
          <ProgressText>
            <span>Completion Progress:</span>
            <span>{dailyReports.filter(report => report.status === 'Completed').length} of {dailyReports.length} days</span>
          </ProgressText>
          <ProgressText>{completionPercentage}%</ProgressText>
        </ProgressDetails>
        <ProgressBar>
          <ProgressFill $progress={completionPercentage} $completed={isCompletionFinished} />
        </ProgressBar>
      </ProgressContainer>

      <ReportTabs value={activeDay} onValueChange={setActiveDay}>
        <TabsHeader>
          <TabsHeaderTitle>
            <Calendar size={16} /> Daily Reports
          </TabsHeaderTitle>
          <CollapseButton $expanded={!sidebarCollapsed} onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed 
              ? (<><PanelLeftOpen size={16} /> Show All Days</>) 
              : (<><PanelLeftClose size={16} /> Hide Days</>)
            }
          </CollapseButton>
        </TabsHeader>
        
        {!sidebarCollapsed && (
          <ReportTabsList>
            {dailyReports.map((report) => (
              <ReportTabsTrigger 
                key={report.day} 
                value={report.day} 
                $completed={report.status === 'Completed'}
              >
                {report.day.substring(0, 3)}
                {report.status === 'Completed' && <Check size={12} />}
                {report.content && (
                  <WordCountBadge $count={getWordCount(report.content)}>
                    {getWordCount(report.content)}
                  </WordCountBadge>
                )}
              </ReportTabsTrigger>
            ))}
          </ReportTabsList>
        )}

        {dailyReports.map((report) => (
          <ReportTabsContent key={report.day} value={report.day}>
            <ReportHeaderTitle>
              <Calendar size={18} /> 
              {report.day}, {format(dateRange.start, 'MMM d')} - {format(dateRange.end, 'MMM d, yyyy')}
            </ReportHeaderTitle>

            <ControlsRow>
              <ControlGroup>
                <ControlLabel>
                  <Shield size={16} /> Status:
                </ControlLabel>
                <Select 
                  value={report.status} 
                  onChange={(e) => handleStatusChange(report.day, e.target.value)}
                >
                  <option value="To update">To update</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Needs review">Needs review</option>
                </Select>
              </ControlGroup>
              <ControlGroup>
                <ControlLabel>
                  <AlertTriangle size={16} /> Security Code:
                </ControlLabel>
                <Select 
                  value={report.securityCode} 
                  onChange={(e) => handleSecurityCodeChange(report.day, e.target.value)}
                >
                  <option value="Code 4">Code 4 (All Clear)</option>
                  <option value="Code 3">Code 3 (Attention Required)</option>
                  <option value="Code 2">Code 2 (Minor Incident)</option>
                  <option value="Code 1">Code 1 (Serious Incident)</option>
                </Select>
              </ControlGroup>
            </ControlsRow>

            <TextAreaContainer>
              <TextArea 
                value={report.content || ''} 
                onChange={(e) => handleContentChange(report.day, e.target.value)} 
                placeholder={`Enter security report for ${report.day}...`} 
              />
              <CharCount $isLow={getWordCount(report.content) < 50}>
                {getWordCount(report.content)} words
              </CharCount>
              {typingAI && (
                <AIPromptIndicator>
                  <Sparkles size={14} /> AI suggesting improvements...
                </AIPromptIndicator>
              )}
            </TextAreaContainer>

            <ButtonGroup>
              <ExpandedButtonGroup>
                <StyledButton 
                  variant="outline" 
                  onClick={() => setShowTemplates(!showTemplates)}
                >
                  <FileText size={16} /> {showTemplates ? 'Hide Templates' : 'Use Template'}
                </StyledButton>
                <StyledButton 
                  variant="outline" 
                  onClick={() => generateReport(report.day)} 
                  disabled={isGenerating || !aiOptions.enabled}
                >
                  <Sparkles size={16} /> {isGenerating ? 'Generating...' : 'AI Generate'}
                </StyledButton>
              </ExpandedButtonGroup>
              <StyledButton 
                variant={isContentSufficient(report.content) ? 'default' : 'outline'} 
                onClick={() => markAsCompleted(report.day)} 
                disabled={!isContentSufficient(report.content)}
              >
                <CheckCircle size={16} /> 
                {report.status === 'Completed' ? 'Completed' : 'Mark as Completed'}
              </StyledButton>
            </ButtonGroup>

            <TemplateListContainer className={showTemplates ? 'expanded' : ''}>
              {/* Template Selection Content would go here */}
              <TemplateItem>
                <TemplateTitle>Standard Patrol Report</TemplateTitle>
                <TemplatePreview>
                  Routine patrol conducted with no significant incidents. All access points checked and secured...
                </TemplatePreview>
              </TemplateItem>
              <TemplateItem>
                <TemplateTitle>Incident Report Template</TemplateTitle>
                <TemplatePreview>
                  At [time], security personnel observed [description of incident]...
                </TemplatePreview>
              </TemplateItem>
            </TemplateListContainer>

            {/* AI Assistant */}
            {aiOptions.enabled && report.content && report.content.length > 20 && (
              <div style={{ marginTop: '1.5rem' }}>
                <AIReportAssistant
                  day={report.day}
                  content={report.content}
                  securityCode={report.securityCode as SecurityCode}
                  onChange={(content) => handleContentChange(report.day, content)}
                  aiOptions={aiOptions}
                  dateRange={dateRange}
                />
              </div>
            )}
          </ReportTabsContent>
        ))}
      </ReportTabs>

      {/* Summary Section */}
      <SummarySection>
        <SummarySectionTitle>
          <FileCheck size={18} /> Additional Notes & Compliance
        </SummarySectionTitle>
        <TextAreaContainer>
          <TextArea 
            value={summaryNotes} 
            onChange={(e) => { 
              onSummaryChange(e.target.value); 
              triggerAutosave(); 
            }} 
            placeholder="Enter additional notes..." 
          />
          <CharCount $isLow={getWordCount(summaryNotes) < 50}>
            {getWordCount(summaryNotes)} words
          </CharCount>
        </TextAreaContainer>
        <StyledButton 
          variant="outline" 
          onClick={generateSummary} 
          disabled={isGenerating || !aiOptions.enabled}
        >
          <Sparkles size={16} /> 
          {isGenerating ? 'Generating...' : 'Generate Summary with AI'}
        </StyledButton>
      </SummarySection>

      {/* Signature Section */}
      <SignatureSection>
        <SummarySectionTitle>
          <Lock size={18} /> Contact Information
        </SummarySectionTitle>
        <InputGroup>
          <InputLabel htmlFor="signature">Contact Name / Signature:</InputLabel>
          <TextInput 
            id="signature" 
            type="text" 
            value={signature} 
            onChange={(e) => { 
              onSignatureChange(e.target.value); 
              triggerAutosave(); 
            }} 
            placeholder="Enter your name/signature" 
          />
        </InputGroup>
        <InputGroup>
          <InputLabel htmlFor="contactEmail">Contact Email:</InputLabel>
          <TextInput 
            id="contactEmail" 
            type="email" 
            value={contactEmailValue} 
            onChange={handleContactEmailChange} 
            placeholder="Enter your email" 
          />
        </InputGroup>
      </SignatureSection>

      {/* AI Options Section */}
      <AIOptionsSection>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SummarySectionTitle>
            <Sparkles size={18} /> AI Report Enhancement Options
          </SummarySectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#e0e0e0' }}>Enable AI</span>
            <Switch 
              checked={aiOptions.enabled} 
              onCheckedChange={(checked) => onAIOptionChange({ enabled: checked })} 
            />
          </div>
        </div>
        <div style={{ fontSize: '0.875rem', color: '#999', marginBottom: '1rem' }}>
          Configure how AI will help improve your reports.
        </div>
        <CheckboxGroup>
          <CheckboxLabel>
            <Checkbox 
              type="checkbox" 
              checked={aiOptions.autoCorrect} 
              onChange={(e) => onAIOptionChange({ autoCorrect: e.target.checked })} 
              disabled={!aiOptions.enabled} 
            />
            Auto-correct spelling & grammar
          </CheckboxLabel>
          <CheckboxLabel>
            <Checkbox 
              type="checkbox" 
              checked={aiOptions.enhanceWriting} 
              onChange={(e) => onAIOptionChange({ enhanceWriting: e.target.checked })} 
              disabled={!aiOptions.enabled} 
            />
            Enhance writing style
          </CheckboxLabel>
          <CheckboxLabel>
            <Checkbox 
              type="checkbox" 
              checked={aiOptions.suggestContent} 
              onChange={(e) => onAIOptionChange({ suggestContent: e.target.checked })} 
              disabled={!aiOptions.enabled} 
            />
            Suggest additional content
          </CheckboxLabel>
          <CheckboxLabel>
            <Checkbox 
              type="checkbox" 
              checked={aiOptions.generateSummary} 
              onChange={(e) => onAIOptionChange({ generateSummary: e.target.checked })} 
              disabled={!aiOptions.enabled} 
            />
            Generate summary from all reports
          </CheckboxLabel>
          <CheckboxLabel>
            <Checkbox 
              type="checkbox" 
              checked={aiOptions.suggestImprovements} 
              onChange={(e) => onAIOptionChange({ suggestImprovements: e.target.checked })} 
              disabled={!aiOptions.enabled} 
            />
            Suggest security improvements
          </CheckboxLabel>
          <CheckboxLabel>
            <Checkbox 
              type="checkbox" 
              checked={aiOptions.analyzeThreats} 
              onChange={(e) => onAIOptionChange({ analyzeThreats: e.target.checked })} 
              disabled={!aiOptions.enabled} 
            />
            Analyze potential threats
          </CheckboxLabel>
          <CheckboxLabel>
            <Checkbox 
              type="checkbox" 
              checked={aiOptions.highlightPatterns} 
              onChange={(e) => onAIOptionChange({ highlightPatterns: e.target.checked })} 
              disabled={!aiOptions.enabled} 
            />
            Highlight recurring patterns
          </CheckboxLabel>
        </CheckboxGroup>
      </AIOptionsSection>
    </Section>
  );
};

export default EnhancedDailyReportsPanel;