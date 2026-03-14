/**
 * Database Module
 * Handles IndexedDB operations and caching
 */

import { DB_CONFIG, APP_CONFIG } from './constants.js';
import { i18n } from './i18n.js';

class Database {
  constructor() {
    this.db = null;
    this.initPromise = null;
  }

  async init() {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.NAME, DB_CONFIG.VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Quotes store
        if (!db.objectStoreNames.contains(DB_CONFIG.STORES.QUOTES)) {
          db.createObjectStore(DB_CONFIG.STORES.QUOTES, { keyPath: 'id' });
        }
        
        // Settings store
        if (!db.objectStoreNames.contains(DB_CONFIG.STORES.SETTINGS)) {
          db.createObjectStore(DB_CONFIG.STORES.SETTINGS, { keyPath: 'key' });
        }
        
        // Cache store with expiration
        if (!db.objectStoreNames.contains(DB_CONFIG.STORES.CACHE)) {
          const cacheStore = db.createObjectStore(DB_CONFIG.STORES.CACHE, { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
    
    return this.initPromise;
  }

  async getFromStore(storeName, key) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async setInStore(storeName, data) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedQuotes(sourceId, language) {
    const cacheKey = `quotes_${sourceId}_${language}`;
    const cached = await this.getFromStore(DB_CONFIG.STORES.CACHE, cacheKey);
    
    if (cached && Date.now() - cached.timestamp < APP_CONFIG.CACHE_DURATION) {
      return cached.data;
    }
    
    return null;
  }

  async cacheQuotes(sourceId, language, data) {
    const cacheKey = `quotes_${sourceId}_${language}`;
    await this.setInStore(DB_CONFIG.STORES.CACHE, {
      key: cacheKey,
      data: data,
      timestamp: Date.now()
    });
  }

  async getSetting(key, defaultValue = null) {
    const result = await this.getFromStore(DB_CONFIG.STORES.SETTINGS, key);
    return result ? result.value : defaultValue;
  }

  async setSetting(key, value) {
    await this.setInStore(DB_CONFIG.STORES.SETTINGS, { key, value });
  }

  async clearCache() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([DB_CONFIG.STORES.CACHE], 'readwrite');
      const store = transaction.objectStore(DB_CONFIG.STORES.CACHE);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const db = new Database();
