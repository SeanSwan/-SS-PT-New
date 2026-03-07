/**
 * HistoryTab — Past Form Analyses with Trend
 * ============================================
 * Shows paginated analysis history and improvement trend.
 */
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useFormAnalysisAPI } from '../../hooks/useFormAnalysisAPI';
import { getScoreColor, getScoreGrade } from './constants';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 20px;
  color: rgba(224, 236, 244, 0.5);
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 12px;
`;

const Card = styled(motion.div)`
  background: rgba(0, 32, 96, 0.3);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(96, 192, 240, 0.1);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: border-color 0.2s;

  &:hover {
    border-color: rgba(96, 192, 240, 0.3);
  }
`;

const ScoreBadge = styled.div<{ $color: string }>`
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 800;
  color: ${({ $color }) => $color};
  background: ${({ $color }) => $color}15;
  border: 1px solid ${({ $color }) => $color}30;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
`;

const CardContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ExerciseName = styled.p`
  font-size: 15px;
  font-weight: 700;
  color: #E0ECF4;
  margin: 0;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
`;

const MetaText = styled.span`
  font-size: 12px;
  color: rgba(224, 236, 244, 0.4);
`;

const StatusBadge = styled.span<{ $status: string }>`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 2px 8px;
  border-radius: 8px;
  color: ${({ $status }) =>
    $status === 'complete' ? '#00FF88' :
    $status === 'failed' ? '#FF4757' :
    '#FFB800'};
  background: ${({ $status }) =>
    $status === 'complete' ? 'rgba(0, 255, 136, 0.1)' :
    $status === 'failed' ? 'rgba(255, 71, 87, 0.1)' :
    'rgba(255, 184, 0, 0.1)'};
`;

const LoadMoreButton = styled(motion.button)`
  min-height: 44px;
  border-radius: 22px;
  border: 1px solid rgba(96, 192, 240, 0.2);
  background: rgba(0, 32, 96, 0.3);
  color: rgba(224, 236, 244, 0.6);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const LoadingText = styled.p`
  text-align: center;
  color: rgba(224, 236, 244, 0.4);
  font-size: 13px;
`;

const DetailPanel = styled(motion.div)`
  background: rgba(0, 32, 96, 0.4);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 16px;
  padding: 20px;
  margin-top: -4px;
  margin-bottom: 4px;
`;

const DetailSection = styled.div`
  margin-top: 12px;
`;

const DetailLabel = styled.h4`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: rgba(224, 236, 244, 0.4);
  margin: 0 0 6px;
`;

const DetailItem = styled.p`
  font-size: 13px;
  color: rgba(224, 236, 244, 0.7);
  margin: 4px 0;
  padding-left: 12px;
  border-left: 2px solid rgba(96, 192, 240, 0.2);
`;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

const HistoryTab: React.FC = () => {
  const { fetchHistory, reprocessAnalysis } = useFormAnalysisAPI();
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadHistory = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    try {
      const data = await fetchHistory({ page: pageNum, limit: 20 });
      if (pageNum === 1) {
        setAnalyses(data.analyses);
      } else {
        setAnalyses(prev => [...prev, ...data.analyses]);
      }
      setTotalPages(data.totalPages);
    } catch {
      // Silently handle — empty state shown
    } finally {
      setIsLoading(false);
    }
  }, [fetchHistory]);

  useEffect(() => {
    loadHistory(1);
  }, [loadHistory]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    loadHistory(next);
  };

  const handleReprocess = async (id: number) => {
    try {
      await reprocessAnalysis(id);
      setAnalyses(prev => prev.map(a =>
        a.id === id ? { ...a, analysisStatus: 'pending' } : a
      ));
    } catch {
      // Error handled silently
    }
  };

  if (isLoading && analyses.length === 0) {
    return <Container><LoadingText>Loading history...</LoadingText></Container>;
  }

  if (analyses.length === 0) {
    return (
      <Container>
        <EmptyState>
          <EmptyIcon>📊</EmptyIcon>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#E0ECF4', marginBottom: 8 }}>
            No analyses yet
          </p>
          <p style={{ fontSize: 13 }}>
            Upload a video or use the live camera to get your first form analysis.
          </p>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      {analyses.map((a) => {
        const color = a.overallScore != null ? getScoreColor(a.overallScore) : 'rgba(224, 236, 244, 0.3)';
        const isExpanded = expandedId === a.id;

        return (
          <React.Fragment key={a.id}>
            <Card
              onClick={() => setExpandedId(isExpanded ? null : a.id)}
              whileTap={{ scale: 0.98 }}
            >
              <ScoreBadge $color={color}>
                {a.overallScore ?? '--'}
              </ScoreBadge>
              <CardContent>
                <ExerciseName>{a.exerciseName}</ExerciseName>
                <MetaRow>
                  <MetaText>{formatDate(a.createdAt)}</MetaText>
                  <MetaText>{formatTime(a.createdAt)}</MetaText>
                  <StatusBadge $status={a.analysisStatus}>
                    {a.analysisStatus}
                  </StatusBadge>
                </MetaRow>
                {a.repCount && (
                  <MetaText>{a.repCount} reps detected</MetaText>
                )}
              </CardContent>
            </Card>

            {isExpanded && (
              <DetailPanel
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                {a.overallScore != null && (
                  <div style={{ textAlign: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 36, fontWeight: 800, color }}>
                      {a.overallScore}
                    </span>
                    <span style={{ fontSize: 12, color: 'rgba(224, 236, 244, 0.4)', marginLeft: 4 }}>
                      / 100
                    </span>
                    <p style={{ fontSize: 12, color, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>
                      {getScoreGrade(a.overallScore)}
                    </p>
                  </div>
                )}

                {a.findings?.length > 0 && (
                  <DetailSection>
                    <DetailLabel>Findings</DetailLabel>
                    {a.findings.map((f: any, i: number) => (
                      <DetailItem key={i}>
                        {f.message || f.description || JSON.stringify(f)}
                      </DetailItem>
                    ))}
                  </DetailSection>
                )}

                {a.recommendations?.length > 0 && (
                  <DetailSection>
                    <DetailLabel>Recommendations</DetailLabel>
                    {a.recommendations.map((r: any, i: number) => (
                      <DetailItem key={i}>
                        {typeof r === 'string' ? r : r.message || JSON.stringify(r)}
                      </DetailItem>
                    ))}
                  </DetailSection>
                )}

                {a.coachingFeedback && (
                  <DetailSection>
                    <DetailLabel>Coaching Feedback</DetailLabel>
                    <DetailItem>
                      {typeof a.coachingFeedback === 'string'
                        ? a.coachingFeedback
                        : a.coachingFeedback.summary || JSON.stringify(a.coachingFeedback)}
                    </DetailItem>
                  </DetailSection>
                )}

                {a.analysisStatus === 'failed' && (
                  <LoadMoreButton
                    onClick={(e) => { e.stopPropagation(); handleReprocess(a.id); }}
                    whileTap={{ scale: 0.95 }}
                    style={{ marginTop: 12, borderColor: 'rgba(255, 184, 0, 0.3)', color: '#FFB800' }}
                  >
                    Retry Analysis
                  </LoadMoreButton>
                )}
              </DetailPanel>
            )}
          </React.Fragment>
        );
      })}

      {page < totalPages && (
        <LoadMoreButton
          onClick={handleLoadMore}
          disabled={isLoading}
          whileTap={{ scale: 0.95 }}
        >
          {isLoading ? 'Loading...' : 'Load More'}
        </LoadMoreButton>
      )}
    </Container>
  );
};

export default HistoryTab;
