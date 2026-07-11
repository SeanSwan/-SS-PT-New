import styled from 'styled-components';

export const InsightShell = styled.section`
  margin: 0 0 16px;
  padding: 14px 15px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 70%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
`;

export const InsightHeading = styled.strong`
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--accent-primary, #60C0F0);
  font-size: 13px;
  font-weight: 800;
`;

export const InsightCopy = styled.p`
  margin: 8px 0 12px;
  color: var(--text-secondary, #A8B7C7);
  font-size: 13px;
  line-height: 1.5;
`;

export const InsightMeta = styled.small`
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  border-radius: 999px;
  padding: 3px 10px;
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 24%, transparent);
  font-size: 12px;
  font-weight: 700;
`;
