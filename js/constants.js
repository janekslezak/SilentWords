/**
 * Application Constants
 */

export const DB_CONFIG = {
  NAME: 'SilentWordsDB',
  VERSION: 1,
  STORES: {
    QUOTES: 'quotes',
    SETTINGS: 'settings',
    CACHE: 'cache'
  }
};

export const APP_CONFIG = {
  DEFAULT_LANGUAGE: 'en',
  SUPPORTED_LANGUAGES: ['en', 'pl'],
  DEFAULT_THEME: 'dark',
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  DEBOUNCE_DELAY: 300
};

export const SELECTORS = {
  // App container
  app: '#app',
  loading: '#loading-screen',
  
  // Header controls
  themeToggle: '#theme-toggle',
  langToggle: '#lang-toggle',
  installBtn: '#install-btn',
  
  // Navigation
  prevBtn: '#prev-btn',
  nextBtn: '#next-btn',
  randomBtn: '#random-btn',
  
  // Quote display
  quoteText: '#quote-text',
  quoteSource: '#quote-source',
  quoteAuthor: '#quote-author',
  quoteNumber: '#quote-number',
  
  // Actions
  copyBtn: '#copy-btn',
  shareBtn: '#share-btn',
  aboutBtn: '#about-btn',
  closeAbout: '#close-about',
  
  // Modal
  aboutModal: '#about-modal',
  
  // Toasts
  toast: '#toast',
  toastMessage: '#toast-message'
};

export const QUOTE_SOURCES = [
  { id: 'dhammapada', filePattern: (lang) => `dhammapada-${lang}.json` },
  { id: 'zen', filePattern: (lang) => `zen-${lang}.json` },
  { id: 'tao', filePattern: (lang) => `tao-${lang}.json` }
];

export const KEYBOARD_SHORTCUTS = {
  ARROW_LEFT: 'previous',
  ARROW_RIGHT: 'next',
  SPACE: 'random',
  C: 'copy',
  S: 'share',
  T: 'theme',
  L: 'language',
  ESCAPE: 'close'
};
