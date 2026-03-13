// ─── Quote Logic ───────────────────────────────────────────────────────────────
import { CATEGORIES, MAX_RANDOM_ATTEMPTS } from './constants.js';

let state = {
  databases: {
    dhammapada: [],
    koans: [],
    tao: []
  },
  loaded: false,
  currentCategory: CATEGORIES.ALL,
  currentQuote: null
};

export function validateQuote(quote) {
  return quote &&
         typeof quote.text === 'string' &&
         quote.text.length > 0 &&
         typeof quote.source === 'string';
}

export function getPool() {
  if (state.currentCategory === CATEGORIES.ALL) {
    return [
      ...state.databases.dhammapada,
      ...state.databases.koans,
      ...state.databases.tao
    ];
  }
  return state.databases[state.currentCategory] || [];
}

export function getRandomQuote() {
  const pool = getPool();
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0];

  let quote;
  let attempts = 0;
  do {
    quote = pool[Math.floor(Math.random() * pool.length)];
    attempts++;
  } while (state.currentQuote && quote.text === state.currentQuote.text && attempts < MAX_RANDOM_ATTEMPTS);

  return quote;
}

export function setCurrentCategory(cat) {
  state.currentCategory = cat;
}

export function setDatabases(type, data) {
  state.databases[type] = data;
}

export function setLoaded(status) {
  state.loaded = status;
}

export function setCurrentQuote(quote) {
  state.currentQuote = quote;
}

export function getState() {
  return state;
}