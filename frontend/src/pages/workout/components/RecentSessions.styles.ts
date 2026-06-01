import styled from 'styled-components';

interface StatusProps {
  status: string;
}

const statusTone = (status: string) => {
  switch (status) {
    case 'completed':
      return { bg: 'rgba(114, 214, 160, 0.16)', fg: 'var(--success, #72d6a0)' };
    case 'in_progress':
      return { bg: 'rgba(198, 168, 75, 0.16)', fg: 'var(--accent-gold, #c6a84b)' };
    case 'cancelled':
    case 'skipped':
      return { bg: 'rgba(255, 107, 122, 0.16)', fg: 'var(--danger, #ff6b7a)' };
    default:
      return { bg: 'rgba(96, 192, 240, 0.14)', fg: 'var(--accent-primary, #60c0f0)' };
  }
};

export const SessionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  color: var(--text-primary, #e0ecf4);
`;

export const StateMessage = styled.div`
  display: grid;
  min-height: 220px;
  place-items: center;
  padding: 1.25rem;
  color: rgba(224, 236, 244, 0.72);
  text-align: center;
`;

export const ErrorMessage = styled(StateMessage)`
  color: var(--danger-text, #ffb4b4);
`;

export const ListHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1.25rem;

  h2 {
    margin: 0;
    font-size: 1.25rem;
  }

  @media (max-width: 768px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export const FilterContainer = styled.label`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  min-height: 44px;
  font-weight: 700;
`;

export const StatusFilter = styled.select`
  min-height: 44px;
  padding: 0.55rem 0.75rem;
  background: rgba(10, 10, 15, 0.72);
  border: 1px solid rgba(224, 236, 244, 0.16);
  border-radius: 8px;
  color: var(--text-primary, #e0ecf4);

  &:focus-visible {
    border-color: var(--accent-primary, #60c0f0);
    outline: none;
  }
`;

export const SessionsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  gap: 1rem;
`;

export const SessionCard = styled.article`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: rgba(20, 20, 25, 0.88);
  border: 1px solid rgba(224, 236, 244, 0.1);
  border-radius: 8px;
`;

export const SessionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid rgba(224, 236, 244, 0.1);
`;

export const SessionStatus = styled.span<StatusProps>`
  padding: 0.3rem 0.55rem;
  background: ${({ status }) => statusTone(status).bg};
  border-radius: 999px;
  color: ${({ status }) => statusTone(status).fg};
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
`;

export const SessionTitle = styled.h3`
  margin: 0;
  padding: 1rem 1rem 0.45rem;
  font-size: 1.05rem;
`;

export const SessionDetails = styled.div`
  display: grid;
  gap: 0.45rem;
  padding: 0 1rem 1rem;
`;

export const DetailItem = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.9rem;
`;

export const MutedLabel = styled.span`
  color: rgba(224, 236, 244, 0.64);
`;

export const StrongValue = styled.span`
  color: var(--text-primary, #e0ecf4);
  font-weight: 700;
`;

export const CardActions = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 0.9rem 1rem 1rem;
  margin-top: auto;
`;

export const ActionButton = styled.button`
  min-height: 44px;
  flex: 1;
  padding: 0.55rem 0.8rem;
  background: rgba(96, 192, 240, 0.14);
  border: 1px solid rgba(96, 192, 240, 0.34);
  border-radius: 8px;
  color: var(--accent-primary, #60c0f0);
  cursor: pointer;
  font-weight: 800;

  &:hover,
  &:focus-visible {
    background: rgba(139, 92, 246, 0.18);
    outline: none;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.48;
  }
`;

export const Pagination = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  align-items: center;
  margin-top: 1.25rem;
`;

export const DetailView = styled.div`
  display: grid;
  gap: 1rem;
`;

export const DetailHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
`;

export const DetailTitle = styled.h2`
  margin: 0;
  font-size: 1.4rem;
`;

export const DetailMeta = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(20, 20, 25, 0.84);
  border: 1px solid rgba(224, 236, 244, 0.1);
  border-radius: 8px;
`;

export const Panel = styled.section`
  padding: 1rem;
  background: rgba(20, 20, 25, 0.84);
  border: 1px solid rgba(224, 236, 244, 0.1);
  border-radius: 8px;
`;

export const ExerciseTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 0.75rem;
    border-bottom: 1px solid rgba(224, 236, 244, 0.1);
    text-align: left;
  }
`;
