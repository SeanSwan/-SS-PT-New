/**
 * Styled components for GardeningTab
 * Extracted to keep GardeningTab.tsx under 300 lines (CLAUDE.md rule).
 */
import styled from 'styled-components';

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const ZoneLookup = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

export const ZoneIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(96, 192, 240, 0.15), rgba(139, 92, 246, 0.1));
  border: 1px solid rgba(96, 192, 240, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary, #60C0F0);
`;

export const ZoneTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

export const ZoneSubtitle = styled.p`
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
`;

export const SearchRow = styled.div`
  display: flex;
  gap: 8px;
`;

export const ZipInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-size: 15px;
  min-height: 44px;
  &::placeholder { color: var(--text-muted, rgba(224, 236, 244, 0.4)); }
  &:focus { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: -2px; }
`;

export const LookupBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 20px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0));
  color: white;
  font-weight: 600;
  font-size: 14px;
  min-height: 44px;
  cursor: pointer;
  white-space: nowrap;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:hover:not(:disabled) { filter: brightness(1.1); }
  &:active:not(:disabled) { transform: scale(0.97); }
`;

export const ErrorMsg = styled.div`
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(201, 42, 84, 0.1);
  border-left: 3px solid #C92A54;
  color: var(--text-primary, #E0ECF4);
  font-size: 13px;
`;

export const ZoneResult = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(96, 192, 240, 0.05);
  border: 1px solid rgba(96, 192, 240, 0.15);
`;

export const ZoneBadge = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0));
  color: white;
  font-weight: 800;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

export const ZoneLabel = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

export const ZoneTemp = styled.div`
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  margin-top: 2px;
`;

export const FilterRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const FilterSelect = styled.select`
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-size: 13px;
  min-height: 44px;
  cursor: pointer;
  &:focus { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: -2px; }
`;

export const SectionHeader = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const PlantGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const PlantCard = styled.button`
  border-radius: 12px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  background: var(--bg-surface, #1A1A24);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s;
  text-align: left;
  width: 100%;
  padding: 0;
  &:hover { border-color: rgba(96, 192, 240, 0.25); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const PlantHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  min-height: 44px;
`;

export const PlantEmoji = styled.div`
  font-size: 28px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(96, 192, 240, 0.06);
  flex-shrink: 0;
`;

export const PlantName = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

export const PlantMeta = styled.div`
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  margin-top: 2px;
  text-transform: capitalize;
`;

export const DiffBadge = styled.span`
  font-weight: 600;
`;

export const HarvestDays = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  white-space: nowrap;
`;

export const PlantDetails = styled.div`
  padding: 12px 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid rgba(96, 192, 240, 0.06);
`;

export const DetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  svg { color: var(--accent-primary, #60C0F0); flex-shrink: 0; }
`;

export const NutritionNote = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: var(--accent-gold, #C6A84B);
  background: rgba(198, 168, 75, 0.06);
  padding: 8px 12px;
  border-radius: 8px;
  svg { flex-shrink: 0; margin-top: 1px; }
`;

export const YieldNote = styled.div`
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
`;

export const CompanionNote = styled.div`
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  font-style: italic;
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 32px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  font-size: 14px;
`;
