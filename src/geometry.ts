const DEG2RAD = Math.PI / 180;

export function arcPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startDeg: number,
  endDeg: number,
): string {
  const s = startDeg * DEG2RAD;
  const e = endDeg * DEG2RAD;
  const la = endDeg - startDeg > 180 ? 1 : 0;
  const osx = cx + Math.cos(s) * outerR;
  const osy = cy + Math.sin(s) * outerR;
  const oex = cx + Math.cos(e) * outerR;
  const oey = cy + Math.sin(e) * outerR;
  const iex = cx + Math.cos(e) * innerR;
  const iey = cy + Math.sin(e) * innerR;
  const isx = cx + Math.cos(s) * innerR;
  const isy = cy + Math.sin(s) * innerR;
  return `M${osx},${osy} A${outerR},${outerR} 0 ${la},1 ${oex},${oey} L${iex},${iey} A${innerR},${innerR} 0 ${la},0 ${isx},${isy} Z`;
}

export function starPath(
  cx: number,
  cy: number,
  points: number,
  outerR: number,
  innerR: number,
): string {
  let d = '';
  for (let i = 0; i < points; i++) {
    const oa = (Math.PI * 2 * i) / points - Math.PI / 2;
    const ia = (Math.PI * 2 * (i + 0.5)) / points - Math.PI / 2;
    const ox = cx + Math.cos(oa) * outerR;
    const oy = cy + Math.sin(oa) * outerR;
    const ix = cx + Math.cos(ia) * innerR;
    const iy = cy + Math.sin(ia) * innerR;
    d += (i === 0 ? `M${ox},${oy}` : `L${ox},${oy}`) + `L${ix},${iy}`;
  }
  return d + 'Z';
}

export function radialCuts(
  startDeg: number,
  endDeg: number,
  cutWidth: number,
  gapDeg: number,
): { startDeg: number; endDeg: number }[] {
  const cuts: { startDeg: number; endDeg: number }[] = [];
  const sectorSpan = endDeg - startDeg;
  const step = cutWidth + gapDeg;
  const numCuts = Math.floor(sectorSpan / step);
  const patternSpan = numCuts * step;
  const offset = (sectorSpan - patternSpan) / 2;
  for (let i = 0; i < numCuts; i++) {
    const cutStart = startDeg + offset + i * step + gapDeg;
    const cutEnd = Math.min(cutStart + cutWidth, endDeg);
    cuts.push({ startDeg: cutStart, endDeg: cutEnd });
  }
  return cuts;
}

export function ringFill(magnitude: number, hue: number, sat: number): string {
  if (magnitude <= 0.01) return `hsla(${hue}, ${sat * 0.1}%, 12%, 0.9)`;
  if (magnitude <= 0.5) return `hsla(${hue}, ${sat * 0.5}%, 35%, 0.92)`;
  return `hsla(${hue}, ${sat * 0.9}%, 58%, 0.95)`;
}
