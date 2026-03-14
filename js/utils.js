/**
 * Utility Functions
 */

import { i18n } from './i18n.js';

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const showToast = (messageKey, type = 'success') => {
  const toast = document.getElementById('toast');
  const message = document.getElementById('toast-message');
  
  if (!toast || !message) return;
  
  message.textContent = i18n.t(messageKey, messageKey);
  toast.className = `toast show ${type}`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
};

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    showToast('ui.copySuccess');
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      document.execCommand('copy');
      showToast('ui.copySuccess');
      return true;
    } catch (e) {
      showToast('ui.error', 'error');
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
};

export const shareQuote = async (quote) => {
  const shareData = {
    title: i18n.t('ui.title'),
    text: `"${quote.text}" — ${quote.sourceDisplay}`,
    url: window.location.href
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      showToast('ui.shareSuccess');
      return true;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
      }
    }
  }
  
  // Fallback to clipboard
  const textToShare = `${shareData.text}\n\n${shareData.url}`;
  return copyToClipboard(textToShare);
};

export const detectTheme = () => {
  const saved = localStorage.getItem('silentwords-theme');
  if (saved) return saved;
  
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

export const setTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('silentwords-theme', theme);
};

export const toggleTheme = () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
};
