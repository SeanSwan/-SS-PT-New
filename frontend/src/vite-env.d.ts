/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_ADMIN_API_URL?: string;
    // Add other custom env variables here if needed.
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }