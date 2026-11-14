/**
 * Frete por CEP: R$ fixo + valor por km.
 *
 * Duas fontes, nesta ordem:
 *  1. API do backend (quando existe): distância real por road/Haversine (precisa)
 *  2. Tabela de cidades do config: distância aproximada da região (funciona sempre)
 *
 * A tabela fica em config.distanceTable no formato { "Cidade": km }.
 */

const VIA_CEP = 'https://viacep.com.br/ws';

/** Normaliza CEP: só números, 8 dígitos. */
export function soDigitos(cep) {
  return String(cep || '').replace(/\D/g, '');
}

/** Busca cidade e UF a partir do CEP (ViaCEP, com CORS liberado). */
export async function buscarCidade(cep) {
  const d = soDigitos(cep);
  if (d.length !== 8) return { ok: false, erro: 'CEP deve ter 8 dígitos.' };
  try {
    const res = await fetch(`${VIA_CEP}/${d}/json/`);
    if (!res.ok) return { ok: false, erro: 'CEP não encontrado.' };
    const data = await res.json();
    if (data.erro) return { ok: false, erro: 'CEP não encontrado.' };
    return { ok: true, cidade: data.localidade || '', uf: data.uf || '' };
  } catch {
    return { ok: false, erro: 'Não foi possível consultar o CEP agora.' };
  }
}

/** Distância em linha reta (Haversine) entre duas coordenadas, em km. */
export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const rad = (v) => (v * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Calcula o frete.
 * @param {string} cep         CEP do cliente
 * @param {object} cfg         config da loja
 * @param {string} [apiBase]   URL da API (opcional)
 * @returns {Promise<object>} { ok, km, valor, cidade, msg }
 */
export async function calcularFrete(cep, cfg = {}, apiBase = '') {
  const base = Number(cfg.shippingBase) || 0;
  const porKm = Number(cfg.shippingPerKm) || 0;
  const maxKm = Number(cfg.shippingMaxKm) || 0;
  const totalCarrinho = Number(cfg._subtotal) || 0;
  const gratisAcima = Number(cfg.freeShippingOver) || 0;

  const d = soDigitos(cep);
  if (d.length !== 8) return { ok: false, msg: 'Digite um CEP com 8 dígitos.' };

  // 1) tenta a API do backend (distância precisa)
  if (apiBase) {
    try {
      const res = await fetch(`${apiBase}/api/frete?cep=${d}`);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.km === 'number') {
          return finalizar(data.km, data.cidade || '', base, porKm, maxKm, gratisAcima, totalCarrinho, 'preciso');
        }
      }
    } catch { /* sem backend: cai para a tabela */ }
  }

  // 2) tabela de cidades
  const { ok, cidade, uf, erro } = await buscarCidade(d);
  if (!ok) return { ok: false, msg: erro };

  const tabela = normalizaChave(cfg.distanceTable || {});
  const chave = semAcento(cidade).toLowerCase().trim();
  const km = tabela[chave];

  if (km === undefined) {
    return {
      ok: false,
      cidade,
      msg: `Não entregamos em ${cidade}${uf ? '/' + uf : ''} ainda — fale com a gente pelo WhatsApp.`,
    };
  }
  return finalizar(km, cidade, base, porKm, maxKm, gratisAcima, totalCarrinho, 'aproximado');
}

function finalizar(km, cidade, base, porKm, maxKm, gratisAcima, totalCarrinho, precisao) {
  if (maxKm && km > maxKm) {
    return {
      ok: false,
      km,
      cidade,
      msg: `Fica a ${km.toFixed(0)} km — nossa entrega vai até ${maxKm} km. Combine pelo WhatsApp.`,
    };
  }
  let valor = base + porKm * km;
  valor = Math.round(valor * 100) / 100;
  let msg = `Frete: R$ ${valor.toFixed(2).replace('.', ',')} (${km.toFixed(1).replace('.', ',')} km)`;
  if (gratisAcima && totalCarrinho >= gratisAcima) {
    valor = 0;
    msg = `Frete grátis (acima de R$ ${gratisAcima.toFixed(2).replace('.', ',')})`;
  }
  return { ok: true, km: Math.round(km * 10) / 10, cidade, valor, msg, precisao };
}

/** Tabela sem acento para comparar ("Sao Jose do Rio Preto" = "São José do Rio Preto"). */
function normalizaChave(tabela) {
  const saida = {};
  for (const [cidade, km] of Object.entries(tabela)) {
    saida[semAcento(cidade).toLowerCase().trim()] = Number(km);
  }
  return saida;
}

export function semAcento(t) {
  return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Converte "Nome da cidade=12.5" por linha em um objeto { "Nome da cidade": 12.5 }. */
export function tabelaDeTexto(texto) {
  const tabela = {};
  String(texto || '').split('\n').forEach((linha) => {
    const limpo = linha.trim();
    if (!limpo || limpo.startsWith('#')) return;
    const [cidade, km] = limpo.split('=');
    if (!cidade || km === undefined) return;
    const valor = Number(String(km).replace(',', '.'));
    if (Number.isFinite(valor)) tabela[cidade.trim()] = valor;
  });
  return tabela;
}

/** Tabela para texto (edição no painel). */
export function textoDaTabela(tabela) {
  return Object.entries(tabela || {})
    .map(([cidade, km]) => `${cidade}=${km}`)
    .join('\n');
}
