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
  theme: localStorage.getItem('theme') || 'dark'
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
  btnTheme: document.getElementById('btn-theme'),
  categoryBtns: document.querySelectorAll('.source-btn'),
  stats: document.getElementById('stats'),
  toast: document.getElementById('toast')
};

// ─── Database Loading ───────────────────────────────────────────

async function loadDatabase(type) {
  try {
    const response = await fetch(`${CONFIG.dataPath}${CONFIG.files[type]}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid format');

    state.databases[type] = data;
    console.log(`Loaded ${data.length} ${type}`);
    return true;
  } catch (error) {
    console.error(`Failed to load ${type}:`, error);
    state.databases[type] = [];
    return false;
  }
}

async function initDatabases() {
  elements.btnPull.disabled = true;

  await Promise.all([
    loadDatabase('dhammapada'),
    loadDatabase('koans'),
    loadDatabase('tao')
  ]);

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
  do {
    quote = pool[Math.floor(Math.random() * pool.length)];
  } while (state.currentQuote && quote.text === state.currentQuote.text);

  return quote;
}

function displayQuote() {
  if (!state.loaded) return;

  const quote = getRandomQuote();
  if (!quote) return;

  state.currentQuote = quote;

  elements.quoteText.style.opacity = '0';
  elements.quoteAuthor.style.opacity = '0';

  setTimeout(() => {
    elements.quoteText.textContent = quote.text;
    elements.quoteAuthor.textContent = quote.author ? `— ${quote.author}` : '— Laozi';

    // Source line: show chapter for Tao, source for others
    if (quote.chapter) {
      elements.quoteSource.textContent = `${quote.source}, ch. ${quote.chapter}`;
    } else {
      elements.quoteSource.textContent = quote.source || '';
    }

    elements.quoteTradition.textContent = quote.tradition || (quote.translator ? `Trans. ${quote.translator}` : '');

    elements.quoteText.style.opacity = '1';
    elements.quoteAuthor.style.opacity = '1';
  }, 150);
}

function updateStats() {
  if (!elements.stats) return;

  const d = state.databases.dhammapada.length;
  const k = state.databases.koans.length;
  const t = state.databases.tao.length;
  const total = d + k + t;

  const labels = {
    all: `${total} quotes • ${d} Dhammapada • ${k} Koans • ${t} Daodejing`,
    dhammapada: `${d} quotes — Dhammapada`,
    koans: `${k} quotes — Koans`,
    tao: `${t} quotes — Daodejing`
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
    navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Copied to clipboard');
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
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', state.theme);
  applyTheme();
}

// ─── Initialization ─────────────────────────────────────────────

function init() {
  applyTheme();

  if (elements.btnTheme) elements.btnTheme.addEventListener('click', toggleTheme);
  if (elements.btnPull) elements.btnPull.addEventListener('click', displayQuote);
  if (elements.btnCopy) elements.btnCopy.addEventListener('click', copyToClipboard);

  if (elements.categoryBtns) {
    elements.categoryBtns.forEach(btn => {
      btn.addEventListener('click', () => setCategory(btn.dataset.category));
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.target.matches('button')) {
      e.preventDefault();
      displayQuote();
    }
  });

  initDatabases();
}

document.addEventListener('DOMContentLoaded', init);
