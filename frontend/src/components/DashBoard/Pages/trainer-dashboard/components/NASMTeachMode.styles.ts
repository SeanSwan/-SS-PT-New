import styled from 'styled-components';

export const TeachContainer = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
`;

export const TeachHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  color: var(--accent-secondary, #8B5CF6);
  flex-wrap: wrap;
`;

export const TeachTitle = styled.h3`
  font-family: 'Sora', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  flex: 1;
`;

export const ExpandControls = styled.div`
  display: flex;
  gap: 8px;
`;

export const ExpandBtn = styled.button`
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  background: var(--bg-surface, #1A1A24);
  color: var(--text-secondary, rgba(224,236,244,0.6));
  font-size: 0.7rem;
  cursor: pointer;
  min-height: 44px;
  &:hover { border-color: var(--accent-primary, #60C0F0); color: var(--text-primary, #E0ECF4); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const AccordionItem = styled.div`
  border: 1px solid var(--border-soft, rgba(96,192,240,0.08));
  border-radius: 8px;
  margin-bottom: 6px;
  overflow: hidden;
`;

export const AccordionHeader = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  border: 0;
  padding: 12px 16px;
  cursor: pointer;
  min-height: 48px;
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.85rem;
  font-weight: 600;
  text-align: left;
  transition: background 0.2s;
  &:hover { background: rgba(96, 192, 240, 0.05); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: -2px; }
`;

export const AccordionLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--accent-primary, #60C0F0);
  span { color: var(--text-primary, #E0ECF4); }
`;

export const AccordionBody = styled.div`
  padding: 16px;
  font-size: 0.82rem;
  line-height: 1.6;
  color: var(--text-secondary, rgba(224,236,244,0.7));
`;

export const BulletList = styled.ul`
  margin: 8px 0;
  padding-left: 20px;
  li { margin-bottom: 4px; }
`;

export const StepList = styled.ol`
  margin: 8px 0;
  padding-left: 20px;
  li { margin-bottom: 6px; }
  strong { color: var(--text-primary, #E0ECF4); }
`;

export const ClientScript = styled.div`
  background: rgba(139, 92, 246, 0.08);
  border-left: 3px solid var(--accent-secondary, #8B5CF6);
  border-radius: 0 8px 8px 0;
  padding: 14px 16px;
  margin: 10px 0;
  font-style: italic;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.85rem;
  line-height: 1.6;
`;

export const ScriptNote = styled.div`
  font-style: normal;
  font-weight: 600;
  color: var(--accent-gold, #C6A84B);
  margin-top: 10px;
  font-size: 0.8rem;
`;

export const CompensationTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;
  font-size: 0.78rem;

  th {
    text-align: left;
    padding: 8px 10px;
    background: var(--bg-surface, #1A1A24);
    color: var(--accent-primary, #60C0F0);
    font-weight: 600;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--border-soft, rgba(96,192,240,0.15));
  }

  td {
    padding: 8px 10px;
    border-bottom: 1px solid var(--border-soft, rgba(96,192,240,0.06));
    vertical-align: top;
  }

  tr:hover td { background: rgba(96, 192, 240, 0.03); }
`;

export const InfoBox = styled.div`
  background: rgba(96, 192, 240, 0.06);
  border: 1px solid rgba(96, 192, 240, 0.12);
  border-radius: 8px;
  padding: 12px 16px;
  margin: 10px 0;
  font-size: 0.82rem;
  line-height: 1.6;
  strong { color: var(--text-primary, #E0ECF4); }
`;

export const TwoColumn = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 10px 0;
  @media (max-width: 600px) { grid-template-columns: 1fr; }
`;

export const SubLabel = styled.div`
  font-weight: 700;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  color: var(--accent-primary, #60C0F0);
`;
