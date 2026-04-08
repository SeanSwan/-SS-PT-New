/**
 * ┌─── COMPONENT: StyleBrowser ────────────────────────────────┐
 * │ PURPOSE: Grid of curated art styles for badge generation.  │
 * │ 40 styles across 8 categories from MidLibrary.io research. │
 * └────────────────────────────────────────────────────────────┘
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { Palette } from 'lucide-react';

const Wrapper = styled.div`
  margin-bottom: 20px;
`;

const CategoryTabs = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
`;

const CatTab = styled.button<{ $active: boolean }>`
  min-height: 36px;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'rgba(96, 192, 240, 0.08)'};
  background: ${({ $active }) => $active ? 'rgba(96, 192, 240, 0.1)' : 'transparent'};
  color: ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, rgba(224, 236, 244, 0.85))'};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover { border-color: var(--accent-primary, #60C0F0); }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
`;

const StyleCard = styled.button<{ $selected: boolean }>`
  padding: 12px;
  border-radius: 10px;
  border: 2px solid ${({ $selected }) => $selected ? 'var(--accent-secondary, #8B5CF6)' : 'rgba(96, 192, 240, 0.08)'};
  background: ${({ $selected }) => $selected ? 'rgba(139, 92, 246, 0.08)' : 'var(--bg-elevated, #141419)'};
  cursor: pointer;
  text-align: center;
  transition: all 0.15s;
  min-height: 44px;

  &:hover { border-color: var(--accent-secondary, #8B5CF6); }
`;

const StyleIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(96, 192, 240, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 6px;
  color: var(--accent-primary, #60C0F0);
`;

const StyleName = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

export interface ArtStyle {
  id: string;
  name: string;
  category: string;
  promptModifier: string;
}

interface StyleBrowserProps {
  styles: ArtStyle[];
  selectedId: string | null;
  onSelect: (style: ArtStyle) => void;
}

const StyleBrowser: React.FC<StyleBrowserProps> = ({ styles, selectedId, onSelect }) => {
  const [category, setCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(styles.map(s => s.category)))];
  const filtered = category === 'All' ? styles : styles.filter(s => s.category === category);

  return (
    <Wrapper>
      <CategoryTabs>
        {categories.map(cat => (
          <CatTab key={cat} $active={category === cat} onClick={() => setCategory(cat)}>
            {cat}
          </CatTab>
        ))}
      </CategoryTabs>

      <Grid>
        {filtered.map(style => (
          <StyleCard
            key={style.id}
            $selected={selectedId === style.id}
            onClick={() => onSelect(style)}
            title={style.promptModifier}
          >
            <StyleIcon><Palette size={16} /></StyleIcon>
            <StyleName>{style.name}</StyleName>
          </StyleCard>
        ))}
      </Grid>
    </Wrapper>
  );
};

export default StyleBrowser;
