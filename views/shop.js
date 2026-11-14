/** Telas públicas: vitrine, produto, carrinho, checkout e pedido. */

import { store } from '../lib/store.js';
import { h, qs, qsa, toast, openSheet, confirmDialog, money, formatDateBR } from '../lib/ui.js';
import { buildPixPayload } from '../lib/pix.js';
import { calcularFrete, soDigitos } from '../lib/frete.js';
import {
  buildPostText, copyText, openShare, productLink, storeLink,
  SHARE_TARGETS, nativeShare, buildShareCard, downloadCanvas,
} from '../lib/share.js';

/** Formata a data da última atualização de preços (ISO -> DD/MM/AAAA). */
export function formatarData(valor) {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor);
  return d.toLocaleDateString('pt-BR');
}

/** Normaliza número de WhatsApp para o formato internacional (55...). */
export function waNumber(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) digits = digits.replace(/^0+/, '');
  if (digits.length <= 11 && !digits.startsWith('55')) digits = `55${digits}`;
  return digits;
}

export function waLink(message) {
  const num = waNumber(store.state.config.whatsapp);
  if (!num) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

function activeProducts() {
  return store.state.products.filter((p) => p.active !== false);
}

function stockLabel(product) {
  if (product.stock === null || product.stock === undefined || product.stock === '') return null;
  const n = Number(product.stock);
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return { text: 'Esgotado', level: 'out', css: 'is-out' };
  if (n <= 3) return { text: `Restam ${n}`, level: 'low', css: 'is-low' };
  return { text: `${n} em estoque`, level: 'ok', css: '' };
}

/** `stock?.is-out` seria lido como subtração (stock?.is - out) — por isso o nível é separado. */
const isOut = (stock) => !!stock && stock.level === 'out';

/* ============================ VITRINE ============================ */

export function renderHome(root) {
  const cfg = store.state.config;
  const products = activeProducts();
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];

  const searchInput = h('input', {
    class: 'search__input',
    type: 'search',
    placeholder: 'Buscar produto...',
    'aria-label': 'Buscar produto',
    onInput: (e) => filterGrid(e.target.value),
  });

  const chips = h('div', { class: 'chips' },
    h('button', { class: 'chip is-active', dataset: { cat: '' }, onClick: (e) => selectChip(e) }, 'Todos'),
    ...categories.map((c) => h('button', { class: 'chip', dataset: { cat: c }, onClick: (e) => selectChip(e) }, c)));

  const grid = h('div', { class: 'grid', id: 'grid' });
  const empty = h('div', { class: 'empty', id: 'empty-state' });

  const hero = h('section', { class: 'hero' },
    h('div', { class: 'hero__text' },
      h('h1', { class: 'hero__title', text: cfg.storeName }),
      cfg.tagline ? h('p', { class: 'hero__sub', text: cfg.tagline }) : null),
    h('div', { class: 'hero__actions' },
      h('button', { class: 'btn btn--primary', onClick: () => openShareStudio() }, 'Divulgar catálogo'),
      cfg.whatsapp ? h('a', { class: 'btn btn--ghost btn--light', href: waLink(`Olá! Vim pelo catálogo da ${cfg.storeName}.`) || '#', target: '_blank', rel: 'noopener' },
        cfg.contactName ? `Falar com ${cfg.contactName}` : 'Falar no WhatsApp') : null));

  const root2 = h('div', { class: 'view' },
    store.remoteStatus && !store.remoteStatus.ok
      ? h('div', { class: 'notice notice--warn' },
        h('p', { text: `Não foi possível carregar o catálogo remoto (${store.remoteStatus.error}). Mostrando o catálogo salvo no site.` }))
      : null,
    hero,
    h('div', { class: 'search' }, h('span', { class: 'search__icon', html: '&#9906;' }), searchInput),
    chips,
    products.length ? grid : empty,
    footer());

  root.appendChild(root2);

  if (products.length) renderGrid(grid, products);
  else empty.innerHTML = `<div class="empty__icon">&#128230;</div>
    <h3>Seu catálogo está vazio</h3>
    <p>Adicione produtos no painel administrativo para começar a divulgar.</p>
    <a class="btn btn--primary" href="#/admin">Abrir painel</a>`;

  function selectChip(e) {
    qsa('.chip', chips).forEach((c) => c.classList.remove('is-active'));
    e.currentTarget.classList.add('is-active');
    const cat = e.currentTarget.dataset.cat;
    const list = cat ? products.filter((p) => p.category === cat) : products;
    renderGrid(grid, list);
  }

  function filterGrid(term) {
    const t = term.trim().toLowerCase();
    const activeCat = qs('.chip.is-active', chips)?.dataset.cat || '';
    let list = activeCat ? products.filter((p) => p.category === activeCat) : products;
    if (t) {
      list = list.filter((p) => `${p.name} ${p.desc || ''} ${(p.tags || []).join(' ')} ${p.category || ''}`.toLowerCase().includes(t));
    }
    renderGrid(grid, list);
  }
}

function renderGrid(grid, list) {
  grid.innerHTML = '';
  if (!list.length) {
    grid.appendChild(h('div', { class: 'empty' },
      h('div', { class: 'empty__icon', html: '&#128269;' }),
      h('h3', { text: 'Nenhum produto encontrado' }),
      h('p', { text: 'Tente outro termo de busca.' })));
    return;
  }
  list.forEach((p) => grid.appendChild(productCard(p)));
}

function productCard(product) {
  const stock = stockLabel(product);
  const old = Number(product.oldPrice) || 0;
  const promo = old > product.price;

  const media = product.image
    ? h('img', { class: 'card__img', src: product.image, alt: product.name, loading: 'lazy' })
    : h('div', { class: 'card__emoji', text: product.emoji || '&#128230;' });

  return h('article', { class: `card${product.featured ? ' is-featured' : ''}${product.active === false ? ' is-off' : ''}` },
    h('button', { class: 'card__media', onClick: () => openProductSheet(product.id) },
      media,
      promo ? h('span', { class: 'badge badge--promo', text: `${Math.round((1 - product.price / old) * 100)}% OFF` }) : null,
      product.featured ? h('span', { class: 'badge badge--star', text: 'Destaque' }) : null,
      isOut(stock) ? h('span', { class: 'badge badge--out', text: 'Esgotado' }) : null),
    h('div', { class: 'card__body' },
      h('h3', { class: 'card__title', text: product.name }),
      product.category ? h('span', { class: 'card__cat', text: product.category }) : null,
      h('div', { class: 'card__price' },
        h('strong', { text: money(product.price) }),
        promo ? h('s', { text: money(old) }) : null),
      stock && stock.level !== 'out' ? h('small', { class: `card__stock ${stock.css}`, text: stock.text }) : null,
      h('div', { class: 'card__actions' },
        h('button', {
          class: 'btn btn--primary btn--block',
          disabled: isOut(stock),
          onClick: () => {
            if (store.addToCart(product.id, 1)) toast(`${product.name} adicionado ao carrinho`, 'success');
          },
        }, isOut(stock) ? 'Indisponível' : 'Adicionar'),
        h('button', { class: 'icon-btn icon-btn--soft', title: 'Compartilhar', onClick: () => openProductShare(product) },
          h('span', { html: '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M18 16.1c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.03-.47-.09-.7l7.05-4.11A2.99 2.99 0 0 0 21 5a3 3 0 1 0-3-3c0 .24.04.47.09.7L8.04 8.84A2.99 2.99 0 0 0 3 12a3 3 0 1 0 3 3c0-.24-.04-.47-.09-.7l7.12 4.16c-.05.21-.08.43-.08.65a2.92 2.92 0 0 0 5.84 0c0-1.6-1.32-2.91-2.91-2.91Z"/></svg>' })))));
}

/* ============================ PRODUTO ============================ */

export function openProductSheet(id) {
  const product = store.state.products.find((p) => p.id === id);
  if (!product) return;
  const stock = stockLabel(product);
  const old = Number(product.oldPrice) || 0;
  const promo = old > product.price;
  let qty = 1;

  const qtyLabel = h('span', { class: 'qty__value', text: '1' });
  const setQty = (n) => {
    const max = (product.stock === null || product.stock === undefined) ? 99 : product.stock;
    qty = Math.max(1, Math.min(n, Math.max(max, 1)));
    qtyLabel.textContent = String(qty);
  };

  const media = product.image
    ? h('img', { class: 'sheet__img', src: product.image, alt: product.name })
    : h('div', { class: 'sheet__emoji', text: product.emoji || '&#128230;' });

  const content = h('div', { class: 'product' },
    h('div', { class: 'product__media' }, media),
    h('div', { class: 'product__head' },
      product.category ? h('span', { class: 'tag', text: product.category }) : null,
      h('h3', { class: 'product__title', text: product.name }),
      h('div', { class: 'card__price card__price--lg' },
        h('strong', { text: money(product.price) }),
        promo ? h('s', { text: money(old) }) : null)),
    product.desc ? h('p', { class: 'product__desc', text: product.desc }) : null,
    (product.tags || []).length ? h('div', { class: 'tags' }, ...product.tags.map((t) => h('span', { class: 'tag', text: t }))) : null,
    h('div', { class: 'qty' },
      h('button', { class: 'qty__btn', onClick: () => setQty(qty - 1) }, '−'),
      qtyLabel,
      h('button', { class: 'qty__btn', onClick: () => setQty(qty + 1) }, '+')),
    product.link ? h('a', { class: 'btn btn--ghost btn--block', href: product.link, target: '_blank', rel: 'noopener' }, 'Comprar em outra loja') : null);

  const actions = [
    { label: 'Compartilhar', class: 'btn--ghost', onClick: () => { openProductShare(product); } },
    {
      label: 'Adicionar ao carrinho',
      class: 'btn--primary',
      onClick: (close) => {
        if (store.addToCart(product.id, qty)) {
          toast(`${qty}x ${product.name} no carrinho`, 'success');
          close();
          openCart();
        }
      },
    },
  ];

  openSheet({ title: product.name, content, actions, size: 'lg' });
}

export function openProductShare(product) {
  const text = buildPostText(product);
  const link = productLink(product);
  const grid = h('div', { class: 'share-grid' },
    ...SHARE_TARGETS.map((t) => h('button', {
      class: 'share-btn',
      onClick: () => {
        openShare(t.id, { text, url: link });
        if (t.id === 'copy') toast('Link e texto copiados', 'success');
        if (t.id === 'instagram') toast('Legenda copiada — cole no Instagram', 'info');
      },
    },
      h('span', { class: 'share-btn__icon', style: { background: t.color } }, h('span', { html: t.icon })),
      h('span', { class: 'share-btn__label', text: t.label }))),
    h('button', {
      class: 'share-btn',
      onClick: async () => {
        const ok = await nativeShare({ title: product.name, text, url: link });
        if (!ok) toast('Texto copiado para a área de transferência', 'info');
      },
    },
      h('span', { class: 'share-btn__icon', style: { background: '#0F172A' } }, h('span', { html: '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M18 16.1c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.03-.47-.09-.7l7.05-4.11A2.99 2.99 0 0 0 21 5a3 3 0 1 0-3-3c0 .24.04.47.09.7L8.04 8.84A2.99 2.99 0 0 0 3 12a3 3 0 1 0 3 3c0-.24-.04-.47-.09-.7l7.12 4.16c-.05.21-.08.43-.08.65a2.92 2.92 0 0 0 5.84 0c0-1.6-1.32-2.91-2.91-2.91Z"/></svg>' })),
      h('span', { class: 'share-btn__label', text: 'Mais' })));

  const { close } = openSheet({
    title: 'Divulgar produto',
    subtitle: product.name,
    content: h('div', {},
      h('div', { class: 'share-preview' },
        h('p', { class: 'share-preview__text', text }),
        h('p', { class: 'share-preview__link', text: link })),
      grid),
  });
  return close;
}

/* ============================ CARRINHO ============================ */

export function openCart() {
  // fecha qualquer folha aberta antes (evita duas folhas empilhadas)
  qsa('.sheet, .sheet-backdrop').forEach((n) => n.remove());
  document.body.classList.remove('no-scroll');
  const content = h('div', { class: 'cart' });
  const { close, body } = openSheet({ title: 'Carrinho', content, size: 'lg' });

  function refresh() {
    body.innerHTML = '';
    const lines = store.cartLines();
    const totals = store.cartTotals();
    if (!lines.length) {
      body.appendChild(h('div', { class: 'empty' },
        h('div', { class: 'empty__icon', html: '&#128722;' }),
        h('h3', { text: 'Carrinho vazio' }),
        h('p', { text: 'Adicione produtos para continuar.' })));
      return;
    }
    const list = h('div', { class: 'cart__list' });
    lines.forEach((line) => {
      list.appendChild(h('div', { class: 'cart-line' },
        h('div', { class: 'cart-line__media' },
          line.product.image
            ? h('img', { src: line.product.image, alt: line.product.name })
            : h('span', { text: line.product.emoji || '📦' })),
        h('div', { class: 'cart-line__info' },
          h('strong', { text: line.product.name }),
          h('span', { class: 'cart-line__price', text: money(line.product.price) }),
          h('div', { class: 'qty qty--sm' },
            h('button', { class: 'qty__btn', onClick: () => { store.setCartQty(line.id, line.qty - 1); refresh(); } }, '−'),
            h('span', { class: 'qty__value', text: String(line.qty) }),
            h('button', { class: 'qty__btn', onClick: () => { store.setCartQty(line.id, line.qty + 1); refresh(); } }, '+'))),
        h('button', { class: 'icon-btn icon-btn--soft', title: 'Remover', onClick: () => { store.setCartQty(line.id, 0); refresh(); } }, h('span', { html: '&times;' })),
        h('strong', { class: 'cart-line__total', text: money(line.total) })));
    });
    body.appendChild(list);

    body.appendChild(h('div', { class: 'cart__summary' },
      h('div', { class: 'cart__row' }, h('span', { text: 'Subtotal' }), h('strong', { text: money(totals.subtotal) })),
      h('div', { class: 'cart__row' }, h('span', { text: 'Entrega' }), h('strong', { text: totals.shipping ? money(totals.shipping) : 'Grátis' })),
      h('div', { class: 'cart__row cart__row--total' }, h('span', { text: 'Total' }), h('strong', { text: money(totals.total) }))));

    const actions = h('div', { class: 'cart__actions' },
      h('button', { class: 'btn btn--primary btn--block', onClick: () => { close(); window.location.hash = '#/checkout'; } }, 'Finalizar pedido'),
      h('button', { class: 'btn btn--ghost btn--block', onClick: () => { copyText(orderMessage()); toast('Pedido copiado — cole no WhatsApp', 'success'); } }, 'Copiar pedido'),
      h('button', { class: 'btn btn--link btn--block', onClick: () => { store.clearCart(); refresh(); } }, 'Esvaziar carrinho'));
    body.appendChild(actions);
  }

  refresh();
}

export function orderMessage(customers = null) {
  const cfg = store.state.config;
  const lines = store.cartLines();
  const totals = store.cartTotals();
  const out = [`Olá! Vim pelo catálogo da ${cfg.storeName} e quero fazer este pedido:`, ''];
  lines.forEach((l) => out.push(`• ${l.qty}x ${l.product.name} — ${money(l.total)}`));
  out.push('', `Subtotal: ${money(totals.subtotal)}`);
  if (totals.shipping) out.push(`Entrega: ${money(totals.shipping)}`);
  out.push(`Total: ${money(totals.total)}`);
  if (customers) {
    out.push('');
    out.push(`Nome: ${customers.name}`);
    out.push(`Telefone: ${customers.phone}`);
    if (customers.email) out.push(`E-mail: ${customers.email}`);
    if (customers.fulfillment === 'pickup') out.push('Retirada no local');
    else if (customers.address) out.push(`Entrega em: ${customers.address}${customers.complement ? ` - ${customers.complement}` : ''}`);
  }
  out.push('', `Link do catálogo: ${storeLink()}`);
  return out.join('\n');
}

/* ============================ CHECKOUT ============================ */

export function renderCheckout(root) {
  const cfg = store.state.config;
  const totals = store.cartTotals();
  if (!totals.count) {
    root.appendChild(h('div', { class: 'view' },
      h('div', { class: 'empty' },
        h('div', { class: 'empty__icon', html: '&#128722;' }),
        h('h3', { text: 'Seu carrinho está vazio' }),
        h('a', { class: 'btn btn--primary', href: '#/' }, 'Ver produtos'))));
    return;
  }

  const view = h('div', { class: 'view view--narrow' });
  root.appendChild(view);

  const cliente = store.customer;
  const state = {
    name: cliente.name, phone: cliente.phone, email: cliente.email,
    fulfillment: 'delivery', address: '', complement: '', notes: '',
    payment: cfg.pixKey ? 'pix' : 'whatsapp',
  };
  let etapa = cliente.name && cliente.phone ? 2 : 1;

  const field = (label, control, hint) => h('label', { class: 'field' },
    h('span', { class: 'field__label', text: label }), control,
    hint ? h('small', { class: 'field__hint', text: hint }) : null);
  const input = (attrs) => h('input', { class: 'input', ...attrs });

  const steps = h('div', { class: 'steps' },
    h('span', { class: 'steps__item is-active', id: 'step-1' }, h('b', { text: '1' }), ' Cadastro'),
    h('span', { class: 'steps__sep' }),
    h('span', { class: 'steps__item', id: 'step-2' }, h('b', { text: '2' }), ' Entrega e pagamento'));

  function render() {
    view.innerHTML = '';
    view.appendChild(h('a', { class: 'back-link', href: '#/' }, '← Continuar comprando'));
    view.appendChild(steps);
    if (etapa === 1) renderCadastro();
    else renderPedido();
  }

  /* ------------------------- etapa 1: cadastro ------------------------- */

  function renderCadastro() {
    steps.querySelector('#step-1').classList.add('is-active');
    steps.querySelector('#step-2').classList.remove('is-active');

    const form = h('form', { class: 'form', id: 'cadastro-form' });
    form.appendChild(h('h2', { class: 'section-title', text: 'Seu cadastro' }));
    form.appendChild(h('p', { class: 'hint', text: 'Cadastre-se uma vez para agilizar as próximas compras. Seus dados ficam salvos só neste aparelho.' }));
    form.appendChild(field('Nome completo', input({ required: true, value: state.name, placeholder: 'Como te chamamos?', onInput: (e) => { state.name = e.target.value; } })));
    form.appendChild(field('WhatsApp', input({ required: true, inputmode: 'tel', value: state.phone, placeholder: '(00) 00000-0000', onInput: (e) => { state.phone = e.target.value; } })));
    form.appendChild(field('E-mail (opcional)', input({ type: 'email', value: state.email, placeholder: 'Para receber a confirmação do pedido', onInput: (e) => { state.email = e.target.value; } })));
    form.appendChild(h('button', { class: 'btn btn--primary btn--block btn--lg', type: 'submit' }, 'Continuar para o pedido'));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!state.name.trim() || !state.phone.trim()) {
        toast('Preencha nome e WhatsApp', 'error');
        return;
      }
      store.saveCustomer({ name: state.name, phone: state.phone, email: state.email });
      etapa = 2;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    view.appendChild(form);
  }

  /* ------------------------- etapa 2: pedido ------------------------- */

  function renderPedido() {
    steps.querySelector('#step-1').classList.remove('is-active');
    steps.querySelector('#step-2').classList.add('is-active');

    const form = h('form', { class: 'form', id: 'checkout-form' });

    form.appendChild(h('div', { class: 'customer-card' },
      h('div', {},
        h('strong', { text: state.name }),
        h('span', { text: state.phone }),
        state.email ? h('span', { text: state.email }) : null),
      h('button', {
        class: 'btn btn--link btn--sm', type: 'button',
        onClick: () => { etapa = 1; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); },
      }, 'Editar cadastro')));

    form.appendChild(h('h2', { class: 'section-title', text: 'Entrega' }));
    form.appendChild(field('Como prefere receber?', h('div', { class: 'segmented' },
      h('button', { type: 'button', class: 'segmented__btn is-active', dataset: { v: 'delivery' }, onClick: (e) => pickSeg(e, 'delivery') }, 'Entrega'),
      h('button', { type: 'button', class: 'segmented__btn', dataset: { v: 'pickup' }, onClick: (e) => pickSeg(e, 'pickup') }, 'Retirar no local'))));
    // ---- frete por CEP: R$ fixo + por km ----
    const cepInput = input({ placeholder: '00000-000', inputmode: 'numeric', maxlength: '9' });
    const freteMsg = h('p', { class: 'hint', id: 'frete-msg' });
    form.appendChild(field('Frete por CEP', h('div', { class: 'frete-box' },
      cepInput,
      h('button', {
        type: 'button', class: 'btn btn--ghost btn--sm',
        onClick: async () => {
          freteMsg.textContent = 'Consultando...';
          const resultado = await calcularFrete(cepInput.value, { ...cfg, _subtotal: totals.subtotal }, store.apiBase || '');
          if (resultado.ok) {
            store.setShippingCalculado(resultado.valor);
            freteMsg.textContent = `${resultado.msg}${resultado.cidade ? ` • ${resultado.cidade}` : ''}`;
          } else {
            store.setShippingCalculado(null);
            freteMsg.textContent = resultado.msg;
          }
          atualizaResumo();
        },
      }, 'Calcular'))));
    form.appendChild(freteMsg);

    form.appendChild(field('Endereço', input({ placeholder: 'Rua, número, bairro, cidade', onInput: (e) => { state.address = e.target.value; } })));
    form.appendChild(field('Complemento', input({ placeholder: 'Apto, bloco, ponto de referência', onInput: (e) => { state.complement = e.target.value; } })));
    form.appendChild(field('Observações', h('textarea', { class: 'input input--area', rows: '2', placeholder: 'Ex.: entregar depois das 18h', onInput: (e) => { state.notes = e.target.value; } })));

    form.appendChild(h('h2', { class: 'section-title', text: 'Forma de pagamento' }));
    const payBox = h('div', { class: 'segmented segmented--wrap' });
    const payOptions = [];
    if (cfg.pixKey) payOptions.push(['pix', 'Pix (QR Code)']);
    payOptions.push(['whatsapp', 'Combinar no WhatsApp']);
    payOptions.forEach(([v, label]) => {
      payBox.appendChild(h('button', { type: 'button', class: `segmented__btn${state.payment === v ? ' is-active' : ''}`, dataset: { v }, onClick: (e) => pickSeg(e, v, payBox) }, label));
    });
    form.appendChild(payBox);
    if (cfg.paymentNote) form.appendChild(h('p', { class: 'hint', text: cfg.paymentNote }));

    function pickSeg(e, value, box = e.currentTarget.parentElement) {
      qsa('.segmented__btn', box).forEach((b) => b.classList.remove('is-active'));
      e.currentTarget.classList.add('is-active');
      state.payment = value;
      if (box === payBox) state.payment = value;
      if (value === 'delivery') form.classList.remove('is-pickup'); else form.classList.add('is-pickup');
    }

    const resumo = () => {
      const t = store.cartTotals();
      return h('div', { class: 'summary', id: 'resumo' },
        h('h2', { class: 'section-title', text: 'Resumo' }),
        ...store.cartLines().map((l) => h('div', { class: 'cart__row' },
          h('span', { text: `${l.qty}x ${l.product.name}` }),
          h('strong', { text: money(l.total) }))),
        h('div', { class: 'cart__row' }, h('span', { text: 'Entrega' }), h('strong', { text: t.shipping ? money(t.shipping) : 'Grátis' })),
        h('div', { class: 'cart__row cart__row--total' }, h('span', { text: 'Total' }), h('strong', { text: money(t.total) })));
    };

    const atualizaResumo = () => {
      const antigo = qs('#resumo');
      if (antigo) antigo.replaceWith(resumo());
    };

    form.appendChild(resumo());
    form.appendChild(h('button', { class: 'btn btn--primary btn--block btn--lg', type: 'submit' }, 'Finalizar pedido'));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      finishOrder(state);
    });

    view.appendChild(form);
  }

  render();
}

function orderCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const num = Math.floor(Math.random() * 9000 + 1000);
  return `${letters[Math.floor(Math.random() * letters.length)]}${letters[Math.floor(Math.random() * letters.length)]}-${num}`;
}

async function finishOrder(customer) {
  const cfg = store.state.config;
  const totals = store.cartTotals();
  const code = orderCode();
  const order = {
    code,
    at: Date.now(),
    items: store.cartLines().map((l) => ({ id: l.id, name: l.product.name, price: l.product.price, qty: l.qty, total: l.total })),
    subtotal: totals.subtotal,
    shipping: totals.shipping,
    total: totals.total,
    customer: { ...customer },
    payment: customer.payment,
    status: 'novo',
  };
  await store.pushOrder(order);

  const content = h('div', { class: 'order-done' },
    h('div', { class: 'order-done__check', html: '&#10003;' }),
    h('h3', { text: 'Pedido registrado!' }),
    h('p', { class: 'order-done__code', text: `Código ${code}` }),
    h('p', { class: 'hint', text: 'Envie o pedido pelo WhatsApp para combinarmos a entrega e o pagamento.' }),
    h('div', { class: 'order-summary' },
      ...order.items.map((i) => h('div', { class: 'cart__row' },
        h('span', { text: `${i.qty}x ${i.name}` }),
        h('strong', { text: money(i.total) }))),
      h('div', { class: 'cart__row' }, h('span', { text: 'Entrega' }), h('strong', { text: order.shipping ? money(order.shipping) : 'Grátis' })),
      h('div', { class: 'cart__row cart__row--total' }, h('span', { text: 'Total' }), h('strong', { text: money(order.total) }))));

  const actions = [];

  if (customer.payment === 'pix' && cfg.pixKey) {
    try {
      const payload = buildPixPayload({
        key: cfg.pixKey,
        amount: totals.total,
        name: cfg.pixName || cfg.storeName,
        city: cfg.pixCity || cfg.city || 'BRASIL',
        txid: code.replace('-', ''),
        desc: `Pedido ${code}`,
      });
      const box = h('div', { class: 'pix-box' });
      const canvas = h('canvas', { class: 'pix-box__qr' });
      box.appendChild(canvas);
      box.appendChild(h('p', { class: 'pix-box__label', text: 'Aponte a câmera para pagar' }));
      const copy = h('button', { class: 'btn btn--ghost btn--block', onClick: () => { copyText(payload); toast('Código Pix copiado', 'success'); } }, 'Copiar código Pix');
      box.appendChild(copy);
      content.appendChild(box);
      content.appendChild(h('details', { class: 'pix-details' },
        h('summary', { text: 'Ver código Pix em texto' }),
        h('code', { class: 'pix-code', text: payload })));
      if (window.QRCode?.toCanvas) {
        window.QRCode.toCanvas(canvas, payload, { width: 240, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })
          .catch(() => { canvas.remove(); });
      }
    } catch (err) {
      content.appendChild(h('p', { class: 'hint', text: `Não foi possível gerar o Pix: ${err.message}` }));
    }
  }

  const wa = waLink(orderMessage(customer));
  if (wa) {
    actions.push({ label: 'Enviar no WhatsApp', class: 'btn--primary', onClick: () => window.open(wa, '_blank', 'noopener') });
  } else {
    // sem número cadastrado: o pedido pode ser copiado e enviado por qualquer canal
    actions.push({
      label: 'Copiar pedido',
      class: 'btn--primary',
      onClick: () => { copyText(orderMessage(customer)); toast('Pedido copiado — cole no seu WhatsApp', 'success'); },
    });
  }

  openSheet({ title: 'Pedido criado', content, actions, size: 'lg' });

  // esvazia o carrinho e volta para a vitrine — sem disparar hashchange,
  // que removeria a própria folha de confirmação
  store.clearCart();
  if (location.hash !== '#/') history.replaceState(null, '', '#/');
  const root = document.getElementById('view');
  if (root) {
    root.innerHTML = '';
    renderHome(root);
  }
}

/* ============================ RODAPÉ ============================ */

export function footer() {
  const cfg = store.state.config;
  return h('footer', { class: 'footer' },
    h('div', { class: 'footer__brand' },
      cfg.logo ? h('img', { class: 'footer__logo', src: cfg.logo, alt: cfg.storeName }) : null,
      h('strong', { text: cfg.storeName }),
      cfg.tagline ? h('p', { class: 'footer__tagline', text: cfg.tagline }) : null),
    h('div', { class: 'footer__links' },
      cfg.whatsapp ? h('a', { href: waLink(`Olá! Vim pelo catálogo.`) || '#', target: '_blank', rel: 'noopener' },
        cfg.contactName ? `WhatsApp · ${cfg.contactName}` : 'WhatsApp') : null,
      cfg.instagram ? h('a', { href: `https://instagram.com/${cfg.instagram.replace(/^@/, '')}`, target: '_blank', rel: 'noopener' }, 'Instagram') : null,
      h('a', { href: '#/admin' }, 'Painel administrativo')),
    cfg.updatedAt
      ? h('p', { class: 'footer__note', text: `Preços atualizados em ${formatarData(cfg.updatedAt)}` })
      : null,
    h('p', { class: 'footer__note', text: '© ' + new Date().getFullYear() + ` ${cfg.storeName}` }));
}

/* ============================ ESTÚDIO DE DIVULGAÇÃO ============================ */

export function openShareStudio() {
  const cfg = store.state.config;
  const textArea = h('textarea', { class: 'input input--area share-text', rows: '7', value: buildPostText(null, { includeAll: true }) });

  const grid = h('div', { class: 'share-grid' },
    ...SHARE_TARGETS.map((t) => h('button', {
      class: 'share-btn',
      onClick: () => {
        openShare(t.id, { text: textArea.value });
        if (t.id === 'copy') toast('Texto e link copiados', 'success');
        if (t.id === 'instagram') toast('Legenda copiada — cole no Instagram', 'info');
      },
    },
      h('span', { class: 'share-btn__icon', style: { background: t.color } }, h('span', { html: t.icon })),
      h('span', { class: 'share-btn__label', text: t.label }))));

  const cards = h('div', { class: 'card-actions' },
    h('button', { class: 'btn btn--ghost', onClick: () => makeCard('feed') }, 'Card quadrado (feed)'),
    h('button', { class: 'btn btn--ghost', onClick: () => makeCard('story') }, 'Card de story'));

  async function makeCard(ratio) {
    const canvas = await buildShareCard(null, ratio);
    downloadCanvas(canvas, `card-${cfg.storeName}-${ratio}.png`);
    toast('Card gerado — pronto para publicar', 'success');
  }

  const content = h('div', {},
    h('p', { class: 'hint', text: 'Edite o texto, escolha a rede e divulgue. O link do catálogo é incluído automaticamente.' }),
    textArea,
    h('div', { class: 'row-between' },
      h('button', { class: 'btn btn--link', onClick: () => { textArea.value = buildPostText(null, { includeAll: true }); } }, 'Texto padrão'),
      h('button', { class: 'btn btn--link', onClick: () => { copyText(textArea.value); toast('Texto copiado', 'success'); } }, 'Copiar texto')),
    grid,
    h('h3', { class: 'section-title', text: 'Imagens prontas' }),
    cards);

  openSheet({ title: 'Divulgar catálogo', subtitle: cfg.storeName, content, size: 'lg' });
}
