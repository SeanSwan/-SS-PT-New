import { useState, useEffect } from 'react';

/**
 * Hook to easily use localStorage with React state
 * Synchronizes state across tabs and provides type safety
 * 
 * @param key - localStorage key to use
 * @param defaultValue - default value to use if no value exists in localStorage
 * @returns [storedValue, setValue] - stored value and setter function
 */
export default function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const storedValue = localStorage.getItem(key);
      return storedValue === null ? defaultValue : JSON.parse(storedValue);
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    const listener = (e: StorageEvent) => {
      if (e.storageArea === localStorage && e.key === key) {
        try {
          setValue(e.newValue ? JSON.parse(e.newValue) : defaultValue);
        } catch (error) {
          console.error(`Error parsing localStorage key "${key}":`, error);
        }
      }
    };
    window.addEventListener('storage', listener);

    return () => {
      window.removeEventListener('storage', listener);
    };
  }, [key, defaultValue]);

  const setValueInLocalStorage = (newValue: T | ((val: T) => T)) => {
    try {
      setValue((currentValue) => {
        const result = typeof newValue === 'function' 
          ? (newValue as (val: T) => T)(currentValue) 
          : newValue;
        
        localStorage.setItem(key, JSON.stringify(result));
        return result;
      });
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [value, setValueInLocalStorage];
}