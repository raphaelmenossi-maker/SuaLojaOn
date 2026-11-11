/** Parser/serializador de CSV (UTF-8, com ; como separador padrão e fallback para ,). */

/** Detecta o separador mais presente na primeira linha. */
export function detectDelimiter(text) {
  const first = (text.split(/\r?\n/)[0] || '').split(';').length;
  const alt = (text.split(/\r?\n/)[0] || '').split(',').length;
  return first >= alt ? ';' : ',';
}

/** Converte texto CSV em array de objetos usando a primeira linha como cabeçalho. */
export function parseCsv(text, delimiter) {
  const clean = String(text || '').replace(/^\uFEFF/, '');
  const sep = delimiter || detectDelimiter(clean);
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { cell += '"'; i++; }
        else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === sep) { row.push(cell); cell = ''; continue; }
    if (ch === '\r') continue;
    if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    cell += ch;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }

  const cleaned = rows.filter((r) => r.some((c) => String(c).trim() !== ''));
  if (!cleaned.length) return { headers: [], rows: [] };

  const headers = cleaned[0].map((h) => String(h).trim().toLowerCase());
  const data = cleaned.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (r[i] ?? '').trim(); });
    return obj;
  });
  return { headers, rows: data, delimiter: sep };
}

/** Converte array de objetos em texto CSV. */
export function toCsv(items, headers) {
  const cols = headers || Object.keys(items[0] || {});
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(';')];
  for (const item of items) lines.push(cols.map((c) => esc(item[c])).join(';'));
  return lines.join('\r\n');
}

/** Converte string numérica pt-BR ("1.234,56", "R$ 89,90") em número. */
export function parseNumberBR(value) {
  if (typeof value === 'number') return value;
  let s = String(value ?? '').replace(/[^\d,.-]/g, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
