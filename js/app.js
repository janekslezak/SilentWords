/**
 * Silent Words - Main Application
 * No external dependencies - self contained
 */

// Constants inline to avoid module loading issues
const SOURCE_MAP = {
  'dhammapada': 'dhammapada',
  'koans': 'zen',
  'tao': 'dao',
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
    errorLoading: 'Error loading databases',
    stats: 'quotes loaded'
  },
  pl: {
    loading: 'Ładowanie...',
    newQuote: 'Nowy Cytat',
    collection: 'Kolekcja:',
    all: 'Wszystko',
    koans: 'Koany',
    copySuccess: 'Skopiowano do schowka',
    errorLoading: 'Błąd ładowania baz danych',
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
    console.log('[App] Initializing...');
    
    // Set initial lang
    document.documentElement.lang = this.currentLang;
    
    // Cache DOM elements
    this.cacheElements();
    
    // Setup event listeners
    this.setupListeners();
    
    // Setup theme
    this.initTheme();
    
    // Update language button display
    this.updateLangButton();
    
    // Update UI text
    this.updateUIText();
    
    // Setup credits toggle
    this.setupCreditsToggle();
    
    // Load quotes
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
    
    console.log('[App] Elements cached:', Object.keys(this.els));
  }

  setupListeners() {
    // Main controls
    if (this.els.btnPull) {
      this.els.btnPull.addEventListener('click', () => this.handlePull());
    }
    if (this.els.btnCopy) {
      this.els.btnCopy.addEventListener('click', () => this.handleCopy());
    }
    if (this.els.btnTheme) {
      this.els.btnTheme.addEventListener('click', () => this.handleTheme());
    }
    if (this.els.btnLang) {
      this.els.btnLang.addEventListener('click', () => this.handleLang());
      console.log('[App] Language button listener added');
    }
    
    // Source selection
    if (this.els.sourceBtns) {
      this.els.sourceBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const category = e.target.dataset.category;
          this.handleSourceChange(category);
        });
      });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.handlePull();
      }
      if (e.code === 'KeyC' && (e.ctrlKey || e.metaKey)) return;
      if (e.code === 'KeyC') this.handleCopy();
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
    console.log('[App] Toggling language from:', this.currentLang);
    
    const newLang = this.currentLang === 'en' ? 'pl' : 'en';
    this.currentLang = newLang;
    localStorage.setItem('sw-lang', newLang);
    document.documentElement.lang = newLang;
    
    this.updateLangButton();
    this.updateUIText();
    
    // Reload quotes with new language
    this.els.loader.style.display = 'flex';
    this.els.quoteContent.style.display = 'none';
    
    try {
      await this.loadQuotes();
      this.showQuote();
    } catch (err) {
      console.error('[App] Error reloading after lang change:', err);
      this.showError();
    }
  }

  updateLangButton() {
    const codeEl = this.els.btnLang.querySelector('.lang-code');
    if (codeEl) {
      codeEl.textContent = this.currentLang.toUpperCase();
      console.log('[App] Language button updated to:', this.currentLang.toUpperCase());
    }
  }

  updateUIText() {
    const t = TRANSLATIONS[this.currentLang];
    
    // Update all elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) {
        el.textContent = t[key];
      }
    });
  }

  async handleSourceChange(category) {
    if (this.isLoading || category === this.currentCategory) return;
    
    console.log('[App] Changing source to:', category);
    
    // Update active button
    this.els.sourceBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });
    
    this.currentCategory = category;
    
    // Show loader
    this.els.loader.style.display = 'flex';
    this.els.quoteContent.style.display = 'none';
    
    await this.loadQuotes();
    this.showQuote();
  }

  async loadQuotes() {
    this.isLoading = true;
    if (this.els.btnPull) this.els.btnPull.disabled = true;
    
    this.quotes = [];
    
    const sources = this.currentCategory === 'all' 
      ? SOURCE_MAP.all 
      : [SOURCE_MAP[this.currentCategory]];
    
    console.log('[App] Loading sources:', sources, 'Language:', this.currentLang);
    
    let loadedCount = 0;
    let errors = [];
    
    for (const source of sources) {
      const fileName = `${source}-${this.currentLang}.json`;
      console.log('[App] Fetching:', fileName);
      
      try {
        const response = await fetch(`data/${fileName}`);
        
        if (!response.ok) {
          // Try fallback to English if translation missing
          if (this.currentLang !== 'en') {
            console.log(`[App] ${fileName} not found, trying English fallback`);
            const fallbackName = `${source}-en.json`;
            const fallbackResponse = await fetch(`data/${fallbackName}`);
            
            if (fallbackResponse.ok) {
              const data = await fallbackResponse.json();
              if (Array.isArray(data)) {
                this.quotes.push(...data);
                loadedCount += data.length;
                console.log(`[App] Loaded ${data.length} quotes from ${fallbackName}`);
              }
            } else {
              errors.push(`${fileName} (fallback failed)`);
            }
          } else {
            errors.push(fileName);
          }
        } else {
          const data = await response.json();
          if (Array.isArray(data)) {
            this.quotes.push(...data);
            loadedCount += data.length;
            console.log(`[App] Loaded ${data.length} quotes from ${fileName}`);
          } else {
            console.warn(`[App] Data from ${fileName} is not an array:`, data);
          }
        }
      } catch (e) {
        console.error(`[App] Error loading ${fileName}:`, e);
        errors.push(fileName);
      }
    }
    
    this.isLoading = false;
    if (this.els.btnPull) this.els.btnPull.disabled = false;
    
    if (this.quotes.length === 0) {
      console.error('[App] No quotes loaded. Errors:', errors);
      throw new Error('No databases found');
    }
    
    console.log(`[App] Total quotes loaded: ${this.quotes.length}`);
    
    // Shuffle
    this.shuffleQuotes();
    this.currentIndex = 0;
    
    // Update stats
    this.updateStats();
    
    // Hide loader, show content
    this.els.loader.style.display = 'none';
    this.els.quoteContent.style.display = 'block';
  }

  showError() {
    const t = TRANSLATIONS[this.currentLang];
    this.els.stats.textContent = t.errorLoading || 'Error: No databases found';
    this.els.stats.style.color = 'var(--danger)';
    this.els.loader.style.display = 'none';
    this.els.quoteContent.style.display = 'block';
    this.els.quoteText.textContent = t.errorLoading || 'Error loading databases';
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
    
    this.els.quoteText.textContent = quote.text || '';
    this.els.quoteAuthor.textContent = quote.author ? `— ${quote.author}` : '';
    this.els.quoteSource.textContent = quote.source || '';
    this.els.quoteTradition.textContent = quote.tradition || '';
    
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
      // Fallback
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
    this.els.btnTheme.textContent = next === 'dark' ? '🌙' : '☀️';
  }

  initTheme() {
    const saved = localStorage.getItem('sw-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    if (this.els.btnTheme) {
      this.els.btnTheme.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
  }

  updateStats() {
    const t = TRANSLATIONS[this.currentLang];
    const count = this.quotes.length;
    this.els.stats.textContent = `${count} ${t.stats || 'quotes loaded'}`;
    this.els.stats.style.color = 'var(--muted)';
  }

  showToast(message) {
    this.els.toast.textContent = message;
    this.els.toast.classList.add('show');
    setTimeout(() => {
      this.els.toast.classList.remove('show');
    }, 2000);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
  });
} else {
  const app = new App();
  app.init();
}
