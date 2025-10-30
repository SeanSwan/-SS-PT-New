/**
 * useForm Hook
 * =============
 * Reusable hook for form state management
 * 
 * Usage:
 * const { formData, handleInputChange, setFormData, resetForm } = useForm<FormType>({
 *   name: '',
 *   email: '',
 *   age: 0
 * });
 * 
 * Then in JSX:
 * <input name="name" value={formData.name} onChange={handleInputChange} />
 * <input name="email" value={formData.email} onChange={handleInputChange} />
 * <input name="age" type="number" value={formData.age} onChange={handleInputChange} />
 */

import { useState, useCallback, ChangeEvent } from 'react';

// ==========================================
// TYPES
// ==========================================

export type FormInputValue = string | number | boolean;

export interface UseFormReturn<T> {
  /** Current form data state */
  formData: T;
  
  /** Handle input changes for text inputs, textareas, selects, and checkboxes */
  handleInputChange: (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  
  /** Set form data programmatically */
  setFormData: (data: T | ((prev: T) => T)) => void;
  
  /** Reset form to initial state */
  resetForm: () => void;
  
  /** Update a single field */
  updateField: <K extends keyof T>(field: K, value: T[K]) => void;
  
  /** Check if form has been modified from initial state */
  isDirty: boolean;
}

// ==========================================
// HOOK IMPLEMENTATION
// ==========================================

/**
 * Generic form state management hook
 * Handles text inputs, numbers, selects, checkboxes, and textareas
 * 
 * @param initialState - The initial form state object
 * @returns Form state and handlers
 */
export function useForm<T extends Record<string, any>>(
  initialState: T
): UseFormReturn<T> {
  const [formData, setFormData] = useState<T>(initialState);
  const [isDirty, setIsDirty] = useState(false);

  /**
   * Handle input changes for various input types
   * Works with: input[type=text], input[type=number], input[type=checkbox], textarea, select
   */
  const handleInputChange = useCallback((
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    // For checkboxes, use 'checked' property
    const inputValue = type === 'checkbox' 
      ? (e.target as HTMLInputElement).checked
      : value;

    // Convert to number if input type is number
    const parsedValue = type === 'number' 
      ? (value === '' ? 0 : Number(value))
      : inputValue;

    setFormData(prev => ({
      ...prev,
      [name]: parsedValue
    }));

    setIsDirty(true);
  }, []);

  /**
   * Update a single field programmatically
   */
  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setIsDirty(true);
  }, []);

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setFormData(initialState);
    setIsDirty(false);
  }, [initialState]);

  /**
   * Custom setter that also updates dirty state
   */
  const customSetFormData = useCallback((data: T | ((prev: T) => T)) => {
    setFormData(data);
    setIsDirty(true);
  }, []);

  return {
    formData,
    handleInputChange,
    setFormData: customSetFormData,
    resetForm,
    updateField,
    isDirty
  };
}

export default useForm;
