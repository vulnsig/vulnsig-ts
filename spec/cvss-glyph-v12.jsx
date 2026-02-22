import { useState, useMemo } from "react";

const METRIC_DEFS = {
  AV: { name: "Attack Vector", values: { N: "Network", A: "Adjacent", L: "Local", P: "Physical" }, severity: { N: 1.0, A: 0.7, L: 0.4, P: 0.15 } },
  AC: { name: "Attack Complexity", values: { L: "Low", H: "High" }, severity: { L: 1.0, H: 0.4 } },
  AT: { name: "Attack Requirements", values: { N: "None", P: "Present" }, severity: { N: 1.0, P: 0.4 } },
  PR: { name: "Privileges Required", values: { N: "None", L: "Low", H: "High" }, severity: { N: 1.0, L: 0.6, H: 0.2 } },
  UI: { name: "User Interaction", values: { N: "None", P: "Passive", A: "Active" }, severity: { N: 1.0, P: 0.6, A: 0.2 } },
  VC: { name: "Confidentiality", values: { H: "High", L: "Low", N: "None" }, severity: { H: 1.0, L: 0.5, N: 0.0 } },
  VI: { name: "Integrity", values: { H: "High", L: "Low", N: "None" }, severity: { H: 1.0, L: 0.5, N: 0.0 } },
  VA: { name: "Availability", values: { H: "High", L: "Low", N: "None" }, severity: { H: 1.0, L: 0.5, N: 0.0 } },
  SC: { name: "Sub Confidentiality", values: { H: "High", L: "Low", N: "None" }, severity: { H: 1.0, L: 0.5, N: 0.0 } },
  SI: { name: "Sub Integrity", values: { H: "High", L: "Low", N: "None" }, severity: { H: 1.0, L: 0.5, N: 0.0 } },
  SA: { name: "Sub Availability", values: { H: "High", L: "Low", N: "None" }, severity: { H: 1.0, L: 0.5, N: 0.0 } },
};

function parseCVSS(v) {
  const m = {};
  for (const p of v.split("/")) { const [k, val] = p.split(":"); if (METRIC_DEFS[k]) m[k] = val; }
  return m;
}
function getSev(m, k) { const d = METRIC_DEFS[k]; return d && m[k] ? (d.severity[m[k]] ?? 0) : 0; }

function exploitabilityColor(_av, _ac, _at, _pr, _ui, score) {
  // Hue driven by CVSS Base Score (0-10) for maximum color diversity
  const w = score != null ? parseFloat(score) / 10 : 0.5;
  // Map 0-10 across a wide perceptual spectrum:
  // 0=teal(180) → 2=cyan(195) → 3=blue(220) → 4=indigo(245) → 5=purple(270)
  // → 6=magenta(310) → 7=rose(340) → 8=red(360/0) → 9=orange(20) → 10=amber(40)
  let hue;
  if (w <= 0.1) hue = 175;                                    // near-zero: deep teal
  else if (w <= 0.25) hue = 175 + ((w - 0.1) / 0.15) * 30;   // teal → cyan (175→205)
  else if (w <= 0.4) hue = 205 + ((w - 0.25) / 0.15) * 40;   // cyan → blue (205→245)
  else if (w <= 0.55) hue = 245 + ((w - 0.4) / 0.15) * 30;   // blue → purple (245→275)
  else if (w <= 0.7) hue = 275 + ((w - 0.55) / 0.15) * 40;   // purple → magenta (275→315)
  else if (w <= 0.8) hue = 315 + ((w - 0.7) / 0.1) * 30;     // magenta → rose (315→345)
  else if (w <= 0.9) hue = 345 + ((w - 0.8) / 0.1) * 20;     // rose → red (345→365)
  else hue = 5 + ((w - 0.9) / 0.1) * 35;                     // red → amber (5→40)
  if (hue >= 360) hue -= 360;
  const sat = 60 + w * 25;
  return { hue, sat: 50 + w * 35, weighted: w };
}

function ringFill(mag, hue, sat) {
  if (mag <= 0.01) return `hsla(${hue}, ${sat * 0.1}%, 12%, 0.9)`;
  if (mag <= 0.5) return `hsla(${hue}, ${sat * 0.5}%, 35%, 0.92)`;
  return `hsla(${hue}, ${sat * 0.9}%, 58%, 0.95)`;
}

function arcPath(cx, cy, iR, oR, sDeg, eDeg) {
  const s = (sDeg * Math.PI) / 180, e = (eDeg * Math.PI) / 180;
  const la = eDeg - sDeg > 180 ? 1 : 0;
  return `M${cx + Math.cos(s) * oR},${cy + Math.sin(s) * oR} A${oR},${oR} 0 ${la},1 ${cx + Math.cos(e) * oR},${cy + Math.sin(e) * oR} L${cx + Math.cos(e) * iR},${cy + Math.sin(e) * iR} A${iR},${iR} 0 ${la},0 ${cx + Math.cos(s) * iR},${cy + Math.sin(s) * iR} Z`;
}

// Generate radial cut lines through a sector for AT:P dashing
function radialCuts(cx, cy, innerR, outerR, startDeg, endDeg, cutWidth, gapDeg) {
  const lines = [];
  const sectorSpan = endDeg - startDeg;
  const step = cutWidth + gapDeg; // one full cycle: fill + cut
  const numCuts = Math.floor(sectorSpan / step);
  // Center the pattern within the sector
  const patternSpan = numCuts * step;
  const offset = (sectorSpan - patternSpan) / 2;
  for (let i = 0; i < numCuts; i++) {
    const cutStart = startDeg + offset + i * step + gapDeg;
    const cutEnd = Math.min(cutStart + cutWidth, endDeg);
    lines.push({ startDeg: cutStart, endDeg: cutEnd });
  }
  return lines;
}

function CVSSGlyph({ vector, size = 120, showLabel = true, interactive = false, score = null }) {
  const metrics = useMemo(() => parseCVSS(vector), [vector]);
  const [hovered, setHovered] = useState(null);

  const av = getSev(metrics, "AV"), ac = getSev(metrics, "AC"), at = getSev(metrics, "AT");
  const pr = getSev(metrics, "PR"), ui = getSev(metrics, "UI");
  const vc = getSev(metrics, "VC"), vi = getSev(metrics, "VI"), va = getSev(metrics, "VA");
  const sc = getSev(metrics, "SC"), si = getSev(metrics, "SI"), sa = getSev(metrics, "SA");

  const cx = 60, cy = 60;
  const vulnImpact = (vc + vi + va) / 3;
  const subImpact = (sc + si + sa) / 3;
  const hasAnySub = sc > 0 || si > 0 || sa > 0;
  const atPresent = at < 0.5;

  const { hue, sat } = exploitabilityColor(av, ac, at, pr, ui, score);
  const petalCount = { N: 8, A: 6, L: 4, P: 3 }[metrics.AV] || 8;

  const ringWidth = 4.375; // each ring band is this thick
  const ringGap = 1.5; // gap between each ring
  const outerR = 44;
  
  // Hue ring: stroke centered on outerR + ringGap + ringWidth/2
  const hueRingR = outerR + ringGap + ringWidth / 2;
  
  // When split (3 visible rings from outside in):
  //   hue ring:       hueRingR (stroke)
  //   gap:            ringGap
  //   sub band:       outerR down to outerR - ringWidth
  //   gap:            ringGap  
  //   vuln band:      outerR - ringWidth - ringGap down to outerR - ringWidth - ringGap - ringWidth
  const subOuterR = outerR;
  const subInnerR = outerR - ringWidth;
  const vulnOuterR = subInnerR - ringGap;
  const vulnInnerR = vulnOuterR - ringWidth;
  
  // When undivided (2 visible rings):
  //   hue ring:       hueRingR (stroke)
  //   gap:            ringGap
  //   CIA band:       outerR down to outerR - (ringWidth * 2 + ringGap)
  //   (full depth = both bands + the gap between them)
  const undividedInnerR = vulnInnerR;
  
  const innerR = undividedInnerR; // inner edge of ring area (same either way)
  const gapDeg = 3;

  const starOuterR = innerR - 2;
  // AC:L (severity=1.0) → very pointy (ratio 0.25)
  // AC:H (severity=0.4) → blunt, nearly polygonal (ratio 0.7)
  const starInnerR = starOuterR * (0.75 - ac * 0.5);

  const uid = useMemo(() => Math.random().toString(36).slice(2, 8), []);

  function starPathD(n, oR, iR, off = 0) {
    let d = "";
    for (let i = 0; i < n; i++) {
      const oa = (Math.PI * 2 * i) / n - Math.PI / 2 + off;
      const ia = (Math.PI * 2 * (i + 0.5)) / n - Math.PI / 2 + off;
      d += (i === 0 ? `M${cx + Math.cos(oa) * oR},${cy + Math.sin(oa) * oR}` : `L${cx + Math.cos(oa) * oR},${cy + Math.sin(oa) * oR}`) + `L${cx + Math.cos(ia) * iR},${cy + Math.sin(ia) * iR}`;
    }
    return d + "Z";
  }

  const sectors = [
    { key: "C", s: -150 + gapDeg / 2, e: -30 - gapDeg / 2, vuln: vc, sub: sc, label: "Confidentiality" },
    { key: "I", s: -30 + gapDeg / 2, e: 90 - gapDeg / 2, vuln: vi, sub: si, label: "Integrity" },
    { key: "A", s: 90 + gapDeg / 2, e: 210 - gapDeg / 2, vuln: va, sub: sa, label: "Availability" },
  ];

  // PR encoding via star stroke
  // PR:N = barely visible stroke (exposed, no barrier)
  // PR:L = medium stroke  
  // PR:H = thick bold stroke (shielded, hard to reach)
  const prRaw = metrics.PR;
  const prStrokeWidth = prRaw === "H" ? 2.5 : prRaw === "L" ? 1.5 : 0.5;
  const prStrokeAlpha = prRaw === "H" ? 0.8 : prRaw === "L" ? 0.55 : 0.2;

  const uiRaw = metrics.UI;
  const spikeBase = hueRingR + ringWidth / 2 - 0.5;
  const uiSpikes = [];
  const uiBumps = [];
  if (uiRaw === "N") {
    for (let i = 0; i < petalCount; i++) {
      const a = (Math.PI * 2 * i) / petalCount - Math.PI / 2;
      uiSpikes.push({ x1: cx + Math.cos(a) * spikeBase, y1: cy + Math.sin(a) * spikeBase, x2: cx + Math.cos(a) * (spikeBase + 4.7), y2: cy + Math.sin(a) * (spikeBase + 4.7) });
    }
  } else if (uiRaw === "P") {
    // Filled semicircle bumps protruding outward from the hue ring
    const bumpR = 4.7;
    for (let i = 0; i < petalCount; i++) {
      const a = (Math.PI * 2 * i) / petalCount - Math.PI / 2;
      // Center on the hue ring edge, semicircle faces outward
      const bx = cx + Math.cos(a) * spikeBase;
      const by = cy + Math.sin(a) * spikeBase;
      // Arc from -90° to +90° relative to the radial direction
      const perpL = a - Math.PI / 2;
      const perpR = a + Math.PI / 2;
      const x1 = bx + Math.cos(perpL) * bumpR;
      const y1 = by + Math.sin(perpL) * bumpR;
      const x2 = bx + Math.cos(perpR) * bumpR;
      const y2 = by + Math.sin(perpR) * bumpR;
      // Outer control point for the arc
      const ox = bx + Math.cos(a) * bumpR;
      const oy = by + Math.sin(a) * bumpR;
      uiBumps.push({ d: `M${x1},${y1} A${bumpR},${bumpR} 0 0,1 ${x2},${y2} Z` });
    }
  }

  // Star fill: full intensity, hue carries the score signal
  const sfSat = sat * 0.85;
  const sfLight = 35;
  const sfAlpha = 0.85;
  const starFill = `hsla(${hue}, ${sfSat}%, ${sfLight}%, ${sfAlpha})`;

  const scoreColorVal = `hsl(${hue}, ${sat}%, ${45 + (score ? parseFloat(score) / 10 * 12 : 6)}%)`;
  const bgColor = `hsl(${hue}, 4%, 5%)`;

  // Radial cut parameters for AT:P
  const cutGapDeg = 4;  // angular width of visible fill
  const cutWidthDeg = 3; // angular width of the dark cut

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={size} height={size} viewBox="0 0 120 120" style={{ overflow: "visible" }}
        onMouseLeave={() => setHovered(null)}>
        <defs>
          <radialGradient id={`sg-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`hsla(${hue}, ${sfSat * 1.1}%, ${sfLight + 6}%, ${Math.min(1, sfAlpha + 0.1)})`} />
            <stop offset="100%" stopColor={starFill} />
          </radialGradient>
        </defs>

        {uiSpikes.map((s, i) => (
          <line key={`sp-${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
            stroke={`hsla(${hue}, ${sat}%, 65%, 0.7)`}
            strokeWidth={4.5} strokeLinecap="butt" />
        ))}
        {uiBumps.map((b, i) => (
          <path key={`bp-${i}`} d={b.d}
            fill={`hsla(${hue}, ${sat}%, 60%, 0.65)`} />
        ))}

        <circle cx={cx} cy={cy} r={innerR} fill={bgColor} />

        <path d={starPathD(petalCount, starOuterR, starInnerR)} fill={`url(#sg-${uid})`} stroke="none" />
        <path d={starPathD(petalCount, starOuterR, starInnerR)} fill="none" 
          stroke={`hsla(${hue}, ${sat * 0.5}%, 70%, ${prStrokeAlpha})`}
          strokeWidth={prStrokeWidth} strokeLinejoin="round" />

        {/* CIA Ring segments */}
        {sectors.map((sec) => (
          <g key={sec.key}>
            {/* Vuln band (inner) */}
            <path d={arcPath(cx, cy, vulnInnerR, hasAnySub ? vulnOuterR : outerR, sec.s, sec.e)}
              fill={ringFill(sec.vuln, hue, sat)}
              onMouseEnter={interactive ? () => setHovered(`${sec.label} (vuln): ${sec.vuln >= 1 ? "High" : sec.vuln >= 0.5 ? "Low" : "None"}`) : undefined} />
            {/* Sub band (outer) */}
            {hasAnySub && (
              <path d={arcPath(cx, cy, subInnerR, subOuterR, sec.s, sec.e)}
                fill={ringFill(sec.sub, hue, sat)}
                onMouseEnter={interactive ? () => setHovered(`${sec.label} (sub): ${sec.sub >= 1 ? "High" : sec.sub >= 0.5 ? "Low" : "None"}`) : undefined} />
            )}
            {/* AT:P radial cuts — slices through the FULL ring depth */}
            {atPresent && radialCuts(cx, cy, vulnInnerR, outerR, sec.s, sec.e, cutWidthDeg, cutGapDeg).map((cut, ci) => (
              <path key={`cut-${sec.key}-${ci}`}
                d={arcPath(cx, cy, vulnInnerR - 0.5, outerR + 0.5, cut.startDeg, cut.endDeg)}
                fill={bgColor} />
            ))}
          </g>
        ))}

        {/* Gap between bands is structural — no divider stroke needed */}

        {/* Exploitability hue ring — always full color, undivided */}
        <circle cx={cx} cy={cy} r={hueRingR} fill="none"
          stroke={`hsl(${hue}, ${sat}%, 52%)`} strokeWidth={ringWidth} />

        {/* Sector labels */}
        {size >= 140 && sectors.map((sec) => {
          const midDeg = (sec.s + sec.e) / 2;
          const midRad = (midDeg * Math.PI) / 180;
          const labelR = hasAnySub ? (vulnInnerR + vulnOuterR) / 2 : (vulnInnerR + outerR) / 2;
          return (
            <text key={`lbl-${sec.key}`} x={cx + Math.cos(midRad) * labelR} y={cy + Math.sin(midRad) * labelR}
              textAnchor="middle" dominantBaseline="central"
              fill={sec.vuln > 0.5 ? "rgba(0,0,0,0.4)" : sec.vuln > 0.01 ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.07)"}
              fontSize={size >= 200 ? 8 : 6} fontFamily="'JetBrains Mono', monospace" fontWeight={700}
            >{sec.key}</text>
          );
        })}

        {interactive && hovered && (
          <g>
            <rect x={cx - 60} y={1} width={120} height={16} rx={4} fill="rgba(0,0,0,0.88)" />
            <text x={cx} y={12} textAnchor="middle" fill="white" fontSize="7.5" fontFamily="'JetBrains Mono', monospace">{hovered}</text>
          </g>
        )}
      </svg>
      {showLabel && false && (
        <div style={{ textAlign: "center", lineHeight: 1.1 }}>
          <div style={{ fontSize: size < 80 ? 9 : 11, fontWeight: 700, color: scoreColor, fontFamily: "'JetBrains Mono', monospace" }}></div>
        </div>
      )}
    </div>
  );
}

function Legend() {
  const sh = 10, ss = 75;
  const bgC = `hsl(${sh}, 4%, 5%)`;

  const sectionStyle = { marginBottom: 14, padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" };
  const headStyle = { fontSize: 11, fontWeight: 600, color: "#cbd5e1", marginBottom: 8 };
  const metricTag = (label, color = "#6366f1") => (
    <span style={{ display: "inline-block", padding: "1px 5px", borderRadius: 3, fontSize: 8, fontWeight: 700, background: `${color}22`, color, border: `1px solid ${color}44`, marginRight: 3, letterSpacing: "0.05em" }}>{label}</span>
  );
  const valueTag = (label) => (
    <span style={{ display: "inline-block", padding: "1px 4px", borderRadius: 3, fontSize: 8, fontWeight: 600, background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)", marginRight: 2 }}>{label}</span>
  );

  function miniStar(cx, cy, n, oR, iR, fill, stroke) {
    let d = "";
    for (let i = 0; i < n; i++) {
      const oa = (Math.PI * 2 * i) / n - Math.PI / 2;
      const ia = (Math.PI * 2 * (i + 0.5)) / n - Math.PI / 2;
      d += (i === 0 ? `M${cx + Math.cos(oa) * oR},${cy + Math.sin(oa) * oR}` : `L${cx + Math.cos(oa) * oR},${cy + Math.sin(oa) * oR}`) + `L${cx + Math.cos(ia) * iR},${cy + Math.sin(ia) * iR}`;
    }
    return <path d={d + "Z"} fill={fill} stroke={stroke} strokeWidth={0.7} strokeLinejoin="round" />;
  }

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12, padding: "20px 22px", fontSize: 12, color: "#94a3b8",
      maxWidth: 540, fontFamily: "'JetBrains Mono', monospace",
    }}>
      <div style={{ fontWeight: 700, color: "#e2e8f0", marginBottom: 6, fontSize: 14, letterSpacing: "0.05em" }}>VISUAL ENCODING</div>
      <div style={{ fontSize: 9, color: "#475569", marginBottom: 16, lineHeight: 1.4 }}>
        Each CVSS 4.0 Base metric maps to a specific visual property of the glyph.
      </div>

      {/* ─── 1. CIA RING ─── */}
      <div style={sectionStyle}>
        <div style={headStyle}>
          Outer Ring — Impact on CIA Triad
        </div>
        <div style={{ fontSize: 9, color: "#64748b", marginBottom: 10, lineHeight: 1.5 }}>
          The ring is divided into three 120° sectors, one per CIA dimension.
          Each sector's brightness encodes the impact magnitude for that dimension.
        </div>

        {/* Ring diagram with labels */}
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 10 }}>
          <svg width={80} height={80} viewBox="0 0 80 80" style={{ overflow: "visible" }}>
            <circle cx={40} cy={40} r={26.5} fill={bgC} />
            {/* C=High, I=Low, A=None — single undivided band */}
            <path d={arcPath(40, 40, 26.5, 33.5, -148, -32)} fill={ringFill(1.0, sh, ss)} />
            <path d={arcPath(40, 40, 26.5, 33.5, -28, 88)} fill={ringFill(0.5, sh, ss)} />
            <path d={arcPath(40, 40, 26.5, 33.5, 92, 208)} fill={ringFill(0.0, sh, ss)} />
            {/* Hue ring */}
            <circle cx={40} cy={40} r={35.75} fill="none" stroke={`hsl(${sh}, ${ss}%, 52%)`} strokeWidth={3} />
            {miniStar(40, 40, 6, 24, 10, "hsla(10,5%,14%,0.8)", "rgba(255,255,255,0.2)")}
            <text x={40} y={16} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize={7} fontWeight={700}>C</text>
            <text x={58} y={54} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize={7} fontWeight={700}>I</text>
            <text x={22} y={54} textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize={7} fontWeight={700}>A</text>
          </svg>
          <div style={{ fontSize: 9, lineHeight: 1.8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "inline-block", width: 24, height: 8, borderRadius: 2, background: ringFill(1.0, sh, ss) }} />
              {valueTag("H")} <span style={{ color: "#64748b" }}>High impact</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "inline-block", width: 24, height: 8, borderRadius: 2, background: ringFill(0.5, sh, ss) }} />
              {valueTag("L")} <span style={{ color: "#64748b" }}>Low impact</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "inline-block", width: 24, height: 8, borderRadius: 2, background: ringFill(0.0, sh, ss), border: "1px solid rgba(255,255,255,0.08)" }} />
              {valueTag("N")} <span style={{ color: "#64748b" }}>No impact</span>
            </div>
          </div>
        </div>

        {/* Metric tags */}
        <div style={{ fontSize: 9, color: "#475569", lineHeight: 1.8 }}>
          <div><strong style={{ color: "#94a3b8" }}>Top sector:</strong> {metricTag("VC")} Confidentiality — can attacker read data?</div>
          <div><strong style={{ color: "#94a3b8" }}>Bottom-right:</strong> {metricTag("VI")} Integrity — can attacker modify data?</div>
          <div><strong style={{ color: "#94a3b8" }}>Bottom-left:</strong> {metricTag("VA")} Availability — can attacker disrupt service?</div>
        </div>
      </div>

      {/* ─── 2. SPLIT BAND (Subsequent) ─── */}
      <div style={sectionStyle}>
        <div style={headStyle}>
          Split Band — Subsequent System Impact
        </div>
        <div style={{ fontSize: 9, color: "#64748b", marginBottom: 10, lineHeight: 1.5 }}>
          When {metricTag("SC", "#f59e0b")} {metricTag("SI", "#f59e0b")} {metricTag("SA", "#f59e0b")} are non-zero,
          the ring splits radially: inner band = vulnerable system, outer band = downstream systems.
        </div>

        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {/* With split — 3 equal rings */}
          <div style={{ textAlign: "center" }}>
            <svg width={56} height={56} viewBox="0 0 56 56" style={{ overflow: "visible" }}>
              <circle cx={28} cy={28} r={18.5} fill={bgC} />
              {/* Vuln band (inner) */}
              <path d={arcPath(28, 28, 18.5, 22, -148, -32)} fill={ringFill(1.0, sh, ss)} />
              <path d={arcPath(28, 28, 18.5, 22, -28, 88)} fill={ringFill(1.0, sh, ss)} />
              <path d={arcPath(28, 28, 18.5, 22, 92, 208)} fill={ringFill(0.0, sh, ss)} />
              {/* Sub band (outer) */}
              <path d={arcPath(28, 28, 23.5, 27, -148, -32)} fill={ringFill(0.5, sh, ss)} />
              <path d={arcPath(28, 28, 23.5, 27, -28, 88)} fill={ringFill(0.0, sh, ss)} />
              <path d={arcPath(28, 28, 23.5, 27, 92, 208)} fill={ringFill(0.0, sh, ss)} />
              {/* Hue ring */}
              <circle cx={28} cy={28} r={29.25} fill="none" stroke={`hsl(${sh}, ${ss}%, 52%)`} strokeWidth={3} />
              {miniStar(28, 28, 6, 16, 7, "hsla(10,5%,14%,0.6)", "rgba(255,255,255,0.15)")}
            </svg>
            <div style={{ fontSize: 7, color: "#64748b", marginTop: 2 }}>SC:L, SI:N, SA:N</div>
          </div>
          {/* Without split — undivided + hue ring */}
          <div style={{ textAlign: "center" }}>
            <svg width={56} height={56} viewBox="0 0 56 56" style={{ overflow: "visible" }}>
              <circle cx={28} cy={28} r={18.5} fill={bgC} />
              <path d={arcPath(28, 28, 18.5, 27, -148, -32)} fill={ringFill(1.0, sh, ss)} />
              <path d={arcPath(28, 28, 18.5, 27, -28, 88)} fill={ringFill(1.0, sh, ss)} />
              <path d={arcPath(28, 28, 18.5, 27, 92, 208)} fill={ringFill(0.0, sh, ss)} />
              {/* Hue ring */}
              <circle cx={28} cy={28} r={29.25} fill="none" stroke={`hsl(${sh}, ${ss}%, 52%)`} strokeWidth={3} />
              {miniStar(28, 28, 6, 16, 7, "hsla(10,5%,14%,0.6)", "rgba(255,255,255,0.15)")}
            </svg>
            <div style={{ fontSize: 7, color: "#64748b", marginTop: 2 }}>SC:N, SI:N, SA:N</div>
          </div>
          <div style={{ fontSize: 9, color: "#475569", lineHeight: 1.6 }}>
            <div>Split appears only when downstream impact &gt; None</div>
            <div style={{ marginTop: 4 }}>Each band independently shows H / L / N brightness per sector</div>
          </div>
        </div>
      </div>

      {/* ─── 3. DASHED RING ─── */}
      <div style={sectionStyle}>
        <div style={headStyle}>
          Segmented Ring — Attack Requirements
        </div>
        <div style={{ fontSize: 9, color: "#64748b", marginBottom: 10, lineHeight: 1.5 }}>
          {metricTag("AT", "#ef4444")} controls whether the ring is solid or segmented.
          Segments indicate the exploit requires specific preconditions (e.g., a race condition, specific configuration).
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <svg width={50} height={50} viewBox="0 0 50 50" style={{ overflow: "visible" }}>
              <circle cx={25} cy={25} r={16} fill={bgC} />
              <path d={arcPath(25, 25, 16, 23, -148, -32)} fill={ringFill(1.0, sh, ss)} />
              <path d={arcPath(25, 25, 16, 23, -28, 88)} fill={ringFill(0.5, sh, ss)} />
              <path d={arcPath(25, 25, 16, 23, 92, 208)} fill={ringFill(0.0, sh, ss)} />
              {[[-148, -32], [-28, 88], [92, 208]].map(([sd, ed]) =>
                radialCuts(25, 25, 16, 23, sd, ed, 3, 4).map((c, i) =>
                  <path key={`${sd}-${i}`} d={arcPath(25, 25, 15.5, 23.5, c.startDeg, c.endDeg)} fill={bgC} />
                )
              )}
              <circle cx={25} cy={25} r={25} fill="none" stroke={`hsl(${sh}, ${ss}%, 52%)`} strokeWidth={2.5} />
            </svg>
            <div style={{ fontSize: 8, color: "#94a3b8" }}>{valueTag("P")} Present</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <svg width={50} height={50} viewBox="0 0 50 50" style={{ overflow: "visible" }}>
              <circle cx={25} cy={25} r={16} fill={bgC} />
              <path d={arcPath(25, 25, 16, 23, -148, -32)} fill={ringFill(1.0, sh, ss)} />
              <path d={arcPath(25, 25, 16, 23, -28, 88)} fill={ringFill(0.5, sh, ss)} />
              <path d={arcPath(25, 25, 16, 23, 92, 208)} fill={ringFill(0.0, sh, ss)} />
              <circle cx={25} cy={25} r={25} fill="none" stroke={`hsl(${sh}, ${ss}%, 52%)`} strokeWidth={2.5} />
            </svg>
            <div style={{ fontSize: 8, color: "#94a3b8" }}>{valueTag("N")} None</div>
          </div>
          <div style={{ fontSize: 9, color: "#475569", lineHeight: 1.5 }}>
            Radial cuts slice through all bands uniformly so inner/outer stay aligned.
          </div>
        </div>
      </div>

      {/* ─── 3b. COMBINED: SPLIT + SEGMENTED ─── */}
      <div style={sectionStyle}>
        <div style={headStyle}>
          Combined — Split Band + Segmented Ring
        </div>
        <div style={{ fontSize: 9, color: "#64748b", marginBottom: 10, lineHeight: 1.5 }}>
          When both {metricTag("AT", "#ef4444")} = {valueTag("P")} and subsequent impact exists,
          the ring shows both features: two bands with radial cuts slicing through both in lockstep.
          See <strong style={{ color: "#cbd5e1" }}>Shellshock</strong> and <strong style={{ color: "#cbd5e1" }}>Rowhammer</strong> in the gallery.
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "center" }}>
          {/* Combined: split + segmented */}
          <div style={{ textAlign: "center" }}>
            <svg width={64} height={64} viewBox="0 0 64 64" style={{ overflow: "visible" }}>
              <circle cx={32} cy={32} r={22.5} fill={bgC} />
              {/* Vuln band (inner) */}
              <path d={arcPath(32, 32, 22.5, 26, -148, -32)} fill={ringFill(1.0, sh, ss)} />
              <path d={arcPath(32, 32, 22.5, 26, -28, 88)} fill={ringFill(1.0, sh, ss)} />
              <path d={arcPath(32, 32, 22.5, 26, 92, 208)} fill={ringFill(1.0, sh, ss)} />
              {/* Sub band (outer) */}
              <path d={arcPath(32, 32, 27.5, 31, -148, -32)} fill={ringFill(1.0, sh, ss)} />
              <path d={arcPath(32, 32, 27.5, 31, -28, 88)} fill={ringFill(1.0, sh, ss)} />
              <path d={arcPath(32, 32, 27.5, 31, 92, 208)} fill={ringFill(1.0, sh, ss)} />
              {/* Radial cuts through both bands */}
              {[[-148, -32], [-28, 88], [92, 208]].map(([sd, ed]) =>
                radialCuts(32, 32, 22.5, 31, sd, ed, 3, 4).map((c, i) =>
                  <path key={`${sd}-${i}`} d={arcPath(32, 32, 22, 31.5, c.startDeg, c.endDeg)} fill={bgC} />
                )
              )}
              {/* Hue ring */}
              <circle cx={32} cy={32} r={33.25} fill="none" stroke={`hsl(${sh}, ${ss}%, 52%)`} strokeWidth={3} />
              {miniStar(32, 32, 8, 20, 20 * 0.25, "hsla(10,25%,22%,0.7)", "rgba(255,255,255,0.25)")}
            </svg>
            <div style={{ fontSize: 7, color: "#94a3b8", marginTop: 2 }}>Shellshock</div>
            <div style={{ fontSize: 7, color: "#475569" }}>AT:P + SC/SI/SA:H</div>
          </div>
          {/* Split only (no cuts) */}
          <div style={{ textAlign: "center" }}>
            <svg width={64} height={64} viewBox="0 0 64 64" style={{ overflow: "visible" }}>
              <circle cx={32} cy={32} r={22.5} fill={bgC} />
              <path d={arcPath(32, 32, 22.5, 26, -148, -32)} fill={ringFill(1.0, sh, ss)} />
              <path d={arcPath(32, 32, 22.5, 26, -28, 88)} fill={ringFill(1.0, sh, ss)} />
              <path d={arcPath(32, 32, 22.5, 26, 92, 208)} fill={ringFill(1.0, sh, ss)} />
              <path d={arcPath(32, 32, 27.5, 31, -148, -32)} fill={ringFill(1.0, sh, ss)} />
              <path d={arcPath(32, 32, 27.5, 31, -28, 88)} fill={ringFill(1.0, sh, ss)} />
              <path d={arcPath(32, 32, 27.5, 31, 92, 208)} fill={ringFill(1.0, sh, ss)} />
              <circle cx={32} cy={32} r={33.25} fill="none" stroke={`hsl(${sh}, ${ss}%, 52%)`} strokeWidth={3} />
              {miniStar(32, 32, 8, 20, 20 * 0.25, "hsla(10,25%,22%,0.7)", "rgba(255,255,255,0.25)")}
            </svg>
            <div style={{ fontSize: 7, color: "#94a3b8", marginTop: 2 }}>Log4Shell</div>
            <div style={{ fontSize: 7, color: "#475569" }}>AT:N + SC/SI/SA:H</div>
          </div>
          {/* Segmented only (no split) */}
          <div style={{ textAlign: "center" }}>
            <svg width={64} height={64} viewBox="0 0 64 64" style={{ overflow: "visible" }}>
              <circle cx={32} cy={32} r={22.5} fill={bgC} />
              <path d={arcPath(32, 32, 22.5, 31, -148, -32)} fill={ringFill(1.0, sh, ss)} />
              <path d={arcPath(32, 32, 22.5, 31, -28, 88)} fill={ringFill(1.0, sh, ss)} />
              <path d={arcPath(32, 32, 22.5, 31, 92, 208)} fill={ringFill(0.0, sh, ss)} />
              {[[-148, -32], [-28, 88], [92, 208]].map(([sd, ed]) =>
                radialCuts(32, 32, 22.5, 31, sd, ed, 3, 4).map((c, i) =>
                  <path key={`${sd}-${i}`} d={arcPath(32, 32, 22, 31.5, c.startDeg, c.endDeg)} fill={bgC} />
                )
              )}
              <circle cx={32} cy={32} r={33.25} fill="none" stroke={`hsl(${sh}, ${ss}%, 52%)`} strokeWidth={3} />
              {miniStar(32, 32, 4, 20, 20 * 0.55, "hsla(200,10%,14%,0.7)", "rgba(255,255,255,0.2)")}
            </svg>
            <div style={{ fontSize: 7, color: "#94a3b8", marginTop: 2 }}>KRACK</div>
            <div style={{ fontSize: 7, color: "#475569" }}>AT:P + SC/SI/SA:N</div>
          </div>
        </div>
      </div>

      {/* ─── 4. HUE ─── */}
      <div style={sectionStyle}>
        <div style={headStyle}>
          Color Hue — CVSS Base Score
        </div>
        <div style={{ fontSize: 9, color: "#64748b", marginBottom: 8, lineHeight: 1.5 }}>
          The overall color is driven by the CVSS 4.0 Base Score (0–10), providing a continuous
          spectrum from cool to warm. This tints the ring segments, star fill, hue ring, and spikes.
        </div>
        <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 6 }}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(sc => {
            const { hue: h, sat: s } = exploitabilityColor(0, 0, 0, 0, 0, sc);
            return (
              <div key={sc} style={{ textAlign: "center" }}>
                <div style={{ width: 20, height: 14, borderRadius: 3, background: `hsl(${h}, ${s}%, 52%)` }} />
                <div style={{ fontSize: 6, color: "#475569", marginTop: 2 }}>{sc}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#475569" }}>
          <span>Low severity</span><span>Critical</span>
        </div>
        <div style={{ fontSize: 8, color: "#334155", marginTop: 6, fontStyle: "italic" }}>
          Cool teal → blue → violet → magenta → warm red-orange
        </div>
      </div>

      {/* ─── 4b. HUE RING ─── */}
      <div style={sectionStyle}>
        <div style={headStyle}>
          Outer Hue Ring — Exploitability Color Key
        </div>
        <div style={{ fontSize: 9, color: "#64748b", marginBottom: 10, lineHeight: 1.5 }}>
          A thin undivided ring sits just outside the CIA bands, always at full saturation.
          It provides a clear, unambiguous color reference regardless of how bright or dim the CIA segments are.
        </div>
        <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          {[
            { label: "2.3", desc: "Low severity", sc: 2.3 },
            { label: "5.6", desc: "Medium", sc: 5.6 },
            { label: "8.7", desc: "High", sc: 8.7 },
            { label: "10.0", desc: "Critical", sc: 10.0 },
          ].map(({ label, desc, sc }, i) => {
            const { hue: h, sat: s } = exploitabilityColor(0, 0, 0, 0, 0, sc);
            return (
              <div key={i} style={{ textAlign: "center" }}>
                <svg width={44} height={44} viewBox="0 0 44 44" style={{ overflow: "visible" }}>
                  <circle cx={22} cy={22} r={14} fill={`hsl(${h}, 4%, 6%)`} />
                  <path d={arcPath(22, 22, 14, 17.5, -148, -32)} fill={ringFill(0.5, h, s)} />
                  <path d={arcPath(22, 22, 14, 17.5, -28, 88)} fill={ringFill(0.5, h, s)} />
                  <path d={arcPath(22, 22, 14, 17.5, 92, 208)} fill={ringFill(0.0, h, s)} />
                  <circle cx={22} cy={22} r={19.75} fill="none" stroke={`hsl(${h}, ${s}%, 52%)`} strokeWidth={3} />
                  {miniStar(22, 22, 6, 12, 4, `hsla(${h}, 15%, 14%, 0.6)`, `hsla(${h}, 20%, 40%, 0.3)`)}
                </svg>
                <div style={{ fontSize: 8, fontWeight: 600, color: `hsl(${h}, ${s}%, 55%)` }}>{label}</div>
                <div style={{ fontSize: 7, color: "#475569", lineHeight: 1.2 }}>{desc}</div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 8, color: "#334155", marginTop: 6, fontStyle: "italic" }}>
          Same color drives the CIA ring tint, star fill hue, and spike color — but always clearly readable here.
        </div>
      </div>

      {/* ─── 5. STAR POINTS ─── */}
      <div style={sectionStyle}>
        <div style={headStyle}>
          Star Points — Attack Vector
        </div>
        <div style={{ fontSize: 9, color: "#64748b", marginBottom: 10, lineHeight: 1.5 }}>
          {metricTag("AV", "#8b5cf6")} determines the number of star points.
          More points = broader network reach = easier remote access.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { n: 8, val: "N", label: "Network", desc: "Remotely exploitable" },
            { n: 6, val: "A", label: "Adjacent", desc: "Same LAN / WiFi" },
            { n: 4, val: "L", label: "Local", desc: "Local access needed" },
            { n: 3, val: "P", label: "Physical", desc: "Touch the device" },
          ].map(({ n, val, label, desc }) => (
            <div key={n} style={{ textAlign: "center", flex: 1 }}>
              <svg width={36} height={36} viewBox="0 0 36 36" style={{ overflow: "visible" }}>
                <circle cx={18} cy={18} r={16} fill="hsla(0,0%,6%,0.8)" stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
                {miniStar(18, 18, n, 13, 13 * 0.25, "hsla(260,15%,18%,0.8)", "rgba(255,255,255,0.3)")}
              </svg>
              <div style={{ fontSize: 8, fontWeight: 600, color: "#cbd5e1" }}>{valueTag(val)} {label}</div>
              <div style={{ fontSize: 7, color: "#475569", lineHeight: 1.3, marginTop: 2 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 6. STAR POINTINESS ─── */}
      <div style={sectionStyle}>
        <div style={headStyle}>
          Star Pointiness — Attack Complexity
        </div>
        <div style={{ fontSize: 9, color: "#64748b", marginBottom: 10, lineHeight: 1.5 }}>
          {metricTag("AC", "#ec4899")} controls the ratio between star tip radius and valley radius.
          Pointy = simple exploit, blunt = complex conditions required.
        </div>
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          {[
            { ratio: 0.25, val: "L", label: "Low (simple)", desc: "Deep sharp points" },
            { ratio: 0.55, val: "H", label: "High (complex)", desc: "Blunt, rounded" },
          ].map(({ ratio, val, label, desc }) => (
            <div key={val} style={{ textAlign: "center" }}>
              <svg width={48} height={48} viewBox="0 0 48 48" style={{ overflow: "visible" }}>
                <circle cx={24} cy={24} r={22} fill="hsla(0,0%,6%,0.8)" stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
                {miniStar(24, 24, 6, 18, 18 * ratio, "hsla(280,15%,18%,0.8)", "rgba(255,255,255,0.3)")}
              </svg>
              <div style={{ fontSize: 8, fontWeight: 600, color: "#cbd5e1" }}>{valueTag(val)} {label}</div>
              <div style={{ fontSize: 7, color: "#475569", marginTop: 2 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 6b. STAR STROKE — PR ─── */}
      <div style={sectionStyle}>
        <div style={headStyle}>
          Star Outline — Privileges Required
        </div>
        <div style={{ fontSize: 9, color: "#64748b", marginBottom: 10, lineHeight: 1.5 }}>
          {metricTag("PR", "#f97316")} controls the star's outline thickness.
          A thicker border suggests more barriers to exploitation — like a shield around the vulnerability.
        </div>
        <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          {[
            { val: "N", label: "None", desc: "No auth needed", sw: 0.5, sa: 0.2 },
            { val: "L", label: "Low", desc: "Basic user", sw: 1.5, sa: 0.55 },
            { val: "H", label: "High", desc: "Admin / root", sw: 2.5, sa: 0.8 },
          ].map(({ val, label, desc, sw, sa }) => (
            <div key={val} style={{ textAlign: "center" }}>
              <svg width={44} height={44} viewBox="0 0 44 44" style={{ overflow: "visible" }}>
                <circle cx={22} cy={22} r={20} fill="hsla(0,0%,6%,0.8)" stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
                {miniStar(22, 22, 8, 16, 4, "hsla(300,15%,18%,0.7)", `hsla(0,0%,70%,${sa})`)}
                <path d={(() => { let d=""; for(let i=0;i<8;i++){const oa=Math.PI*2*i/8-Math.PI/2;const ia=Math.PI*2*(i+0.5)/8-Math.PI/2;d+=(i===0?`M${22+Math.cos(oa)*16},${22+Math.sin(oa)*16}`:`L${22+Math.cos(oa)*16},${22+Math.sin(oa)*16}`)+`L${22+Math.cos(ia)*4},${22+Math.sin(ia)*4}`;}return d+"Z";})()}
                  fill="none" stroke={`rgba(255,255,255,${sa})`} strokeWidth={sw} strokeLinejoin="round" />
              </svg>
              <div style={{ fontSize: 8, fontWeight: 600, color: "#cbd5e1" }}>{valueTag(val)} {label}</div>
              <div style={{ fontSize: 7, color: "#475569", marginTop: 2 }}>{desc}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 8, color: "#334155", marginTop: 6, fontStyle: "italic" }}>
          Thin/absent = open, exposed · Thick = shielded, requires privileges
        </div>
      </div>

      {/* ─── 7. STAR FILL ─── */}
      <div style={sectionStyle}>
        <div style={headStyle}>
          Star Fill — Score Color
        </div>
        <div style={{ fontSize: 9, color: "#64748b", marginBottom: 6, lineHeight: 1.5 }}>
          The star interior is filled at full intensity using the score-driven hue.
          This makes the center a vivid, immediate indicator of overall severity color.
        </div>
      </div>

      {/* ─── 8. SPIKES ─── */}
      <div style={sectionStyle}>
        <div style={headStyle}>
          Spikes — User Interaction Required
        </div>
        <div style={{ fontSize: 9, color: "#64748b", marginBottom: 10, lineHeight: 1.5 }}>
          {metricTag("UI", "#f97316")} determines spike presence and style.
          Spikes radiate from star tips outward past the ring.
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          {[
            { label: "None", val: "N", desc: "Self-exploiting, no user action", draw: (cx, cy, r) => {
              return [0, 60, 120, 180, 240, 300].map((deg, i) => { 
                const rad = (deg - 90) * Math.PI / 180; 
                return <line key={i} x1={cx + Math.cos(rad) * (r - 0.5)} y1={cy + Math.sin(rad) * (r - 0.5)} x2={cx + Math.cos(rad) * (r + 2.5)} y2={cy + Math.sin(rad) * (r + 2.5)} stroke="rgba(255,255,255,0.7)" strokeWidth={4.5} strokeLinecap="butt" />; 
              });
            }},
            { label: "Passive", val: "P", desc: "Victim opens file or visits page", draw: (cx, cy, r) => {
              const bumpR = 2.2;
              return [0, 60, 120, 180, 240, 300].map((deg, i) => {
                const a = (deg - 90) * Math.PI / 180;
                const bx = cx + Math.cos(a) * (r - 0.5);
                const by = cy + Math.sin(a) * (r - 0.5);
                const perpL = a - Math.PI / 2;
                const perpR = a + Math.PI / 2;
                const x1 = bx + Math.cos(perpL) * bumpR;
                const y1 = by + Math.sin(perpL) * bumpR;
                const x2 = bx + Math.cos(perpR) * bumpR;
                const y2 = by + Math.sin(perpR) * bumpR;
                return <path key={i} d={`M${x1},${y1} A${bumpR},${bumpR} 0 0,1 ${x2},${y2} Z`} fill="rgba(255,255,255,0.55)" />;
              });
            }},
            { label: "Active", val: "A", desc: "Victim must click / submit / install", draw: () => [] },
          ].map(({ label, val, desc, draw }) => (
            <div key={label} style={{ textAlign: "center", flex: 1 }}>
              <svg width={40} height={40} viewBox="0 0 40 40" style={{ overflow: "visible" }}>
                <circle cx={20} cy={20} r={12} fill="hsla(0,0%,10%,0.6)" stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
                <circle cx={20} cy={20} r={14} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} />
                {draw(20, 20, 14)}
              </svg>
              <div style={{ fontSize: 8, fontWeight: 600, color: "#cbd5e1" }}>{valueTag(val)} {label}</div>
              <div style={{ fontSize: 7, color: "#475569", lineHeight: 1.3, marginTop: 2 }}>{desc}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 8, color: "#334155", marginTop: 8, lineHeight: 1.4 }}>
          Long spikes = auto-exploitable · Bumps = passive trigger · Smooth = deliberate action needed
        </div>
      </div>

      {/* ─── SUMMARY TABLE ─── */}
      <div style={{ ...sectionStyle, marginBottom: 0 }}>
        <div style={headStyle}>Quick Reference</div>
        <div style={{ fontSize: 9, lineHeight: 2, color: "#64748b" }}>
          {[
            ["Ring brightness", "VC, VI, VA / SC, SI, SA", "Impact per CIA dimension"],
            ["Ring split", "SC, SI, SA > None", "Downstream systems affected"],
            ["Ring segmented", "AT = Present", "Exploit needs preconditions"],
            ["Overall hue", "CVSS Base Score", "Severity spectrum (cool→warm)"],
            ["Outer hue ring", "CVSS Base Score", "Full-color reference ring"],
            ["Star points", "AV", "Network reach (8/6/4/3)"],
            ["Star pointiness", "AC", "Exploit complexity"],
            ["Star outline", "PR", "Privileges required (thin→thick)"],
            ["Star fill", "CVSS Base Score", "Score color at full intensity"],
            ["Spike style", "UI", "User interaction (spikes/bumps/none)"],
          ].map(([visual, metrics, meaning], i) => (
            <div key={i} style={{ display: "flex", gap: 8, borderBottom: i < 9 ? "1px solid rgba(255,255,255,0.03)" : "none", paddingBottom: 2 }}>
              <span style={{ width: 130, minWidth: 130, color: "#94a3b8", fontWeight: 600, fontSize: 8 }}>{visual}</span>
              <span style={{ width: 140, minWidth: 140, fontSize: 8, color: "#6366f1" }}>{metrics}</span>
              <span style={{ fontSize: 8 }}>{meaning}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const EXAMPLES = [
  { name: "Log4Shell", cve: "CVE-2021-44228", score: "10.0", vector: "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H", desc: "Remote, trivial, no auth, full compromise + downstream" },
  { name: "Heartbleed", cve: "CVE-2014-0160", score: "8.7", vector: "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:N/VA:N/SC:L/SI:N/SA:N", desc: "Network data leak, confidentiality only" },
  { name: "Spectre", cve: "CVE-2017-5753", score: "5.6", vector: "CVSS:4.0/AV:L/AC:H/AT:P/PR:L/UI:N/VC:H/VI:N/VA:N/SC:H/SI:N/SA:N", desc: "Local, complex, needs specific CPU" },
  { name: "EternalBlue", cve: "CVE-2017-0144", score: "9.3", vector: "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N", desc: "Network RCE, full system compromise" },
  { name: "Dirty COW", cve: "CVE-2016-5195", score: "7.3", vector: "CVSS:4.0/AV:L/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N", desc: "Local priv escalation, read/write" },
  { name: "Bluekeep", cve: "CVE-2019-0708", score: "9.3", vector: "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:L/SI:L/SA:L", desc: "Wormable RDP RCE + downstream" },
  { name: "Phishing Link", cve: "Example", score: "5.1", vector: "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:A/VC:L/VI:L/VA:N/SC:N/SI:N/SA:N", desc: "Active user click, low impact" },
  { name: "USB Physical", cve: "Example", score: "7.3", vector: "CVSS:4.0/AV:P/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N", desc: "Physical access, full compromise" },
  { name: "Rowhammer", cve: "CVE-2015-0565", score: "5.9", vector: "CVSS:4.0/AV:L/AC:H/AT:P/PR:L/UI:N/VC:H/VI:H/VA:N/SC:H/SI:H/SA:N", desc: "Needs specific DRAM, crosses boundaries" },
  { name: "KRACK", cve: "CVE-2017-13077", score: "5.6", vector: "CVSS:4.0/AV:A/AC:H/AT:P/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N", desc: "Adjacent WiFi, needs handshake timing" },
  { name: "Shellshock", cve: "CVE-2014-6271", score: "9.2", vector: "CVSS:4.0/AV:N/AC:L/AT:P/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H", desc: "Remote but needs bash CGI exposed" },
  { name: "POODLE", cve: "CVE-2014-3566", score: "2.3", vector: "CVSS:4.0/AV:N/AC:H/AT:P/PR:N/UI:N/VC:L/VI:N/VA:N/SC:N/SI:N/SA:N", desc: "Needs SSLv3 fallback + MITM position" },
  { name: "Meltdown", cve: "CVE-2017-5754", score: "5.6", vector: "CVSS:4.0/AV:L/AC:H/AT:P/PR:L/UI:N/VC:H/VI:N/VA:N/SC:H/SI:N/SA:N", desc: "Local, complex, reads kernel memory" },
  { name: "Sudo Baron", cve: "CVE-2021-3156", score: "8.4", vector: "CVSS:4.0/AV:L/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N", desc: "Local root via sudo heap overflow" },
  { name: "DDoS Amplif.", cve: "Example", score: "8.7", vector: "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:H/SC:N/SI:N/SA:H", desc: "Remote, availability only, amplified" },
  { name: "XSS Stored", cve: "Example", score: "5.1", vector: "CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:P/VC:L/VI:L/VA:N/SC:N/SI:N/SA:N", desc: "Needs auth + passive victim, low impact" },
];

function scoreColorFn(vector, score) {
  const m = parseCVSS(vector);
  const { hue, sat } = exploitabilityColor(getSev(m, "AV"), getSev(m, "AC"), getSev(m, "AT"), getSev(m, "PR"), getSev(m, "UI"), score);
  return `hsl(${hue}, ${sat}%, 55%)`;
}

export default function App() {
  const [customVector, setCustomVector] = useState(EXAMPLES[0].vector);
  const [selectedIdx, setSelectedIdx] = useState(0);

  return (
    <div style={{ minHeight: "100vh", background: "#060810", color: "#e2e8f0", fontFamily: "'JetBrains Mono', 'Fira Code', monospace", padding: "32px 24px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        input:focus { outline: none; border-color: rgba(99, 102, 241, 0.5) !important; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 6, fontSize: 10, letterSpacing: "0.2em", color: "#475569", textTransform: "uppercase" }}>CVSS Visual Fingerprint — v1.2</div>
        <h1 style={{ fontSize: 28, fontWeight: 300, margin: 0, background: "linear-gradient(135deg, hsl(190,60%,50%), hsl(280,60%,55%), hsl(350,70%,55%), hsl(20,80%,55%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Vulnerability Glyphs</h1>
        <p style={{ color: "#64748b", fontSize: 12, marginTop: 8, maxWidth: 640, lineHeight: 1.6, fontWeight: 300 }}>
          AT:P now cuts radial slices through the ring — both bands are dashed in lockstep. Compare Shellshock (segmented) vs Log4Shell (solid).
        </p>

        <div style={{ marginTop: 20, marginBottom: 28 }}>
          <label style={{ fontSize: 10, letterSpacing: "0.12em", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Vector String</label>
          <input type="text" value={customVector} onChange={(e) => { setCustomVector(e.target.value); setSelectedIdx(-1); }}
            style={{ width: "100%", maxWidth: 720, padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }} />
        </div>

        <div style={{ display: "flex", gap: 36, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 36 }}>
          <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <CVSSGlyph vector={customVector} size={240} interactive={true} score={selectedIdx >= 0 && EXAMPLES[selectedIdx] ? EXAMPLES[selectedIdx].score : null} />
            {selectedIdx >= 0 && EXAMPLES[selectedIdx] && (
              <div style={{ marginTop: 4, textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: scoreColorFn(customVector, EXAMPLES[selectedIdx].score), fontFamily: "'JetBrains Mono', monospace" }}>{EXAMPLES[selectedIdx].score}</div>
                <div style={{ fontSize: 10, color: "#64748b", lineHeight: 1.4, maxWidth: 240, marginTop: 4 }}>{EXAMPLES[selectedIdx].desc}</div>
              </div>
            )}
          </div>
          <Legend />
        </div>

        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "#475569", textTransform: "uppercase", marginBottom: 10 }}>Scale Comparison</div>
          <div style={{ display: "flex", gap: 20, alignItems: "flex-end", flexWrap: "wrap" }}>
            {[20, 32, 48, 64, 96, 140].map(s => (
              <div key={s} style={{ textAlign: "center" }}>
                <CVSSGlyph vector={customVector} size={s} showLabel={s >= 48} score={selectedIdx >= 0 && EXAMPLES[selectedIdx] ? EXAMPLES[selectedIdx].score : null} />
                <div style={{ fontSize: 9, color: "#475569", marginTop: 4 }}>{s}px</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "#475569", textTransform: "uppercase", marginBottom: 14 }}>Notable Vulnerabilities</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
            {EXAMPLES.map((ex, i) => (
              <button key={i} onClick={() => { setCustomVector(ex.vector); setSelectedIdx(i); }}
                style={{
                  background: selectedIdx === i ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.015)",
                  border: `1px solid ${selectedIdx === i ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)"}`,
                  borderRadius: 10, padding: "10px 6px", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  transition: "all 0.15s", color: "inherit", fontFamily: "inherit",
                }}>
                <CVSSGlyph vector={ex.vector} size={68} showLabel={false} score={ex.score} />
                <div style={{ fontSize: 10, fontWeight: 600, color: "#cbd5e1", textAlign: "center", lineHeight: 1.2 }}>{ex.name}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: scoreColorFn(ex.vector, ex.score), fontFamily: "'JetBrains Mono', monospace" }}>{ex.score}</div>
                <div style={{ fontSize: 8, color: "#475569" }}>{ex.cve}</div>
                <div style={{ fontSize: 8, color: "#64748b", textAlign: "center", lineHeight: 1.2 }}>{ex.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
