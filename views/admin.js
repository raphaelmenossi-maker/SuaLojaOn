/** Painel administrativo: produtos, pedidos, divulgação e configurações. */

import { store } from '../lib/store.js';
import { h, qs, qsa, toast, openSheet, confirmDialog, money, formatDateBR } from '../lib/ui.js';
import { parseCsv, toCsv, parseNumberBR } from '../lib/csv.js';
import { buildPostText, copyText, openShare, productLink, storeLink, SHARE_TARGETS, nativeShare, buildShareCard, downloadCanvas } from '../lib/share.js';
import { openShareStudio } from './shop.js';
import { tabelaDeTexto, textoDaTabela } from '../lib/frete.js';

const STATUS = {
  novo: { label: 'Novo', class: 'st--novo' },
  preparando: { label: 'Preparando', class: 'st--preparando' },
  enviado: { label: 'Enviado', class: 'st--enviado' },
  entregue: { label: 'Entregue', class: 'st--entregue' },
  cancelado: { label: 'Cancelado', class: 'st--cancelado' },
};

const CSV_HEADERS = ['nome', 'preco', 'precoAntigo', 'descricao', 'categoria', 'tags', 'estoque', 'emoji', 'link'];

function alias(obj, names) {
  for (const n of names) {
    if (obj[n] !== undefined && obj[n] !== '') return obj[n];
  }
  return '';
}

/** Tela de login (PIN) — só aparece se houver PIN configurado. */
export async function ensureAuthenticated() {
  if (store.mode === 'server') {
    // já tem sessão válida? (token guardado de um login anterior)
    if (await store.verifyAuth()) return true;
  } else if (!String(store.state.config.adminPin || '').length) {
    return true; // modo local sem PIN configurado
  }

  return new Promise((resolve) => {
    const input = h('input', { class: 'input', type: 'password', inputmode: 'numeric', placeholder: 'PIN de acesso', autocomplete: 'off' });
    const error = h('p', { class: 'hint hint--error' });
    const content = h('div', {},
      h('p', { class: 'hint', text: 'Digite o PIN para acessar o painel.' }),
      input,
      error);

    const { close } = openSheet({
      title: 'Painel administrativo',
      size: 'sm',
      content,
      actions: [
        { label: 'Cancelar', class: 'btn--ghost', onClick: (c) => { c(); resolve(false); } },
        {
          label: 'Entrar',
          class: 'btn--primary',
          onClick: async (c) => {
            const ok = await store.login(input.value.trim());
            if (ok) { c(); resolve(true); }
            else { error.textContent = 'PIN incorreto.'; input.value = ''; }
          },
        },
      ],
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        qs('.sheet__foot .btn--primary')?.click();
      }
    });
    void close;
  });
}

/* ============================ ROTEADOR DO PAINEL ============================ */

export async function renderAdmin(root, section = 'painel', arg = '') {
  const ok = await ensureAuthenticated();
  if (!ok) {
    root.appendChild(h('div', { class: 'view' },
      h('div', { class: 'empty' },
        h('div', { class: 'empty__icon', html: '&#128274;' }),
        h('h3', { text: 'Acesso restrito' }),
        h('a', { class: 'btn btn--primary', href: '#/' }, 'Voltar ao catálogo'))));
    return;
  }

  const wrap = h('div', { class: 'admin' });
  root.appendChild(wrap);

  const nav = h('nav', { class: 'admin-nav' },
    ...[
      ['painel', 'Painel'],
      ['produtos', 'Produtos'],
      ['pedidos', 'Pedidos'],
      ['divulgar', 'Divulgar'],
      ['config', 'Configurações'],
    ].map(([id, label]) => h('a', {
      class: `admin-nav__link${section === id ? ' is-active' : ''}`,
      href: `#/admin${id === 'painel' ? '' : `/${id}`}`,
    }, label)));

  const content = h('div', { class: 'admin__content' });
  wrap.appendChild(nav);
  wrap.appendChild(content);

  if (section === 'produtos' && arg === 'novo') { content.appendChild(productForm(null, () => { window.location.hash = '#/admin/produtos'; })); return; }
  if (section === 'produtos' && arg) { content.appendChild(productForm(arg, () => { window.location.hash = '#/admin/produtos'; })); return; }

  if (section === 'produtos') renderProducts(content);
  else if (section === 'pedidos') renderOrders(content);
  else if (section === 'divulgar') renderDivulgar(content);
  else if (section === 'config') renderConfig(content);
  else renderDashboard(content);
}

/* ============================ PAINEL ============================ */

function renderDashboard(root) {
  const products = store.state.products;
  const orders = store.state.orders;
  const revenue = orders.filter((o) => o.status !== 'cancelado').reduce((s, o) => s + (o.total || 0), 0);

  root.appendChild(h('div', { class: 'admin__head' },
    h('h1', { text: 'Painel' }),
    h('div', { class: 'row' },
      h('a', { class: 'btn btn--ghost', href: '#/admin/produtos/novo' }, '+ Novo produto'),
      h('a', { class: 'btn btn--primary', href: '#/admin/divulgar' }, 'Divulgar'))));

  root.appendChild(h('div', { class: 'kpis' },
    kpi('Produtos', String(products.length)),
    kpi('Pedidos', String(orders.length)),
    kpi('Novos pedidos', String(orders.filter((o) => o.status === 'novo').length)),
    kpi('Faturamento', money(revenue))));

  const recent = orders.slice(0, 6);
  root.appendChild(h('h2', { class: 'section-title', text: 'Pedidos recentes' }));
  if (!recent.length) {
    root.appendChild(h('div', { class: 'empty' },
      h('div', { class: 'empty__icon', html: '&#128230;' }),
      h('h3', { text: 'Nenhum pedido ainda' }),
      h('p', { text: 'Os pedidos feitos na loja aparecem aqui.' })));
  } else {
    root.appendChild(orderTable(recent));
  }
}

function kpi(label, value) {
  return h('div', { class: 'kpi' },
    h('span', { class: 'kpi__label', text: label }),
    h('strong', { class: 'kpi__value', text: value }));
}

/* ============================ PRODUTOS ============================ */

function renderProducts(root) {
  const search = h('input', { class: 'input', type: 'search', placeholder: 'Buscar produto pelo nome ou categoria', onInput: () => draw() });
  const listBox = h('div', { class: 'admin-list' });

  root.appendChild(h('div', { class: 'admin__head' },
    h('h1', { text: 'Produtos' }),
    h('div', { class: 'row' },
      h('button', { class: 'btn btn--ghost', onClick: exportCsv }, 'Exportar CSV'),
      h('button', { class: 'btn btn--ghost', onClick: importCsv }, 'Importar CSV'),
      h('a', { class: 'btn btn--primary', href: '#/admin/produtos/novo' }, '+ Novo produto'))));
  root.appendChild(h('div', { class: 'admin-toolbar' }, search));
  root.appendChild(listBox);

  function draw() {
    const term = search.value.trim().toLowerCase();
    let list = store.state.products;
    if (term) list = list.filter((p) => `${p.name} ${p.category || ''}`.toLowerCase().includes(term));
    listBox.innerHTML = '';
    if (!list.length) {
      listBox.appendChild(h('div', { class: 'empty' },
        h('div', { class: 'empty__icon', html: '&#128230;' }),
        h('h3', { text: 'Nenhum produto' }),
        h('p', { text: 'Cadastre um produto ou importe sua planilha.' })));
      return;
    }
    list.forEach((p) => listBox.appendChild(productRow(p)));
  }
  draw();

  function productRow(p) {
    const media = p.image
      ? h('img', { src: p.image, alt: p.name })
      : h('span', { text: p.emoji || '📦' });
    return h('div', { class: `admin-row${p.active === false ? ' is-off' : ''}` },
      h('div', { class: 'admin-row__media' }, media),
      h('div', { class: 'admin-row__info' },
        h('strong', { text: p.name }),
        h('span', { class: 'admin-row__meta', text: `${money(p.price)}${p.category ? ` • ${p.category}` : ''}${p.stock !== null && p.stock !== undefined ? ` • ${p.stock} un.` : ''}` })),
      h('div', { class: 'admin-row__actions' },
        h('a', { class: 'icon-btn icon-btn--soft', href: `#/admin/produtos/${p.id}`, title: 'Editar', html: '&#9998;' }),
        h('button', { class: 'icon-btn icon-btn--soft', title: 'Duplicar', html: '&#10697;', onClick: () => { store.duplicateProduct(p.id); toast('Produto duplicado', 'success'); draw(); } }),
        h('button', { class: 'icon-btn icon-btn--soft', title: p.active === false ? 'Ativar' : 'Ocultar', html: p.active === false ? '&#128065;' : '&#128584;', onClick: () => { store.upsertProduct({ ...p, active: p.active === false }); draw(); } }),
        h('button', {
          class: 'icon-btn icon-btn--soft icon-btn--danger', title: 'Excluir', html: '&#128465;',
          onClick: async () => {
            const ok = await confirmDialog({ title: 'Excluir produto?', message: `O produto "${p.name}" será removido do catálogo.`, confirmLabel: 'Excluir', danger: true });
            if (ok) { store.deleteProduct(p.id); toast('Produto excluído', 'info'); draw(); }
          },
        })));
  }

  function exportCsv() {
    const rows = store.state.products.map((p) => ({
      nome: p.name,
      preco: p.price,
      precoAntigo: p.oldPrice || '',
      descricao: p.desc || '',
      categoria: p.category || '',
      tags: (p.tags || []).join(', '),
      estoque: p.stock ?? '',
      emoji: p.emoji || '',
      link: p.link || '',
    }));
    downloadText(toCsv(rows, CSV_HEADERS), 'produtos.csv', 'text/csv;charset=utf-8');
    toast('CSV exportado', 'success');
  }

  function importCsv() {
    const input = h('input', { type: 'file', accept: '.csv,text/csv', onChange: (e) => readFile(e.target.files[0]) });
    const paste = h('textarea', { class: 'input input--area', rows: '6', placeholder: 'nome;preco;precoAntigo;descricao;categoria;tags;estoque;emoji;link' });
    const content = h('div', {},
      h('p', { class: 'hint', text: 'Aceita arquivo .csv ou texto colado. Colunas: nome, preco, precoAntigo, descricao, categoria, tags, estoque, emoji, link. Os produtos com o mesmo nome são atualizados.' }),
      h('label', { class: 'btn btn--ghost btn--block' }, 'Escolher arquivo CSV', input),
      h('p', { class: 'hint', text: 'Ou cole abaixo:' }),
      paste);

    openSheet({
      title: 'Importar produtos',
      content,
      size: 'lg',
      actions: [
        { label: 'Cancelar', class: 'btn--ghost' },
        {
          label: 'Importar',
          class: 'btn--primary',
          onClick: (close) => {
            const text = paste.value.trim() || input.files?.[0] ? '' : '';
            const raw = paste.value.trim();
            if (!raw) { toast('Cole o conteúdo do CSV ou escolha um arquivo', 'error'); return; }
            void text;
            const { rows } = parseCsv(raw);
            let added = 0;
            let updated = 0;
            rows.forEach((row) => {
              const name = alias(row, ['nome', 'name', 'produto', 'titulo', 'título']);
              if (!name) return;
              const existing = store.state.products.find((p) => p.name.toLowerCase() === name.toLowerCase());
              const payload = {
                id: existing?.id,
                name,
                price: parseNumberBR(alias(row, ['preco', 'price', 'valor', 'preço'])),
                oldPrice: parseNumberBR(alias(row, ['precoantigo', 'preco_anterior', 'promocao', 'de', 'promo'])),
                desc: alias(row, ['descricao', 'descrição', 'desc', 'detalhes']),
                category: alias(row, ['categoria', 'category', 'grupo']),
                tags: alias(row, ['tags', 'etiquetas']),
                stock: alias(row, ['estoque', 'stock', 'qtd']) === '' ? null : parseNumberBR(alias(row, ['estoque', 'stock', 'qtd'])),
                emoji: alias(row, ['emoji', 'icone', 'ícone']),
                link: alias(row, ['link', 'url']),
              };
              if (existing) updated++; else added++;
              store.upsertProduct(payload);
            });
            toast(`${added} produto(s) adicionado(s), ${updated} atualizado(s)`, 'success');
            close();
            renderProducts(qs('.admin__content') || document.body);
          },
        },
      ],
    });

    function readFile(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { paste.value = String(reader.result || ''); };
      reader.readAsText(file, 'utf-8');
    }
  }
}

function downloadText(content, filename, type) {
  const blob = new Blob([`\uFEFF${content}`], { type });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ============================ FORMULÁRIO DE PRODUTO ============================ */

function productForm(id, onDone) {
  const existing = id ? store.state.products.find((p) => p.id === id) : null;
  const p = existing || { name: '', price: 0, oldPrice: 0, desc: '', category: '', tags: [], stock: null, emoji: '', image: '', active: true, featured: false, link: '' };
  let image = p.image || '';

  const categories = store.state.categories;
  const datalist = h('datalist', { id: 'cat-list' }, ...categories.map((c) => h('option', { value: c })));

  const preview = h('div', { class: 'preview' },
    image ? h('img', { src: image, alt: 'Prévia' }) : h('span', { class: 'preview__emoji', text: p.emoji || '📦' }));

  const field = (label, control, hint) => h('label', { class: 'field' },
    h('span', { class: 'field__label', text: label }), control,
    hint ? h('small', { class: 'field__hint', text: hint }) : null);

  const emojiInput = h('input', { class: 'input', value: p.emoji || '', placeholder: '📦', onInput: (e) => { preview.textContent = e.target.value || '📦'; } });
  const fileInput = h('input', {
    type: 'file', accept: 'image/*', class: 'hidden',
    onChange: (e) => handleImage(e.target.files[0]),
  });

  async function handleImage(file) {
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file, 900, 0.78);
      image = dataUrl;
      preview.innerHTML = '';
      preview.appendChild(h('img', { src: dataUrl, alt: 'Prévia' }));
      toast('Imagem carregada', 'success');
    } catch {
      toast('Não foi possível ler a imagem', 'error');
    }
  }

  const form = h('form', { class: 'form' },
    field('Nome do produto', h('input', { class: 'input', required: true, value: p.name, placeholder: 'Ex.: Camiseta estampada' })),
    h('div', { class: 'form-row' },
      field('Preço (R$)', h('input', { class: 'input', type: 'number', step: '0.01', min: '0', value: p.price || 0 })),
      field('Preço anterior (R$)', h('input', { class: 'input', type: 'number', step: '0.01', min: '0', value: p.oldPrice || 0 }), 'Deixe 0 se não há promoção')),
    field('Descrição', h('textarea', { class: 'input input--area', rows: '4', placeholder: 'Detalhes, tamanhos, material...' }, p.desc || '')),
    h('div', { class: 'form-row' },
      field('Categoria', h('input', { class: 'input', list: 'cat-list', value: p.category || '', placeholder: 'Ex.: Camisetas' })),
      field('Etiquetas', h('input', { class: 'input', value: (p.tags || []).join(', '), placeholder: 'ex.: cotton, promoção' }), 'Separe por vírgula')),
    h('div', { class: 'form-row' },
      field('Estoque', h('input', { class: 'input', type: 'number', min: '0', value: p.stock ?? '' }), 'Vazio = ilimitado'),
      field('Emoji (ícone)', emojiInput)),
    field('Link externo de compra', h('input', { class: 'input', value: p.link || '', placeholder: 'https://...' }), 'Opcional: mercado livre, shopee, sua loja'),
    field('Foto do produto', h('div', { class: 'upload' },
      preview,
      h('div', { class: 'upload__actions' },
        h('label', { class: 'btn btn--ghost' }, 'Escolher foto', fileInput),
        h('button', { class: 'btn btn--link', type: 'button', onClick: () => { image = ''; preview.textContent = emojiInput.value || '📦'; } }, 'Remover')))),
    h('div', { class: 'switch-row' },
      h('label', { class: 'switch' },
        h('input', { type: 'checkbox', checked: p.active !== false, onChange: (e) => { form.dataset.active = e.target.checked ? '1' : '0'; } }),
        h('span', { text: 'Visível no catálogo' })),
      h('label', { class: 'switch' },
        h('input', { type: 'checkbox', checked: !!p.featured, onChange: (e) => { form.dataset.featured = e.target.checked ? '1' : '0'; } }),
        h('span', { text: 'Marcar como destaque' }))),
    datalist);

  const actions = [
    { label: 'Cancelar', class: 'btn--ghost', onClick: (close) => { close(); onDone?.(); } },
    {
      label: existing ? 'Salvar alterações' : 'Cadastrar produto',
      class: 'btn--primary',
      onClick: (close) => {
        const data = readForm(form);
        if (!data.name) { toast('Informe o nome do produto', 'error'); return; }
        if (!data.price && data.price !== 0) { toast('Informe o preço', 'error'); return; }
        store.upsertProduct({
          id: existing?.id,
          ...data,
          image,
          stock: data.stock === '' ? null : Number(data.stock),
          oldPrice: Number(data.oldPrice) || 0,
        });
        toast(existing ? 'Produto atualizado' : 'Produto cadastrado', 'success');
        close();
        onDone?.();
      },
    },
  ];

  const box = h('div', {}, form);
  openSheet({ title: existing ? 'Editar produto' : 'Novo produto', content: box, actions, size: 'lg' });
  return box;
}

function readForm(form) {
  const inputs = form.querySelectorAll('input, textarea');
  const val = (labelText) => {
    const field = [...form.querySelectorAll('.field')].find((f) => f.querySelector('.field__label')?.textContent === labelText);
    return field?.querySelector('input, textarea')?.value ?? '';
  };
  const switches = form.querySelectorAll('.switch input');
  return {
    name: val('Nome do produto').trim(),
    price: parseNumberBR(val('Preço (R$)')),
    oldPrice: parseNumberBR(val('Preço anterior (R$)')),
    desc: val('Descrição').trim(),
    category: val('Categoria').trim(),
    tags: val('Etiquetas'),
    stock: val('Estoque'),
    emoji: val('Emoji (ícone)').trim(),
    link: val('Link externo de compra').trim(),
    active: switches[0]?.checked !== false,
    featured: !!switches[1]?.checked,
  };
}

/** Reduz a imagem antes de guardar (economiza espaço no navegador). */
function resizeImage(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const hgt = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = hgt;
        canvas.getContext('2d').drawImage(img, 0, 0, w, hgt);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/* ============================ PEDIDOS ============================ */

function renderOrders(root) {
  const orders = store.state.orders;
  root.appendChild(h('div', { class: 'admin__head' },
    h('h1', { text: 'Pedidos' }),
    h('div', { class: 'row' },
      h('button', { class: 'btn btn--ghost', onClick: exportOrders }, 'Exportar CSV'))));

  if (!orders.length) {
    root.appendChild(h('div', { class: 'empty' },
      h('div', { class: 'empty__icon', html: '&#128230;' }),
      h('h3', { text: 'Nenhum pedido recebido' }),
      h('p', { text: 'Os pedidos feitos na vitrine aparecem aqui automaticamente.' })));
    return;
  }
  root.appendChild(orderTable(orders));

  function exportOrders() {
    const rows = orders.map((o) => ({
      codigo: o.code,
      data: formatDateBR(o.at),
      cliente: o.customer?.name || '',
      telefone: o.customer?.phone || '',
      entrega: o.customer?.fulfillment === 'pickup' ? 'Retirada' : 'Entrega',
      endereco: o.customer?.address || '',
      pagamento: o.payment,
      total: o.total,
      status: STATUS[o.status]?.label || o.status,
      itens: (o.items || []).map((i) => `${i.qty}x ${i.name}`).join(' | '),
    }));
    downloadText(toCsv(rows, Object.keys(rows[0])), 'pedidos.csv', 'text/csv;charset=utf-8');
    toast('Pedidos exportados', 'success');
  }
}

function orderTable(orders) {
  const table = h('div', { class: 'orders' });
  orders.forEach((o) => {
    const st = STATUS[o.status] || STATUS.novo;
    table.appendChild(h('div', { class: 'order' },
      h('div', { class: 'order__head' },
        h('strong', { text: o.code }),
        h('span', { class: `st ${st.class}`, text: st.label }),
        h('span', { class: 'order__date', text: formatDateBR(o.at) })),
      h('p', { class: 'order__items', text: (o.items || []).map((i) => `${i.qty}x ${i.name}`).join(' • ') }),
      h('p', { class: 'order__customer', text: `${o.customer?.name || ''} • ${o.customer?.phone || ''}${o.customer?.email ? ` • ${o.customer.email}` : ''}${o.customer?.address ? ` • ${o.customer.address}` : ''}` }),
      h('div', { class: 'order__foot' },
        h('strong', { text: money(o.total) }),
        h('select', {
          class: 'input input--sm',
          onChange: (e) => { store.updateOrderStatus(o.code, e.target.value); toast('Status atualizado', 'success'); },
        }, ...Object.entries(STATUS).map(([k, v]) => h('option', { value: k, selected: o.status === k }, v.label))))));
  });
  return table;
}

/* ============================ DIVULGAR ============================ */

function renderDivulgar(root) {
  const cfg = store.state.config;
  const link = storeLink();
  const textArea = h('textarea', { class: 'input input--area share-text', rows: '8' }, buildPostText(null, { includeAll: true }));

  root.appendChild(h('div', { class: 'admin__head' },
    h('h1', { text: 'Divulgar' }),
    h('p', { class: 'hint', text: 'Link do catálogo: ' })));

  root.appendChild(h('div', { class: 'link-box' },
    h('code', { text: link }),
    h('button', { class: 'btn btn--ghost btn--sm', onClick: () => { copyText(link); toast('Link copiado', 'success'); } }, 'Copiar link'),
    h('button', { class: 'btn btn--ghost btn--sm', onClick: () => window.open(link, '_blank', 'noopener') }, 'Abrir')));

  root.appendChild(h('h2', { class: 'section-title', text: 'Texto pronto' }));
  root.appendChild(textArea);
  root.appendChild(h('div', { class: 'row' },
    h('button', { class: 'btn btn--ghost', onClick: () => { textArea.value = buildPostText(null, { includeAll: true }); } }, 'Recriar texto'),
    h('button', { class: 'btn btn--ghost', onClick: () => { copyText(textArea.value); toast('Texto copiado', 'success'); } }, 'Copiar texto'),
    h('button', { class: 'btn btn--primary', onClick: async () => {
      const ok = await nativeShare({ title: cfg.storeName, text: textArea.value, url: link });
      if (!ok) toast('Compartilhamento indisponível — texto copiado', 'info');
    } }, 'Compartilhar')));

  root.appendChild(h('h2', { class: 'section-title', text: 'Enviar para as redes' }));
  root.appendChild(h('div', { class: 'share-grid' },
    ...SHARE_TARGETS.map((t) => h('button', {
      class: 'share-btn',
      onClick: () => {
        openShare(t.id, { text: textArea.value, url: link });
        if (t.id === 'copy') toast('Texto e link copiados', 'success');
        if (t.id === 'instagram') toast('Legenda copiada — cole no Instagram', 'info');
      },
    },
      h('span', { class: 'share-btn__icon', style: { background: t.color } }, h('span', { html: t.icon })),
      h('span', { class: 'share-btn__label', text: t.label })))));

  root.appendChild(h('h2', { class: 'section-title', text: 'Imagens prontas para publicar' }));
  root.appendChild(h('div', { class: 'card-actions' },
    h('button', { class: 'btn btn--ghost', onClick: () => makeCard(null, 'feed') }, 'Card do catálogo (feed)'),
    h('button', { class: 'btn btn--ghost', onClick: () => makeCard(null, 'story') }, 'Card do catálogo (story)')));

  root.appendChild(h('h2', { class: 'section-title', text: 'Divulgar produto específico' }));
  const products = store.state.products.filter((p) => p.active !== false);
  if (!products.length) {
    root.appendChild(h('p', { class: 'hint', text: 'Cadastre produtos para divulgar individualmente.' }));
  } else {
    const list = h('div', { class: 'admin-list' });
    products.forEach((p) => {
      list.appendChild(h('div', { class: 'admin-row' },
        h('div', { class: 'admin-row__media' }, p.image ? h('img', { src: p.image, alt: p.name }) : h('span', { text: p.emoji || '📦' })),
        h('div', { class: 'admin-row__info' },
          h('strong', { text: p.name }),
          h('span', { class: 'admin-row__meta', text: money(p.price) })),
        h('div', { class: 'admin-row__actions' },
          h('button', { class: 'btn btn--ghost btn--sm', onClick: () => openProductShareAdmin(p) }, 'Divulgar'),
          h('button', { class: 'btn btn--ghost btn--sm', onClick: () => makeCard(p, 'feed') }, 'Card'))));
    });
    root.appendChild(list);
  }

  async function makeCard(product, ratio) {
    const canvas = await buildShareCard(product, ratio);
    downloadCanvas(canvas, `card-${(product?.name || cfg.storeName).replace(/\s+/g, '-').toLowerCase()}-${ratio}.png`);
    toast('Card gerado — pronto para publicar', 'success');
  }
}

function openProductShareAdmin(product) {
  const text = buildPostText(product);
  const link = productLink(product);
  openSheet({
    title: 'Divulgar produto',
    subtitle: product.name,
    content: h('div', {},
      h('div', { class: 'share-preview' },
        h('p', { class: 'share-preview__text', text }),
        h('p', { class: 'share-preview__link', text: link })),
      h('div', { class: 'share-grid' },
        ...SHARE_TARGETS.map((t) => h('button', {
          class: 'share-btn',
          onClick: () => {
            openShare(t.id, { text, url: link });
            if (t.id === 'copy') toast('Link e texto copiados', 'success');
          },
        },
          h('span', { class: 'share-btn__icon', style: { background: t.color } }, h('span', { html: t.icon })),
          h('span', { class: 'share-btn__label', text: t.label }))))),
  });
}

/* ============================ CONFIGURAÇÕES ============================ */

function renderConfig(root) {
  const cfg = store.state.config;

  root.appendChild(h('div', { class: 'admin__head' }, h('h1', { text: 'Configurações' })));

  const form = h('form', { class: 'form' });
  const field = (label, control, hint) => h('label', { class: 'field' },
    h('span', { class: 'field__label', text: label }), control, hint ? h('small', { class: 'field__hint', text: hint }) : null);

  let logo = cfg.logo || '';
  const tabelaTexto = textoDaTabela(cfg.distanceTable || {});
  const logoPreview = h('div', { class: 'preview' },
    logo ? h('img', { src: logo, alt: 'Logo' }) : h('span', { class: 'preview__emoji', text: '🏪' }));
  const logoInput = h('input', { type: 'file', accept: 'image/*', class: 'hidden', onChange: (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      logo = String(reader.result);
      logoPreview.innerHTML = '';
      logoPreview.appendChild(h('img', { src: logo, alt: 'Logo' }));
    };
    reader.readAsDataURL(file);
  } });

  form.appendChild(h('h2', { class: 'section-title', text: 'Identidade da loja' }));
  form.appendChild(field('Nome da loja', h('input', { class: 'input', value: cfg.storeName })));
  form.appendChild(field('Slogan / chamada', h('input', { class: 'input', value: cfg.tagline || '' })));
  form.appendChild(field('Cidade', h('input', { class: 'input', value: cfg.city || '' })));
  form.appendChild(field('Logo', h('div', { class: 'upload' }, logoPreview, h('label', { class: 'btn btn--ghost' }, 'Escolher logo', logoInput))));

  form.appendChild(h('h2', { class: 'section-title', text: 'Contato e redes' }));
  form.appendChild(field('WhatsApp (com DDD)', h('input', { class: 'input', value: cfg.whatsapp || '', placeholder: '5516999999999' }), 'Com DDD e código do país (55)'));
  form.appendChild(field('Nome do contato', h('input', { class: 'input', value: cfg.contactName || '', placeholder: 'Ex.: Raphael' }), 'Aparece no botão do WhatsApp, no rodapé e nos textos de divulgação'));
  form.appendChild(field('Instagram', h('input', { class: 'input', value: cfg.instagram || '', placeholder: '@minhaloja' })));
  form.appendChild(field('Facebook', h('input', { class: 'input', value: cfg.facebook || '', placeholder: 'minhaloja' })));

  form.appendChild(h('h2', { class: 'section-title', text: 'Pagamento (Pix)' }));
  form.appendChild(field('Chave Pix', h('input', { class: 'input', value: cfg.pixKey || '', placeholder: 'CPF, CNPJ, e-mail ou telefone' })));
  form.appendChild(field('Nome do recebedor', h('input', { class: 'input', value: cfg.pixName || '', placeholder: 'Nome que aparece no Pix' })));
  form.appendChild(field('Cidade do recebedor', h('input', { class: 'input', value: cfg.pixCity || '', placeholder: 'SAO PAULO' })));
  form.appendChild(field('Observação sobre pagamento', h('input', { class: 'input', value: cfg.paymentNote || '' })));

  form.appendChild(h('h2', { class: 'section-title', text: 'Entrega' }));
  form.appendChild(h('div', { class: 'form-row' },
    field('Taxa fixa de entrega (R$)', h('input', { class: 'input', type: 'number', step: '0.01', min: '0', value: cfg.shippingFee || 0 }), 'usada quando o CEP não é calculado'),
    field('Frete grátis acima de (R$)', h('input', { class: 'input', type: 'number', step: '0.01', min: '0', value: cfg.freeShippingOver || 0 }), '0 = desativado')));
  form.appendChild(h('div', { class: 'form-row' },
    field('Frete base (R$)', h('input', { class: 'input', type: 'number', step: '0.01', min: '0', value: cfg.shippingBase ?? 5 }), 'valor fixo de toda entrega'),
    field('Valor por km (R$)', h('input', { class: 'input', type: 'number', step: '0.01', min: '0', value: cfg.shippingPerKm ?? 0.5 }), 'soma ao valor base')));
  form.appendChild(h('div', { class: 'form-row' },
    field('Raio de entrega (km)', h('input', { class: 'input', type: 'number', step: '1', min: '0', value: cfg.shippingMaxKm ?? 60 }), 'acima disso,combine pelo WhatsApp'),
    field('CEP da loja', h('input', { class: 'input', value: cfg.storeCep || '', placeholder: '14010-000' }), 'origem da distância')));
  form.appendChild(field('Tabela de distância por cidade', h('textarea', {
    class: 'input input--area', rows: '6', placeholder: 'Ribeirão Preto=0\nFranca=90\nBarretos=95',
  }, tabelaTexto), 'Uma cidade por linha, no formato Nome=km. É o que permite calcular o frete sem internet.'));
  form.appendChild(field('Instruções de entrega', h('textarea', { class: 'input input--area', rows: '2', value: cfg.deliveryNote || '' })));

  form.appendChild(h('h2', { class: 'section-title', text: 'Segurança e dados' }));
  form.appendChild(field('PIN do painel', h('input', { class: 'input', type: 'text', value: cfg.adminPin || '', placeholder: 'deixe vazio para não pedir' }), 'Fica só neste navegador — nunca é gravado nos arquivos publicados (não vai para o GitHub). Nota: em site estático o PIN é uma trava de interface, não segurança de verdade.'));
  form.appendChild(field('URL da API (servidor)', h('input', { class: 'input', value: localStorage.getItem('loja.api') || '', placeholder: 'https://minhaapi.com.br' }), 'Deixe vazio para modo local (dados neste navegador)'));

  const remoteStatus = h('p', { class: 'hint' });
  const remoteInput = h('input', { class: 'input', value: cfg.remoteCatalogUrl || '', placeholder: 'https://meu-site.com/catalogo.json' });
  if (cfg.remoteCatalogUrl) {
    remoteStatus.textContent = `Catálogo remoto ativo: ${cfg.remoteCatalogUrl}`;
  }
  form.appendChild(field('URL do catálogo remoto', remoteInput,
    'Opcional: um arquivo JSON com {"products": [...]} em um host que permita CORS (ex.: raw.githubusercontent.com). O site passa a mostrar esse catálogo — você atualiza lá e o site muda, sem republicar.'));
  form.appendChild(h('div', { class: 'row' },
    h('button', { class: 'btn btn--ghost', type: 'button', onClick: async () => {
      const url = remoteInput.value.trim();
      const res = await store.loadRemote(url);
      if (res.ok) {
        toast(`Catálogo remoto carregado: ${res.count} produto(s)`, 'success');
        remoteStatus.textContent = `Catálogo remoto ativo: ${url}`;
      } else {
        toast(res.error, 'error');
        remoteStatus.textContent = res.error;
      }
    } }, 'Testar e carregar agora'),
    h('button', { class: 'btn btn--link', type: 'button', onClick: () => {
      store.state.config.remoteCatalogUrl = remoteInput.value.trim();
      toast('Salve as configurações para aplicar a URL remota', 'info');
    } }, 'Aplicar sem salvar')));
  form.appendChild(remoteStatus);

  const dataBox = h('div', { class: 'card-actions' },
    h('button', { class: 'btn btn--ghost', type: 'button', onClick: exportAll }, 'Exportar dados (JSON)'),
    h('button', { class: 'btn btn--ghost', type: 'button', onClick: importAll }, 'Importar dados (JSON)'),
    h('button', { class: 'btn btn--ghost', type: 'button', onClick: () => openSheet({ title: 'Escolher arquivo JSON', content: h('input', { type: 'file', accept: '.json', onChange: (e) => importFile(e.target.files?.[0]) }) }) }, 'Importar arquivo'),
    h('button', { class: 'btn btn--danger', type: 'button', onClick: resetAll }, 'Apagar tudo'));

  form.appendChild(h('h2', { class: 'section-title', text: 'Backup' }));
  form.appendChild(dataBox);

  // status do que já está publicado (só no modo local)
  let refreshPublishStatus = async () => {};

  if (store.mode === 'local') {
    const publishStatus = h('p', { class: 'hint', text: 'Verificando o que está publicado no site...' });
    refreshPublishStatus = async () => {
      try {
        const res = await fetch('./dados.json', { cache: 'no-store' });
        const pub = res.ok ? await res.json() : null;
        if (!pub) {
          publishStatus.textContent = 'Não foi possível ler o catálogo publicado (dados.json) — se você hospeda o site em outro lugar, o arquivo fica ao lado do index.html.';
          return;
        }
        const localName = store.state.config.storeName || '(sem nome)';
        const publicName = pub.config?.storeName || '(sem nome)';
        const nLocal = store.state.products.length;
        const nPublic = (pub.products || []).length;
        if (localName === publicName && nLocal === nPublic) {
          publishStatus.innerHTML = '✓ Seu navegador está sincronizado com o site publicado.';
        } else {
          publishStatus.innerHTML = `O site público mostra <strong>${publicName}</strong> (${nPublic} produto(s)). Aqui você tem <strong>${localName}</strong> (${nLocal} produto(s)) — <strong>ainda não publicado</strong>.`;
        }
      } catch {
        publishStatus.textContent = 'Não foi possível comparar com o site publicado.';
      }
    };
    refreshPublishStatus();

    form.appendChild(h('h2', { class: 'section-title', text: 'Publicar o catálogo' }));
    form.appendChild(h('div', { class: 'notice' },
      h('p', { html: 'Neste modo o catálogo fica salvo <strong>neste navegador</strong>. Para que outras pessoas vejam os seus produtos ao acessar o link, publique o arquivo <code>dados.json</code> na mesma pasta do <code>index.html</code>:' }),
      h('ol', { class: 'notice__steps' },
        h('li', { text: 'Cadastre e salve os produtos aqui no painel.' }),
        h('li', { text: 'Baixe o dados.json abaixo.' }),
        h('li', { text: 'Envie o arquivo para o seu site (hospedagem, GitHub Pages, Netlify, Vercel...).' }),
        h('li', { text: 'Recarregue o link do catálogo — os produtos passam a aparecer para todo mundo.' })),
      publishStatus,
      h('button', { class: 'btn btn--primary', type: 'button', onClick: downloadDataJson }, 'Baixar dados.json para publicar')));

    form.appendChild(h('h2', { class: 'section-title', text: 'Catálogo remoto (atualizar sem republicar)' }));
    form.appendChild(h('div', { class: 'notice' },
      h('p', { html: 'Hospede um arquivo <code>catalogo.json</code> no seu GitHub, Netlify ou host e cole a URL em <strong>URL do catálogo remoto</strong> (acima). O site passa a buscar os produtos nesse arquivo: <strong>você edita lá e o site muda sozinho</strong>, sem republicar nada.' }),
      h('ol', { class: 'notice__steps' },
        h('li', { text: 'Baixe o catalogo.json abaixo e edite no computador (ou monte o seu no painel).' }),
        h('li', { text: 'Suba o arquivo para o seu GitHub/host e copie a URL pública dele.' }),
        h('li', { text: 'Cole a URL em "URL do catálogo remoto" e clique em Testar.' }),
        h('li', { text: 'Salve as configurações e me passe a URL para eu ligar no site publicado.' })),
      h('button', { class: 'btn btn--primary', type: 'button', onClick: downloadRemoteCatalog }, 'Baixar catalogo.json (para hospedar)')));
  }

  root.appendChild(form);
  root.appendChild(h('div', { class: 'admin__actions' },
    h('button', { class: 'btn btn--primary btn--lg btn--block', onClick: save }, 'Salvar configurações')));

  async function save() {
    const get = (label) => {
      const f = [...form.querySelectorAll('.field')].find((x) => x.querySelector('.field__label')?.textContent === label);
      return f?.querySelector('input, textarea')?.value ?? '';
    };
    const next = {
      ...cfg,
      storeName: get('Nome da loja').trim() || 'Minha Loja',
      tagline: get('Slogan / chamada').trim(),
      city: get('Cidade').trim(),
      whatsapp: get('WhatsApp (com DDD)').replace(/\D/g, ''),
      contactName: get('Nome do contato').trim(),
      instagram: get('Instagram').trim(),
      facebook: get('Facebook').trim(),
      pixKey: get('Chave Pix').trim(),
      pixName: get('Nome do recebedor').trim(),
      pixCity: get('Cidade do recebedor').trim(),
      paymentNote: get('Observação sobre pagamento').trim(),
      shippingFee: parseNumberBR(get('Taxa fixa de entrega (R$)')),
      freeShippingOver: parseNumberBR(get('Frete grátis acima de (R$)')),
      shippingBase: parseNumberBR(get('Frete base (R$)')),
      shippingPerKm: parseNumberBR(get('Valor por km (R$)')),
      shippingMaxKm: parseNumberBR(get('Raio de entrega (km)')),
      storeCep: get('CEP da loja').trim(),
      distanceTable: tabelaDeTexto(get('Tabela de distância por cidade')),
      deliveryNote: get('Instruções de entrega').trim(),
      adminPin: get('PIN do painel').trim(),
      remoteCatalogUrl: get('URL do catálogo remoto').trim(),
      logo,
    };
    const api = get('URL da API (servidor)').trim();
    if (api !== (localStorage.getItem('loja.api') || '')) {
      store.setApiBase(api);
      toast('URL da API salva — recarregue a página', 'info');
    }
    store.state.config = next;
    await store.pushConfig();
    toast('Configurações salvas', 'success');
    refreshPublishStatus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function exportAll() {
    const data = {
      config: store.state.config,
      products: store.state.products,
      categories: store.state.categories,
      orders: store.state.orders,
      exportedAt: new Date().toISOString(),
    };
    downloadText(JSON.stringify(data, null, 2), 'catalogo-backup.json', 'application/json');
    toast('Backup exportado', 'success');
  }

  /** Gera o arquivo que publica o catálogo no site estático (sem pedidos). */
  function downloadDataJson() {
    const data = {
      config: store.state.config,
      products: store.state.products,
      categories: store.state.categories,
      exportedAt: new Date().toISOString(),
    };
    downloadText(JSON.stringify(data, null, 2), 'dados.json', 'application/json');
    toast('dados.json baixado — envie para o servidor junto do index.html', 'success');
  }

  /**
   * Arquivo para o catálogo remoto: é este JSON que você hospeda e o site lê.
   * A URL remota é removida para o arquivo não apontar para si mesmo.
   */
  function downloadRemoteCatalog() {
    const { remoteCatalogUrl, ...config } = store.state.config;
    const data = {
      config: { ...config, remoteCatalogUrl: '' },
      products: store.state.products,
      categories: store.state.categories,
    };
    downloadText(JSON.stringify(data, null, 2), 'catalogo.json', 'application/json');
    toast('catalogo.json baixado — hospede esse arquivo e cole a URL em Configurações', 'success');
  }

  function importAll() {
    openSheet({
      title: 'Importar dados (JSON)',
      content: h('textarea', { class: 'input input--area', rows: '8', placeholder: '{ "config": {...}, "products": [...] }' }),
      actions: [
        { label: 'Cancelar', class: 'btn--ghost' },
        { label: 'Importar', class: 'btn--primary', onClick: (close) => {
          const ta = qs('.sheet__body textarea');
          try {
            const data = JSON.parse(ta.value);
            if (data.config) store.state.config = { ...cfg, ...data.config };
            if (Array.isArray(data.products)) store.state.products = data.products;
            if (Array.isArray(data.orders)) store.state.orders = data.orders;
            store.state.categories = store.deriveCategories();
            store.persist();
            toast('Dados importados', 'success');
            close();
            window.location.reload();
          } catch {
            toast('JSON inválido', 'error');
          }
        } },
      ],
    });
  }

  function importFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data.config) store.state.config = { ...cfg, ...data.config };
        if (Array.isArray(data.products)) store.state.products = data.products;
        if (Array.isArray(data.orders)) store.state.orders = data.orders;
        store.state.categories = store.deriveCategories();
        store.persist();
        toast('Backup restaurado', 'success');
        setTimeout(() => window.location.reload(), 600);
      } catch {
        toast('Arquivo inválido', 'error');
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  async function resetAll() {
    const ok = await confirmDialog({
      title: 'Apagar tudo?',
      message: 'Produtos, pedidos e configurações deste navegador serão removidos. Faça um backup antes.',
      confirmLabel: 'Apagar tudo',
      danger: true,
    });
    if (!ok) return;
    localStorage.removeItem('loja.state.v1');
    toast('Tudo apagado', 'info');
    setTimeout(() => window.location.reload(), 500);
  }
}
