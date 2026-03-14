/**
 * Silent Words - Main Application
 */

import { SOURCE_MAP, TRANSLATIONS } from './constants.js';

class App {
  constructor() {
    this.quotes = [];
    this.currentIndex = 0;
    this.currentLang = localStorage.getItem('sw-lang') || 'en';
    this.currentCategory = 'all';
    this.isLoading = false;
    
    // Bind methods
    this.handlePull = this.handlePull.bind(this);
    this.handleCopy = this.handleCopy.bind(this);
    this.handleTheme = this.handleTheme.bind(this);
    this.handleLang = this.handleLang.bind(this);
    this.handleSourceChange = this.handleSourceChange.bind(this);
  }

  async init() {
    // Set initial lang attribute
    document.documentElement.lang = this.currentLang;
    
    // Cache DOM elements
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
      sourceBtns: document.querySelectorAll('.source-btn')
    };

    // Setup event listeners
    this.setupListeners();
    
    // Setup theme
    this.initTheme();
    
    // Update language button display
    this.updateLangButton();
    
    // Update UI text
    this.updateUIText();
    
    // Load quotes
    await this.loadQuotes();
    
    // Show first quote
    this.showQuote();
  }

  setupListeners() {
    // Main controls
    this.els.btnPull.addEventListener('click', this.handlePull);
    this.els.btnCopy.addEventListener('click', this.handleCopy);
    this.els.btnTheme.addEventListener('click', this.handleTheme);
    this.els.btnLang.addEventListener('click', this.handleLang);
    
    // Source selection
    this.els.sourceBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleSourceChange(e.target.dataset.category));
    });
    
    // Keyboard
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

  async handleLang() {
    const newLang = this.currentLang === 'en' ? 'pl' : 'en';
    this.currentLang = newLang;
    localStorage.setItem('sw-lang', newLang);
    document.documentElement.lang = newLang;
    
    this.updateLangButton();
    this.updateUIText();
    
    // Reload quotes with new language
    await this.loadQuotes();
    this.showQuote();
  }

  updateLangButton() {
    const codeEl = this.els.btnLang.querySelector('.lang-code');
    if (codeEl) {
      codeEl.textContent = this.currentLang.toUpperCase();
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
    
    // Update active button
    this.els.sourceBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });
    
    this.currentCategory = category;
    await this.loadQuotes();
    this.showQuote();
  }

  async loadQuotes() {
    this.isLoading = true;
    this.els.btnPull.disabled = true;
    this.els.loader.style.display = 'flex';
    this.els.quoteContent.style.display = 'none';
    
    this.quotes = [];
    
    try {
      const sources = this.currentCategory === 'all' 
        ? SOURCE_MAP.all 
        : [SOURCE_MAP[this.currentCategory]];
      
      for (const source of sources) {
        const fileName = `${source}-${this.currentLang}.json`;
        try {
          const response = await fetch(`data/${fileName}`);
          if (!response.ok) {
            // Try fallback to English if translation missing
            if (this.currentLang !== 'en') {
              const fallback = await fetch(`data/${source}-en.json`);
              if (fallback.ok) {
                const data = await fallback.json();
                this.quotes.push(...data);
              }
            }
          } else {
            const data = await response.json();
            this.quotes.push(...data);
          }
        } catch (e) {
          console.warn(`Failed to load ${fileName}:`, e);
        }
      }
      
      // Shuffle
      this.shuffleQuotes();
      this.currentIndex = 0;
      
      // Update stats
      this.updateStats();
      
    } catch (error) {
      console.error('Error loading quotes:', error);
      this.quotes = [{
        text: this.currentLang === 'pl' ? 'Błąd ładowania cytatów' : 'Error loading quotes',
        author: '',
        source: 'Error',
        tradition: ''
      }];
    } finally {
      this.isLoading = false;
      this.els.btnPull.disabled = false;
      this.els.loader.style.display = 'none';
      this.els.quoteContent.style.display = 'block';
    }
  }

  shuffleQuotes() {
    for (let i = this.quotes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.quotes[i], this.quotes[j]] = [this.quotes[j], this.quotes[i]];
    }
  }

  showQuote() {
    const quote = this.quotes[this.currentIndex];
    if (!quote) return;
    
    this.els.quoteText.textContent = quote.text;
    this.els.quoteAuthor.textContent = quote.author ? `— ${quote.author}` : '';
    this.els.quoteSource.textContent = quote.source || '';
    this.els.quoteTradition.textContent = quote.tradition || '';
  }

  handlePull() {
    this.currentIndex = (this.currentIndex + 1) % this.quotes.length;
    this.showQuote();
  }

  async handleCopy() {
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
    this.els.btnTheme.textContent = theme === 'dark' ? '🌙' : '☀️';
  }

  updateStats() {
    const count = this.quotes.length;
    const t = TRANSLATIONS[this.currentLang];
    this.els.stats.textContent = `${count} quotes loaded`;
  }

  showToast(message) {
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
