/**
 * Internationalization Module
 * Handles language switching and translation loading
 */

class I18n {
  constructor() {
    this.currentLang = localStorage.getItem('silentwords-language') || 'en';
    this.translations = {};
    this.listeners = [];
    this.isReady = false;
  }

  async init() {
    await this.loadLanguage(this.currentLang, false);
    this.isReady = true;
    return this;
  }

  async loadLanguage(lang, notify = true) {
    try {
      const response = await fetch(`data/${lang}.json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      this.translations = await response.json();
      this.currentLang = lang;
      localStorage.setItem('silentwords-language', lang);
      document.documentElement.lang = lang;
      
      // Update meta tags
      this.updateMetaTags();
      
      if (notify) {
        this.notifyListeners();
      }
      
      return true;
    } catch (error) {
      console.error(`[i18n] Failed to load language ${lang}:`, error);
      // Fallback to English if available
      if (lang !== 'en') {
        return this.loadLanguage('en', notify);
      }
      return false;
    }
  }

  toggleLanguage() {
    const newLang = this.currentLang === 'en' ? 'pl' : 'en';
    this.loadLanguage(newLang);
    return newLang;
  }

  t(key, fallback = null) {
    const keys = key.split('.');
    let value = this.translations;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }
    
    return value || fallback || key;
  }

  getCurrentLanguage() {
    return this.currentLang;
  }

  getLanguageDisplay() {
    return this.currentLang.toUpperCase();
  }

  onChange(callback) {
    this.listeners.push(callback);
    // Immediately call with current state
    if (this.isReady) callback(this.currentLang);
  }

  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentLang);
      } catch (e) {
        console.error('[i18n] Error in listener:', e);
      }
    });
  }

  updateMetaTags() {
    // Update document title
    document.title = this.t('ui.title', 'Silent Words');
    
    // Update meta description if exists
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.content = this.t('ui.subtitle', 'Buddhist & Taoist Quotes');
    }
  }

  // Utility to update all [data-i18n] elements
  updatePageContent() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const attr = el.getAttribute('data-i18n-attr');
      const text = this.t(key);
      
      if (attr) {
        el.setAttribute(attr, text);
      } else {
        el.textContent = text;
      }
    });
  }
}

export const i18n = new I18n();
