/**
 * Pix BR Code (EMV) — geração do "pix copia e cola" e do QR.
 * Especificação: Manual de Padrões para Iniciação do Pix (BCB) + EMV QRCPS.
 */

/** Remove acentos e caracteres não aceitos pelo BR Code. */
export function sanitizePixText(text, max) {
  const clean = String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 $%*+\-.\/]/g, '')
    .trim()
    .slice(0, max);
  return clean;
}

/** Normaliza a chave Pix conforme o tipo (CPF/CNPJ/e-mail/telefone/aleatória). */
export function normalizePixKey(key) {
  const raw = String(key || '').trim();
  if (!raw) return '';
  if (raw.includes('@')) return raw.toLowerCase();
  const onlyDigits = raw.replace(/\D/g, '');
  if (/^\d{11}$/.test(onlyDigits) || /^\d{14}$/.test(onlyDigits)) return onlyDigits;
  if (/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(raw)) return onlyDigits;
  if (/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/.test(raw)) return onlyDigits;
  return raw; // chave aleatória (UUID) permanece como está
}

/** CRC16-CCITT (polinômio 0x1021, init 0xFFFF). */
export function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function field(id, value) {
  const len = String(value.length).padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Monta o payload Pix.
 * @param {object} opts
 * @param {string} opts.key      chave Pix (CPF, CNPJ, e-mail, telefone ou aleatória)
 * @param {number} [opts.amount] valor em reais (opcional)
 * @param {string} [opts.name]   nome do recebedor (max 25)
 * @param {string} [opts.city]   cidade do recebedor (max 15)
 * @param {string} [opts.txid]   identificador do pedido (max 25, sem espaços)
 * @param {string} [opts.desc]   descrição (max 43)
 */
export function buildPixPayload(opts = {}) {
  const key = normalizePixKey(opts.key);
  if (!key) throw new Error('Chave Pix não informada.');

  const name = sanitizePixText(opts.name, 25) || 'RECEBEDOR';
  const city = sanitizePixText(opts.city, 15) || 'BRASIL';
  const txid = sanitizePixText(opts.txid, 25).replace(/\s+/g, '') || '***';
  const desc = sanitizePixText(opts.desc, 43);

  let payload = field('00', 'BR.GOV.BCB.PIX' + key);
  payload += field('01', opts.amount ? '12' : '11'); // 12 = valor definido
  if (desc) payload += field('02', desc);
  payload += field('26', name);
  payload += field('27', city);

  // valor da transação: moeda BRL (986) + amount com ponto decimal
  if (opts.amount && Number(opts.amount) > 0) {
    payload += field('54', `986${Number(opts.amount).toFixed(2)}`);
  }

  let additional = field('05', txid);
  payload += field('62', additional);

  payload += '6304';
  payload += crc16(payload);
  return payload;
}

/** Link de pagamento Pix via provedor de checkout (fallback web). */
export function pixCheckoutUrl(payload) {
  return `https://pix.com.br/pagar?payload=${encodeURIComponent(payload)}`;
}
