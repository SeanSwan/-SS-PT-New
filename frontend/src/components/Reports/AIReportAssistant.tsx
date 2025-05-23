// File: frontend/src/components/Reports/AIAssistant.tsx
// MODIFIED: Renamed 'expanded' prop to '$expanded' in AssistantContainer and SuggestionContent

import React, { useState, useEffect, useRef } from 'react';
// MODIFIED: Added 'css' import
import styled, { css } from 'styled-components';
// Update AIOptions interface to include missing properties
interface AIOptions {
  enabled: boolean;
  autoCorrect?: boolean;
  enhanceWriting?: boolean;
  suggestImprovements?: boolean;
  // Added potentially missing properties based on usage
  suggestContent?: boolean;
  analyzeThreats?: boolean;
  generateSummary?: boolean;
}

// Import other necessary types
import { Button } from '../ui/button';

import {
  Sparkles,
  FileText,
  CheckCircle,
  AlertTriangle,
  RotateCw,
  ArrowRightCircle,
  Lightbulb,
  ThumbsUp,
  Shield,
  MessageSquare,
  Maximize2,
  Minimize2,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

// Styled components
// MODIFIED: Renamed 'expanded' prop to '$expanded'
const AssistantContainer = styled.div<{ $expanded: boolean }>`
  border: 1px solid ${props => props.$expanded ? '#7c3aed' : '#e0e0e0'};
  border-radius: 8px;
  overflow: hidden;
  background-color: ${props => props.$expanded ? '#f9f5ff' : '#f9fafb'};
  transition: all 0.3s ease;
  box-shadow: ${props => props.$expanded ? '0 4px 16px rgba(124, 58, 237, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.05)'};

  &:hover {
    border-color: ${props => props.$expanded ? '#7c3aed' : '#0070f3'};
  }
`;

const AssistantHeader = styled.div`
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e0e0e0;
  background-color: ${props => props.color || '#7c3aed'};
  color: white;
  cursor: pointer;

  @media (max-width: 640px) {
    padding: 0.5rem 0.75rem;
  }
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;

  @media (max-width: 640px) {
    font-size: 0.875rem;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const IconButton = styled.button`
  background: none;
  border: none;
  padding: 0.25rem;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
`;

// MODIFIED: Renamed 'expanded' prop to '$expanded'
const AssistantContent = styled.div<{ $expanded: boolean }>`
  max-height: ${props => props.$expanded ? '600px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s ease-in-out;
`;

const ContentSection = styled.div`
  padding: 1rem;

  @media (max-width: 640px) {
    padding: 0.75rem;
  }
`;

const SuggestionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.75rem;
`;

const SuggestionItem = styled.div`
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
`;

const SuggestionHeader = styled.div`
  padding: 0.75rem;
  background-color: #f3f4f6;
  font-weight: 500;
  font-size: 0.875rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;

  &:hover {
    background-color: #e5e7eb;
  }

  @media (max-width: 640px) {
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
  }
`;

const SuggestionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

// MODIFIED: Renamed 'expanded' prop to '$expanded'
const SuggestionContent = styled.div<{ $expanded: boolean }>`
  max-height: ${props => props.$expanded ? '300px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s ease-in-out;
`;

const SuggestionText = styled.div`
  padding: 0.75rem;
  font-size: 0.875rem;
  line-height: 1.6;
  color: #333;
  background-color: white;
  white-space: pre-line;

  @media (max-width: 640px) {
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
  }
`;

const SuggestionActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-top: 1px solid #f3f4f6;
  background-color: white;
`;

const ProcessingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #6b7280;

  @media (max-width: 640px) {
    padding: 1.5rem;
  }
`;

const SpinnerIcon = styled(RotateCw)`
  animation: spin 2s linear infinite;
  margin-bottom: 1rem;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const FeedbackContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-top: 1px solid #e0e0e0;
  background-color: #f9fafb;
  font-size: 0.8125rem;
  color: #6b7280;

  @media (max-width: 640px) {
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
`;

const FeedbackActions = styled.div`
  display: flex;
  gap: 0.75rem;

  @media (max-width: 640px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const FeedbackButton = styled.button`
  background: none;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8125rem;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: #f3f4f6;
    color: #4b5563;
  }

  &.active {
    background-color: #dbeafe;
    color: #1e40af;
  }

  @media (max-width: 640px) {
    font-size: 0.75rem;
  }
`;

const SuggestionBadge = styled.span<{ type: string }>`
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 500;

  background-color: ${props => {
    switch(props.type) {
      case 'grammar': return '#d1fae5';
      case 'security': return '#dbeafe';
      case 'content': return '#fef3c7';
      case 'improvement': return '#e0e7ff';
      default: return '#f3f4f6';
    }
  }};

  color: ${props => {
    switch(props.type) {
      case 'grammar': return '#047857';
      case 'security': return '#1e40af';
      case 'content': return '#b45309';
      case 'improvement': return '#4338ca';
      default: return '#4b5563';
    }
  }};
`;

const NoSuggestionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  color: #6b7280;
  text-align: center;

  @media (max-width: 640px) {
    padding: 1.5rem;
  }
`;

const MultiColumnText = styled.div`
  columns: 2;
  column-gap: 2rem;
  margin-top: 1rem;

  @media (max-width: 768px) {
    columns: 1;
  }
`;

const SecurityTip = styled.div`
  margin-bottom: 1rem;
  break-inside: avoid;
`;

const TipTitle = styled.div`
  font-weight: 600;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
`;

const TipContent = styled.div`
  font-size: 0.875rem;
  color: #4b5563;
  line-height: 1.5;
`;

// Define proper type instead of using 'any'
interface Suggestion {
  type: 'grammar' | 'content' | 'security' | 'improvement';
  title: string;
  issue?: string;
  suggestion: string;
  text: string;
  improvement: string;
}

interface AIReportAssistantProps {
  day: string;
  content: string;
  securityCode?: string;
  onChange: (content: string) => void;
  aiOptions: AIOptions;
  dateRange: { start: Date; end: Date };
}

/**
 * AI Report Assistant Component
 *
 * Provides intelligent assistance for security report writing with
 * grammar correction, content suggestions, and security improvements
 */
export const AIReportAssistant: React.FC<AIReportAssistantProps> = ({
  day,
  content,
  securityCode = 'Code 4',
  onChange,
  aiOptions,
  dateRange,
}) => {
  // MODIFIED: Changed prop name 'expanded' to '$expanded' for AssistantContainer state
  const [$expanded, setExpanded] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<{ [key: number]: 'helpful' | 'not-helpful' | null }>({});

  const contentRef = useRef<string>(content);

  // Update contentRef when content changes
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // Analyze content and generate suggestions
  const analyzeContent = React.useCallback(async () => {
    if (!aiOptions.enabled || contentRef.current.length < 50) return;

    setIsProcessing(true);

    try {
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Generate suggestions based on AI options and content
      const newSuggestions: Suggestion[] = [];

      // Grammar and spelling suggestions
      if (aiOptions.autoCorrect) {
        const grammarIssues = findGrammarIssues(contentRef.current);

        if (grammarIssues.length > 0) {
          for (const issue of grammarIssues) {
            if (issue.correction) {
              newSuggestions.push({
                type: 'grammar',
                title: 'Grammar & Spelling',
                issue: issue.original,
                suggestion: issue.correction,
                text: `Consider changing "${issue.original}" to "${issue.correction}".`,
                improvement: contentRef.current.replace(issue.original, issue.correction)
              });
            }
          }
        }
      }

      // Content enhancement suggestions
      if (aiOptions.enhanceWriting) {
        const enhancements = generateContentEnhancements(contentRef.current, day, dateRange);

        for (const enhancement of enhancements) {
          newSuggestions.push({
            type: 'content',
            title: 'Content Enhancement',
            suggestion: enhancement.suggestion,
            text: enhancement.description,
            improvement: enhancement.enhancedContent
          });
        }
      }

      // Security-specific suggestions
      if (aiOptions.suggestImprovements) {
        const securitySuggestions = generateSecuritySuggestions(contentRef.current, securityCode);

        for (const suggestion of securitySuggestions) {
          newSuggestions.push({
            type: 'security',
            title: 'Security Improvement',
            suggestion: suggestion.title,
            text: suggestion.description,
            improvement: suggestion.enhancedContent
          });
        }
      }

      // Set suggestions
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Error analyzing content:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [aiOptions, day, dateRange, securityCode]);

  // Automatically analyze content when expanded
  useEffect(() => {
    // MODIFIED: Use '$expanded' state variable
    if ($expanded && contentRef.current.length > 50 && suggestions.length === 0) {
      analyzeContent();
    }
  }, [$expanded, analyzeContent, suggestions.length]);

  // Toggle suggestion expansion
  const toggleSuggestion = (index: number) => {
    setExpandedSuggestion(expandedSuggestion === index ? null : index);
  };

  // Apply suggestion
  const applySuggestion = (improvement: string) => {
    onChange(improvement);
  };

  // Record feedback
  const recordFeedback = (index: number, type: 'helpful' | 'not-helpful') => {
    setFeedbackGiven(prev => ({
      ...prev,
      [index]: type
    }));
  };

  // Mock grammar checking function
  const findGrammarIssues = (text: string) => {
    // Simple grammar rules for simulation
    const commonErrors = [
      { regex: /\bthier\b/gi, correction: 'their' },
      { regex: /\byour\b([^a-zA-Z])(welcome|right)/gi, replacement: "you're$1$2" },
      { regex: /\bit's\b([^a-zA-Z])(time|getting|way)/gi, replacement: "its$1$2" },
      { regex: /\beffect\b([^a-zA-Z])(on|of)/gi, replacement: "affect$1$2" },
      { regex: /\bteh\b/gi, correction: 'the' },
      { regex: /\bto (much|many)\b/gi, replacement: "too $1" },
      { regex: /\balot\b/gi, correction: 'a lot' },
      { regex: /\bdefinately\b/gi, correction: 'definitely' },
    ];

    const issues = [];

    for (const error of commonErrors) {
      const matches = text.match(error.regex);

      if (matches) {
        for (const match of matches) {
          if (error.replacement) {
            const corrected = match.replace(error.regex, error.replacement);
            issues.push({
              original: match,
              correction: corrected
            });
          } else if (error.correction) {
            issues.push({
              original: match,
              correction: error.correction
            });
          }
        }
      }
    }

    // Add random spacing issues
    const doubleSpaceRegex = /\s{2,}/g;
    const doubleSpaces = text.match(doubleSpaceRegex);

    if (doubleSpaces) {
      for (const match of doubleSpaces) {
        issues.push({
          original: match,
          correction: ' '
        });
      }
    }

    return issues;
  };

  // Generate content enhancement suggestions
  const generateContentEnhancements = (text: string, day: string, dateRange: { start: Date; end: Date }) => {
    const enhancements = [];

    // Filter for which enhancements to suggest based on content
    const hasTimeSpecificInfo = /\b([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]\b/.test(text) ||
                               /\b([0-9]|0[0-9]|1[0-9]|2[0-3]) (am|pm|AM|PM)\b/.test(text);

    const hasCameraInfo = /\b(camera|surveillance|monitor|video|footage)\b/i.test(text);

    const hasAccessInfo = /\b(access|entry|door|gate|credential|badge|key|lock)\b/i.test(text);

    const hasPatrolInfo = /\b(patrol|walk|inspection|check|tour)\b/i.test(text);

    // Create a date for the report day based on the date range
    const dayIndex = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(day);
    const reportDate = new Date(dateRange.start);
    reportDate.setDate(reportDate.getDate() + dayIndex);

    // Add time-specific information if missing
    if (!hasTimeSpecificInfo) {
      enhancements.push({
        suggestion: 'Add time-specific information',
        description: 'Consider adding specific times for security activities to provide a more detailed chronological record.',
        enhancedContent: `${text}\n\nSecurity monitoring began at 00:00 hours with all systems operational. Perimeter checks were conducted at 08:00, 12:00, 16:00, and 20:00 hours with all access points confirmed secure throughout the monitoring period.`
      });
    }

    // Add camera/surveillance details if missing
    if (!hasCameraInfo) {
      enhancements.push({
        suggestion: 'Include surveillance system details',
        description: 'Add information about camera systems and surveillance monitoring to document security technology performance.',
        enhancedContent: `${text}\n\nAll surveillance cameras remained fully operational with 100% uptime throughout the monitoring period. Video quality was excellent with no technical issues detected. Recording systems functioning normally with all footage properly archived according to retention policies.`
      });
    }

    // Add access control information if missing
    if (!hasAccessInfo) {
      enhancements.push({
        suggestion: 'Add access control information',
        description: 'Include details about access points and credential verification procedures.',
        enhancedContent: `${text}\n\nAll access points were maintained in secure status with proper credential verification for all personnel. Access control systems functioned without technical issues and all entries were properly logged in the system. No unauthorized access attempts were detected.`
      });
    }

    // Add patrol information if missing
    if (!hasPatrolInfo) {
      enhancements.push({
        suggestion: 'Include patrol and inspection details',
        description: 'Add information about security patrols and site inspections conducted.',
        enhancedContent: `${text}\n\nRegular security patrols were conducted throughout the monitoring period with comprehensive coverage of all designated areas. Physical inspections confirmed all access points, sensitive areas, and perimeter zones remained properly secured with no evidence of tampering or unauthorized access.`
      });
    }

    return enhancements;
  };

  // Generate security-specific suggestions
  const generateSecuritySuggestions = (text: string, securityCode?: string) => {
    const suggestions = [];

    // Add compliance statement if missing
    if (!/(compliance|compliant|regulation|requirement|standard)/i.test(text)) {
      suggestions.push({
        title: 'Add compliance information',
        description: 'Include a statement about compliance with security standards and requirements.',
        enhancedContent: `${text}\n\nAll security operations were conducted in full compliance with established security protocols and regulatory requirements. Required documentation has been properly maintained and is available for audit purposes as needed.`
      });
    }

    // Add incident response readiness if code is not "All Clear"
    if (securityCode && securityCode !== 'Code 4') {
      suggestions.push({
        title: 'Include incident response details',
        description: 'Add information about response procedures followed for the security code situation.',
        enhancedContent: `${text}\n\nIn response to the security situation, proper incident response protocols were followed according to established procedures. All required notifications were made to appropriate personnel, and the situation was documented according to security incident reporting requirements. Follow-up actions have been scheduled as appropriate to prevent recurrence.`
      });
    }

    // Add personnel security details if missing
    if (!/(personnel|staff|employee|guard)/i.test(text)) {
      suggestions.push({
        title: 'Add security personnel information',
        description: 'Include details about security personnel activities and staffing.',
        enhancedContent: `${text}\n\nSecurity personnel maintained proper coverage of all assigned posts with no staffing gaps. All security staff demonstrated appropriate attention to detail and adherence to established protocols. Communication between security team members remained effective throughout the monitoring period.`
      });
    }

    return suggestions;
  };

  // Get security tips based on the day of week
  const getSecurityTips = () => {
    const tips = [
      {
        title: 'Credential Verification',
        content: 'Ensure all staff credentials are thoroughly verified, particularly on days with higher visitor traffic like Mondays and Fridays.'
      },
      {
        title: 'Perimeter Checks',
        content: 'Conduct comprehensive perimeter checks at varying times to avoid establishing predictable patterns that could be exploited.'
      },
      {
        title: 'Access Point Documentation',
        content: 'Maintain detailed logs of all access point activity, including times, personnel, and purpose for comprehensive security records.'
      },
      {
        title: 'Video System Verification',
        content: 'Regularly confirm all surveillance cameras are functioning properly with unobstructed views and proper recording capability.'
      },
      {
        title: 'Incident Documentation',
        content: 'Document even minor security concerns with specific details to establish patterns and improve future response capabilities.'
      },
      {
        title: 'Communication Protocols',
        content: 'Follow established communication protocols for all security matters to ensure proper information flow to all stakeholders.'
      }
    ];

    // Return a subset of tips based on the day
    const dayIndex = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(day);

    // Select 4 tips with the day's index as a seed
    const selectedTips = [];
    for (let i = 0; i < 4; i++) {
      selectedTips.push(tips[(dayIndex + i) % tips.length]);
    }

    return selectedTips;
  };

  return (
    // MODIFIED: Pass '$expanded' prop instead of 'expanded'
    <AssistantContainer $expanded={$expanded}>
      <AssistantHeader
        color="#7c3aed"
        onClick={() => setExpanded(!$expanded)}
      >
        <HeaderTitle>
          <Sparkles size={18} />
          AI Security Report Assistant
        </HeaderTitle>

        <HeaderActions>
          {/* MODIFIED: Use '$expanded' state variable */}
          {$expanded ? (
            <IconButton onClick={(e) => { e.stopPropagation(); setExpanded(false); }}>
              <Minimize2 size={18} />
            </IconButton>
          ) : (
            <IconButton onClick={(e) => { e.stopPropagation(); setExpanded(true); }}>
              <Maximize2 size={18} />
            </IconButton>
          )}
        </HeaderActions>
      </AssistantHeader>

      {/* MODIFIED: Pass '$expanded' prop instead of 'expanded' */}
      <AssistantContent $expanded={$expanded}>
        <ContentSection>
          {isProcessing ? (
            <ProcessingContainer>
              <SpinnerIcon size={32} />
              <div>Analyzing security report content...</div>
            </ProcessingContainer>
          ) : suggestions.length > 0 ? (
            <>
              <div>
                AI analysis has identified the following suggestions to enhance your security report:
              </div>

              <SuggestionsList>
                {suggestions.map((suggestion, index) => (
                  <SuggestionItem key={index}>
                    <SuggestionHeader onClick={() => toggleSuggestion(index)}>
                      <SuggestionTitle>
                        {suggestion.type === 'grammar' && <CheckCircle size={16} />}
                        {suggestion.type === 'content' && <FileText size={16} />}
                        {suggestion.type === 'security' && <Shield size={16} />}
                        {suggestion.type === 'improvement' && <Lightbulb size={16} />}

                        {suggestion.title}
                        <SuggestionBadge type={suggestion.type}>
                          {suggestion.type === 'grammar' && 'Grammar'}
                          {suggestion.type === 'content' && 'Content'}
                          {suggestion.type === 'security' && 'Security'}
                          {suggestion.type === 'improvement' && 'Improvement'}
                        </SuggestionBadge>
                      </SuggestionTitle>

                      {expandedSuggestion === index ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </SuggestionHeader>

                    {/* MODIFIED: Pass '$expanded' prop derived from state check */}
                    <SuggestionContent $expanded={expandedSuggestion === index}>
                      <SuggestionText>
                        {suggestion.text}
                      </SuggestionText>

                      <SuggestionActions>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleSuggestion(index)}
                        >
                          Dismiss
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => applySuggestion(suggestion.improvement)}
                        >
                          <ArrowRightCircle size={14} className="mr-1" />
                          Apply Suggestion
                        </Button>
                      </SuggestionActions>
                    </SuggestionContent>
                  </SuggestionItem>
                ))}
              </SuggestionsList>
            </>
          ) : contentRef.current.length > 50 ? (
            <NoSuggestionsContainer>
              <CheckCircle size={32} color="#10b981" />
              <div style={{ marginTop: '0.75rem', fontWeight: 500 }}>Your report looks good!</div>
              <div style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}>No significant issues were found in your security report.</div>

              <div style={{ marginTop: '1.5rem', textAlign: 'left', width: '100%' }}>
                <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Lightbulb size={16} />
                  Security Reporting Tips for {day}:
                </div>

                <MultiColumnText>
                  {getSecurityTips().map((tip, index) => (
                    <SecurityTip key={index}>
                      <TipTitle>
                        <Shield size={14} />
                        {tip.title}
                      </TipTitle>
                      <TipContent>{tip.content}</TipContent>
                    </SecurityTip>
                  ))}
                </MultiColumnText>
              </div>
            </NoSuggestionsContainer>
          ) : (
            <NoSuggestionsContainer>
              <MessageSquare size={32} color="#6b7280" />
              <div style={{ marginTop: '0.75rem', fontWeight: 500 }}>Add more content to your report</div>
              <div style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}>
                Enter more details in your security report to receive AI-powered suggestions and improvements.
              </div>
            </NoSuggestionsContainer>
          )}
        </ContentSection>

        <FeedbackContainer>
          <div>AI Assistant trained specifically for security operations reporting</div>
          <FeedbackActions>
            <FeedbackButton
              className={feedbackGiven[-1] === 'helpful' ? 'active' : ''}
              onClick={() => recordFeedback(-1, 'helpful')}
            >
              <ThumbsUp size={14} />
              Helpful
            </FeedbackButton>
            <FeedbackButton
              className={feedbackGiven[-1] === 'not-helpful' ? 'active' : ''}
              onClick={() => recordFeedback(-1, 'not-helpful')}
            >
              <AlertTriangle size={14} />
              Not Helpful
            </FeedbackButton>
          </FeedbackActions>
        </FeedbackContainer>
      </AssistantContent>
    </AssistantContainer>
  );
};

export default AIReportAssistant; // Ensure export name is correct if used elsewhere