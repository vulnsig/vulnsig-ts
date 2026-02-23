#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { renderGlyph } from '../dist/index.js';

const vectors = JSON.parse(readFileSync('spec/test-vectors.json', 'utf8'));

const sizes = [48, 96, 160];

// --- Index: one glyph per vector ---
const indexItems = vectors
  .map((tv, i) => {
    const svg = renderGlyph({ vector: tv.vector, score: tv.score, size: 80, showLabel: false });
    return `
    <a href="#detail-${i}" class="index-item">
      <div class="index-glyph">${svg}</div>
      <div class="index-name">${tv.name}</div>
      <div class="index-score">${tv.score}</div>
    </a>`;
  })
  .join('\n');

// --- Detail cards ---
const cards = vectors
  .map((tv, i) => {
    const svgs = sizes
      .map((s) => {
        const svg = renderGlyph({ vector: tv.vector, score: tv.score, size: s, showLabel: true });
        return `<div class="size"><div class="svg-wrap">${svg}</div><span class="size-label">${s}px</span></div>`;
      })
      .join('\n');

    const tags = [];
    if (tv.expect.splitBand) tags.push('split');
    if (tv.expect.segmented) tags.push('segmented');
    if (tv.expect.bumps) tags.push('bumps');
    if (tv.expect.spikes === 'long') tags.push('spikes');
    tags.push(`${tv.expect.starPoints}-pt`);
    tags.push(tv.expect.prStroke);

    const tagHtml = tags.map((t) => `<span class="tag">${t}</span>`).join('');

    return `
    <div class="card" id="detail-${i}">
      <div class="card-header">
        <div class="name">${tv.name}</div>
        <div class="meta">
          <span class="score">${tv.score}</span>
          <span class="cve">${tv.cve}</span>
        </div>
        <div class="tags">${tagHtml}</div>
      </div>
      <div class="sizes">${svgs}</div>
      <div class="vector">${tv.vector}</div>
    </div>`;
  })
  .join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Threatprint Preview</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #060810;
    color: #e2e8f0;
    font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
    padding: 32px 24px;
  }
  h1 {
    font-size: 28px;
    font-weight: 300;
    margin-bottom: 4px;
    background: linear-gradient(135deg, hsl(190,60%,50%), hsl(280,60%,55%), hsl(350,70%,55%), hsl(20,80%,55%));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .subtitle {
    font-size: 13px;
    color: #475569;
    margin-bottom: 28px;
  }

  /* --- Index --- */
  .index {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 40px;
    padding-bottom: 28px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .index-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 8px 8px;
    border-radius: 10px;
    text-decoration: none;
    color: inherit;
    transition: background 0.15s;
    width: 105px;
  }
  .index-item:hover {
    background: rgba(255,255,255,0.06);
  }
  .index-glyph {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .index-name {
    font-size: 10px;
    font-weight: 600;
    color: #cbd5e1;
    text-align: center;
    line-height: 1.2;
  }
  .index-score {
    font-size: 11px;
    font-weight: 700;
    color: #a78bfa;
  }

  /* --- Detail section --- */
  .section-title {
    font-size: 16px;
    font-weight: 400;
    color: #64748b;
    margin-bottom: 16px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(560px, 1fr));
    gap: 16px;
  }
  .card {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 10px;
    padding: 20px 22px;
    scroll-margin-top: 20px;
  }
  .card-header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 14px;
  }
  .name {
    font-size: 16px;
    font-weight: 600;
    color: #e2e8f0;
  }
  .score {
    font-size: 15px;
    font-weight: 700;
    color: #a78bfa;
  }
  .cve {
    font-size: 12px;
    color: #475569;
  }
  .tags {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  .tag {
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 3px;
    background: rgba(99,102,241,0.1);
    color: #818cf8;
    border: 1px solid rgba(99,102,241,0.2);
  }
  .sizes {
    display: flex;
    align-items: flex-end;
    gap: 20px;
    margin-bottom: 12px;
  }
  .size {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .svg-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .size-label {
    font-size: 11px;
    color: #475569;
  }
  .vector {
    font-size: 11px;
    color: #334155;
    word-break: break-all;
    line-height: 1.4;
  }
</style>
</head>
<body>
  <h1>Threatprint Preview</h1>
  <div class="subtitle">Generated from spec/test-vectors.json &mdash; ${new Date().toISOString().slice(0, 19)}</div>

  <div class="index">
    ${indexItems}
  </div>

  <div class="section-title">Detail</div>
  <div class="grid">
    ${cards}
  </div>
</body>
</html>`;

writeFileSync('doc/preview.html', html);
console.log(`doc/preview.html written (${vectors.length} vectors, ${sizes.length} sizes each)`);
