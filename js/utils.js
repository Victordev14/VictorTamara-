// VictorLeads — shared helpers

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pickRandom(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

export function pickMany(arr, n) {
  const copy = [...arr];
  const out = [];
  n = Math.min(n, copy.length);
  for (let i = 0; i < n; i++) {
    out.push(copy.splice(randomInt(0, copy.length - 1), 1)[0]);
  }
  return out;
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function scoreClass(score) {
  if (score >= 80) return 'high';
  if (score >= 50) return 'mid';
  return 'low';
}

export function scoreLabel(score) {
  if (score >= 80) return 'Alta oportunidade';
  if (score >= 50) return 'Média oportunidade';
  return 'Baixa oportunidade';
}

export function waLink(ddi, phone, message = '') {
  const digits = `${ddi}${phone}`.replace(/\D/g, '');
  const q = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${q}`;
}

export function downloadCSV(filename, rows) {
  const csv = rows.map(row => row.map(cell => {
    const val = cell === null || cell === undefined ? '' : String(cell);
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// ---------- Toasts ----------
export function toast(message, type = 'info') {
  const root = document.getElementById('toastRoot');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-dot"></span><span>${escapeHtml(message)}</span>`;
  root.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .2s, transform .2s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(16px)';
    setTimeout(() => el.remove(), 220);
  }, 3200);
}

// ---------- Modal ----------
export function openModal(innerHtml, { size = '' } = {}) {
  closeModal();
  const root = document.getElementById('modalRoot');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'activeModalOverlay';
  overlay.innerHTML = `<div class="modal ${size}">${innerHtml}</div>`;
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) closeModal();
  });
  root.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  return overlay;
}

export function closeModal() {
  const overlay = document.getElementById('activeModalOverlay');
  if (overlay) overlay.remove();
  document.body.style.overflow = '';
}

export function confirmModal({ title, message, confirmLabel = 'Confirmar', danger = false, onConfirm }) {
  const overlay = openModal(`
    <div class="modal-head">
      <div class="modal-title">${escapeHtml(title)}</div>
      <button class="modal-close" data-close><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/></svg></button>
    </div>
    <div class="modal-body"><p style="color:var(--text-2);font-size:13px;line-height:1.6">${message}</p></div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancelar</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirmModalBtn">${escapeHtml(confirmLabel)}</button>
    </div>
  `);
  overlay.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
  overlay.querySelector('#confirmModalBtn').addEventListener('click', () => {
    closeModal();
    onConfirm && onConfirm();
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});
