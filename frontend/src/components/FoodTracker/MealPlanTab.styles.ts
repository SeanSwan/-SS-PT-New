import styled from 'styled-components';
import { motion } from 'framer-motion';

const textSoft = 'var(--text-secondary, rgba(224, 236, 244, 0.6))';
const textMuted = 'var(--text-muted, rgba(224, 236, 244, 0.5))';
const borderSoft = 'var(--border-soft, rgba(96, 192, 240, 0.08))';
const borderMid = 'var(--border-soft, rgba(96, 192, 240, 0.12))';
const surface = 'var(--bg-surface, #1A1A24)';
const primary = 'var(--accent-primary, #60C0F0)';
const secondary = 'var(--accent-secondary, #8B5CF6)';
const gold = 'var(--accent-gold, #C6A84B)';

export const TabRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    .spin { animation: none; }
  }
`;

export const Section = styled.div`
  background: color-mix(in srgb, var(--bg-elevated, #141419) 80%, transparent);
  border: 1px solid ${borderSoft};
  border-radius: 12px;
  padding: 20px;
`;

export const SectionHeader = styled.h3`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 4px;
  color: var(--text-primary, #E0ECF4);
  font: 600 16px 'Plus Jakarta Sans', sans-serif;
`;

export const SectionDesc = styled.p`margin:0 0 16px;color:${textSoft};font-size:13px;`;
export const FormGrid = styled.div`display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:12px;`;
export const FormGroup = styled.div`display:flex;flex-direction:column;gap:4px;margin-bottom:10px;`;
export const Label = styled.label`font-size:12px;font-weight:500;color:${textSoft};`;
export const GroupLabel = styled.div`font-size:12px;font-weight:500;color:${textSoft};`;

export const Input = styled.input`
  min-height: 44px;
  padding: 10px 12px;
  background: ${surface};
  border: 1px solid ${borderMid};
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  font: 14px 'Fira Code', monospace;
  &:focus { outline: 2px solid ${primary}; outline-offset: -1px; }
  &::placeholder { color: var(--text-muted, rgba(224, 236, 244, 0.3)); }
`;

export const Select = styled.select`
  min-height: 44px;
  padding: 10px 12px;
  background: ${surface};
  border: 1px solid ${borderMid};
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  font-size: 13px;
  cursor: pointer;
  &:focus { outline: 2px solid ${primary}; }
  option { background: ${surface}; }
`;

export const ChipRow = styled.div`display:flex;flex-wrap:wrap;gap:6px;`;

export const FilterChip = styled.button<{ $active: boolean }>`
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 16px;
  border: 1px solid ${({ $active }) => $active ? secondary : borderMid};
  background: ${({ $active }) => $active ? `color-mix(in srgb, ${secondary} 12%, transparent)` : 'transparent'};
  color: ${({ $active }) => $active ? secondary : textMuted};
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
  &:hover { border-color: ${secondary}; color: var(--text-primary, #E0ECF4); }
`;

export const GenerateBtn = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 48px;
  margin-top: 8px;
  padding: 14px 24px;
  border: 0;
  border-radius: 10px;
  background: linear-gradient(135deg, ${secondary}, ${primary});
  color: var(--button-text-on-accent, #0A0A0F);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  &:disabled { opacity: 0.6; cursor: not-allowed; }
  &:hover:not(:disabled) { box-shadow: 0 0 20px color-mix(in srgb, ${secondary} 40%, transparent); }
`;

export const ErrorText = styled.p`display:flex;align-items:center;gap:6px;margin:8px 0 0;color:var(--accent-error,#C92A54);font-size:13px;`;
export const PlanResult = styled(motion.div)`margin-top:20px;padding-top:20px;border-top:1px solid ${borderSoft};`;
export const PlanTitle = styled.h4`margin:0 0 10px;color:var(--text-primary,#E0ECF4);font-size:18px;font-weight:700;`;
export const TargetRow = styled.div`display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;`;

export const TargetChip = styled.span`
  padding: 4px 10px;
  border-radius: 12px;
  background: color-mix(in srgb, ${primary} 10%, transparent);
  border: 1px solid color-mix(in srgb, ${primary} 20%, transparent);
  color: ${primary};
  font: 500 12px 'Fira Code', monospace;
`;

export const ConfChip = styled.span<{ $val: number }>`
  padding: 4px 10px;
  border-radius: 12px;
  background: color-mix(in srgb, ${({ $val }) => $val > 0.7 ? primary : gold} 10%, transparent);
  border: 1px solid color-mix(in srgb, ${({ $val }) => $val > 0.7 ? primary : gold} 20%, transparent);
  color: ${({ $val }) => $val > 0.7 ? primary : gold};
  font-size: 12px;
`;

export const NasmNote = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0 0 12px;
  padding: 10px;
  border-radius: 8px;
  background: color-mix(in srgb, ${secondary} 6%, transparent);
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  font-size: 13px;
  font-style: italic;
  svg { flex-shrink: 0; margin-top: 2px; }
`;

export const MealCard = styled.div`margin-bottom:8px;border:1px solid ${borderSoft};border-radius:8px;overflow:hidden;`;
export const MealHeader = styled.button`
  display:flex;justify-content:space-between;align-items:center;width:100%;min-height:44px;padding:12px 14px;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer;
  &:hover { background: color-mix(in srgb, ${primary} 4%, transparent); }
`;
export const MealInfo = styled.div`display:flex;align-items:center;gap:10px;`;
export const MealType = styled.span`padding:2px 8px;border-radius:8px;background:color-mix(in srgb,${secondary} 10%,transparent);color:${secondary};font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;`;
export const MealName = styled.span`color:var(--text-primary,#E0ECF4);font-size:14px;font-weight:500;`;
export const MealMeta = styled.div`display:flex;align-items:center;gap:10px;color:${textMuted};`;
export const MealTime = styled.span`display:flex;align-items:center;gap:4px;font-size:12px;`;
export const MealCal = styled.span`color:${gold};font:600 13px 'Fira Code',monospace;`;
export const MealExpanded = styled(motion.div)`overflow:hidden;padding:0 14px 14px;`;
export const PrepTime = styled.p`display:flex;align-items:center;gap:6px;margin:0 0 8px;color:${textMuted};font-size:12px;`;

export const FoodTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  th { text-align:left;padding:6px 8px;color:${textMuted};font-weight:500;border-bottom:1px solid ${borderSoft}; }
  td { padding:6px 8px;color:var(--text-secondary, rgba(224, 236, 244, 0.7));border-bottom:1px solid color-mix(in srgb, ${borderSoft} 50%, transparent); }
  td:nth-child(n+3), th:nth-child(n+3) { text-align:right; }
  td:nth-child(n+3) { font-family:'Fira Code', monospace; }
`;

export const GrocerySection = styled.div`margin-top:16px;padding-top:16px;border-top:1px solid ${borderSoft};`;
export const GroceryTitle = styled.h5`display:flex;align-items:center;gap:8px;margin:0 0 10px;color:var(--text-primary,#E0ECF4);font-size:14px;font-weight:600;`;
export const GroceryGrid = styled.div`display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;`;
export const GroceryItem = styled.span`padding:6px 10px;border:1px solid var(--border-soft,rgba(96,192,240,0.06));border-radius:6px;background:color-mix(in srgb,${surface} 80%,transparent);color:var(--text-secondary,rgba(224,236,244,0.7));font-size:12px;`;
export const TipsSection = styled.div`margin-top:12px;`;
export const Tip = styled.p`display:flex;align-items:flex-start;gap:6px;margin:4px 0;color:${textSoft};font-size:12px;svg{flex-shrink:0;margin-top:1px;color:${gold};}`;
export const Disclaimer = styled.p`margin:12px 0 0;padding-top:10px;border-top:1px solid var(--border-soft,rgba(96,192,240,0.06));color:var(--text-muted,rgba(224,236,244,0.35));font-size:10px;line-height:1.4;`;
export const PhotoArea = styled.div`margin-bottom:12px;`;

export const UploadZone = styled.button`
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;width:100%;min-height:120px;padding:32px 20px;border:2px dashed var(--border-soft,rgba(96,192,240,0.15));border-radius:12px;background:transparent;cursor:pointer;transition:background 0.15s ease,border-color 0.15s ease;
  svg{color:${primary};} span{color:${textSoft};font-size:14px;} small{color:var(--text-muted,rgba(224,236,244,0.4));font-size:11px;}
  &:hover{border-color:${primary};background:color-mix(in srgb,${primary} 4%,transparent);}
`;

export const PreviewWrap = styled.div`position:relative;display:inline-block;`;
export const HiddenFileInput = styled.input`display:none;`;
export const PreviewImg = styled.img`max-width:100%;max-height:300px;border:1px solid ${borderMid};border-radius:10px;`;
export const ClearBtn = styled.button`position:absolute;top:8px;right:8px;display:flex;align-items:center;justify-content:center;width:44px;height:44px;border:0;border-radius:50%;background:color-mix(in srgb,var(--bg-base,#030712) 70%,transparent);color:var(--text-primary,#E0ECF4);cursor:pointer;&:hover{background:var(--accent-error,#C92A54);}`;
export const PhotoResultWrap = styled(motion.div)`margin-top:16px;`;
export const PresetGrid = styled.div`display:flex;flex-direction:column;gap:10px;`;
export const PresetCard = styled.div`padding:14px;border:1px solid ${borderSoft};border-radius:10px;background:color-mix(in srgb,${surface} 90%,transparent);`;
export const PresetHeader = styled.button`display:flex;justify-content:space-between;align-items:center;width:100%;min-height:44px;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer;`;
export const PresetName = styled.span`color:var(--text-primary,#E0ECF4);font-size:15px;font-weight:600;`;
export const PresetTiming = styled.p`margin:2px 0 0;color:${textMuted};font-size:12px;`;
export const PresetCals = styled.span`white-space:nowrap;color:${gold};font:600 13px 'Fira Code',monospace;`;
export const PresetDesc = styled.p`margin:8px 0 0;color:var(--text-secondary,rgba(224,236,244,0.7));font-size:13px;line-height:1.4;`;
export const PresetExpanded = styled(motion.div)`overflow:hidden;margin-top:12px;padding-top:12px;border-top:1px solid ${borderSoft};`;
export const PresetSection = styled.div`margin-bottom:12px;`;
export const PresetLabel = styled.span`display:block;margin-bottom:6px;color:${secondary};font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;`;
export const MacroRow = styled.div`display:flex;gap:8px;`;
export const MacroChip = styled.span`padding:4px 10px;border-radius:8px;background:color-mix(in srgb,${primary} 8%,transparent);color:${primary};font:12px 'Fira Code',monospace;`;
export const SampleMeal = styled.p`margin:4px 0;color:var(--text-secondary,rgba(224,236,244,0.7));font-size:13px;line-height:1.4;`;
export const PresetText = styled.p`margin:0;color:var(--text-secondary,rgba(224,236,244,0.7));font-size:13px;line-height:1.4;`;
export const AvoidRow = styled.div`display:flex;flex-wrap:wrap;gap:6px;`;
export const AvoidChip = styled.span`padding:3px 8px;border:1px solid color-mix(in srgb,var(--accent-secondary, #8B5CF6) 22%,transparent);border-radius:10px;background:color-mix(in srgb,var(--accent-secondary, #8B5CF6) 9%,transparent);color:color-mix(in srgb,var(--accent-secondary, #8B5CF6) 82%,var(--text-primary,#E0ECF4));font-size:11px;`;
