/** Casca do aplicativo: cabeçalho, navegação e roteador por hash. */

import { store } from './lib/store.js';
import { h, qs, qsa, toast } from './lib/ui.js';
import { renderHome, renderCheckout, openProductSheet, openCart, footer } from './views/shop.js';
import { renderAdmin } from './views/admin.js';

const view = () => document.getElementById('view');
let lastProductOpened = null;

function parseHash() {
  const raw = (location.hash || '#/').replace(/^#/, '');
  const parts = raw.split('/').filter(Boolean);
  return { parts };
}

function render() {
  const { parts } = parseHash();
  const root = view();
  root.innerHTML = '';
  qsa('.sheet-backdrop, .sheet').forEach((n) => n.remove());
  document.body.classList.remove('no-scroll');
  window.scrollTo({ top: 0 });

  if (parts[0] === 'checkout') {
    renderCheckout(root);
    setActiveNav('checkout');
    return;
  }

  if (parts[0] === 'admin') {
    renderAdmin(root, parts[1] || 'painel', parts[2] || '');
    setActiveNav('admin');
    return;
  }

  if (parts[0] === 'p' && parts[1]) {
    renderHome(root);
    if (lastProductOpened !== parts[1]) {
      lastProductOpened = parts[1];
      setTimeout(() => openProductSheet(parts[1]), 60);
    }
    setActiveNav('home');
    return;
  }

  if (parts[0] === 'carrinho') {
    renderHome(root);
    setTimeout(() => openCart(), 60);
    setActiveNav('cart');
    return;
  }

  renderHome(root);
  lastProductOpened = null;
  setActiveNav('home');
}

function setActiveNav(id) {
  qsa('[data-nav]').forEach((n) => n.classList.toggle('is-active', n.dataset.nav === id));
}

/* ------------------------------- cabeçalho ------------------------------- */

function buildHeader() {
  const cfg = store.state.config;
  const cartBadge = h('span', { class: 'cart-badge', id: 'cart-badge' });
  const header = h('header', { class: 'topbar' },
    h('a', { class: 'brand', href: '#/' },
      cfg.logo ? h('img', { class: 'brand__logo', src: cfg.logo, alt: cfg.storeName }) : h('span', { class: 'brand__mark', text: '🛍️' }),
      h('span', { class: 'brand__name', text: cfg.storeName })),
    h('div', { class: 'topbar__actions' },
      h('a', { class: 'icon-btn icon-btn--soft', href: '#/checkout', title: 'Finalizar pedido' },
        h('span', { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M9 3h6l1 3H8l1-3Z"/><path d="M6 6h12l-1 14H7L6 6Z"/><path d="M10 11v5M14 11v5"/></svg>' })),
      h('button', { class: 'icon-btn icon-btn--soft cart-btn', title: 'Carrinho', onClick: () => { location.hash = '#/carrinho'; } },
        h('span', { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6 5 3H2"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/></svg>' }),
        cartBadge)));
  return header;
}

function buildNav() {
  return h('nav', { class: 'tabbar' },
    h('a', { class: 'tabbar__link', href: '#/', dataset: { nav: 'home' } },
      h('span', { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/></svg>' }),
      h('span', { text: 'Início' })),
    h('a', { class: 'tabbar__link', href: '#/carrinho', dataset: { nav: 'cart' } },
      h('span', { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6 5 3H2"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/></svg>' }),
      h('span', { text: 'Carrinho' })),
    h('a', { class: 'tabbar__link', href: '#/admin/divulgar', dataset: { nav: 'share' } },
      h('span', { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>' }),
      h('span', { text: 'Divulgar' })),
    h('a', { class: 'tabbar__link', href: '#/admin', dataset: { nav: 'admin' } },
      h('span', { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>' }),
      h('span', { text: 'Painel' })));
}

/* ------------------------------- dados de exemplo ------------------------------- */

const DEMO = {
  config: {
    storeName: 'Ateliê da Lu',
    tagline: 'Peças artesanais feitas à mão — entrega em toda a cidade',
    whatsapp: '5511999999999',
    instagram: '@ateliedalu',
    city: 'São Paulo',
    pixKey: '',
    paymentNote: 'Pagamento no Pix ou na entrega.',
    shippingFee: 8,
    freeShippingOver: 150,
    deliveryNote: 'Entregas das 9h às 18h, de segunda a sábado.',
  },
  products: [
    { id: 'demo1', name: 'Vaso de cerâmica artesanal', price: 89.9, oldPrice: 129.9, desc: 'Vaso feito à mão com esmalte natural. Altura 18cm. Cada peça é única.', category: 'Decoração', tags: ['cerâmica', 'feito à mão'], stock: 4, emoji: '🏺', active: true, featured: true },
    { id: 'demo2', name: 'Ecobag de algodão cru', price: 39.9, oldPrice: 0, desc: 'Sacola de algodão cru com estampa exclusiva. 38x40cm.', category: 'Acessórios', tags: ['algodão', 'reutilizável'], stock: 12, emoji: '👜', active: true, featured: false },
    { id: 'demo3', name: 'Vela de cera de abelha', price: 24.9, oldPrice: 0, desc: 'Vela artesanal de 180g, queima por cerca de 25 horas.', category: 'Casa', tags: ['cera', 'perfumado'], stock: 8, emoji: '🕯️', active: true, featured: false },
    { id: 'demo4', name: 'Jogo de 4 coasters de cortiça', price: 54.9, oldPrice: 69.9, desc: 'Coasters de cortiça natural com ilustração exclusiva.', category: 'Mesa', tags: ['cortiça'], stock: 6, emoji: '🥂', active: true, featured: false },
    { id: 'demo5', name: 'Kit 3 potes de vidro temperado', price: 119.9, oldPrice: 0, desc: 'Kit com 3 potes herméticos de vidro temperado.', category: 'Cozinha', tags: ['vidro', 'kit'], stock: 3, emoji: '🫙', active: true, featured: true },
    { id: 'demo6', name: 'Banho de planta natural', price: 49.9, oldPrice: 0, desc: 'Banho relaxante com camomila e lavanda. 500ml.', category: 'Cuidado', tags: ['natural'], stock: 0, emoji: '🧴', active: true, featured: false },
  ],
};

async function loadInitialData() {
  await store.init();
  if (store.mode === 'server') return;

  // já existe catálogo local? (do navegador)
  if (!(store.state.products || []).length) {
    // sem catálogo local: usa o publicado (dados.json) e, sem ele, o exemplo
    let seed = null;
    try {
      const res = await fetch('./dados.json', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && (Array.isArray(data.products) || data.config)) seed = data;
      }
    } catch { /* sem dados.json */ }

    if (!seed) seed = DEMO;
    store.state.config = { ...store.state.config, ...(seed.config || {}) };
    store.state.products = Array.isArray(seed.products) ? seed.products : [];
    store.state.categories = store.deriveCategories();
    store.persist();
  }

  // catálogo remoto: a URL vem do dados.json publicado, então a busca vem DEPOIS
  // do seed — é ela que traz os produtos de verdade e o instagram/hashtags.
  if (store.state.config.remoteCatalogUrl && !store.remoteLoaded) {
    store.remoteStatus = await store.loadRemote();
  }
}
  await store.init();
  if (store.mode === 'server') return;

  // já existe catálogo local? (do navegador ou do catálogo remoto)
  if ((store.state.products || []).length) return;

  // sem catálogo local: usa o publicado (dados.json) e, sem ele, o exemplo
  let seed = null;
  try {
    const res = await fetch('./dados.json', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      // o arquivo publicado manda: mesmo com 0 produtos (catálogo vazio de propósito)
      if (data && (Array.isArray(data.products) || data.config)) seed = data;
    }
  } catch { /* sem dados.json */ }

  if (!seed) seed = DEMO;
  store.state.config = { ...store.state.config, ...(seed.config || {}) };
  store.state.products = Array.isArray(seed.products) ? seed.products : [];
  store.state.categories = store.deriveCategories();
  store.persist();
}

/* ------------------------------- inicialização ------------------------------- */

async function boot() {
  await loadInitialData();

  let header = buildHeader();
  document.getElementById('topbar-slot').replaceWith(header);
  document.getElementById('tabbar-slot').replaceWith(buildNav());

  const updateBadge = () => {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const count = store.state.cart.reduce((s, c) => s + c.qty, 0);
    badge.textContent = count ? String(count) : '';
    badge.classList.toggle('is-visible', count > 0);
  };

  // refaz o cabeçalho quando o nome/logo da loja mudam (ex.: ao salvar as configurações)
  let brandKey = brandSignature();
  store.onChange(() => {
    const next = brandSignature();
    if (next === brandKey) return;
    brandKey = next;
    const novo = buildHeader();
    header.replaceWith(novo);
    header = novo;
    updateBadge();
  });

  store.onChange(updateBadge);
  updateBadge();

  window.addEventListener('hashchange', render);
  render();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offline é opcional */ });
  }
}

function brandSignature() {
  const cfg = store.state.config;
  return JSON.stringify([cfg.storeName, cfg.logo, cfg.whatsapp]);
}

document.addEventListener('DOMContentLoaded', boot);
