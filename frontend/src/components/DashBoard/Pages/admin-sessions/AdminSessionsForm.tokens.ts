/**
 * Theme token bridge for active admin session form and dialog chrome.
 * Keeps visual constants out of the extracted style module so it stays under the project file cap.
 */
export const TEXT_PRIMARY = 'var(--text-primary, #E0ECF4)';
export const TEXT_SECONDARY = 'var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, transparent))';
export const TEXT_MUTED = 'var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 55%, transparent))';
export const FIELD_SURFACE = 'color-mix(in srgb, var(--bg-surface, #1A1A24) 76%, transparent)';
export const FIELD_BORDER = 'color-mix(in srgb, var(--text-primary, #E0ECF4) 15%, transparent)';
export const FIELD_BORDER_SOFT = 'color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent)';
export const FOCUS_BORDER = 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 50%, transparent)';
export const FOCUS_SHADOW = '0 0 10px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent)';
export const FIELD_FOCUS_SHADOW = '0 0 15px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent)';
export const SELECT_OPTION_SURFACE = 'var(--bg-surface, #1A1A24)';
export const PANEL_SURFACE = 'color-mix(in srgb, var(--bg-surface, #1A1A24) 72%, transparent)';
export const PANEL_BORDER = 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent)';
export const NOTES_SURFACE = 'color-mix(in srgb, var(--text-primary, #E0ECF4) 5%, transparent)';
export const NOTES_BORDER = 'color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent)';
export const SELECTED_BORDER = '2px solid var(--accent-secondary, #8B5CF6)';
export const SELECTED_SURFACE = 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent)';
export const SELECTED_SURFACE_HOVER = 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent)';
export const ITEM_BORDER = '1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 20%, transparent)';
export const ITEM_HOVER_SURFACE = 'color-mix(in srgb, var(--text-primary, #E0ECF4) 5%, transparent)';
