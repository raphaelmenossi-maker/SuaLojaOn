/** Helpers de interface: criação de elementos, avisos, folhas e diálogos. */

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'html') el.innerHTML = value;
    else if (key === 'text') el.textContent = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat(3)) {
    if (child === null || child === undefined || child === false) continue;
    el.appendChild(typeof child === 'object' ? child : document.createTextNode(String(child)));
  }
  return el;
}

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

export function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDateBR(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/* ---------------- avisos ---------------- */

let toastHost = null;
export function toast(message, type = 'info') {
  if (!toastHost) {
    toastHost = h('div', { class: 'toast-host' });
    document.body.appendChild(toastHost);
  }
  const icon = { info: 'ℹ️', success: '✅', error: '⚠️', warn: '🔔' }[type] || 'ℹ️';
  const node = h('div', { class: `toast toast--${type}` }, h('span', { class: 'toast__icon', text: icon }), h('span', { text: message }));
  toastHost.appendChild(node);
  requestAnimationFrame(() => node.classList.add('is-visible'));
  setTimeout(() => {
    node.classList.remove('is-visible');
    setTimeout(() => node.remove(), 250);
  }, 3200);
}

/* ---------------- folhas (bottom sheet) ---------------- */

export function openSheet({ title, subtitle, content, actions = [], size = 'auto' }) {
  const backdrop = h('div', { class: 'sheet-backdrop' });
  const sheet = h('div', { class: `sheet sheet--${size}` });
  const close = () => {
    backdrop.classList.remove('is-open');
    sheet.classList.remove('is-open');
    setTimeout(() => { backdrop.remove(); sheet.remove(); document.body.classList.remove('no-scroll'); }, 220);
  };
  const head = h('div', { class: 'sheet__head' },
    h('div', {},
      h('h2', { class: 'sheet__title', text: title || '' }),
      subtitle ? h('p', { class: 'sheet__subtitle', text: subtitle }) : null),
    h('button', { class: 'icon-btn', 'aria-label': 'Fechar', onClick: close, html: '&times;' }));
  const body = h('div', { class: 'sheet__body' });
  if (typeof content === 'string') body.innerHTML = content;
  else if (content) body.appendChild(content);

  sheet.appendChild(head);
  sheet.appendChild(body);
  if (actions.length) {
    const foot = h('div', { class: 'sheet__foot' });
    actions.forEach((a) => {
      const btn = h('button', { class: `btn ${a.class || 'btn--ghost'}`, onClick: () => a.onClick?.(close) }, a.label);
      foot.appendChild(btn);
    });
    sheet.appendChild(foot);
  }
  backdrop.addEventListener('click', close);
  document.body.appendChild(backdrop);
  document.body.appendChild(sheet);
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => {
    backdrop.classList.add('is-open');
    sheet.classList.add('is-open');
  });
  return { close, body, sheet };
}

/* ---------------- diálogo de confirmação ---------------- */

export function confirmDialog({ title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false }) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (value, close) => {
      if (done) return;
      done = true;
      close();
      resolve(value);
    };
    const { close } = openSheet({
      title,
      size: 'sm',
      content: h('p', { class: 'dialog-text', text: message }),
      actions: [
        { label: cancelLabel, class: 'btn--ghost', onClick: (c) => finish(false, c) },
        { label: confirmLabel, class: danger ? 'btn--danger' : 'btn--primary', onClick: (c) => finish(true, c) },
      ],
    });
    const obs = new MutationObserver(() => {
      if (!document.body.contains(document.querySelector('.sheet-backdrop'))) {
        obs.disconnect();
        resolve(false);
      }
    });
    obs.observe(document.body, { childList: true });
  });
}

/* ---------------- carregando ---------------- */

export function skeleton(count = 6) {
  return h('div', { class: 'grid' }, Array.from({ length: count }, () =>
    h('div', { class: 'card card--skeleton' },
      h('div', { class: 'sk sk--img' }),
      h('div', { class: 'sk sk--line' }),
      h('div', { class: 'sk sk--line sk--short' }))));
}
