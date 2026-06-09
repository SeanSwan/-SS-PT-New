// Shared text-fragment helpers for Swan Coach command receipt summaries.

export type SummaryResult = Record<string, unknown>;

export const numberValue = (r: SummaryResult, key: string): number | undefined => typeof r[key] === 'number' ? r[key] as number : undefined;
export const stringValue = (r: SummaryResult, key: string): string | undefined => typeof r[key] === 'string' ? r[key] as string : undefined;
export const plural = (count: number, suffix = 's') => (count !== 1 ? suffix : '');
export const signed = (value: number) => `${value > 0 ? '+' : ''}${value}`;
export const textOr = (value: string, fallback: string) => value === '' ? fallback : value;
export const painEntryWord = (count: number) => count === 1 ? 'entry' : 'entries';
export const isNavigationCommand = (command: string) => command.startsWith('navigate_') || command.startsWith('scan_command');

export const positiveNumber = (r: SummaryResult, key: string): number | undefined => {
  const value = numberValue(r, key);
  return value !== undefined && value > 0 ? value : undefined;
};

export const numberOr = (r: SummaryResult, key: string, fallback: number) => {
  const value = numberValue(r, key);
  return value === undefined ? fallback : value;
};

export const stringOr = (r: SummaryResult, key: string, fallback: string) => {
  const value = stringValue(r, key);
  return value === undefined ? fallback : value;
};

export const numberPart = (r: SummaryResult, key: string, render: (value: number) => string) => {
  const value = numberValue(r, key);
  return value === undefined ? '' : render(value);
};

export const positiveNumberPart = (r: SummaryResult, key: string, render: (value: number) => string) => {
  const value = positiveNumber(r, key);
  return value === undefined ? '' : render(value);
};

export const nonZeroNumberPart = (r: SummaryResult, key: string, render: (value: number) => string) => {
  const value = numberValue(r, key);
  return value === undefined || value === 0 ? '' : render(value);
};

export const stringPart = (r: SummaryResult, key: string, render: (value: string) => string) => {
  const value = stringValue(r, key);
  return value === undefined ? '' : render(value);
};

export const stringPairPart = (r: SummaryResult, firstKey: string, secondKey: string, render: (first: string, second: string) => string) => {
  const first = stringValue(r, firstKey);
  const second = stringValue(r, secondKey);
  return first === undefined || second === undefined ? '' : render(first, second);
};
