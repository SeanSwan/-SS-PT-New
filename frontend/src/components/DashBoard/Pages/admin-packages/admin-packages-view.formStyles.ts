import styled from 'styled-components';
import { CheckCircle } from 'lucide-react';
import { sanitizeImageUrl, cssUrlValue } from '../../../../utils/imageUrl';

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

export const FormGridFull = styled.div`
  grid-column: 1 / -1;
`;

export const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

export const CenteredFormField = styled(FormField)`
  justify-content: center;
`;

export const FormLabel = styled.label`
  color: var(--text-secondary, rgba(224, 236, 244, 0.68));
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
`;

export const FormGroupLabel = styled.span`
  color: var(--text-secondary, rgba(224, 236, 244, 0.68));
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
`;

export const FormInput = styled.input`
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 80%, transparent);
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 14%, transparent);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  outline: none;
  font-size: 0.95rem;
  width: 100%;
  box-sizing: border-box;
  min-height: 44px;

  &:focus {
    border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 50%, transparent);
    box-shadow: 0 0 10px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
  }

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.55));
  }

  &[readonly] {
    cursor: default;
    opacity: 0.85;
  }
`;

export const FormInputAccent = styled(FormInput)`
  color: var(--accent-primary, #60C0F0);
  font-weight: bold;
`;

export const FormTextarea = styled.textarea`
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 80%, transparent);
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 14%, transparent);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  outline: none;
  font-size: 0.95rem;
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;

  &:focus {
    border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 50%, transparent);
    box-shadow: 0 0 10px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
  }

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.55));
  }
`;

export const FormSelect = styled.select`
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 80%, transparent);
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 14%, transparent);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  outline: none;
  font-size: 0.95rem;
  width: 100%;
  box-sizing: border-box;
  min-height: 44px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2rem;

  &:focus {
    border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 50%, transparent);
    box-shadow: 0 0 10px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
  }

  option {
    background: var(--bg-base, #0A0A0F);
    color: var(--text-primary, #E0ECF4);
  }
`;

export const SwitchLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.95rem;
  min-height: 44px;
`;

export const SwitchTrack = styled.span<{ $checked?: boolean }>`
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: ${p => p.$checked ? 'var(--success, #10b981)' : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 18%, transparent)'};
  transition: background 0.2s ease;
  flex-shrink: 0;
`;

export const SwitchThumb = styled.span<{ $checked?: boolean }>`
  position: absolute;
  top: 2px;
  left: ${p => p.$checked ? '22px' : '2px'};
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--text-primary, #E0ECF4);
  transition: left 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
`;

export const HiddenCheckbox = styled.input`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

export const AvatarCircle = styled.span<{ $src?: string }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${({ $src }) => {
    const safe = $src ? sanitizeImageUrl($src) : null;
    return safe
      ? `url(${cssUrlValue(safe)}) center/cover no-repeat`
      : 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0))';
  }};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--text-inverse, #0A0A0F);
  flex-shrink: 0;
`;

export const ClientCheckItem = styled.label<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  min-height: 44px;
  cursor: pointer;
  border-radius: 6px;
  background: ${p => p.$selected ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent)' : 'transparent'};
  transition: background 0.15s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  }
`;

export const ClientListContainer = styled.div`
  max-height: 200px;
  overflow-y: auto;
  background: rgba(20, 20, 40, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 0.25rem 0;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }
`;

export const DiscountInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

export const DiscountSuffix = styled.span`
  position: absolute;
  right: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
  pointer-events: none;
`;

export const DiscountInput = styled(FormInput)`
  padding-right: 2rem;
`;

export const SelectedClientIcon = styled(CheckCircle)`
  margin-left: auto;
  color: var(--accent-primary, #60C0F0);
`;
