/**
 * Silent Words - Main Application
 */

// File mapping: button category -> filename prefix
const SOURCE_MAP = {
  'dhammapada': 'dhammapada',
  'koans': 'zen',
  'tao': 'dao',        // Button "Dao" with category="tao" loads dao-*.json
  'dao': 'dao',        // Fallback if button uses category="dao"
  'all': ['dhammapada', 'zen', 'dao']
};

const TRANSLATIONS = {
  en: {
    loading: 'Loading...',
    newQuote: 'New Quote',
    collection: 'Collection:',
    all: 'All',
    koans: 'Koans',
    copySuccess: 'Copied to clipboard',
    errorLoading: 'Error: No databases found',
    stats: 'quotes loaded'
  },
  pl: {
    loading: 'Ładowanie...',
    newQuote: 'Nowy Cytat',
    collection: 'Kolekcja:',
    all: 'Wszystko',
    koans: 'Koany',
    copySuccess: 'Skopiowano do schowka',
    errorLoading: 'Błąd: Nie znaleziono baz danych',
    stats: 'cytatów załadowano'
  }
};

class App {
  constructor() {
    this.quotes = [];
    this.currentIndex = 0;
    this.currentLang = localStorage.getItem('sw-lang') || 'en';
    this.currentCategory = 'all';
    this.isLoading = false;
    this.els = {};
  }

  async init() {
    console.log('[App] Starting...');
    document.documentElement.lang = this.currentLang;
    
    this.cacheElements();
    this.setupListeners();
    this.initTheme();
    this.updateLangButton();
    this.updateUIText();
    this.setupCreditsToggle();
    
    try {
      await this.loadQuotes();
      this.showQuote();
    } catch (err) {
      console.error('[App] Init error:', err);
      this.showError();
    }
  }

  cacheElements() {
    this.els = {
      loader: document.getElementById('loader'),
      quoteContent: document.getElementById('quote-content'),
      quoteText: document.getElementById('quote-text'),
      quoteAuthor: document.getElementById('quote-author'),
      quoteSource: document.getElementById('quote-source'),
      quoteTradition: document.getElementById('quote-tradition'),
      btnPull: document.getElementById('btn-pull'),
      btnCopy: document.getElementById('btn-copy'),
      btnTheme: document.getElementById('btn-theme'),
      btnLang: document.getElementById('btn-lang'),
      stats: document.getElementById('stats'),
      toast: document.getElementById('toast'),
      sourceBtns: document.querySelectorAll('.source-btn'),
      creditsLink: document.getElementById('credits-link'),
      creditsContent: document.getElementById('credits-content')
    };
  }

  setupListeners() {
    if (this.els.btnPull) this.els.btnPull.addEventListener('click', () => this.handlePull());
    if (this.els.btnCopy) this.els.btnCopy.addEventListener('click', () => this.handleCopy());
    if (this.els.btnTheme) this.els.btnTheme.addEventListener('click', () => this.handleTheme());
    if (this.els.btnLang) this.els.btnLang.addEventListener('click', () => this.handleLang());
    
    if (this.els.sourceBtns) {
      this.els.sourceBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const category = e.target.dataset.category;
          console.log('[App] Source button clicked:', category);
          this.handleSourceChange(category);
        });
      });
    }
    
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.handlePull();
      }
      if (e.code === 'KeyC' && !e.ctrlKey && !e.metaKey) this.handleCopy();
      if (e.code === 'KeyT') this.handleTheme();
      if (e.code === 'KeyL') this.handleLang();
    });
  }

  setupCreditsToggle() {
    if (this.els.creditsLink && this.els.creditsContent) {
      this.els.creditsLink.addEventListener('click', (e) => {
        e.preventDefault();
        const isHidden = this.els.creditsContent.style.display === 'none';
        this.els.creditsContent.style.display = isHidden ? 'block' : 'none';
        this.els.creditsLink.textContent = isHidden ? 'Hide Credits' : 'Credits';
      });
    }
  }

  async handleLang() {
    const newLang = this.currentLang === 'en' ? 'pl' : 'en';
    this.currentLang = newLang;
    localStorage.setItem('sw-lang', newLang);
    document.documentElement.lang = newLang;
    
    this.updateLangButton();
    this.updateUIText();
    
    await this.loadQuotes();
    this.showQuote();
  }

  updateLangButton() {
    const codeEl = this.els.btnLang?.querySelector('.lang-code');
    if (codeEl) codeEl.textContent = this.currentLang.toUpperCase();
  }

  updateUIText() {
    const t = TRANSLATIONS[this.currentLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) el.textContent = t[key];
    });
  }

  async handleSourceChange(category) {
    if (!category || this.isLoading || category === this.currentCategory) return;
    
    console.log('[App] Changing source to:', category);
    
    // Update active button state
    this.els.sourceBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });
    
    this.currentCategory = category;
    await this.loadQuotes();
    this.showQuote();
  }

  async loadQuotes() {
    this.isLoading = true;
    if (this.els.btnPull) this.els.btnPull.disabled = true;
    
    this.quotes = [];
    
    // Get source(s) to load
    let sources = [];
    if (this.currentCategory === 'all') {
      sources = SOURCE_MAP.all;
    } else {
      // Map category to filename prefix, fallback to category name itself
      const mapped = SOURCE_MAP[this.currentCategory];
      sources = [mapped || this.currentCategory];
    }
    
    console.log('[App] Loading sources:', sources, 'Lang:', this.currentLang);
    
    for (const source of sources) {
      const fileName = `${source}-${this.currentLang}.json`;
      console.log('[App] Fetching:', fileName);
      
      try {
        let response = await fetch(`data/${fileName}`);
        
        // If not found and not English, try English fallback
        if (!response.ok && this.currentLang !== 'en') {
          const fallbackName = `${source}-en.json`;
          console.log(`[App] ${fileName} not found, trying ${fallbackName}`);
          response = await fetch(`data/${fallbackName}`);
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        if (Array.isArray(data)) {
          this.quotes.push(...data);
          console.log(`[App] Loaded ${data.length} quotes from ${source}`);
        } else {
          console.warn(`[App] Data from ${source} is not an array`);
        }
      } catch (e) {
        console.error(`[App] Failed to load ${source}:`, e.message);
      }
    }
    
    this.isLoading = false;
    if (this.els.btnPull) this.els.btnPull.disabled = false;
    
    if (this.quotes.length === 0) {
      console.error('[App] No quotes loaded from any source');
      throw new Error('No databases found');
    }
    
    console.log(`[App] Total: ${this.quotes.length} quotes`);
    this.shuffleQuotes();
    this.currentIndex = 0;
    this.updateStats();
    
    if (this.els.loader) this.els.loader.style.display = 'none';
    if (this.els.quoteContent) this.els.quoteContent.style.display = 'block';
  }

  showError() {
    const t = TRANSLATIONS[this.currentLang];
    if (this.els.stats) {
      this.els.stats.textContent = t.errorLoading;
      this.els.stats.style.color = 'var(--danger)';
    }
    if (this.els.loader) this.els.loader.style.display = 'none';
    if (this.els.quoteContent) this.els.quoteContent.style.display = 'block';
    if (this.els.quoteText) this.els.quoteText.textContent = t.errorLoading;
  }

  shuffleQuotes() {
    for (let i = this.quotes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.quotes[i], this.quotes[j]] = [this.quotes[j], this.quotes[i]];
    }
  }

  showQuote() {
    if (this.quotes.length === 0) return;
    const quote = this.quotes[this.currentIndex];
    
    if (this.els.quoteText) this.els.quoteText.textContent = quote.text || '';
    if (this.els.quoteAuthor) this.els.quoteAuthor.textContent = quote.author ? `— ${quote.author}` : '';
    if (this.els.quoteSource) this.els.quoteSource.textContent = quote.source || '';
    if (this.els.quoteTradition) this.els.quoteTradition.textContent = quote.tradition || '';
    
    document.title = `${quote.source || 'Silent Words'} — ${quote.author || ''}`;
  }

  handlePull() {
    if (this.quotes.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.quotes.length;
    this.showQuote();
  }

  async handleCopy() {
    if (this.quotes.length === 0) return;
    const quote = this.quotes[this.currentIndex];
    const text = `"${quote.text}" ${quote.author ? `— ${quote.author}` : ''}`;
    
    try {
      await navigator.clipboard.writeText(text);
      this.showToast(TRANSLATIONS[this.currentLang].copySuccess);
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.showToast(TRANSLATIONS[this.currentLang].copySuccess);
    }
  }

  handleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('sw-theme', next);
    if (this.els.btnTheme) this.els.btnTheme.textContent = next === 'dark' ? '🌙' : '☀️';
  }

  initTheme() {
    const saved = localStorage.getItem('sw-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    if (this.els.btnTheme) this.els.btnTheme.textContent = theme === 'dark' ? '🌙' : '☀️';
  }

  updateStats() {
    const t = TRANSLATIONS[this.currentLang];
    const count = this.quotes.length;
    if (this.els.stats) {
      this.els.stats.textContent = `${count} ${t.stats}`;
      this.els.stats.style.color = 'var(--muted)';
    }
  }

  showToast(message) {
    if (!this.els.toast) return;
    this.els.toast.textContent = message;
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
