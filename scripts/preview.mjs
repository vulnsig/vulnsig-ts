#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { renderGlyph } from '../dist/index.js';
import { scoreToHue } from '../dist/color.js';
import { arcPath, starPath, ringFill, radialCuts } from '../dist/geometry.js';

const vectors = JSON.parse(readFileSync('spec/test-vectors.json', 'utf8'));

const sizes = [48, 96, 160];

// --- Legend helpers ---
function miniStar(cx, cy, n, oR, iR, fill, stroke, sw = 0.7) {
  return `<path d="${starPath(cx, cy, n, oR, iR)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
}

function metricTag(label, color = '#6366f1') {
  return `<span style="display:inline-block;padding:1px 5px;border-radius:3px;font-size:8px;font-weight:700;background:${color}22;color:${color};border:1px solid ${color}44;margin-right:3px;letter-spacing:0.05em">${label}</span>`;
}

function valueTag(label) {
  return `<span style="display:inline-block;padding:1px 4px;border-radius:3px;font-size:8px;font-weight:600;background:rgba(255,255,255,0.06);color:#94a3b8;border:1px solid rgba(255,255,255,0.08);margin-right:2px">${label}</span>`;
}

function swatch(color, border = '') {
  const bdr = border ? `border:${border};` : '';
  return `<span style="display:inline-block;width:24px;height:8px;border-radius:2px;background:${color};${bdr}"></span>`;
}

// Fixed legend colors
const sh = 10, ss = 75, sl = 1;
const bgC = `hsl(${sh}, 4%, 5%)`;

// --- Build legend sections ---
function buildLegend() {
  const sectionStart = `<div style="margin-bottom:14px;padding:12px 14px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.05)">`;
  const headStyle = `font-size:11px;font-weight:600;color:#cbd5e1;margin-bottom:8px`;
  const descStyle = `font-size:9px;color:#64748b;margin-bottom:10px;line-height:1.5`;

  // 1. CIA Ring
  const ciaRingSvg = `<svg width="80" height="80" viewBox="0 0 80 80" style="overflow:visible">
    <circle cx="40" cy="40" r="26.5" fill="${bgC}"/>
    <path d="${arcPath(40, 40, 26.5, 33.5, -148, -32)}" fill="${ringFill(1.0, sh, ss, sl)}"/>
    <path d="${arcPath(40, 40, 26.5, 33.5, -28, 88)}" fill="${ringFill(0.5, sh, ss, sl)}"/>
    <path d="${arcPath(40, 40, 26.5, 33.5, 92, 208)}" fill="${ringFill(0.0, sh, ss, sl)}"/>
    <circle cx="40" cy="40" r="35.75" fill="none" stroke="hsl(${sh}, ${ss}%, 52%)" stroke-width="3"/>
    ${miniStar(40, 40, 6, 24, 10, 'hsla(10,5%,14%,0.8)', 'rgba(255,255,255,0.2)')}
    <text x="40" y="16" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="7" font-weight="700" font-family="monospace">C</text>
    <text x="58" y="54" text-anchor="middle" fill="rgba(255,255,255,0.35)" font-size="7" font-weight="700" font-family="monospace">I</text>
    <text x="22" y="54" text-anchor="middle" fill="rgba(255,255,255,0.12)" font-size="7" font-weight="700" font-family="monospace">A</text>
  </svg>`;

  const ciaSection = `${sectionStart}
    <div style="${headStyle}">Outer Ring &mdash; Impact on CIA Triad</div>
    <div style="${descStyle}">The ring is divided into three 120&deg; sectors, one per CIA dimension. Each sector's brightness encodes the impact magnitude.</div>
    <div style="display:flex;gap:16px;align-items:center;margin-bottom:10px">
      ${ciaRingSvg}
      <div style="font-size:9px;line-height:2.2">
        <div style="display:flex;align-items:center;gap:6px">${swatch(ringFill(1.0, sh, ss, sl))} ${valueTag('H')} <span style="color:#64748b">High impact</span></div>
        <div style="display:flex;align-items:center;gap:6px">${swatch(ringFill(0.5, sh, ss, sl))} ${valueTag('L')} <span style="color:#64748b">Low impact</span></div>
        <div style="display:flex;align-items:center;gap:6px">${swatch(ringFill(0.0, sh, ss, sl), '1px solid rgba(255,255,255,0.08)')} ${valueTag('N')} <span style="color:#64748b">No impact</span></div>
      </div>
    </div>
    <div style="font-size:9px;color:#475569;line-height:1.8">
      <div><strong style="color:#94a3b8">Top sector:</strong> ${metricTag('VC')} Confidentiality</div>
      <div><strong style="color:#94a3b8">Bottom-right:</strong> ${metricTag('VI')} Integrity</div>
      <div><strong style="color:#94a3b8">Bottom-left:</strong> ${metricTag('VA')} Availability</div>
    </div>
  </div>`;

  // 2. Split Band
  function splitSvg(hasSplit) {
    const cx = 28, cy = 28;
    let paths = '';
    if (hasSplit) {
      paths += `<path d="${arcPath(cx, cy, 18.5, 22, -148, -32)}" fill="${ringFill(1.0, sh, ss, sl)}"/>`;
      paths += `<path d="${arcPath(cx, cy, 18.5, 22, -28, 88)}" fill="${ringFill(1.0, sh, ss, sl)}"/>`;
      paths += `<path d="${arcPath(cx, cy, 18.5, 22, 92, 208)}" fill="${ringFill(0.0, sh, ss, sl)}"/>`;
      paths += `<path d="${arcPath(cx, cy, 23.5, 27, -148, -32)}" fill="${ringFill(0.5, sh, ss, sl)}"/>`;
      paths += `<path d="${arcPath(cx, cy, 23.5, 27, -28, 88)}" fill="${ringFill(0.0, sh, ss, sl)}"/>`;
      paths += `<path d="${arcPath(cx, cy, 23.5, 27, 92, 208)}" fill="${ringFill(0.0, sh, ss, sl)}"/>`;
    } else {
      paths += `<path d="${arcPath(cx, cy, 18.5, 27, -148, -32)}" fill="${ringFill(1.0, sh, ss, sl)}"/>`;
      paths += `<path d="${arcPath(cx, cy, 18.5, 27, -28, 88)}" fill="${ringFill(1.0, sh, ss, sl)}"/>`;
      paths += `<path d="${arcPath(cx, cy, 18.5, 27, 92, 208)}" fill="${ringFill(0.0, sh, ss, sl)}"/>`;
    }
    return `<svg width="56" height="56" viewBox="0 0 56 56" style="overflow:visible">
      <circle cx="${cx}" cy="${cy}" r="18.5" fill="${bgC}"/>
      ${paths}
      <circle cx="${cx}" cy="${cy}" r="29.25" fill="none" stroke="hsl(${sh}, ${ss}%, 52%)" stroke-width="3"/>
      ${miniStar(cx, cy, 6, 16, 7, 'hsla(10,5%,14%,0.6)', 'rgba(255,255,255,0.15)')}
    </svg>`;
  }

  const splitSection = `${sectionStart}
    <div style="${headStyle}">Split Band &mdash; Subsequent System Impact</div>
    <div style="${descStyle}">When ${metricTag('SC', '#f59e0b')} ${metricTag('SI', '#f59e0b')} ${metricTag('SA', '#f59e0b')} are non-zero, the ring splits radially: inner band = vulnerable system, outer band = downstream systems.</div>
    <div style="display:flex;gap:14px;align-items:center">
      <div style="text-align:center">${splitSvg(true)}<div style="font-size:7px;color:#64748b;margin-top:2px">SC:L, SI:N, SA:N</div></div>
      <div style="text-align:center">${splitSvg(false)}<div style="font-size:7px;color:#64748b;margin-top:2px">SC:N, SI:N, SA:N</div></div>
      <div style="font-size:9px;color:#475569;line-height:1.6">
        <div>Split appears only when downstream impact &gt; None</div>
        <div style="margin-top:4px">Each band independently shows H / L / N brightness per sector</div>
      </div>
    </div>
  </div>`;

  // 3. Segmented Ring
  function segSvg(segmented) {
    const cx = 25, cy = 25;
    let paths = '';
    paths += `<path d="${arcPath(cx, cy, 16, 23, -148, -32)}" fill="${ringFill(1.0, sh, ss, sl)}"/>`;
    paths += `<path d="${arcPath(cx, cy, 16, 23, -28, 88)}" fill="${ringFill(0.5, sh, ss, sl)}"/>`;
    paths += `<path d="${arcPath(cx, cy, 16, 23, 92, 208)}" fill="${ringFill(0.0, sh, ss, sl)}"/>`;
    if (segmented) {
      for (const [sd, ed] of [[-148, -32], [-28, 88], [92, 208]]) {
        for (const c of radialCuts(sd, ed, 3, 4)) {
          paths += `<path d="${arcPath(cx, cy, 15.5, 23.5, c.startDeg, c.endDeg)}" fill="${bgC}"/>`;
        }
      }
    }
    return `<svg width="50" height="50" viewBox="0 0 50 50" style="overflow:visible">
      <circle cx="${cx}" cy="${cy}" r="16" fill="${bgC}"/>
      ${paths}
      <circle cx="${cx}" cy="${cy}" r="25" fill="none" stroke="hsl(${sh}, ${ss}%, 52%)" stroke-width="2.5"/>
    </svg>`;
  }

  const segSection = `${sectionStart}
    <div style="${headStyle}">Segmented Ring &mdash; Attack Requirements</div>
    <div style="${descStyle}">${metricTag('AT', '#ef4444')} controls whether the ring is solid or segmented. Segments indicate the exploit requires specific preconditions (e.g., race condition, specific configuration).</div>
    <div style="display:flex;gap:14px;align-items:center">
      <div style="text-align:center">${segSvg(true)}<div style="font-size:8px;color:#94a3b8">${valueTag('P')} Present</div></div>
      <div style="text-align:center">${segSvg(false)}<div style="font-size:8px;color:#94a3b8">${valueTag('N')} None</div></div>
      <div style="font-size:9px;color:#475569;line-height:1.5">Radial cuts slice through all bands uniformly so inner/outer stay aligned.</div>
    </div>
  </div>`;

  // 4. Color Hue
  const hueSwatches = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(sc => {
    const { hue: h, sat: s, light: l } = scoreToHue(sc);
    return `<div style="text-align:center">
      <div style="width:20px;height:14px;border-radius:3px;background:hsl(${h}, ${s}%, ${52 * l}%)"></div>
      <div style="font-size:6px;color:#475569;margin-top:2px">${sc}</div>
    </div>`;
  }).join('');

  const hueSection = `${sectionStart}
    <div style="${headStyle}">Color &mdash; CVSS Base Score</div>
    <div style="${descStyle}">The overall color is driven by the CVSS Base Score (0&ndash;10). This tints the ring, star fill, hue ring, and spikes/bumps.</div>
    <div style="display:flex;gap:4px;justify-content:center;margin-bottom:6px">${hueSwatches}</div>
    <div style="display:flex;justify-content:space-between;font-size:8px;color:#475569">
      <span>Low severity</span><span>Critical</span>
    </div>
  </div>`;

  // 5. Star Points (AV)
  const avItems = [
    { n: 8, val: 'N', label: 'Network', desc: 'Remotely exploitable' },
    { n: 6, val: 'A', label: 'Adjacent', desc: 'Same LAN / WiFi' },
    { n: 4, val: 'L', label: 'Local', desc: 'Local access needed' },
    { n: 3, val: 'P', label: 'Physical', desc: 'Touch the device' },
  ].map(({ n, val, label, desc }) => `
    <div style="text-align:center;flex:1">
      <svg width="36" height="36" viewBox="0 0 36 36" style="overflow:visible">
        <circle cx="18" cy="18" r="16" fill="hsla(0,0%,6%,0.8)" stroke="rgba(255,255,255,0.06)" stroke-width="0.5"/>
        ${miniStar(18, 18, n, 13, 13 * 0.25, 'hsla(260,15%,18%,0.8)', 'rgba(255,255,255,0.3)')}
      </svg>
      <div style="font-size:8px;font-weight:600;color:#cbd5e1">${valueTag(val)} ${label}</div>
      <div style="font-size:7px;color:#475569;line-height:1.3;margin-top:2px">${desc}</div>
    </div>`).join('');

  const avSection = `${sectionStart}
    <div style="${headStyle}">Star Points &mdash; Attack Vector</div>
    <div style="${descStyle}">${metricTag('AV', '#8b5cf6')} determines the number of star points. More points = broader network reach.</div>
    <div style="display:flex;gap:10px">${avItems}</div>
  </div>`;

  // 6. Star Pointiness (AC)
  const acItems = [
    { ratio: 0.25, val: 'L', label: 'Low (simple)', desc: 'Deep sharp points' },
    { ratio: 0.55, val: 'H', label: 'High (complex)', desc: 'Blunt, rounded' },
  ].map(({ ratio, val, label, desc }) => `
    <div style="text-align:center">
      <svg width="48" height="48" viewBox="0 0 48 48" style="overflow:visible">
        <circle cx="24" cy="24" r="22" fill="hsla(0,0%,6%,0.8)" stroke="rgba(255,255,255,0.06)" stroke-width="0.5"/>
        ${miniStar(24, 24, 6, 18, 18 * ratio, 'hsla(280,15%,18%,0.8)', 'rgba(255,255,255,0.3)')}
      </svg>
      <div style="font-size:8px;font-weight:600;color:#cbd5e1">${valueTag(val)} ${label}</div>
      <div style="font-size:7px;color:#475569;margin-top:2px">${desc}</div>
    </div>`).join('');

  const acSection = `${sectionStart}
    <div style="${headStyle}">Star Pointiness &mdash; Attack Complexity</div>
    <div style="${descStyle}">${metricTag('AC', '#ec4899')} controls the ratio between star tip and valley radius. Pointy = simple exploit, blunt = complex conditions.</div>
    <div style="display:flex;gap:16px;justify-content:center">${acItems}</div>
  </div>`;

  // 7. Star Outline (PR)
  const prItems = [
    { val: 'N', label: 'None', desc: 'No auth needed', sw: 0.5, sa: 0.2 },
    { val: 'L', label: 'Low', desc: 'Basic user', sw: 1.5, sa: 0.55 },
    { val: 'H', label: 'High', desc: 'Admin / root', sw: 2.5, sa: 0.8 },
  ].map(({ val, label, desc, sw, sa }) => {
    const starD = starPath(22, 22, 8, 16, 4);
    return `
    <div style="text-align:center">
      <svg width="44" height="44" viewBox="0 0 44 44" style="overflow:visible">
        <circle cx="22" cy="22" r="20" fill="hsla(0,0%,6%,0.8)" stroke="rgba(255,255,255,0.06)" stroke-width="0.5"/>
        ${miniStar(22, 22, 8, 16, 4, 'hsla(300,15%,18%,0.7)', `rgba(255,255,255,${sa})`)}
        <path d="${starD}" fill="none" stroke="rgba(255,255,255,${sa})" stroke-width="${sw}" stroke-linejoin="round"/>
      </svg>
      <div style="font-size:8px;font-weight:600;color:#cbd5e1">${valueTag(val)} ${label}</div>
      <div style="font-size:7px;color:#475569;margin-top:2px">${desc}</div>
    </div>`;
  }).join('');

  const prSection = `${sectionStart}
    <div style="${headStyle}">Star Outline &mdash; Privileges Required</div>
    <div style="${descStyle}">${metricTag('PR', '#f97316')} controls the star's outline thickness. Thicker border = more barriers to exploitation.</div>
    <div style="display:flex;gap:14px;justify-content:center">${prItems}</div>
    <div style="font-size:8px;color:#334155;margin-top:6px;font-style:italic">Thin/absent = open, exposed &middot; Thick = shielded, requires privileges</div>
  </div>`;

  // 8. Spikes / Bumps (UI)
  function spikeSvg() {
    const cx = 20, cy = 20, r = 14;
    let lines = '';
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      const x1 = cx + Math.cos(a) * (r - 0.5);
      const y1 = cy + Math.sin(a) * (r - 0.5);
      const x2 = cx + Math.cos(a) * (r + 3.5);
      const y2 = cy + Math.sin(a) * (r + 3.5);
      lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(255,255,255,0.7)" stroke-width="4.5" stroke-linecap="butt"/>`;
    }
    return `<svg width="40" height="40" viewBox="0 0 40 40" style="overflow:visible">
      <circle cx="${cx}" cy="${cy}" r="12" fill="hsla(0,0%,10%,0.6)" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
      ${lines}
    </svg>`;
  }

  function bumpSvg() {
    const cx = 20, cy = 20, r = 14, bumpR = 2.2;
    let bumps = '';
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      const bx = cx + Math.cos(a) * (r - 0.5);
      const by = cy + Math.sin(a) * (r - 0.5);
      const perpL = a - Math.PI / 2;
      const perpR = a + Math.PI / 2;
      const x1 = bx + Math.cos(perpL) * bumpR;
      const y1 = by + Math.sin(perpL) * bumpR;
      const x2 = bx + Math.cos(perpR) * bumpR;
      const y2 = by + Math.sin(perpR) * bumpR;
      bumps += `<path d="M${x1},${y1} A${bumpR},${bumpR} 0 0,1 ${x2},${y2} Z" fill="rgba(255,255,255,0.55)"/>`;
    }
    return `<svg width="40" height="40" viewBox="0 0 40 40" style="overflow:visible">
      <circle cx="${cx}" cy="${cy}" r="12" fill="hsla(0,0%,10%,0.6)" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
      ${bumps}
    </svg>`;
  }

  function cleanSvg() {
    return `<svg width="40" height="40" viewBox="0 0 40 40" style="overflow:visible">
      <circle cx="20" cy="20" r="12" fill="hsla(0,0%,10%,0.6)" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>
      <circle cx="20" cy="20" r="14" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
    </svg>`;
  }

  const uiSection = `${sectionStart}
    <div style="${headStyle}">Spikes &mdash; User Interaction Required</div>
    <div style="${descStyle}">${metricTag('UI', '#f97316')} determines spike presence and style. Spikes radiate from star tips outward past the ring.</div>
    <div style="display:flex;gap:12px;justify-content:center">
      <div style="text-align:center;flex:1">${spikeSvg()}<div style="font-size:8px;font-weight:600;color:#cbd5e1">${valueTag('N')} None</div><div style="font-size:7px;color:#475569;line-height:1.3;margin-top:2px">Self-exploiting, no user action</div></div>
      <div style="text-align:center;flex:1">${bumpSvg()}<div style="font-size:8px;font-weight:600;color:#cbd5e1">${valueTag('P')} Passive</div><div style="font-size:7px;color:#475569;line-height:1.3;margin-top:2px">Victim opens file or visits page</div></div>
      <div style="text-align:center;flex:1">${cleanSvg()}<div style="font-size:8px;font-weight:600;color:#cbd5e1">${valueTag('A')} Active</div><div style="font-size:7px;color:#475569;line-height:1.3;margin-top:2px">Victim must click / submit / install</div></div>
    </div>
    <div style="font-size:8px;color:#334155;margin-top:8px;line-height:1.4">Long spikes = auto-exploitable &middot; Bumps = passive trigger &middot; Smooth = deliberate action needed</div>
  </div>`;

  // Summary table
  const summaryRows = [
    ['Ring brightness', 'VC, VI, VA / SC, SI, SA', 'Impact per CIA dimension'],
    ['Ring split', 'SC, SI, SA > None', 'Downstream systems affected'],
    ['Ring segmented', 'AT = Present', 'Exploit needs preconditions'],
    ['Overall color', 'CVSS Base Score', 'Severity spectrum (yellow&rarr;red)'],
    ['Outer hue ring', 'CVSS Base Score', 'Full-color reference ring'],
    ['Star points', 'AV', 'Network reach (8/6/4/3)'],
    ['Star pointiness', 'AC', 'Exploit complexity'],
    ['Star outline', 'PR', 'Privileges required (thin&rarr;thick)'],
    ['Star fill', 'CVSS Base Score', 'Score color at full intensity'],
    ['Spike style', 'UI', 'User interaction (spikes/bumps/none)'],
  ].map(([visual, metrics, meaning], i) => `
    <div style="display:flex;gap:8px;border-bottom:${i < 9 ? '1px solid rgba(255,255,255,0.03)' : 'none'};padding-bottom:2px">
      <span style="width:130px;min-width:130px;color:#94a3b8;font-weight:600;font-size:8px">${visual}</span>
      <span style="width:140px;min-width:140px;font-size:8px;color:#6366f1">${metrics}</span>
      <span style="font-size:8px">${meaning}</span>
    </div>`).join('');

  const summarySection = `${sectionStart}
    <div style="${headStyle}">Quick Reference</div>
    <div style="font-size:9px;line-height:2;color:#64748b">${summaryRows}</div>
  </div>`;

  return `
  <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px 22px;font-size:12px;color:#94a3b8;max-width:600px;margin-bottom:32px">
    <div style="font-weight:700;color:#e2e8f0;margin-bottom:6px;font-size:14px;letter-spacing:0.05em">VISUAL ENCODING</div>
    <div style="font-size:9px;color:#475569;margin-bottom:16px;line-height:1.4">Each CVSS Base metric maps to a specific visual property of the glyph.</div>
    ${ciaSection}
    ${splitSection}
    ${segSection}
    ${hueSection}
    ${avSection}
    ${acSection}
    ${prSection}
    ${uiSection}
    ${summarySection}
  </div>`;
}

// --- CVSS version helper ---
function cvssVersion(vector) {
  if (vector.startsWith('CVSS:4.0/')) return '4.0';
  if (vector.startsWith('CVSS:3.1/')) return '3.1';
  if (vector.startsWith('CVSS:3.0/')) return '3.0';
  return '?';
}

function versionBadge(vector) {
  const ver = cvssVersion(vector);
  const color = ver === '4.0' ? '#6366f1' : ver === '3.1' ? '#0ea5e9' : '#14b8a6';
  return `<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:${color}22;color:${color};border:1px solid ${color}44;font-weight:600">v${ver}</span>`;
}

// --- Index: one glyph per vector ---
const indexItems = vectors
  .map((tv, i) => {
    const svg = renderGlyph({ vector: tv.vector, score: tv.score, size: 80 });
    return `
    <a href="#detail-${i}" class="index-item">
      <div class="index-glyph">${svg}</div>
      <div class="index-name">${tv.name}</div>
      <div class="index-score">${tv.score} ${versionBadge(tv.vector)}</div>
    </a>`;
  })
  .join('\n');

// --- Detail cards ---
const cards = vectors
  .map((tv, i) => {
    const svgs = sizes
      .map((s) => {
        const svg = renderGlyph({ vector: tv.vector, score: tv.score, size: s });
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
          ${versionBadge(tv.vector)}
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
<title>VulnSig Preview</title>
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
  <h1>VulnSig Preview</h1>
  <div class="subtitle">Generated from spec/test-vectors.json &mdash; ${new Date().toISOString().slice(0, 19)}</div>

  ${buildLegend()}

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
