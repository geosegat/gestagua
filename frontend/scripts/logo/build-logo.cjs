'use strict';
// Gera os arquivos da marca em public/brand a partir da arte original: remove o
// fundo branco preservando os brancos internos do desenho, recorta o lockup e o
// símbolo, e monta uma folha de prova pra conferência sobre fundo claro/escuro.
//
// Rodar a partir de frontend/ quando chegar uma versão nova do logo:
//   node scripts/logo/build-logo.cjs scripts/logo/psa-original.png public/brand
//
// (.cjs porque o package.json do frontend é "type": "module")
//
// Só usa Node puro (zlib nativo) - sem sharp, ImageMagick ou canvas. A folha de
// prova (proof.png) sai junto no diretório de saída; não é usada pelo app.
const fs = require('node:fs');
const path = require('node:path');
const { decode, encode } = require('./png.cjs');

const SRC = process.argv[2];
const OUT = process.argv[3];

const img = decode(fs.readFileSync(SRC));
const { width: W, height: H } = img;
const src = img.data;

/* ---------- 1. máscara de fundo por flood fill a partir das bordas ---------- */
// Só o branco CONECTADO à borda é fundo. Os traços brancos dentro da gota
// ficam ilhados pelo azul e continuam opacos - é o que evita "buracos" no logo
// quando ele aparece sobre superfície escura.
const BG_TOL = 12; // distância máx. do branco pra contar como fundo
const dist = new Uint8Array(W * H); // 255 - min(r,g,b): 0 = branco puro
for (let i = 0; i < W * H; i++) {
  dist[i] = 255 - Math.min(src[i * 4], src[i * 4 + 1], src[i * 4 + 2]);
}

const isBg = new Uint8Array(W * H);
const stack = [];
for (let x = 0; x < W; x++) {
  stack.push(x, (H - 1) * W + x);
}
for (let y = 0; y < H; y++) {
  stack.push(y * W, y * W + W - 1);
}
while (stack.length) {
  const p = stack.pop();
  if (isBg[p] || dist[p] > BG_TOL) continue;
  isBg[p] = 1;
  const x = p % W;
  const y = (p - x) / W;
  if (x > 0) stack.push(p - 1);
  if (x < W - 1) stack.push(p + 1);
  if (y > 0) stack.push(p - W);
  if (y < H - 1) stack.push(p + W);
}

/* ---------- 2. alpha: 0 no fundo, rampa na borda, opaco no resto ---------- */
// Pixel anti-serrilhado é a arte misturada com o branco do fundo. Sem tratar,
// sobra o halo claro em volta do desenho. Aqui a cobertura vem da distância do
// branco e a cor é "desmisturada" (unpremultiply) pra recuperar o tom original.
const EDGE = 62; // acima disso o pixel é considerado arte cheia
const RADIUS = 2; // só pixels a até 2px do fundo entram na rampa

function nearBg(x, y) {
  for (let dy = -RADIUS; dy <= RADIUS; dy++) {
    for (let dx = -RADIUS; dx <= RADIUS; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      if (isBg[ny * W + nx]) return true;
    }
  }
  return false;
}

const out = Buffer.alloc(W * H * 4);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const o = i * 4;
    if (isBg[i]) continue; // alpha 0 (buffer já zerado)

    let a = 255;
    let [r, g, b] = [src[o], src[o + 1], src[o + 2]];

    if (dist[i] < EDGE && nearBg(x, y)) {
      a = Math.round((dist[i] / EDGE) * 255);
      if (a <= 0) continue;
      const k = a / 255;
      // C = k*F + (1-k)*255  =>  F = (C - 255*(1-k)) / k
      r = Math.min(255, Math.max(0, Math.round((r - 255 * (1 - k)) / k)));
      g = Math.min(255, Math.max(0, Math.round((g - 255 * (1 - k)) / k)));
      b = Math.min(255, Math.max(0, Math.round((b - 255 * (1 - k)) / k)));
    }

    out[o] = r;
    out[o + 1] = g;
    out[o + 2] = b;
    out[o + 3] = a;
  }
}

/* ---------- utilitários de recorte/escala ---------- */

function crop(data, w, h, x0, y0, x1, y1) {
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const buf = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    src4(data, w, x0, y0 + y, cw).copy(buf, y * cw * 4);
  }
  return { width: cw, height: ch, data: buf };
}

function src4(data, w, x, y, len) {
  const start = (y * w + x) * 4;
  return data.subarray(start, start + len * 4);
}

/** Menor retângulo que contém tudo que não é totalmente transparente. */
function bbox(data, w, h) {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return { x0, y0, x1, y1 };
}

/** Redução por média de área, com alpha pré-multiplicado (sem franja). */
function resize(img, tw, th) {
  const { width: w, height: h, data } = img;
  const buf = Buffer.alloc(tw * th * 4);
  const sx = w / tw;
  const sy = h / th;

  for (let y = 0; y < th; y++) {
    const y0 = Math.floor(y * sy);
    const y1 = Math.max(y0 + 1, Math.ceil((y + 1) * sy));
    for (let x = 0; x < tw; x++) {
      const x0 = Math.floor(x * sx);
      const x1 = Math.max(x0 + 1, Math.ceil((x + 1) * sx));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let yy = y0; yy < Math.min(y1, h); yy++) {
        for (let xx = x0; xx < Math.min(x1, w); xx++) {
          const o = (yy * w + xx) * 4;
          const al = data[o + 3] / 255;
          r += data[o] * al;
          g += data[o + 1] * al;
          b += data[o + 2] * al;
          a += data[o + 3];
          n++;
        }
      }
      const o = (y * tw + x) * 4;
      const am = a / n;
      const k = am > 0 ? am / 255 : 0;
      buf[o] = k > 0 ? Math.min(255, Math.round(r / n / k)) : 0;
      buf[o + 1] = k > 0 ? Math.min(255, Math.round(g / n / k)) : 0;
      buf[o + 2] = k > 0 ? Math.min(255, Math.round(b / n / k)) : 0;
      buf[o + 3] = Math.round(am);
    }
  }
  return { width: tw, height: th, data: buf };
}

/** Centraliza numa tela quadrada com margem proporcional. */
function square(img, side, padRatio) {
  const inner = Math.round(side * (1 - padRatio * 2));
  const scale = Math.min(inner / img.width, inner / img.height);
  const rw = Math.max(1, Math.round(img.width * scale));
  const rh = Math.max(1, Math.round(img.height * scale));
  const small = resize(img, rw, rh);
  const buf = Buffer.alloc(side * side * 4);
  const ox = Math.round((side - rw) / 2);
  const oy = Math.round((side - rh) / 2);
  for (let y = 0; y < rh; y++) {
    small.data.subarray(y * rw * 4, (y + 1) * rw * 4).copy(buf, ((oy + y) * side + ox) * 4);
  }
  return { width: side, height: side, data: buf };
}

/* ---------- 3. recortes ---------- */

const full = (() => {
  const b = bbox(out, W, H);
  return crop(out, W, H, b.x0, b.y0, b.x1, b.y1);
})();

// símbolo (gota + folha): fica acima da linha do subtítulo e antes do vão que
// separa do texto "PSA" - limites confirmados pela análise de bandas/colunas
const symbol = (() => {
  const region = crop(out, W, H, 0, 0, 270, 330);
  const b = bbox(region.data, region.width, region.height);
  return crop(region.data, region.width, region.height, b.x0, b.y0, b.x1, b.y1);
})();

const symbolSquare = square(symbol, 256, 0.04);
const fullScaled = full.width > 600 ? resize(full, 600, Math.round((full.height / full.width) * 600)) : full;

/**
 * Versão pra fundo escuro: a gota e a folha seguem coloridas (é a marca), só a
 * tipografia vira branca - o azul-marinho do "PSA" e o verde do subtítulo somem
 * sobre o petróleo. O corte usa a mesma geometria achada na análise: o símbolo
 * ocupa a faixa superior esquerda, todo o resto é texto.
 */
const inverted = (() => {
  const { width: w, height: h } = full;
  const data = Buffer.from(full.data);
  const symW = symbol.width + 6;
  const symH = symbol.height + 6;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (data[o + 3] === 0) continue;
      if (x < symW && y < symH) continue; // símbolo: preserva as cores
      data[o] = 255;
      data[o + 1] = 255;
      data[o + 2] = 255;
    }
  }
  const img = { width: w, height: h, data };
  return w > 600 ? resize(img, 600, Math.round((h / w) * 600)) : img;
})();

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'psa-logo.png'), encode(fullScaled));
fs.writeFileSync(path.join(OUT, 'psa-symbol.png'), encode(symbolSquare));
fs.writeFileSync(path.join(OUT, 'psa-logo-inverso.png'), encode(inverted));

const bgCount = isBg.reduce((s, v) => s + v, 0);
console.log(`fundo removido: ${bgCount} px (${((bgCount / (W * H)) * 100).toFixed(1)}%)`);
console.log(`lockup: ${fullScaled.width}x${fullScaled.height}`);
console.log(`símbolo (recorte): ${symbol.width}x${symbol.height} -> quadrado ${symbolSquare.width}px`);
for (const f of ['psa-logo.png', 'psa-symbol.png', 'psa-logo-inverso.png']) {
  console.log(`  ${f}: ${(fs.statSync(path.join(OUT, f)).size / 1024).toFixed(1)} KB`);
}

/* ---------- 4. folha de prova ---------- */
// Composita os recortes sobre as cores reais do produto: se sobrar halo branco
// ou furo no desenho, aparece aqui.
const BGS = [
  [12, 74, 85], // --brand-primary
  [246, 244, 238], // --color-paper
  [255, 255, 255], // --color-card
  [22, 163, 181], // --brand-accent
];
const CELL = 150;
const sheetW = CELL * BGS.length;
const sheetH = CELL * 3;
const sheet = Buffer.alloc(sheetW * sheetH * 4);

function paste(target, tw, img, ox, oy) {
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const s = (y * img.width + x) * 4;
      const a = img.data[s + 3] / 255;
      if (a === 0) continue;
      const d = ((oy + y) * tw + ox + x) * 4;
      for (let c = 0; c < 3; c++) {
        target[d + c] = Math.round(img.data[s + c] * a + target[d + c] * (1 - a));
      }
      target[d + 3] = 255;
    }
  }
}

BGS.forEach((color, col) => {
  for (let y = 0; y < sheetH; y++) {
    for (let x = col * CELL; x < (col + 1) * CELL; x++) {
      const o = (y * sheetW + x) * 4;
      sheet[o] = color[0];
      sheet[o + 1] = color[1];
      sheet[o + 2] = color[2];
      sheet[o + 3] = 255;
    }
  }
  // linha 1: lockup colorido · linha 2: lockup inverso · linha 3: só o símbolo
  const lockup = resize(fullScaled, 120, Math.round((fullScaled.height / fullScaled.width) * 120));
  paste(sheet, sheetW, lockup, col * CELL + 15, Math.round((CELL - lockup.height) / 2));

  const inv = resize(inverted, 120, Math.round((inverted.height / inverted.width) * 120));
  paste(sheet, sheetW, inv, col * CELL + 15, CELL + Math.round((CELL - inv.height) / 2));

  const mark = resize(symbolSquare, 72, 72);
  paste(sheet, sheetW, mark, col * CELL + 39, CELL * 2 + 39);
});

fs.writeFileSync(path.join(OUT, 'proof.png'), encode({ width: sheetW, height: sheetH, data: sheet }));
console.log('folha de prova: proof.png');
