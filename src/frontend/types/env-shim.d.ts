// Minimal Vite env types for import.meta.env usage
interface ImportMetaEnv {
  readonly VITE_ENABLE_DEV_UI?: string;
  readonly MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
