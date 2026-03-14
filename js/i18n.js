/**
 * Internationalization Module
 * Minimal implementation for EN/PL switch
 */

class I18n {
  constructor() {
    // Default to English or saved preference
    this.currentLang = localStorage.getItem('silentwords-lang') || 'en';
    this.translations = {};
    this.listeners = [];
  }

  async init() {
    await this.loadLanguage(this.currentLang);
    this.updateDocumentLang();
  }

  async loadLanguage(lang) {
    try {
      const response = await fetch(`data/${lang}.json`);
      if (!response.ok) throw new Error(`Failed to load ${lang}`);
      
      this.translations = await response.json();
      this.currentLang = lang;
      localStorage.setItem('silentwords-lang', lang);
      
      this.updateUI();
      this.notifyListeners();
      
    } catch (error) {
      console.error('[i18n] Error loading language:', error);
      // Fallback to empty object if file missing
      this.translations = {};
    }
  }

  toggle() {
    const newLang = this.currentLang === 'en' ? 'pl' : 'en';
    this.loadLanguage(newLang);
    return newLang;
  }

  getCurrent() {
    return this.currentLang;
  }

  t(key, fallback = '') {
    return this.translations[key] || fallback || key;
  }

  updateDocumentLang() {
    document.documentElement.lang = this.currentLang;
  }

  updateUI() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (this.translations[key]) {
        el.textContent = this.translations[key];
      }
    });

    // Update lang toggle button display
    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
      const codeEl = langBtn.querySelector('.lang-code');
      if (codeEl) {
        codeEl.textContent = this.currentLang.toUpperCase();
      }
    }
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notifyListeners() {
    this.listeners.forEach(cb => {
      try {
        cb(this.currentLang);
      } catch (e) {
        console.error('[i18n] Listener error:', e);
      }
    });
  }
}

// Singleton instance
export const i18n = new I18n();
