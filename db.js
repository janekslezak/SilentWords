// ─── IndexedDB Setup ───────────────────────────────────────────────────────────
import { DB_NAME, DB_VERSION, STORE_NAME } from './constants.js';

let db;

export async function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function cacheQuotes(type, data) {
  if (!db) return;
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await store.put(data, type);
}

export async function getCachedQuotes(type) {
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(type);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}