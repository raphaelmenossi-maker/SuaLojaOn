/**
 * Estado central + persistência.
 * Dois modos, detectados automaticamente:
 *  - local  : tudo no localStorage do navegador (funciona offline, sem servidor)
 *  - server : API HTTP (produtos/pedidos/config compartilhados entre dispositivos)
 */

const STORAGE_KEY = 'loja.state.v1';
const TOKEN_KEY = 'loja.token';
const API_KEY = 'loja.api';

const DEFAULT_CONFIG = {
  storeName: 'Minha Loja',
  tagline: 'Peça pelo WhatsApp e receba em casa',
  whatsapp: '',
  contactName: '',
  instagram: '',
  facebook: '',
  pixKey: '',
  pixName: '',
  pixCity: '',
  city: '',
  logo: '',
  freeShippingOver: 0,
  shippingFee: 0,
  deliveryNote: '',
  adminPin: '',
  remoteCatalogUrl: '',
  updatedAt: '',
  paymentNote: 'Pagamento via Pix ou na entrega.',
  theme: 'light',
};

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function defaultState() {
  return {
    config: { ...DEFAULT_CONFIG },
    products: [],
    categories: [],
    cart: [],
    orders: [],
    customer: { name: '', phone: '', email: '' },
    shippingCalculado: null,
  };
}

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed, config: { ...DEFAULT_CONFIG, ...(parsed.config || {}) } };
  } catch {
    return null;
  }
}

class Store extends EventTarget {
  constructor() {
    super();
    this.state = defaultState();
    this.mode = 'local';
    this.apiBase = '';
    this.token = localStorage.getItem(TOKEN_KEY) || '';
    this.serverData = null;
  }

  /** Carrega o estado (do servidor se houver API, senão do navegador). */
  async init() {
    const local = readLocal();
    this.apiBase = (localStorage.getItem(API_KEY) || '').trim();

    let sameOrigin = false;
    if (!this.apiBase) {
      // tenta a mesma origem (quando o app é servido pelo backend)
      try {
        const res = await fetch('./api/health', { cache: 'no-store' });
        sameOrigin = res.ok;
      } catch { /* offline: segue no modo local */ }
    }

    if (this.apiBase || sameOrigin) {
      const health = await this.request('GET', '/api/health');
      if (health) {
        this.mode = 'server';
        // carrinho e categorias continuam no navegador (são por dispositivo)
        this.state.cart = local?.cart || [];
        this.state.categories = local?.categories || [];
        await this.pullFromServer();
        if (this.state.config.remoteCatalogUrl) {
          this.remoteStatus = await this.loadRemote();
        }
        return this.state;
      }
      this.apiBase = '';
    }

    this.mode = 'local';
    this.state = local || this.state;
    this.state.config = { ...DEFAULT_CONFIG, ...this.state.config };
    // catálogo remoto tem prioridade sobre os dados locais/baixados
    if (this.state.config.remoteCatalogUrl) {
      this.remoteStatus = await this.loadRemote();
    }
    this.emit();
    return this.state;
  }

  /**
   * Carrega o catálogo de uma URL externa (JSON).
   * Permite publicar o site uma única vez e depois atualizar os produtos
   * editando o arquivo na origem (planilha/JSON no seu host, GitHub, etc.).
   */
  async loadRemote(urlOverride) {
    this.remoteLoaded = true;
    const url = String(urlOverride ?? this.state.config.remoteCatalogUrl ?? '').trim();
    if (!url) return { ok: false, error: 'Nenhuma URL informada.' };
    if (!/^https?:\/\//i.test(url)) return { ok: false, error: 'A URL precisa começar com http:// ou https://' };
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return { ok: false, error: `Não foi possível carregar (HTTP ${res.status}).` };
      const data = await res.json();
      const products = Array.isArray(data.products) ? data.products : null;
      if (!products) return { ok: false, error: 'O arquivo não tem a lista "products".' };
      this.state.products = products;
      if (data.config && typeof data.config === 'object') {
        this.state.config = { ...this.state.config, ...data.config, remoteCatalogUrl: url };
      } else {
        this.state.config.remoteCatalogUrl = url;
      }
      this.state.categories = this.deriveCategories();
      this.emit();
      return { ok: true, count: products.length };
    } catch (err) {
      return { ok: false, error: 'Falha de rede ou CORS bloqueando a leitura da URL.' };
    }
  }

  /** Cadastro do cliente (fica salvo neste dispositivo para as próximas compras). */
  saveCustomer(data) {
    this.state.customer = {
      name: String(data.name || '').trim(),
      phone: String(data.phone || '').trim(),
      email: String(data.email || '').trim(),
    };
    this.persist();
    this.emit();
    return this.state.customer;
  }

  get customer() {
    return this.state.customer || { name: '', phone: '', email: '' };
  }

  async request(method, path, body) {
    const base = this.apiBase || '';
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    try {
      const res = await fetch(base + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async pullFromServer() {
    // pedidos só quando há sessão (a API exige autenticação)
    const reqs = [this.request('GET', '/api/products'), this.request('GET', '/api/config')];
    if (this.token) reqs.push(this.request('GET', '/api/orders'));
    const [products, config, orders] = await Promise.all(reqs);
    if (products?.products) this.state.products = products.products;
    if (config?.config) this.state.config = { ...DEFAULT_CONFIG, ...config.config };
    if (orders?.orders) this.state.orders = orders.orders;
    this.serverData = { products: products?.products, config: config?.config };
    this.state.categories = this.deriveCategories();
    this.emit();
  }

  async pushProducts() {
    if (this.mode === 'server') {
      await this.request('PUT', '/api/products', { products: this.state.products });
    } else {
      this.persist();
    }
  }

  async pushConfig() {
    if (this.mode === 'server') {
      await this.request('PUT', '/api/config', { config: this.state.config });
    } else {
      this.persist();
    }
    this.emit(); // o cabeçalho (nome/logo) precisa refletir a mudança na hora
  }

  async pushOrder(order) {
    this.state.orders.unshift(order);
    if (this.mode === 'server') {
      await this.request('POST', '/api/orders', { order });
    } else {
      this.persist();
    }
    this.emit();
  }

  async updateOrderStatus(code, status) {
    const order = this.state.orders.find((o) => o.code === code);
    if (!order) return;
    order.status = status;
    if (this.mode === 'server') {
      await this.request('PATCH', `/api/orders/${encodeURIComponent(code)}`, { status });
    } else {
      this.persist();
    }
    this.emit();
  }

  /** Confere se o token guardado ainda vale (modo servidor). */
  async verifyAuth() {
    if (this.mode !== 'server') return true;
    if (!this.token) return false;
    const res = await this.request('GET', '/api/orders');
    if (!res) {
      this.token = '';
      localStorage.removeItem(TOKEN_KEY);
      return false;
    }
    return true;
  }

  async login(pin) {
    if (!this.apiBase && this.mode !== 'server') {
      // modo local: PIN guardado localmente
      if (this.state.config.adminPin && pin !== this.state.config.adminPin) return false;
      return true;
    }
    const res = await this.request('POST', '/api/login', { pin });
    if (res?.token) {
      this.token = res.token;
      localStorage.setItem(TOKEN_KEY, res.token);
      await this.pullFromServer();
      return true;
    }
    return false;
  }

  setApiBase(url) {
    this.apiBase = String(url || '').trim().replace(/\/$/, '');
    localStorage.setItem(API_KEY, this.apiBase);
  }

  persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        config: this.state.config,
        products: this.state.products,
        categories: this.state.categories,
        cart: this.state.cart,
        orders: this.state.orders,
        customer: this.state.customer,
      }));
    } catch (err) {
      this.emit('erro:armazenamento');
    }
  }

  emit(detail) {
    this.dispatchEvent(new CustomEvent('change', { detail }));
  }

  onChange(fn) {
    this.addEventListener('change', fn);
  }

  deriveCategories() {
    const set = new Set(this.state.categories || []);
    this.state.products.forEach((p) => { if (p.category) set.add(p.category); });
    return [...set];
  }

  /* ---------------- produtos ---------------- */

  upsertProduct(product) {
    const clean = { active: true, featured: false, stock: null, ...product };
    clean.id = clean.id || uid('p');
    clean.tags = Array.isArray(clean.tags)
      ? clean.tags
      : String(clean.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
    const idx = this.state.products.findIndex((p) => p.id === clean.id);
    if (idx >= 0) this.state.products[idx] = { ...this.state.products[idx], ...clean };
    else this.state.products.unshift(clean);
    this.state.categories = this.deriveCategories();
    this.pushProducts();
    this.emit();
    return clean;
  }

  deleteProduct(id) {
    this.state.products = this.state.products.filter((p) => p.id !== id);
    this.state.cart = this.state.cart.filter((c) => c.id !== id);
    this.state.categories = this.deriveCategories();
    this.pushProducts();
    this.emit();
  }

  duplicateProduct(id) {
    const src = this.state.products.find((p) => p.id === id);
    if (!src) return null;
    const copy = { ...src, id: uid('p'), name: `${src.name} (cópia)`, createdAt: Date.now() };
    this.state.products.unshift(copy);
    this.pushProducts();
    this.emit();
    return copy;
  }

  /* ---------------- carrinho ---------------- */

  addToCart(id, qty = 1) {
    this.state.shippingCalculado = null;
    const product = this.state.products.find((p) => p.id === id);
    if (!product || product.active === false) return false;
    const line = this.state.cart.find((c) => c.id === id);
    const current = line ? line.qty : 0;
    const max = product.stock === null || product.stock === undefined ? Infinity : product.stock;
    if (current + qty > max) {
      this.emit('erro:estoque');
      return false;
    }
    if (line) line.qty = current + qty;
    else this.state.cart.push({ id, qty });
    this.persist();
    this.emit();
    return true;
  }

  setCartQty(id, qty) {
    this.state.shippingCalculado = null;
    const line = this.state.cart.find((c) => c.id === id);
    if (!line) return;
    if (qty <= 0) this.state.cart = this.state.cart.filter((c) => c.id !== id);
    else line.qty = qty;
    this.persist();
    this.emit();
  }

  clearCart() {
    this.state.cart = [];
    this.state.shippingCalculado = null;
    this.persist();
    this.emit();
  }

  cartLines() {
    return this.state.cart
      .map((line) => {
        const product = this.state.products.find((p) => p.id === line.id);
        if (!product) return null;
        return { ...line, product, total: product.price * line.qty };
      })
      .filter(Boolean);
  }

  cartTotals() {
    const lines = this.cartLines();
    const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
    const cfg = this.state.config;
    const freeOver = Number(cfg.freeShippingOver) || 0;
    const fee = Number(cfg.shippingFee) || 0;
    // valor calculado pelo CEP tem prioridade; senão a taxa fixa
    let shipping = subtotal === 0 ? 0 : (freeOver > 0 && subtotal >= freeOver ? 0 : fee);
    if (this.state.shippingCalculado !== null && this.state.shippingCalculado !== undefined) {
      shipping = this.state.shippingCalculado;
    }
    return { subtotal, shipping, total: subtotal + shipping, count: lines.reduce((s, l) => s + l.qty, 0) };
  }

  /** Guarda o frete calculado pelo CEP (null = usa a taxa fixa). */
  setShippingCalculado(valor) {
    this.state.shippingCalculado = valor;
    this.emit();
  }
}

export const store = new Store();
export { DEFAULT_CONFIG };
