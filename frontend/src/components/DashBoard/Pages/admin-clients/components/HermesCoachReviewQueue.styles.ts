/**
 * HermesCoachReviewQueue.styles
 * Styled shell for the sanitized Hermes coach review queue.
 */
import styled from 'styled-components';
export const QueueShell = styled.section`display:grid;gap:18px;`;

export const QueueHeader = styled.div`
  display:flex;justify-content:space-between;gap:18px;align-items:flex-start;padding:20px;
  border:1px solid var(--swan-border-subtle, rgba(96, 192, 240, 0.22));border-radius:14px;
  background:linear-gradient(135deg, rgba(0, 32, 96, 0.72), rgba(10, 10, 15, 0.86));
`;

export const HeaderCopy = styled.div`display:grid;gap:8px;`;

export const Eyebrow = styled.span`
  color:var(--accent-primary, #60c0f0);font-size:0.78rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;
`;

export const QueueTitle = styled.h4`
  display:inline-flex;align-items:center;gap:10px;color:var(--text-primary, #e0ecf4);font-size:1.28rem;margin:0;
`;

export const QueueText = styled.p`color:var(--text-secondary, #a7b5c4);margin:0;max-width:760px;`;

export const RefreshButton = styled.button`
  min-height:44px;display:inline-flex;align-items:center;gap:8px;border:1px solid var(--accent-primary, #60c0f0);
  border-radius:999px;background:rgba(96, 192, 240, 0.12);color:var(--text-primary, #e0ecf4);font-weight:700;padding:0 16px;cursor:pointer;
`;

export const MetricGrid = styled.div`display:grid;grid-template-columns:repeat(4, minmax(140px, 1fr));gap:12px;`;

export const MetricPanel = styled.div<{ $warn?: boolean }>`
  display:grid;gap:8px;min-height:96px;padding:16px;border-radius:12px;
  border:1px solid ${({ $warn }) => ($warn ? 'rgba(198, 168, 75, 0.45)' : 'var(--swan-border-subtle, rgba(96, 192, 240, 0.18))')};
  background:${({ $warn }) => ($warn ? 'rgba(198, 168, 75, 0.12)' : 'rgba(255, 255, 255, 0.045)')};
`;

export const MetricLabel = styled.span`color:var(--text-secondary, #a7b5c4);font-size:0.82rem;font-weight:700;`;
export const MetricValue = styled.span`color:var(--text-primary, #e0ecf4);font-size:1.9rem;font-weight:800;`;

export const PrivacyRail = styled.div`
  display:flex;align-items:center;flex-wrap:wrap;gap:10px 14px;min-height:44px;color:var(--text-secondary, #a7b5c4);
  border:1px solid rgba(96, 192, 240, 0.16);border-radius:12px;background:rgba(96, 192, 240, 0.07);padding:10px 14px;
  svg{color:var(--accent-primary, #60c0f0);flex-shrink:0;} span{color:var(--accent-primary, #60c0f0);margin-left:auto;}
`;

export const ErrorBanner = styled.div`
  display:flex;align-items:center;gap:10px;min-height:44px;color:var(--danger-contrast, #ffe8e8);
  border:1px solid rgba(248, 113, 113, 0.45);border-radius:12px;background:rgba(127, 29, 29, 0.32);padding:10px 14px;
`;

export const TaskList = styled.div`display:grid;gap:10px;`;

export const TaskRow = styled.article<{ $stale?: boolean }>`
  display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px;border-radius:12px;background:rgba(10, 10, 15, 0.72);
  border:1px solid ${({ $stale }) => ($stale ? 'rgba(198, 168, 75, 0.48)' : 'rgba(255, 255, 255, 0.1)')};
  @media (max-width: 640px){align-items:stretch;flex-direction:column;}
`;

export const TaskMain = styled.div`display:grid;gap:8px;min-width:0;`;
export const TaskTitle = styled.h5`color:var(--text-primary, #e0ecf4);font-size:1rem;line-height:1.3;margin:0;`;

export const TaskMeta = styled.div`
  display:flex;flex-wrap:wrap;gap:8px;
  span{color:var(--text-secondary, #a7b5c4);border:1px solid rgba(255, 255, 255, 0.1);border-radius:999px;padding:4px 9px;font-size:0.78rem;}
`;

export const TaskActions = styled.div`
  display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap;
  @media (max-width: 640px){justify-content:space-between;}
`;

export const TaskAge = styled.span`
  display:inline-flex;align-items:center;gap:6px;color:var(--accent-primary, #60c0f0);font-size:0.86rem;white-space:nowrap;
`;

export const CompleteButton = styled.button`
  min-height:44px;display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(198, 168, 75, 0.52);
  border-radius:999px;background:rgba(198, 168, 75, 0.14);color:var(--text-primary, #e0ecf4);font-weight:800;padding:0 14px;cursor:pointer;
  &:disabled{opacity:0.62;cursor:not-allowed;}
`;

export const EmptyPanel = styled.div`
  display:flex;align-items:center;min-height:88px;color:var(--text-secondary, #a7b5c4);
  border:1px dashed rgba(96, 192, 240, 0.24);border-radius:12px;background:rgba(255, 255, 255, 0.035);padding:18px;
`;
