/// <reference types="vite/client" />

interface ImportMeta {
    readonly env: {
      readonly VITE_API_URL: string;
      readonly VITE_USE_API: string;
      readonly DEV: boolean;
      readonly MODE: string;
      readonly PROD: boolean;
      readonly SSR: boolean;
      [key: string]: any;
    };
  }