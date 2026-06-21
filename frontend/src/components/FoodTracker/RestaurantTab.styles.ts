import styled from 'styled-components';

export const Wrapper = styled.div`
  display: flex; flex-direction: column; gap: 16px;
  @keyframes restaurant-spin { to { transform: rotate(360deg); } }
  .spin { animation: restaurant-spin 0.8s linear infinite; }
  @media (prefers-reduced-motion: reduce) {
    .spin { animation: none; }
  }
`;

export const Header = styled.div`display: flex; align-items: center; gap: 12px;`;

export const Title = styled.h3`
  margin: 0; color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.1rem; font-weight: 700;
`;

export const Subtitle = styled.p`
  margin: 2px 0 0; color: var(--text-secondary, rgba(224,236,244,0.6)); font-size: 0.8rem;
`;

export const SearchRow = styled.div`display: flex; gap: 8px;`;

export const SearchInput = styled.input`
  flex: 1; min-height: 48px; padding: 12px 16px; border-radius: 12px;
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  background: var(--bg-surface, #1A1A24); color: var(--text-primary, #E0ECF4);
  font-size: 16px; outline: none; transition: border-color 0.2s, box-shadow 0.2s;
  &::placeholder { color: var(--text-muted, rgba(224,236,244,0.4)); }
  &:focus { border-color: var(--accent-primary, #60C0F0); box-shadow: 0 0 0 1px var(--accent-primary, #60C0F0); }
`;

export const SearchBtn = styled.button`
  display: flex; align-items: center; justify-content: center; min-width: 48px; min-height: 48px;
  border: none; border-radius: 12px; background: var(--accent-secondary, #8B5CF6);
  color: var(--text-primary, #E0ECF4); cursor: pointer;
  box-shadow: 0 0 12px color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  transition: opacity 0.2s, box-shadow 0.2s;
  &:hover:not(:disabled) { box-shadow: 0 0 20px color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent); }
  &:disabled { cursor: not-allowed; opacity: 0.5; }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const QuickSection = styled.div``;

export const ChipRow = styled.div`
  display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;
`;

export const Chip = styled.button`
  min-height: 44px; padding: 8px 14px; border-radius: 20px;
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  background: var(--bg-surface, #1A1A24); color: var(--text-secondary, rgba(224,236,244,0.7));
  cursor: pointer; font-size: 0.8rem; transition: background 0.2s, border-color 0.2s, color 0.2s;
  &:hover { border-color: var(--accent-primary, #60C0F0); background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent); color: var(--text-primary, #E0ECF4); }
  &:focus-visible { outline: 2px solid var(--arctic-cyan, #50A0F0); outline-offset: 2px; }
`;

export const SectionLabel = styled.div`
  display: flex; align-items: center; gap: 6px; margin-bottom: 8px;
  color: var(--text-secondary, rgba(224,236,244,0.6));
  font-size: 0.75rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;
`;

export const InfoBox = styled.div`
  display: flex; align-items: flex-start; gap: 10px; padding: 14px 16px; border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  color: var(--text-primary, #E0ECF4); font-size: 0.85rem; line-height: 1.5;
  code { padding: 2px 5px; border-radius: 4px; background: color-mix(in srgb, var(--obsidian-black, #0A0A0F) 55%, transparent); font-size: 0.8em; }
`;

export const ErrorBox = styled.div`
  display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--danger, #C92A54) 25%, transparent);
  background: color-mix(in srgb, var(--danger, #C92A54) 10%, transparent);
  color: var(--text-primary, #E0ECF4); font-size: 0.85rem;
`;

export const LoadingBox = styled.div`
  display: flex; align-items: center; justify-content: center; gap: 10px; padding: 20px;
  color: var(--text-secondary, rgba(224,236,244,0.6)); font-size: 0.9rem;
`;

export const ResultSection = styled.div`display: flex; flex-direction: column;`;

export const ResultCard = styled.button`
  display: flex; align-items: center; gap: 12px; width: 100%; min-height: 64px; margin-bottom: 6px;
  padding: 14px 16px; border-radius: 10px; text-align: left; cursor: pointer;
  border: 1px solid var(--border-soft, rgba(96,192,240,0.08));
  background: var(--bg-elevated, #141419);
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
  &:hover { border-color: var(--accent-primary, #60C0F0); box-shadow: 0 4px 12px color-mix(in srgb, var(--obsidian-black, #0A0A0F) 45%, transparent); transform: translateY(-1px); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const ResultInfo = styled.div`flex: 1; min-width: 0;`;
export const ResultName = styled.div`
  overflow: hidden; color: var(--text-primary, #E0ECF4); font-size: 0.9rem; font-weight: 600;
  text-overflow: ellipsis; white-space: nowrap;
`;
export const ResultMeta = styled.div`
  margin-top: 2px; color: var(--text-secondary, rgba(224,236,244,0.7)); font-size: 0.75rem;
`;
export const ResultMacros = styled.div`
  display: flex; flex-shrink: 0; gap: 8px; color: var(--text-secondary, rgba(224,236,244,0.7));
  font-family: 'Fira Code', monospace; font-size: 0.75rem;
`;

export const Brand = styled.span`margin-right: 6px; color: var(--accent-primary, #60C0F0);`;

export const DetailCard = styled.div`
  padding: 20px; border-radius: 14px; background: var(--bg-elevated, #141419); will-change: transform;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  box-shadow: 0 8px 32px color-mix(in srgb, var(--obsidian-black, #0A0A0F) 55%, transparent);
`;
export const DetailHeader = styled.div`margin-bottom: 16px;`;
export const DetailName = styled.h4`
  margin: 0; color: var(--text-primary, #E0ECF4); font-size: 1.1rem; font-weight: 700;
`;
export const DetailServing = styled.p`
  margin: 4px 0 0; color: var(--text-secondary, rgba(224,236,244,0.6)); font-size: 0.8rem;
`;

export const MacroGrid = styled.div`
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 14px;
`;
export const MacroCell = styled.div<{ $accent: string }>`
  padding: 10px 6px; border-radius: 10px; text-align: center;
  border: 1px solid color-mix(in srgb, ${({ $accent }) => $accent} 15%, transparent);
  background: color-mix(in srgb, ${({ $accent }) => $accent} 8%, transparent);
`;
export const MacroVal = styled.div`
  color: var(--text-primary, #E0ECF4); font-family: 'Fira Code', monospace; font-size: 1rem; font-weight: 700;
`;
export const MacroLbl = styled.div`
  margin-top: 2px; color: var(--text-secondary, rgba(224,236,244,0.7));
  font-size: 0.65rem; letter-spacing: 0.05em; text-transform: uppercase;
`;

export const MicroRow = styled.div`display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px;`;
export const MicroItem = styled.span`
  padding: 4px 8px; border-radius: 6px; background: var(--bg-surface, #1A1A24);
  color: var(--text-secondary, rgba(224,236,244,0.7)); font-family: 'Fira Code', monospace; font-size: 0.75rem;
`;

export const ServingList = styled.div`margin-bottom: 14px;`;
export const ServingItem = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 0;
  border-bottom: 1px solid var(--border-soft, rgba(96,192,240,0.06));
  color: var(--text-primary, #E0ECF4); font-size: 0.8rem;
  &:last-child { border-bottom: none; }
`;
export const ServingMacros = styled.span`
  flex-shrink: 0; color: var(--text-secondary, rgba(224,236,244,0.7));
  font-family: 'Fira Code', monospace; font-size: 0.75rem;
`;

export const DetailActions = styled.div`display: flex; flex-direction: column; gap: 10px; margin-top: 4px;`;

export const AddBtn = styled.button`
  display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 48px;
  padding: 12px 16px; border: none; border-radius: 12px;
  background: linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0));
  color: var(--text-inverse, #0F172A); cursor: pointer; font-family: 'Sora', sans-serif;
  font-size: 0.9rem; font-weight: 700;
  box-shadow: 0 0 12px color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent);
  transition: opacity 0.2s, box-shadow 0.2s;
  &:hover { box-shadow: 0 0 24px color-mix(in srgb, var(--accent-primary, #60C0F0) 55%, transparent); opacity: 0.92; }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const AskCoachBtn = styled.button`
  display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 48px;
  padding: 12px 16px; border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent);
  background: color-mix(in srgb, var(--bg-elevated, #141419) 50%, transparent);
  color: var(--accent-primary, #60C0F0); cursor: pointer; font-family: 'Sora', sans-serif;
  font-size: 0.9rem; font-weight: 600; transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
  &:hover { border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 65%, transparent); background: color-mix(in srgb, var(--bg-elevated, #141419) 75%, transparent); box-shadow: 0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const LoadMoreBtn = styled.button`
  display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 44px;
  padding: 10px; border-radius: 10px; background: transparent; cursor: pointer; font-size: 0.85rem;
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12)); color: var(--text-secondary, rgba(224,236,244,0.6));
  transition: border-color 0.2s, color 0.2s;
  &:hover:not(:disabled) { border-color: var(--accent-primary, #60C0F0); color: var(--text-primary, #E0ECF4); }
  &:disabled { cursor: not-allowed; opacity: 0.5; }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const NotConfiguredHeading = styled.h3`
  margin: 8px 0 4px; color: var(--frost-white, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 700;
`;

export const NotConfiguredSub = styled.p`
  margin: 0 0 12px; color: var(--swan-lavender, #4070C0); font-family: 'Sora', sans-serif; font-size: 14px;
`;

export const Attribution = styled.div`
  color: var(--text-muted, rgba(224,236,244,0.3)); font-size: 0.7rem; text-align: center;
  a { color: var(--text-secondary, rgba(224,236,244,0.5)); text-decoration: none; }
  a:hover { text-decoration: underline; }
`;
