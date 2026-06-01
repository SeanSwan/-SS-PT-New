/**
 * Admin sessions shell and card styles.
 * Extracted from the canonical sessions view to keep layout tokens reusable.
 */
import styled from 'styled-components';
import { executiveTheme } from './AdminSessionsTheme.styles';

export const PageContainer = styled.div`
  position: relative;
  overflow-x: hidden;
  background:
    radial-gradient(ellipse at top right, color-mix(in srgb, ${executiveTheme.stellarAuthority} 14%, transparent) 0%, transparent 42%),
    radial-gradient(ellipse at bottom left, color-mix(in srgb, ${executiveTheme.cyberIntelligence} 10%, transparent) 0%, transparent 38%),
    linear-gradient(180deg, ${executiveTheme.deepSpace} 0%, ${executiveTheme.commandNavy} 100%);
  color: ${executiveTheme.stellarWhite};
  min-height: 100vh;
`;

export const ContentContainer = styled.div`
  position: relative;
  z-index: 1;
  padding: 1rem;
  max-width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  width: 100%;
`;

export const StyledCard = styled.div`
  border-radius: 15px;
  overflow: hidden;
  background: color-mix(in srgb, var(--bg-elevated, #141419) 82%, transparent);
  backdrop-filter: blur(10px);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
  box-shadow: 0 8px 32px color-mix(in srgb, var(--bg-base, #0A0A0F) 38%, transparent);

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 20px 40px color-mix(in srgb, var(--bg-base, #0A0A0F) 44%, transparent);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  }
`;

export const CardHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
`;

export const CardTitle = styled.h2`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 1.8rem;
  font-weight: 300;
  text-shadow: 0 0 10px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 26%, transparent);
`;

export const CardContent = styled.div`
  padding: 1.5rem;
`;
