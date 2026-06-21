/**
 * COMPONENT: StyleBrowser
 * PURPOSE: Filters and selects curated badge art styles.
 */

import React, { useState } from 'react';
import { Palette } from 'lucide-react';
import {
  CatTab,
  CategoryTabs,
  Grid,
  StyleCard,
  StyleIcon,
  StyleName,
  Wrapper,
} from './StyleBrowser.styles';

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
  const categories = ['All', ...Array.from(new Set(styles.map(style => style.category)))];
  const filtered = category === 'All' ? styles : styles.filter(style => style.category === category);

  return (
    <Wrapper>
      <CategoryTabs>
        {categories.map(cat => (
          <CatTab
            key={cat}
            type="button"
            $active={category === cat}
            aria-pressed={category === cat}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </CatTab>
        ))}
      </CategoryTabs>

      <Grid>
        {filtered.map(style => (
          <StyleCard
            key={style.id}
            type="button"
            $selected={selectedId === style.id}
            aria-pressed={selectedId === style.id}
            onClick={() => onSelect(style)}
            title={style.promptModifier}
          >
            <StyleIcon><Palette size={16} aria-hidden="true" /></StyleIcon>
            <StyleName>{style.name}</StyleName>
          </StyleCard>
        ))}
      </Grid>
    </Wrapper>
  );
};

export default StyleBrowser;
