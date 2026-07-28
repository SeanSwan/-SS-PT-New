/**
 * SocialNotificationsPanel shared shell/header/card styles.
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

export const Stack = styled.div`
  display: grid;
  gap: 12px;
`;

export const NotificationRow = styled.article<{ $unread: boolean }>`
  position: relative;
  display: grid;
  grid-template-columns: 5px minmax(0, 1fr);
  min-height: 92px;
  width: 100%;
  overflow: hidden;
  border: 1px solid ${({ $unread }) =>
    $unread
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent)'
      : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent)'};
  border-radius: 8px;
  background: ${({ $unread }) =>
    $unread
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 9%, var(--bg-card, #141419))'
      : 'color-mix(in srgb, var(--bg-card, #141419) 92%, transparent)'};
  color: inherit;
`;

export const StatusRail = styled.span<{ $unread: boolean }>`
  background: ${({ $unread }) =>
    $unread ? 'var(--accent-primary, #60C0F0)' : 'color-mix(in srgb, var(--text-muted, #4070C0) 38%, transparent)'};
`;

export const NotificationCopy = styled.div`
  display: grid;
  gap: 12px;
  padding: 14px 16px 16px;
  min-width: 0;
`;

export const NotificationOpenButton = styled.button`
  display: grid;
  width: 100%;
  min-height: 44px;
  gap: 8px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 0;
  text-align: left;
`;

export const NotificationActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

export const NotificationActionButton = styled.button`
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-luxury, #C6A84B) 34%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-luxury, #C6A84B) 12%, var(--bg-card, #141419));
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font: 700 0.82rem/1 'Sora', sans-serif;
  padding: 0 14px;
`;

export const MetaRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
`;

export const TypePill = styled.span`
  color: var(--accent-primary, #60C0F0);
  font: 700 0.7rem/1 'Fira Code', monospace;
  text-transform: uppercase;
`;

export const TimeText = styled.span`
  color: var(--text-muted, #4070C0);
  font: 600 0.72rem/1 'Sora', sans-serif;
`;

export const NotificationTitle = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font: 700 1rem/1.2 'Plus Jakarta Sans', sans-serif;
`;

export const NotificationMessage = styled.p`
  margin: 0;
  color: var(--text-secondary, #B7C7D8);
  font: 400 0.9rem/1.45 'Sora', sans-serif;
`;

export const SenderText = styled.span`
  color: var(--accent-luxury, #C6A84B);
  font: 600 0.78rem/1 'Sora', sans-serif;
`;

export const StateBlock = styled.div`
  display: grid;
  justify-items: center;
  gap: 10px;
  min-height: 220px;
  align-content: center;
  text-align: center;
  border: 1px dashed color-mix(in srgb, var(--accent-secondary, #8B5CF6) 26%, transparent);
  border-radius: 8px;
  padding: 26px;
`;

export const StateTitle = styled.h3`
  margin: 0;
  font: 700 1.15rem/1.2 'Plus Jakarta Sans', sans-serif;
`;

export const StateText = styled.p`
  max-width: 32rem;
  margin: 0;
  color: var(--text-secondary, #B7C7D8);
  font: 400 0.9rem/1.5 'Sora', sans-serif;
`;

export const SkeletonRow = styled.div`
  min-height: 92px;
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent),
    color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent),
    color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)
  );
`;
