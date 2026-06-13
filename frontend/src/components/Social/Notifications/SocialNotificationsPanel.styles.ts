/**
 * SocialNotificationsPanel shared shell/header styles.
 *
 * Keeps the notifications component under the project line cap while preserving
 * the container-aware header behavior used inside the dashboard observatory.
 */
import styled from 'styled-components';

export const PanelShell = styled.section`
  width: 100%;
  container-type: inline-size;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent);
  border-radius: 8px;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--surface-primary, #003080) 72%, transparent),
      color-mix(in srgb, var(--bg-base, #0A0A0F) 88%, transparent)
    ),
    var(--bg-elevated, #003080);
  padding: clamp(18px, 3vw, 28px);
  color: var(--text-primary, #E0ECF4);
`;

export const PanelHeader = styled.header`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;

  @media (max-width: 680px) {
    flex-direction: column;
  }
`;

export const TitleBlock = styled.div`
  display: grid;
  flex: 1 1 15rem;
  gap: 6px;
  min-width: 0;
`;

export const Kicker = styled.span`
  color: var(--accent-luxury, #C6A84B);
  font: 700 0.72rem/1 'Fira Code', monospace;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const PanelTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font: 700 clamp(1.35rem, 3vw, 2rem)/1.1 'Plus Jakarta Sans', sans-serif;
  overflow-wrap: anywhere;
`;

export const HeaderActions = styled.div`
  display: flex;
  flex: 1 1 14rem;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;

  @container (max-width: 540px) {
    justify-content: flex-start;
    width: 100%;
  }
`;

export const UnreadPill = styled.span`
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  border: 1px solid color-mix(in srgb, var(--accent-luxury, #C6A84B) 34%, transparent);
  border-radius: 999px;
  padding: 0 12px;
  color: var(--accent-luxury, #C6A84B);
  font: 700 0.78rem/1 'Fira Code', monospace;
`;

export const ActionButton = styled.button`
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface-primary, #003080) 68%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font: 700 0.82rem/1 'Sora', sans-serif;
  padding: 0 14px;
`;
export const IconButton = styled(ActionButton)`
  width: 44px;
  justify-content: center;
  padding: 0;
`;
