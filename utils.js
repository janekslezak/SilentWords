// ─── Utilities ──────────────────────────────────────────────────────────────────
export function formatQuoteForSharing(quote) {
  const author = quote.author || 'Laozi';
  const src = quote.chapter ? `${quote.source}, ch. ${quote.chapter}` : (quote.source || '');
  return `"${quote.text}" — ${author}${src ? ` (${src})` : ''}`;
}

export function showToast(msg, toastElement) {
  if (!toastElement) return;
  toastElement.textContent = msg;
  toastElement.classList.add('show');
  setTimeout(() => toastElement.classList.remove('show'), 2000);
}