/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SHOW_DEV_BANNER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
