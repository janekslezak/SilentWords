/**
 * Silent Words - Main Application
 * With Language Switcher Integration
 */

import { i18n } from './i18n.js';

class App {
  constructor() {
    this.quotes = [];
    this.currentIndex = 0;
    this.currentLang = 'en';
    this.db = null;
  }

  async init() {
    // Initialize i18n first
    await i18n.init();
    this.currentLang = i18n.getCurrent();
    
    // Cache DOM elements
    this.els = {
      loading: document.getElementById('loading'),
      main: document.getElementById('main'),
      quoteText: document.getElementById('quote-text'),
      quoteSource: document.getElementById('quote-source'),
      quoteChapter: document.getElementById('quote-chapter'),
      toast: document.getElementById('toast'),
      toastMsg: document.getElementById('toast-message')
    };

    // Setup event listeners
    this.setupListeners();
    
    // Setup theme
    this.initTheme();
    
    // Load quotes
    await this.loadQuotes();
    
    // Show main screen
    this.els.loading.classList.add('hidden');
    this.els.main.classList.remove('hidden');
    
    // Display first quote
    this.displayQuote();

    // Register SW
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
  }

  setupListeners() {
    // Language toggle
    document.getElementById('lang-toggle')?.addEventListener('click', () => {
      const newLang = i18n.toggle();
      this.handleLanguageChange(newLang);
    });

    // Theme toggle
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      this.toggleTheme();
    });

    // Navigation
    document.getElementById('prev-btn')?.addEventListener('click', () => this.prevQuote());
    document.getElementById('next-btn')?.addEventListener('click', () => this.nextQuote());
    document.getElementById('random-btn')?.addEventListener('click', () => this.randomQuote());

    // Actions
    document.getElementById('copy-btn')?.addEventListener('click', () => this.copyQuote());
    document.getElementById('share-btn')?.addEventListener('click', () => this.shareQuote());

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      
      switch(e.key) {
        case 'ArrowLeft': this.prevQuote(); break;
        case 'ArrowRight': this.nextQuote(); break;
        case ' ': this.randomQuote(); e.preventDefault(); break;
        case 'c': case 'C': this.copyQuote(); break;
        case 's': case 'S': this.shareQuote(); break;
        case 't': case 'T': this.toggleTheme(); break;
        case 'l': case 'L': 
          const newLang = i18n.toggle();
          this.handleLanguageChange(newLang);
          break;
      }
    });

    // Listen for i18n changes
    i18n.onChange((lang) => {
      this.currentLang = lang;
    });
  }

  async handleLanguageChange(newLang) {
    // Reload quotes for new language
    this.els.loading.classList.remove('hidden');
    this.els.main.classList.add('hidden');
    
    await this.loadQuotes();
    
    this.els.loading.classList.add('hidden');
    this.els.main.classList.remove('hidden');
    this.displayQuote();
    
    this.showToast(i18n.getCurrent() === 'pl' ? 'Zmieniono język' : 'Language changed');
  }

  async loadQuotes() {
    try {
      // Try to load language-specific quotes
      const response = await fetch(`data/quotes-${this.currentLang}.json`);
      
      if (!response.ok) {
        // Fallback to English if translation not available
        if (this.currentLang !== 'en') {
          const fallback = await fetch('data/quotes-en.json');
          this.quotes = await fallback.json();
        } else {
          throw new Error('Failed to load quotes');
        }
      } else {
        this.quotes = await response.json();
      }
      
      this.currentIndex = 0;
    } catch (error) {
      console.error('Failed to load quotes:', error);
      // Use minimal fallback data
      this.quotes = [{
        text: this.currentLang === 'pl' ? 'Błąd ładowania cytatów' : 'Error loading quotes',
        source: 'Error',
        chapter: ''
      }];
    }
  }

  displayQuote() {
    const quote = this.quotes[this.currentIndex];
    if (!quote) return;

    this.els.quoteText.textContent = quote.text;
    this.els.quoteSource.textContent = quote.source || '';
    this.els.quoteChapter.textContent = quote.chapter || '';
    
    // Update page title
    document.title = `${quote.source} — Silent Words`;
  }

  nextQuote() {
    this.currentIndex = (this.currentIndex + 1) % this.quotes.length;
    this.displayQuote();
  }

  prevQuote() {
    this.currentIndex = (this.currentIndex - 1 + this.quotes.length) % this.quotes.length;
    this.displayQuote();
  }

  randomQuote() {
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * this.quotes.length);
    } while (newIndex === this.currentIndex && this.quotes.length > 1);
    
    this.currentIndex = newIndex;
    this.displayQuote();
  }

  async copyQuote() {
    const quote = this.quotes[this.currentIndex];
    const text = `"${quote.text}" — ${quote.source}`;
    
    try {
      await navigator.clipboard.writeText(text);
      this.showToast(i18n.t('copySuccess', 'Copied to clipboard'));
    } catch (err) {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.showToast(i18n.t('copySuccess', 'Copied to clipboard'));
    }
  }

  async shareQuote() {
    const quote = this.quotes[this.currentIndex];
    const shareData = {
      title: 'Silent Words',
      text: `"${quote.text}" — ${quote.source}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Share failed:', err);
      }
    } else {
      this.copyQuote();
    }
  }

  initTheme() {
    const saved = localStorage.getItem('silentwords-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('silentwords-theme', next);
  }

  showToast(message) {
    this.els.toastMsg.textContent = message;
    this.els.toast.classList.add('show');
    setTimeout(() => {
      this.els.toast.classList.remove('show');
    }, 2000);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
