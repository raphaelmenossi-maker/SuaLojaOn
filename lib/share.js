/** Ferramentas de divulgação: texto pronto, links de redes sociais e card para Instagram. */

import { store } from './store.js';

const ICONS = {
  whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.05c-.24.68-1.42 1.31-1.96 1.36-.54.05-1.04.24-3.52-.74-2.98-1.18-4.85-4.25-5-4.45-.15-.2-1.19-1.58-1.19-3.01 0-1.43.75-2.13 1.02-2.42.27-.29.58-.36.78-.36.2 0 .39 0 .56.01.18.01.42-.07.65.5.24.58.82 2 .89 2.14.07.15.12.32.02.51-.1.2-.15.32-.29.49-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.75 1.23 1.6 1.99 1.1.98 2.02 1.29 2.31 1.43.29.15.46.12.63-.07.17-.2.73-.85.92-1.14.2-.29.39-.24.65-.15.27.1 1.7.8 1.99.95.29.15.49.22.56.34.07.13.07.74-.17 1.42Z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.25-1.5 1.55-1.5h1.65V4.6c-.29-.04-1.27-.13-2.41-.13-2.39 0-4.02 1.46-4.02 4.13v2.3H7.5V14h2.77v8h3.23Z"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.53 3h3.05l-6.66 7.6L21.75 21h-6.13l-4.8-6.28L5.32 21H2.27l7.12-8.14L2.25 3h6.29l4.34 5.74L17.53 3Zm-1.07 16.2h1.69L7.6 4.72H5.79l10.67 14.48Z"/></svg>',
  telegram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 4.3 18.7 19.4c-.24 1.07-.88 1.33-1.78.83l-4.9-3.6-2.37 2.28c-.26.26-.48.48-.98.48l.35-4.99 9.1-8.22c.4-.35-.08-.55-.6-.2L6.06 13.06 1.2 11.6c-1.05-.33-1.07-1.05.22-1.56L20.6 2.7c.87-.32 1.63.2 1.3 1.6Z"/></svg>',
  pinterest: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.65 19.31c-.08-.78-.16-1.98.03-2.83.17-.77 1.1-4.9 1.1-4.9s-.28-.56-.28-1.4c0-1.31.76-2.29 1.7-2.29.8 0 1.19.6 1.19 1.32 0 .8-.51 2-.78 3.12-.22.94.47 1.7 1.39 1.7 1.67 0 2.95-1.76 2.95-4.3 0-2.24-1.61-3.82-3.92-3.82-2.67 0-4.24 2-4.24 4.07 0 .81.31 1.67.7 2.14.08.1.09.18.06.28-.07.3-.23.95-.26 1.08-.04.18-.15.22-.34.13-1.27-.59-2.06-2.44-2.06-3.93 0-3.2 2.32-6.13 6.7-6.13 3.52 0 6.25 2.5 6.25 5.86 0 3.5-2.2 6.31-5.27 6.31-1.03 0-2-.53-2.32-1.17l-.63 2.4c-.23.88-.85 1.98-1.26 2.65A10 10 0 1 0 12 2Z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.94 5a1.94 1.94 0 1 1-3.88 0 1.94 1.94 0 0 1 3.88 0ZM3.2 8.9h3.6V21H3.2V8.9Zm5.86 0h3.45v1.66h.05c.48-.9 1.65-1.85 3.4-1.85 3.64 0 4.31 2.34 4.31 5.39V21h-3.6v-6.02c0-1.44-.03-3.29-2.02-3.29-2.02 0-2.33 1.56-2.33 3.19V21H9.06V8.9Z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2Zm0 5.13a4.67 4.67 0 1 0 0 9.34 4.67 4.67 0 0 0 0-9.34Zm0 7.7a3.03 3.03 0 1 1 0-6.06 3.03 3.03 0 0 1 0 6.06Zm5.93-7.88a1.09 1.09 0 1 1-2.18 0 1.09 1.09 0 0 1 2.18 0Z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.1c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.03-.47-.09-.7l7.05-4.11A2.99 2.99 0 0 0 21 5a3 3 0 1 0-3-3c0 .24.04.47.09.7L8.04 8.84A2.99 2.99 0 0 0 3 12a3 3 0 1 0 3 3c0-.24-.04-.47-.09-.7l7.12 4.16c-.05.21-.08.43-.08.65a2.92 2.92 0 0 0 5.84 0c0-1.6-1.32-2.91-2.91-2.91Z"/></svg>',
};

export const SHARE_TARGETS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: ICONS.whatsapp, color: '#25D366' },
  { id: 'facebook', label: 'Facebook', icon: ICONS.facebook, color: '#1877F2' },
  { id: 'instagram', label: 'Instagram', icon: ICONS.instagram, color: '#E1306C' },
  { id: 'x', label: 'X / Twitter', icon: ICONS.x, color: '#111827' },
  { id: 'telegram', label: 'Telegram', icon: ICONS.telegram, color: '#229ED9' },
  { id: 'pinterest', label: 'Pinterest', icon: ICONS.pinterest, color: '#E60023' },
  { id: 'linkedin', label: 'LinkedIn', icon: ICONS.linkedin, color: '#0A66C2' },
  { id: 'copy', label: 'Copiar link', icon: ICONS.copy, color: '#64748B' },
];

export function storeLink() {
  const url = new URL(window.location.href);
  url.hash = '';
  url.search = '';
  return url.toString();
}

export function productLink(product) {
  const url = new URL(window.location.href);
  url.hash = `#/p/${product.id}`;
  return url.toString();
}

export function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Monta um texto de divulgação pronto para colar. */
export function buildPostText(product, { includeAll = false } = {}) {
  const cfg = store.state.config;
  const link = storeLink();
  const lines = [];

  if (product) {
    lines.push(`🔥 ${product.name}`);
    if (product.desc) lines.push(String(product.desc).split('\n')[0].slice(0, 120));
    lines.push(`💰 ${money(product.price)}`);
    if (product.oldPrice && product.oldPrice > product.price) {
      lines.push(`~~${money(product.oldPrice)}~~ · ${Math.round((1 - product.price / product.oldPrice) * 100)}% OFF`);
    }
    lines.push(`👉 ${productLink(product)}`);
  } else if (includeAll) {
    const list = store.state.products.filter((p) => p.active !== false).slice(0, 8);
    lines.push(`✨ ${cfg.storeName}${cfg.tagline ? ` — ${cfg.tagline}` : ''}`);
    if (list.length) {
      lines.push('');
      list.forEach((p, i) => lines.push(`${i + 1}. ${p.name} — ${money(p.price)}`));
    }
    lines.push(`👉 ${link}`);
  } else {
    lines.push(`✨ ${cfg.storeName}${cfg.tagline ? ` — ${cfg.tagline}` : ''}`);
    lines.push(`👉 ${link}`);
  }

  if (cfg.updatedAt) {
    const d = new Date(cfg.updatedAt);
    if (!Number.isNaN(d.getTime())) {
      lines.push(`🕒 Preços atualizados em ${d.toLocaleDateString('pt-BR')}`);
    }
  }
  if (cfg.whatsapp) {
    const quem = cfg.contactName ? ` com ${cfg.contactName}` : '';
    lines.push(`📲 Pedidos no WhatsApp${quem}: ${cfg.whatsapp.replace(/\D/g, '')}`);
  }
  const tags = ['#achadinhos', '#promocao', '#compras'];
  if (cfg.instagram) tags.push(`#${cfg.instagram.replace(/^@/, '').replace(/[^a-zA-Z0-9_]/g, '')}`);
  lines.push(tags.join(' '));
  return lines.join('\n');
}

/** Abre o destino de compartilhamento. */
export function openShare(targetId, { text, url } = {}) {
  const payload = { text: text || buildPostText(), url: url || storeLink() };
  const enc = encodeURIComponent(payload.text);
  const encUrl = encodeURIComponent(payload.url);

  switch (targetId) {
    case 'whatsapp':
      return window.open(`https://wa.me/?text=${enc}`, '_blank', 'noopener');
    case 'facebook':
      return window.open(`https://www.facebook.com/sharer/sharer.php?u=${encUrl}`, '_blank', 'noopener');
    case 'x':
      return window.open(`https://twitter.com/intent/tweet?text=${enc}&url=${encUrl}`, '_blank', 'noopener');
    case 'telegram':
      return window.open(`https://t.me/share/url?url=${encUrl}&text=${enc}`, '_blank', 'noopener');
    case 'pinterest':
      return window.open(`https://pinterest.com/pin/create/button/?url=${encUrl}&description=${enc}`, '_blank', 'noopener');
    case 'linkedin':
      return window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encUrl}`, '_blank', 'noopener');
    case 'instagram':
      // Instagram não aceita link direto: copia a legenda e abre o app/ site.
      copyText(payload.text);
      window.open('https://www.instagram.com/', '_blank', 'noopener');
      return null;
    case 'copy':
      copyText(`${payload.text}\n${payload.url}`);
      return null;
    default:
      return null;
  }
}

export function copyText(text) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch { /* ignora */ }
  ta.remove();
}

export async function nativeShare({ title, text, url } = {}) {
  const data = { title: title || store.state.config.storeName, text: text || buildPostText(), url: url || storeLink() };
  if (navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch { return false; }
  }
  copyText(`${data.text}\n${data.url}`);
  return false;
}

/* ---------------- card para Instagram ---------------- */

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth, maxLines) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else line = test;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (ctx.measureText(last).width > maxWidth) lines[maxLines - 1] = `${last.slice(0, -6)}...`;
  }
  return lines;
}

async function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Gera um card (PNG) de divulgação.
 * @param {object} product produto (ou null para card geral da loja)
 * @param {'feed'|'story'} ratio
 */
export async function buildShareCard(product, ratio = 'feed') {
  const cfg = store.state.config;
  const W = 1080;
  const H = ratio === 'story' ? 1920 : 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // fundo
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#6D28D9');
  grad.addColorStop(0.55, '#9333EA');
  grad.addColorStop(1, '#F97316');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#FFFFFF';
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.arc(120 + i * 190, 180 + (i % 3) * 260, 150 + (i % 2) * 70, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const pad = 72;
  // topo
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillText(cfg.storeName || 'Minha Loja', pad, pad + 20);
  ctx.font = '26px system-ui, sans-serif';
  ctx.globalAlpha = 0.85;
  ctx.fillText(cfg.tagline || '', pad, pad + 62);
  ctx.globalAlpha = 1;

  // imagem do produto
  const imgBox = { x: pad, y: pad + 100, w: W - pad * 2, h: ratio === 'story' ? 820 : 640 };
  ctx.save();
  roundRect(ctx, imgBox.x, imgBox.y, imgBox.w, imgBox.h, 36);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillRect(imgBox.x, imgBox.y, imgBox.w, imgBox.h);
  if (product?.image) {
    const img = await loadImage(product.image);
    if (img) {
      const scale = Math.max(imgBox.w / img.width, imgBox.h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, imgBox.x + (imgBox.w - dw) / 2, imgBox.y + (imgBox.h - dh) / 2, dw, dh);
    }
  } else if (product?.emoji) {
    ctx.font = '300px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(product.emoji, W / 2, imgBox.y + imgBox.h / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();

  // textos
  let y = imgBox.y + imgBox.h + 74;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 54px system-ui, sans-serif';
  const titleLines = wrapText(ctx, product?.name || cfg.storeName, W - pad * 2, 2);
  titleLines.forEach((l) => { ctx.fillText(l, pad, y); y += 62; });

  if (product?.price) {
    ctx.font = 'bold 66px system-ui, sans-serif';
    ctx.fillText(money(product.price), pad, y + 6);
    y += 78;
  }

  if (product?.desc) {
    ctx.globalAlpha = 0.9;
    ctx.font = '30px system-ui, sans-serif';
    wrapText(ctx, product.desc, W - pad * 2, 2).forEach((l) => { ctx.fillText(l, pad, y); y += 40; });
    ctx.globalAlpha = 1;
  }

  // rodapé: link + QR
  const link = product ? productLink(product) : storeLink();
  const qrSize = 190;
  const qrY = H - pad - qrSize;
  if (window.QRCode?.toCanvas) {
    try {
      const qrCanvas = document.createElement('canvas');
      await window.QRCode.toCanvas(qrCanvas, link, { width: qrSize, margin: 1, color: { dark: '#111827', light: '#ffffff' } });
      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, pad - 8, qrY - 8, qrSize + 16, qrSize + 16, 18);
      ctx.fill();
      ctx.drawImage(qrCanvas, pad, qrY);
    } catch { /* sem QR: segue sem ele */ }
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillText('Peça agora pelo WhatsApp', pad + qrSize + 36, qrY + 70);
  ctx.globalAlpha = 0.9;
  ctx.font = '26px system-ui, sans-serif';
  wrapText(ctx, link, W - pad * 2 - qrSize - 60, 2).forEach((l, i) => {
    ctx.fillText(l, pad + qrSize + 36, qrY + 116 + i * 36);
  });
  ctx.globalAlpha = 1;

  return canvas;
}

export function downloadCanvas(canvas, filename) {
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, 'image/png');
}

export { ICONS };
