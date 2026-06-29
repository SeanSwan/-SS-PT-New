import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { ClipboardList, Leaf, ShoppingBasket, Sprout } from 'lucide-react';

const Panel = styled.section`
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(96, 192, 240, 0.14);
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(0, 32, 96, 0.18), rgba(20, 20, 25, 0.72));
`;

const Header = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  color: var(--text-primary, #E0ECF4);
`;

const Title = styled.h4`
  margin: 0;
  font-size: 14px;
`;

const Copy = styled.p`
  margin: 2px 0 0;
  color: var(--text-muted, rgba(224, 236, 244, 0.58));
  font-size: 12px;
  line-height: 1.5;
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Chip = styled.span`
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(96, 192, 240, 0.08);
  color: var(--accent-primary, #60C0F0);
  font-size: 12px;
  font-weight: 700;
`;

const QuestionList = styled.ul`
  margin: 0;
  padding-left: 18px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-size: 12px;
  line-height: 1.55;
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  min-width: 44px;
  border: 1px solid rgba(96, 192, 240, 0.22);
  border-radius: 10px;
  background: rgba(96, 192, 240, 0.08);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
  padding: 8px 12px;
`;

const Status = styled.div`
  color: var(--accent-gold, #C6A84B);
  font-size: 12px;
`;

const FARMER_QUESTIONS = [
  'Do you use synthetic pesticides?',
  'Are you certified organic or using organic practices?',
  'Do you grow this yourself or resell it?',
  'Do you use bioengineered/GMO seeds?',
  'Is this in season locally?',
];

interface LocalFoodActionPanelProps {
  title: string;
  subtitle: string;
  products?: string[];
  sourceNote: string;
  contextType: 'market' | 'garden';
}

const LocalFoodActionPanel: React.FC<LocalFoodActionPanelProps> = ({ title, subtitle, products = [], sourceNote, contextType }) => {
  const [status, setStatus] = useState<string | null>(null);
  const visibleProducts = useMemo(() => products.filter(Boolean).slice(0, 10), [products]);
  const contextText = `${title}\n${subtitle}\n${visibleProducts.join(', ')}\n${sourceNote}`;

  const dispatchContext = (intent: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nutrition:local-food-context', {
        detail: { intent, contextType, products: visibleProducts, sourceNote },
      }));
    }
    setStatus(`${intent} context prepared for this nutrition session.`);
  };

  const copyContext = async () => {
    try {
      await navigator.clipboard?.writeText(contextText);
      setStatus('Local food context copied.');
    } catch {
      dispatchContext('Copy');
    }
  };

  return (
    <Panel>
      <Header>
        {contextType === 'garden' ? <Sprout size={20} /> : <ShoppingBasket size={20} />}
        <div>
          <Title>{title}</Title>
          <Copy>{subtitle}</Copy>
        </div>
      </Header>
      {visibleProducts.length > 0 && (
        <ChipRow>{visibleProducts.map((product) => <Chip key={product}>{product}</Chip>)}</ChipRow>
      )}
      <QuestionList>
        {FARMER_QUESTIONS.map((question) => <li key={question}>{question}</li>)}
      </QuestionList>
      <Copy>{sourceNote}</Copy>
      <ButtonRow>
        <ActionButton type="button" onClick={copyContext}><ClipboardList size={14} />Copy context</ActionButton>
        <ActionButton type="button" onClick={() => dispatchContext('Meal plan')}><Leaf size={14} />Use in meal plan</ActionButton>
        <ActionButton type="button" onClick={() => dispatchContext('Garden handoff')}><Sprout size={14} />Grow this instead</ActionButton>
      </ButtonRow>
      {status && <Status>{status}</Status>}
    </Panel>
  );
};

export default LocalFoodActionPanel;
