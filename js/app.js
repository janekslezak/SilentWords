/**
 * Main Application Logic
 */

import { SELECTORS, KEYBOARD_SHORTCUTS } from './constants.js';
import { i18n } from './i18n.js';
import { db } from './db.js';
import { quotesManager } from './quotes.js';
import { 
  debounce, 
  showToast, 
  copyToClipboard, 
  shareQuote, 
  detectTheme, 
  setTheme, 
  toggleTheme 
} from './utils.js';

class App {
  constructor() {
    this.elements = {};
    this.debouncedResize = debounce(this.handleResize.bind(this), 250);
    this.isReady = false;
  }

  async init() {
    try {
      // Initialize i18n first
      await i18n.init();
      
      // Initialize database
      await db.init();
      
      // Cache DOM elements
      this.cacheElements();
      
      // Setup theme
      const savedTheme = detectTheme();
      setTheme(savedTheme);
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Load quotes
      await this.loadQuotes();
      
      // Initial render
      this.render();
      
      // Register service worker
      this.registerSW();
      
      this.isReady = true;
      console.log('[App] Initialized successfully');
      
    } catch (error) {
      console.error('[App] Initialization error:', error);
      this.showError();
    }
  }

  cacheElements() {
    const els = {};
    Object.keys(SELECTORS).forEach(key => {
      els[key] = document.querySelector(SELECTORS[key]);
    });
    this.elements = els;
  }

  setupEventListeners() {
    // Theme toggle
    if (this.elements.themeToggle) {
      this.elements.themeToggle.addEventListener('click', () => {
        toggleTheme();
      });
    }

    // Language toggle
    if (this.elements.langToggle) {
      this.elements.langToggle.addEventListener('click', () => {
        this.handleLanguageToggle();
      });
      
      // Listen for language changes
      i18n.onChange((lang) => {
        this.updateLanguageButton();
        this.handleLanguageChange();
      });
      
      // Set initial state
      this.updateLanguageButton();
    }

    // Navigation
    if (this.elements.prevBtn) {
      this.elements.prevBtn.addEventListener('click', () => this.showPrevious());
    }
    if (this.elements.nextBtn) {
      this.elements.nextBtn.addEventListener('click', () => this.showNext());
    }
    if (this.elements.randomBtn) {
      this.elements.randomBtn.addEventListener('click', () => this.showRandom());
    }

    // Actions
    if (this.elements.copyBtn) {
      this.elements.copyBtn.addEventListener('click', () => this.handleCopy());
    }
    if (this.elements.shareBtn) {
      this.elements.shareBtn.addEventListener('click', () => this.handleShare());
    }

    // About modal
    if (this.elements.aboutBtn) {
      this.elements.aboutBtn.addEventListener('click', () => this.openAbout());
    }
    if (this.elements.closeAbout) {
      this.elements.closeAbout.addEventListener('click', () => this.closeAbout());
    }
    if (this.elements.aboutModal) {
      this.elements.aboutModal.addEventListener('click', (e) => {
        if (e.target === this.elements.aboutModal) this.closeAbout();
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));

    // Window resize
    window.addEventListener('resize', this.debouncedResize);

    // Install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      if (this.elements.installBtn) {
        this.elements.installBtn.style.display = 'block';
        this.elements.installBtn.addEventListener('click', () => this.handleInstall());
      }
    });
  }

  async loadQuotes() {
    if (this.elements.loading) {
      this.elements.loading.style.display = 'flex';
    }
    
    const success = await quotesManager.loadAllQuotes();
    
    if (this.elements.loading) {
      this.elements.loading.style.display = 'none';
    }
    
    if (!success) {
      this.showError();
    }
  }

  handleLanguageToggle() {
    const newLang = i18n.toggleLanguage();
    console.log(`[App] Language switched to: ${newLang}`);
  }

  async handleLanguageChange() {
    // Reload quotes with new language
    if (this.elements.loading) {
      this.elements.loading.style.display = 'flex';
    }
    
    await quotesManager.reloadWithLanguage();
    
    if (this.elements.loading) {
      this.elements.loading.style.display = 'none';
    }
    
    // Update UI text
    i18n.updatePageContent();
    
    // Re-render current quote
    this.render();
    
    showToast('ui.languageToggle');
  }

  updateLanguageButton() {
    if (this.elements.langToggle) {
      const codeEl = this.elements.langToggle.querySelector('.lang-code');
      if (codeEl) {
        codeEl.textContent = i18n.getLanguageDisplay();
      }
    }
  }

  render() {
    const quote = quotesManager.getCurrentQuote();
    
    if (!quote) {
      if (this.elements.quoteText) {
        this.elements.quoteText.textContent = i18n.t('ui.loading');
      }
      return;
    }

    // Update quote content
    if (this.elements.quoteText) {
      this.elements.quoteText.textContent = quote.text;
    }
    if (this.elements.quoteSource) {
      this.elements.quoteSource.textContent = quote.sourceDisplay;
    }
    if (this.elements.quoteAuthor) {
      this.elements.quoteAuthor.textContent = quote.author || '';
    }
    if (this.elements.quoteNumber) {
      const progress = quotesManager.getProgress();
      this.elements.quoteNumber.textContent = `${progress.current} / ${progress.total}`;
    }

    // Update page title
    document.title = `${i18n.t('ui.title')} — ${quote.sourceDisplay}`;
  }

  showNext() {
    quotesManager.next();
    this.render();
  }

  showPrevious() {
    quotesManager.previous();
    this.render();
  }

  showRandom() {
    quotesManager.random();
    this.render();
  }

  async handleCopy() {
    const quote = quotesManager.getCurrentQuote();
    if (quote) {
      const text = `"${quote.text}" — ${quote.sourceDisplay}`;
      await copyToClipboard(text);
    }
  }

  async handleShare() {
    const quote = quotesManager.getCurrentQuote();
    if (quote) {
      await shareQuote(quote);
    }
  }

  handleKeyboard(e) {
    // Ignore if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    const key = e.key.toUpperCase();
    
    switch(key) {
      case 'ARROWRIGHT':
        e.preventDefault();
        this.showNext();
        break;
      case 'ARROWLEFT':
        e.preventDefault();
        this.showPrevious();
        break;
      case ' ':
        e.preventDefault();
        this.showRandom();
        break;
      case 'C':
        this.handleCopy();
        break;
      case 'S':
        this.handleShare();
        break;
      case 'T':
        toggleTheme();
        break;
      case 'L':
        this.handleLanguageToggle();
        break;
      case 'ESCAPE':
        this.closeAbout();
        break;
    }
  }

  openAbout() {
    if (this.elements.aboutModal) {
      this.elements.aboutModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  closeAbout() {
    if (this.elements.aboutModal) {
      this.elements.aboutModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  handleResize() {
    // Handle responsive adjustments if needed
  }

  async handleInstall() {
    if (!this.deferredPrompt) return;
    
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('[App] User installed the app');
      if (this.elements.installBtn) {
        this.elements.installBtn.style.display = 'none';
      }
    }
    this.deferredPrompt = null;
  }

  showError() {
    if (this.elements.quoteText) {
      this.elements.quoteText.textContent = i18n.t('ui.errorLoading');
    }
  }

  async registerSW() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('[App] SW registered:', registration.scope);
      } catch (error) {
        console.error('[App] SW registration failed:', error);
      }
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
