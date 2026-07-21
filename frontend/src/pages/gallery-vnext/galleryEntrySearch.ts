/** Preserve checkout-return parameters before either gallery implementation can normalize the URL. */
export const ENTRY_SEARCH = typeof window !== 'undefined' ? window.location.search : '';
