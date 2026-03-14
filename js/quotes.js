/**
 * Quotes Module
 * Manages quote loading, caching, and selection
 */

import { QUOTE_SOURCES } from './constants.js';
import { db } from './db.js';
import { i18n } from './i18n.js';

class QuotesManager {
  constructor() {
    this.quotes = [];
    this.currentIndex = 0;
    this.sourcesLoaded = new Set();
    this.isLoading = false;
  }

  async loadAllQuotes() {
    this.isLoading = true;
    const currentLang = i18n.getCurrentLanguage();
    const loadPromises = QUOTE_SOURCES.map(source => this.loadSource(source, currentLang));
    
    try {
      await Promise.all(loadPromises);
      this.shuffleQuotes();
      return true;
    } catch (error) {
      console.error('[Quotes] Error loading quotes:', error);
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  async loadSource(sourceConfig, language) {
    // Check cache first
    const cached = await db.getCachedQuotes(sourceConfig.id, language);
    if (cached) {
      this.addQuotes(cached, sourceConfig.id);
      return;
    }

    // Fetch from network
    const fileName = sourceConfig.filePattern(language);
    try {
      const response = await fetch(`data/${fileName}`);
      if (!response.ok) throw new Error(`Failed to load ${fileName}`);
      
      const data = await response.json();
      
      // Cache for offline use
      await db.cacheQuotes(sourceConfig.id, language, data.quotes);
      this.addQuotes(data.quotes, sourceConfig.id);
      
    } catch (error) {
      console.warn(`[Quotes] Failed to load ${sourceConfig.id}, trying fallback:`, error);
      // Try English fallback if current language failed
      if (language !== 'en') {
        return this.loadSource(sourceConfig, 'en');
      }
      throw error;
    }
  }

  addQuotes(quotes, sourceId) {
    const processed = quotes.map((q, idx) => ({
      ...q,
      id: `${sourceId}_${idx}`,
      source: sourceId,
      sourceDisplay: i18n.t(`quotes.source${this.capitalize(sourceId)}`, sourceId)
    }));
    
    this.quotes.push(...processed);
    this.sourcesLoaded.add(sourceId);
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  shuffleQuotes() {
    for (let i = this.quotes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.quotes[i], this.quotes[j]] = [this.quotes[j], this.quotes[i]];
    }
    this.currentIndex = 0;
  }

  getCurrentQuote() {
    if (this.quotes.length === 0) return null;
    return this.quotes[this.currentIndex];
  }

  next() {
    if (this.quotes.length === 0) return null;
    this.currentIndex = (this.currentIndex + 1) % this.quotes.length;
    return this.getCurrentQuote();
  }

  previous() {
    if (this.quotes.length === 0) return null;
    this.currentIndex = (this.currentIndex - 1 + this.quotes.length) % this.quotes.length;
    return this.getCurrentQuote();
  }

  random() {
    if (this.quotes.length === 0) return null;
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * this.quotes.length);
    } while (newIndex === this.currentIndex && this.quotes.length > 1);
    
    this.currentIndex = newIndex;
    return this.getCurrentQuote();
  }

  getProgress() {
    return {
      current: this.currentIndex + 1,
      total: this.quotes.length
    };
  }

  async reloadWithLanguage() {
    this.quotes = [];
    this.sourcesLoaded.clear();
    this.currentIndex = 0;
    return this.loadAllQuotes();
  }
}

export const quotesManager = new QuotesManager();
