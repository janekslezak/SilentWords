// ─── Silent Words - Main App ────────────────────────────────────────────────────
import { CONFIG, THEMES, CATEGORIES } from './constants.js';
import { initIndexedDB, cacheQuotes, getCachedQuotes } from './db.js';
import {
  validateQuote, getRandomQuote, setCurrentCategory,
  setDatabases, setLoaded, setCurrentQuote, getState
} from './quotes.js';
import { formatQuoteForSharing, showToast } from './utils.js';

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

let state = getState();

// ─── Database Loading ───────────────────────────────────────────────────────────
async function loadDatabase(type) {
  try {
    const cached = await getCachedQuotes(type);
    if (cached && Array.isArray(cached)) {
      setDatabases(type, cached);
      console.log(`Loaded ${cached.length} ${type} from cache`);
      if (!state.loaded) updateDisplayAfterLoad();
    }

    const response = await fetch(`${CONFIG.dataPath}${CONFIG.files[type]}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid format');

    const validData = data.filter(validateQuote);
    if (validData.length === 0) throw new Error('No valid quotes');

    setDatabases(type, validData);
    await cacheQuotes(type, validData);
    console.log(`Loaded ${validData.length} ${type} from network`);
    return true;
  } catch (error) {
    console.error(`Failed to load ${type}:`, error);
    if (state.databases[type].length === 0) {
      showToast(`Failed to load ${type}. Using cached data.`, elements.toast);
    }
    return false;
  }
}

function updateDisplayAfterLoad() {
  const totalLoaded = state.databases.dhammapada.length +
                      state.databases.koans.length +
                      state.databases.tao.length;

  if (totalLoaded === 0) {
    elements.stats.textContent = 'Error: No databases found';
    return;
  }

  setLoaded(true);
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

// ─── UI Logic ────────────────────────────────────────────────────────────────────
function displayQuote() {
  if (!state.loaded) return;

  const quote = getRandomQuote();
  if (!quote) return;

  setCurrentQuote(quote);

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
  setCurrentCategory(cat);

  elements.categoryBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === cat);
  });

  updateStats();
  displayQuote();
}

// ─── Event Handlers ──────────────────────────────────────────────────────────────
function copyToClipboard() {
  if (!state.currentQuote) return;
  const text = formatQuoteForSharing(state.currentQuote);

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Copied to clipboard', elements.toast))
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
    showToast('Copied to clipboard', elements.toast);
  } catch (err) {
    showToast('Failed to copy', elements.toast);
  }
  document.body.removeChild(ta);
}

async function shareQuote() {
  if (!state.currentQuote) return;
  const text = formatQuoteForSharing(state.currentQuote);

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

function applyTheme() {
  const theme = localStorage.getItem('theme') || THEMES.DARK;
  document.documentElement.setAttribute('data-theme', theme);
  if (elements.btnTheme) {
    elements.btnTheme.textContent = theme === THEMES.DARK ? '🌙' : '☀️';
    elements.btnTheme.setAttribute('aria-label',
      theme === THEMES.DARK ? 'Switch to light theme' : 'Switch to dark theme'
    );
  }
}

function toggleTheme() {
  const newTheme = state.theme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
  localStorage.setItem('theme', newTheme);
  state.theme = newTheme;
  applyTheme();
}

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

function updateOnlineStatus() {
  const isOnline = navigator.onLine;
  document.body.classList.toggle('offline', !isOnline);
  if (elements.offlineIndicator) {
    elements.offlineIndicator.style.display = isOnline ? 'none' : 'flex';
  }
  updateStats();
}

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
    showToast('App installed', elements.toast);
    if (elements.btnInstall) {
      elements.btnInstall.style.display = 'none';
    }
  }
  state.deferredPrompt = null;
}

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
      setCategory(CATEGORIES.ALL);
      break;
    case '2':
      setCategory(CATEGORIES.DHAMMAPADA);
      break;
    case '3':
      setCategory(CATEGORIES.KOANS);
      break;
    case '4':
      setCategory(CATEGORIES.TAO);
      break;
  }
}

// ─── Initialization ─────────────────────────────────────────────────────────────
function init() {
  state.theme = localStorage.getItem('theme') || THEMES.DARK;
  applyTheme();
  updateOnlineStatus();

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