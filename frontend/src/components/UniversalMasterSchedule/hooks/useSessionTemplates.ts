import { useCallback, useMemo, useState } from 'react';

export interface SessionTemplate {
  id: string;
  name: string;
  duration: number;
  location: string;
  notes?: string;
  isDefault?: boolean;
}

interface UseSessionTemplatesReturn {
  templates: SessionTemplate[];
  addTemplate: (template: Omit<SessionTemplate, 'id' | 'isDefault'>) => void;
  removeTemplate: (id: string) => void;
  applyTemplate: (id: string) => SessionTemplate | undefined;
}

const STORAGE_KEY = 'schedule.sessionTemplates';

const DEFAULT_TEMPLATES: SessionTemplate[] = [
  { id: 'default-60', name: '60-min Standard', duration: 60, location: 'Main Studio', isDefault: true },
  { id: 'default-30', name: '30-min Check-in', duration: 30, location: 'Main Studio', isDefault: true },
  { id: 'default-90', name: '90-min Extended', duration: 90, location: 'Main Studio', isDefault: true }
];

const loadCustomTemplates = (): SessionTemplate[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === 'string');
  } catch {
    return [];
  }
};

const saveCustomTemplates = (templates: SessionTemplate[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
};

const createId = () => `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const useSessionTemplates = (): UseSessionTemplatesReturn => {
  const [customTemplates, setCustomTemplates] = useState<SessionTemplate[]>(() => loadCustomTemplates());

  const templates = useMemo(
    () => [...DEFAULT_TEMPLATES, ...customTemplates],
    [customTemplates]
  );

  const addTemplate = useCallback((template: Omit<SessionTemplate, 'id' | 'isDefault'>) => {
    const newTemplate: SessionTemplate = {
      ...template,
      id: createId(),
      isDefault: false
    };
    setCustomTemplates((prev) => {
      const next = [...prev, newTemplate];
      saveCustomTemplates(next);
      return next;
    });
  }, []);

  const removeTemplate = useCallback((id: string) => {
    setCustomTemplates((prev) => {
      const next = prev.filter((item) => item.id !== id);
      saveCustomTemplates(next);
      return next;
    });
  }, []);

  const applyTemplate = useCallback(
    (id: string) => templates.find((item) => item.id === id),
    [templates]
  );

  return {
    templates,
    addTemplate,
    removeTemplate,
    applyTemplate
  };
};
