import styled from 'styled-components';

export const WorkspaceShell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  color: var(--text-primary, #E0ECF4);
`;

export const WorkspaceHeader = styled.header`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.2));
  border-radius: 8px;
  background: var(--plaud-workspace-header-bg,
    linear-gradient(135deg, rgba(0, 32, 96, 0.45), rgba(20, 20, 25, 0.82)),
    var(--surface-base, #141419));

  @media (min-width: 900px) {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    padding: 1.25rem;
  }
`;

export const HeaderCopy = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;

  h1 {
    margin: 0;
    font-family: 'Plus Jakarta Sans', 'Sora', system-ui, sans-serif;
    font-size: 1.55rem;
    line-height: 1.12;
    font-weight: 800;
    letter-spacing: 0;
  }

  p {
    margin: 0;
    max-width: 760px;
    color: var(--text-secondary, rgba(224, 236, 244, 0.76));
    line-height: 1.5;
  }
`;

export const Eyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--accent-primary, #60C0F0);
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
`;

export const HeaderActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;

  @media (min-width: 900px) {
    justify-content: flex-end;
  }
`;

export const ActionButton = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0 0.95rem;
  border-radius: 8px;
  border: 1px solid ${({ $primary }) =>
    $primary ? 'var(--border-cyan-strong, rgba(96, 192, 240, 0.55))' : 'var(--border-purple-soft, rgba(139, 92, 246, 0.35))'};
  background: ${({ $primary }) =>
    $primary ? 'var(--bg-primary, #002060)' : 'var(--surface-purple-subtle, rgba(139, 92, 246, 0.1))'};
  color: var(--text-primary, #E0ECF4);
  font-weight: 800;
  cursor: pointer;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;

  &:hover {
    border-color: ${({ $primary }) =>
      $primary ? 'var(--accent-secondary, #8B5CF6)' : 'var(--accent-primary, #60C0F0)'};
    box-shadow: ${({ $primary }) =>
      $primary ? 'var(--shadow-purple-soft, 0 0 18px rgba(139, 92, 246, 0.34))' : 'var(--shadow-cyan-soft, 0 0 16px rgba(96, 192, 240, 0.22))'};
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const CommandRail = styled.section`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;

  @media (min-width: 900px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

export const CommandTile = styled.div`
  display: flex;
  gap: 0.75rem;
  min-height: 86px;
  padding: 0.875rem;
  border: 1px solid var(--border-muted, rgba(224, 236, 244, 0.08));
  border-radius: 8px;
  background: var(--surface-base, rgba(20, 20, 25, 0.7));

  svg {
    flex: 0 0 auto;
    color: var(--accent-primary, #60C0F0);
  }

  strong {
    display: block;
    margin-bottom: 0.25rem;
    color: var(--text-primary, #E0ECF4);
    font-size: 0.92rem;
  }

  span {
    color: var(--text-secondary, rgba(224, 236, 244, 0.72));
    font-size: 0.82rem;
    line-height: 1.45;
  }
`;

export const WorkspaceBody = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;

  @media (min-width: 1200px) {
    grid-template-columns: minmax(0, 1fr) 340px;
    align-items: start;
  }
`;

export const PrimaryPane = styled.section`
  min-width: 0;
`;

export const CoachPane = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding: 1rem;
  border: 1px solid var(--border-purple-soft, rgba(139, 92, 246, 0.24));
  border-radius: 8px;
  background: var(--surface-elevated, rgba(26, 26, 36, 0.68));
`;

export const PaneTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 900;
  color: var(--text-primary, #E0ECF4);

  svg {
    color: var(--accent-secondary, #8B5CF6);
  }
`;

export const ActionList = styled.ul`
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const ActionItem = styled.li`
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 0.55rem;
  align-items: start;
  padding: 0.625rem;
  border-radius: 8px;
  background: var(--surface-recessed, rgba(10, 10, 15, 0.38));
  color: var(--text-secondary, rgba(224, 236, 244, 0.76));
  font-size: 0.84rem;
  line-height: 1.45;

  svg {
    color: var(--accent-primary, #60C0F0);
    margin-top: 0.08rem;
  }

  strong {
    display: block;
    color: var(--text-primary, #E0ECF4);
    font-size: 0.86rem;
  }
`;

export const ActionStatus = styled.em`
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  margin: 0.18rem 0 0.28rem;
  padding: 0 0.45rem;
  border-radius: 999px;
  border: 1px solid var(--border-cyan-soft, rgba(96, 192, 240, 0.28));
  color: var(--accent-primary, #60C0F0);
  font-size: 0.68rem;
  font-style: normal;
  font-weight: 800;
  text-transform: uppercase;
`;
