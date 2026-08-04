/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ SwanTermsIndex — "what the numbers mean".                   │
 * │ The logger prints PR, RPE, 1RM, ecc/iso/con everywhere and  │
 * │ explained none of them (Sean, 2026-07-31). This is the ONE  │
 * │ index: searchable by abbreviation OR by plain English, so   │
 * │ you can look a concept up without knowing its shorthand.    │
 * │ Lives in the Coach drawer's Reference tab — two taps from   │
 * │ anywhere in the session, lazy-mounted like the rest of the  │
 * │ reference content.                                          │
 * └─────────────────────────────────────────────────────────────┘
 */
import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Search } from 'lucide-react';
import { SWAN_TERMS, TERM_GROUPS, type SwanTerm } from './SwanTermsIndex.terms';

const Wrap = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: var(--text-primary, #e0ecf4);
`;

const Title = styled.h3`
  margin: 0;
  font: 700 1rem 'Plus Jakarta Sans', sans-serif;
`;

const Lede = styled.p`
  margin: 0;
  font: 400 0.82rem 'Sora', sans-serif;
  color: var(--text-muted, #94a3b8);
`;

const SearchRow = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  svg {
    position: absolute;
    left: 10px;
    color: var(--text-muted, #94a3b8);
    pointer-events: none;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 0 12px 0 34px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--text-primary, #e0ecf4) 16%, transparent);
  background: var(--bg-base, #030712);
  color: var(--text-primary, #e0ecf4);
  font: 400 0.85rem 'Sora', sans-serif;

  &::placeholder { color: var(--text-muted, #94a3b8); }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8b5cf6);
    outline-offset: 2px;
  }
`;

const GroupLabel = styled.h4`
  margin: 6px 0 0;
  font: 700 0.7rem 'Sora', sans-serif;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted, #94a3b8);
`;

const Entry = styled.div`
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--text-primary, #e0ecf4) 10%, transparent);
  background: color-mix(in srgb, var(--card-dark, #141419) 70%, transparent);
`;

const TermRow = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
`;

const Term = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--world-accent, #60c0f0);
`;

const Expands = styled.span`
  font: 600 0.82rem 'Sora', sans-serif;
  color: var(--text-primary, #e0ecf4);
`;

const Meaning = styled.p`
  margin: 6px 0 0;
  font: 400 0.82rem 'Sora', sans-serif;
  line-height: 1.5;
  color: var(--text-primary, #e0ecf4);
`;

const HowTo = styled.p`
  margin: 6px 0 0;
  padding-left: 10px;
  border-left: 2px solid color-mix(in srgb, var(--world-accent, #60c0f0) 45%, transparent);
  font: 400 0.78rem 'Sora', sans-serif;
  line-height: 1.5;
  color: var(--text-muted, #94a3b8);
`;

const Empty = styled.p`
  margin: 0;
  font: 400 0.82rem 'Sora', sans-serif;
  color: var(--text-muted, #94a3b8);
`;

const matches = (entry: SwanTerm, query: string): boolean => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    entry.term.toLowerCase().includes(needle)
    || entry.expands.toLowerCase().includes(needle)
    || entry.meaning.toLowerCase().includes(needle)
    || (entry.howToUse?.toLowerCase().includes(needle) ?? false)
  );
};

export interface SwanTermsIndexProps {
  /** Pre-filter, so a term can deep-link straight to its entry. */
  initialQuery?: string;
}

const SwanTermsIndex: React.FC<SwanTermsIndexProps> = ({ initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);

  const visible = useMemo(
    () => SWAN_TERMS.filter((entry) => matches(entry, query)),
    [query],
  );

  return (
    <Wrap aria-label='Swan terms index'>
      <Title>What the numbers mean</Title>
      <Lede>Every abbreviation the logger shows you, in plain English. Search a shorthand (RPE) or the idea behind it (&ldquo;how hard was that set&rdquo;).</Lede>

      <SearchRow>
        <Search size={16} aria-hidden='true' />
        <SearchInput
          type='search'
          role='searchbox'
          aria-label='Search terms'
          placeholder='Search terms — PR, tempo, pain…'
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </SearchRow>

      {visible.length === 0 ? (
        <Empty>No term matches &ldquo;{query.trim()}&rdquo;. Try RPE, PR, tempo, or pain.</Empty>
      ) : (
        TERM_GROUPS.map((group) => {
          const entries = visible.filter((entry) => entry.group === group);
          if (entries.length === 0) return null;
          return (
            <React.Fragment key={group}>
              <GroupLabel>{group}</GroupLabel>
              {entries.map((entry) => (
                <Entry key={entry.term}>
                  <TermRow>
                    <Term>{entry.term}</Term>
                    <Expands>{entry.expands}</Expands>
                  </TermRow>
                  <Meaning>{entry.meaning}</Meaning>
                  {entry.howToUse && <HowTo>{entry.howToUse}</HowTo>}
                </Entry>
              ))}
            </React.Fragment>
          );
        })
      )}
    </Wrap>
  );
};

export default SwanTermsIndex;
