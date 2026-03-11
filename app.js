// ─── Silent Words - Modular Local Database ──────────────────────
// Loads from /data/ folder: dhammapada.json, koans.json, taoteching.json

const CONFIG = {
  dataPath: './data/',
  files: {
    dhammapada: 'dhammapada.json',
    koans: 'koans.json',
    tao: 'taoteching.json'
  }
};

const state = {
  databases: {
    dhammapada: [],
    koans: [],
    tao: []
  },
  loaded: false,
  currentCategory: 'all',
  currentQuote: null,
  theme: localStorage.getItem('theme') || 'dark',
  deferredPrompt: null,
  db: null
};

const elements = {
  quoteText: document.getElementById('quote-text'),
  quoteAuthor: document.getElementById('quote-author'),
  quoteSource: document.getElementById('quote-source'),
  quoteTradition: document.getElementById('quote-tradition'),
  quoteContent: document.getElementById('quote-content'),
  loader: document.getElementById('loader'),
  btnPull: document.getElementById('btn-pull'),
  btnCopy: document.getElementById('btn-copy'),
  btnShare: document.getElementById('btn-share'),
  btnTheme: document.getElementById('btn-theme'),
  btnInstall: document.getElementById('btn-install'),
  btnDetails: document.getElementById('btn-details'),
  creditsPanel: document.getElementById('credits-panel'),
  categoryBtns: document.querySelectorAll('.source-btn'),
  stats: document.getElementById('stats'),
  toast: document.getElementById('toast'),
  offlineIndicator: document.getElementById('offline-indicator')
};

// ─── IndexedDB Setup ────────────────────────────────────────────

const DB_NAME = 'SilentWordsDB';
const DB_VERSION = 1;
const STORE_NAME = 'quotes';

function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      state.db = request.result;
      resolve(state.db);
    };
    
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function cacheQuotes(type, data) {
  if (!state.db) return;
  const tx = state.db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await store.put(data, type);
}

async function getCachedQuotes(type) {
  if (!state.db) return null;
  return new Promise((resolve) => {
    const tx = state.db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(type);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

// ─── Database Loading ───────────────────────────────────────────

async function loadDatabase(type) {
  try {
    // Try cache first for instant display
    const cached = await getCachedQuotes(type);
    if (cached && Array.isArray(cached)) {
      state.databases[type] = cached;
      console.log(`Loaded ${cached.length} ${type} from cache`);
      if (!state.loaded) updateDisplayAfterLoad();
    }

    // Fetch fresh data
    const response = await fetch(`${CONFIG.dataPath}${CONFIG.files[type]}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid format');

    // Validate data integrity
    const validData = data.filter(validateQuote);
    if (validData.length !== data.length) {
      console.warn(`Filtered ${data.length - validData.length} invalid quotes from ${type}`);
    }

    state.databases[type] = validData;
    await cacheQuotes(type, validData);
    console.log(`Loaded ${validData.length} ${type} from network`);
    return true;
  } catch (error) {
    console.error(`Failed to load ${type}:`, error);
    if (!state.databases[type].length) {
      state.databases[type] = [];
    }
    return false;
  }
}

function validateQuote(quote) {
  return quote && 
         typeof quote.text === 'string' && 
         quote.text.length > 0 &&
         typeof quote.source === 'string';
}

function updateDisplayAfterLoad() {
  const totalLoaded = state.databases.dhammapada.length +
                      state.databases.koans.length +
                      state.databases.tao.length;

  if (totalLoaded === 0) {
    elements.stats.textContent = 'Error: No databases found';
    return;
  }

  state.loaded = true;
  elements.loader.style.display = 'none';
  elements.quoteContent.style.display = 'block';
  elements.btnPull.disabled = false;

  updateStats();
  displayQuote();
}

async function initDatabases() {
  await initIndexedDB();
  elements.btnPull.disabled = true;

  await Promise.all([
    loadDatabase('dhammapada'),
    loadDatabase('koans'),
    loadDatabase('tao')
  ]);

  updateDisplayAfterLoad();
}

// ─── Quote Logic ────────────────────────────────────────────────

function getPool() {
  if (state.currentCategory === 'all') {
    return [
      ...state.databases.dhammapada,
      ...state.databases.koans,
      ...state.databases.tao
    ];
  }
  return state.databases[state.currentCategory] || [];
}

function getRandomQuote() {
  const pool = getPool();
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0];

  let quote;
  let attempts = 0;
  do {
    quote = pool[Math.floor(Math.random() * pool.length)];
    attempts++;
  } while (state.currentQuote && quote.text === state.currentQuote.text && attempts < 10);

  return quote;
}

function displayQuote() {
  if (!state.loaded) return;

  const quote = getRandomQuote();
  if (!quote) return;

  state.currentQuote = quote;

  elements.quoteText.setAttribute('aria-busy', 'true');
  elements.quoteText.style.opacity = '0';
  elements.quoteAuthor.style.opacity = '0';

  setTimeout(() => {
    elements.quoteText.textContent = quote.text;
    elements.quoteAuthor.textContent = quote.author ? `— ${quote.author}` : '— Laozi';

    if (quote.chapter) {
      elements.quoteSource.textContent = `${quote.source}, ch. ${quote.chapter}`;
    } else {
      elements.quoteSource.textContent = quote.source || '';
    }

    elements.quoteTradition.textContent = quote.tradition || (quote.translator ? `Trans. ${quote.translator}` : '');

    elements.quoteText.style.opacity = '1';
    elements.quoteAuthor.style.opacity = '1';
    elements.quoteText.setAttribute('aria-busy', 'false');
  }, 150);
}

function updateStats() {
  if (!elements.stats) return;

  const d = state.databases.dhammapada.length;
  const k = state.databases.koans.length;
  const t = state.databases.tao.length;
  const total = d + k + t;
  const isOffline = !navigator.onLine;
  const statusPrefix = isOffline ? 'Offline • ' : '';

  const labels = {
    all: `${statusPrefix}${total} quotes • ${d} Dhammapada • ${k} Koans • ${t} Dao`,
    dhammapada: `${statusPrefix}${d} quotes — Dhammapada`,
    koans: `${statusPrefix}${k} quotes — Koans`,
    tao: `${statusPrefix}${t} quotes — Dao`
  };

  elements.stats.textContent = labels[state.currentCategory] || '';
}

function setCategory(cat) {
  state.currentCategory = cat;

  elements.categoryBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === cat);
  });

  updateStats();
  displayQuote();
}

// ─── Utilities ──────────────────────────────────────────────────

function copyToClipboard() {
  if (!state.currentQuote) return;

  const q = state.currentQuote;
  const author = q.author || 'Laozi';
  const src = q.chapter ? `${q.source}, ch. ${q.chapter}` : (q.source || '');
  const text = `"${q.text}" — ${author}${src ? ` (${src})` : ''}`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Copied to clipboard'))
      .catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('aria-hidden', 'true');
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast('Copied to clipboard');
  } catch (err) {
    showToast('Failed to copy');
  }
  document.body.removeChild(ta);
}

async function shareQuote() {
  if (!state.currentQuote) return;
  
  const q = state.currentQuote;
  const author = q.author || 'Laozi';
  const text = `"${q.text}" — ${author}`;
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Silent Words',
        text: text,
        url: window.location.href
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        copyToClipboard();
      }
    }
  } else {
    copyToClipboard();
  }
}

function showToast(msg) {
  if (!elements.toast) return;
  elements.toast.textContent = msg;
  elements.toast.classList.add('show');
  setTimeout(() => elements.toast.classList.remove('show'), 2000);
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  if (elements.btnTheme) {
    elements.btnTheme.textContent = state.theme === 'dark' ? '🌙' : '☀️';
  }
  if (elements.btnTheme) {
    elements.btnTheme.setAttribute('aria-label', 
      state.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
    );
  }
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', state.theme);
  applyTheme();
}

// ─── Details Panel Toggle ───────────────────────────────────────

function toggleDetails() {
  const panel = elements.creditsPanel;
  const btn = elements.btnDetails;
  const isHidden = panel.hasAttribute('hidden');
  
  if (isHidden) {
    panel.removeAttribute('hidden');
    btn.setAttribute('aria-expanded', 'true');
  } else {
    panel.setAttribute('hidden', '');
    btn.setAttribute('aria-expanded', 'false');
  }
}

// ─── Online/Offline Handling ────────────────────────────────────

function updateOnlineStatus() {
  const isOnline = navigator.onLine;
  document.body.classList.toggle('offline', !isOnline);
  if (elements.offlineIndicator) {
    elements.offlineIndicator.style.display = isOnline ? 'none' : 'flex';
  }
  updateStats();
}

// ─── Install Prompt ─────────────────────────────────────────────

function handleInstallPrompt(e) {
  e.preventDefault();
  state.deferredPrompt = e;
  if (elements.btnInstall) {
    elements.btnInstall.style.display = 'flex';
  }
}

async function installApp() {
  if (!state.deferredPrompt) return;
  
  state.deferredPrompt.prompt();
  const { outcome } = await state.deferredPrompt.userChoice;
  
  if (outcome === 'accepted') {
    showToast('App installed');
    if (elements.btnInstall) {
      elements.btnInstall.style.display = 'none';
    }
  }
  state.deferredPrompt = null;
}

// ─── Keyboard Shortcuts ─────────────────────────────────────────

function handleKeyboard(e) {
  if (e.target.matches('input, textarea')) return;
  
  const key = e.key.toLowerCase();
  
  switch(key) {
    case ' ':
    case 'enter':
      e.preventDefault();
      displayQuote();
      break;
    case 'c':
      copyToClipboard();
      break;
    case 's':
      shareQuote();
      break;
    case 't':
      toggleTheme();
      break;
    case '1':
      setCategory('all');
      break;
    case '2':
      setCategory('dhammapada');
      break;
    case '3':
      setCategory('koans');
      break;
    case '4':
      setCategory('tao');
      break;
  }
}

// ─── Initialization ─────────────────────────────────────────────

function init() {
  applyTheme();
  updateOnlineStatus();

  // Event listeners
  if (elements.btnTheme) elements.btnTheme.addEventListener('click', toggleTheme);
  if (elements.btnPull) elements.btnPull.addEventListener('click', displayQuote);
  if (elements.btnCopy) elements.btnCopy.addEventListener('click', copyToClipboard);
  if (elements.btnShare) elements.btnShare.addEventListener('click', shareQuote);
  if (elements.btnInstall) elements.btnInstall.addEventListener('click', installApp);
  if (elements.btnDetails) elements.btnDetails.addEventListener('click', toggleDetails);

  if (elements.categoryBtns) {
    elements.categoryBtns.forEach(btn => {
      btn.addEventListener('click', () => setCategory(btn.dataset.category));
    });
  }

  document.addEventListener('keydown', handleKeyboard);
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  window.addEventListener('beforeinstallprompt', handleInstallPrompt);

  initDatabases();
}

document.addEventListener('DOMContentLoaded', init);
