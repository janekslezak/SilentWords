// ─── Constants ────────────────────────────────────────────────────────────────
export const CONFIG = {
  dataPath: './data/',
  files: {
    dhammapada: 'dhammapada.json',
    koans: 'koans.json',
    tao: 'taoteching.json'
  }
};

export const DB_NAME = 'SilentWordsDB';
export const DB_VERSION = 1;
export const STORE_NAME = 'quotes';

export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light'
};

export const CATEGORIES = {
  ALL: 'all',
  DHAMMAPADA: 'dhammapada',
  KOANS: 'koans',
  TAO: 'tao'
};

export const MAX_RANDOM_ATTEMPTS = 10;
export const TOAST_DURATION = 2000;