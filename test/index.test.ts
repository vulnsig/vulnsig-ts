import { describe, it, expect } from 'vitest';
import { renderGlyph } from '../src/index.js';
import { parseCVSS, detectCVSSVersion, isVersion2, isVersion3 } from '../src/parse.js';
import { scoreToHue } from '../src/color.js';
import { calculateScore } from '../src/score.js';
import testVectors from '../spec/test-vectors.json';

const LOG4SHELL = 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H';

// CVSS 3.1 test vectors
const CVSS31_LOG4SHELL = 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H';
const CVSS31_HEARTBLEED = 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N';
const CVSS31_DIRTY_COW = 'CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N';
const CVSS31_XSS = 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N';

// CVSS 3.0 test vectors (same format as 3.1)
const CVSS30_LOG4SHELL = 'CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H';
const CVSS30_HEARTBLEED = 'CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N';
const CVSS30_XSS = 'CVSS:3.0/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N';

// CVSS 4.0 vectors with E (Exploit Maturity) threat metric
const LOG4SHELL_E_A = LOG4SHELL + '/E:A';
const LOG4SHELL_E_P = LOG4SHELL + '/E:P';
const LOG4SHELL_E_U = LOG4SHELL + '/E:U';
const LOG4SHELL_E_X = LOG4SHELL + '/E:X';

// CVSS 2.0 test vectors (bare, no prefix)
const CVSS2_HEARTBLEED = 'AV:N/AC:L/Au:N/C:P/I:N/A:N';
const CVSS2_WORST = 'AV:N/AC:L/Au:N/C:C/I:C/A:C';
const CVSS2_LOCAL_LOW = 'AV:L/AC:H/Au:M/C:P/I:N/A:N';
const CVSS2_PREFIXED = 'CVSS:2.0/AV:N/AC:L/Au:N/C:P/I:P/A:P';
const CVSS2_WITH_E_H = 'AV:N/AC:L/Au:N/C:C/I:C/A:C/E:H/RL:OF/RC:C';
const CVSS2_AC_M = 'AV:N/AC:M/Au:S/C:P/I:P/A:N';

describe('parseCVSS', () => {
  it('parses a full vector', () => {
    const m = parseCVSS(LOG4SHELL);
    expect(m.AV).toBe('N');
    expect(m.AC).toBe('L');
    expect(m.SC).toBe('H');
  });

  it('parses CVSS 4.0 vector with E metric', () => {
    const m = parseCVSS(LOG4SHELL_E_A);
    expect(m.AV).toBe('N');
    expect(m.E).toBe('A');
    const m2 = parseCVSS(LOG4SHELL_E_P);
    expect(m2.E).toBe('P');
    const m3 = parseCVSS(LOG4SHELL_E_U);
    expect(m3.E).toBe('U');
    const m4 = parseCVSS(LOG4SHELL_E_X);
    expect(m4.E).toBe('X');
  });

  it('handles missing optional metrics', () => {
    const m = parseCVSS('CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H');
    expect(m.AV).toBe('N');
    expect(m.SC).toBeUndefined();
  });

  it('parses CVSS 3.1 vector', () => {
    const m = parseCVSS(CVSS31_LOG4SHELL);
    expect(m.AV).toBe('N');
    expect(m.AC).toBe('L');
    expect(m.C).toBe('H');
    expect(m.I).toBe('H');
    expect(m.A).toBe('H');
    expect(m.S).toBe('C');
  });

  it('parses CVSS 3.0 vector', () => {
    const m = parseCVSS(CVSS30_LOG4SHELL);
    expect(m.AV).toBe('N');
    expect(m.AC).toBe('L');
    expect(m.C).toBe('H');
    expect(m.I).toBe('H');
    expect(m.A).toBe('H');
    expect(m.S).toBe('C');
  });
});

describe('detectCVSSVersion', () => {
  it('detects CVSS 3.0 from vector starting with CVSS:3.0/', () => {
    expect(detectCVSSVersion(CVSS30_LOG4SHELL)).toBe('3.0');
  });

  it('detects CVSS 3.1 from vector starting with CVSS:3.1/', () => {
    expect(detectCVSSVersion(CVSS31_LOG4SHELL)).toBe('3.1');
  });

  it('detects CVSS 4.0 from vector starting with CVSS:4.0/', () => {
    expect(detectCVSSVersion(LOG4SHELL)).toBe('4.0');
  });

  it('detects CVSS 2.0 from bare vector', () => {
    expect(detectCVSSVersion(CVSS2_HEARTBLEED)).toBe('2.0');
  });

  it('detects CVSS 2.0 from prefixed vector', () => {
    expect(detectCVSSVersion(CVSS2_PREFIXED)).toBe('2.0');
  });

  it('throws error for unsupported CVSS prefix version', () => {
    expect(() => detectCVSSVersion('CVSS:1.0/AV:N')).toThrow('Unsupported CVSS version');
  });

  it('throws error for bare string without v2 metric structure', () => {
    // No Au — doesn't look like a CVSS 2.0 base vector.
    expect(() => detectCVSSVersion('foo:bar/baz:qux')).toThrow('Unsupported CVSS version');
  });
});

describe('isVersion2', () => {
  it('returns true for CVSS 2.0', () => {
    expect(isVersion2('2.0')).toBe(true);
  });

  it('returns false for CVSS 3.x and 4.0', () => {
    expect(isVersion2('3.0')).toBe(false);
    expect(isVersion2('3.1')).toBe(false);
    expect(isVersion2('4.0')).toBe(false);
  });
});

describe('isVersion3', () => {
  it('returns true for CVSS 3.0', () => {
    expect(isVersion3('3.0')).toBe(true);
  });

  it('returns true for CVSS 3.1', () => {
    expect(isVersion3('3.1')).toBe(true);
  });

  it('returns false for CVSS 4.0', () => {
    expect(isVersion3('4.0')).toBe(false);
  });
});

describe('scoreToHue', () => {
  it('returns yellow for score 0', () => {
    expect(scoreToHue(0).hue).toBe(55);
  });

  it('returns dark red for score 10', () => {
    expect(scoreToHue(10).hue).toBe(0);
  });

  it('hue decreases with score', () => {
    expect(scoreToHue(0).hue).toBeGreaterThan(scoreToHue(10).hue);
  });
});

describe('calculateScore', () => {
  it('computes Log4Shell as 10.0', () => {
    expect(calculateScore(LOG4SHELL)).toBe(10);
  });

  it('returns 5.0 for invalid vector', () => {
    expect(calculateScore('garbage')).toBe(5.0);
  });

  it('computes CVSS 3.1 Log4Shell as 10.0', () => {
    expect(calculateScore(CVSS31_LOG4SHELL)).toBe(10);
  });

  it('computes CVSS 3.1 Heartbleed correctly', () => {
    expect(calculateScore(CVSS31_HEARTBLEED)).toBe(7.5);
  });

  it('computes CVSS 3.1 Dirty COW correctly', () => {
    expect(calculateScore(CVSS31_DIRTY_COW)).toBe(7.1);
  });

  it('computes CVSS 3.1 XSS correctly', () => {
    expect(calculateScore(CVSS31_XSS)).toBe(6.1);
  });

  it('computes CVSS 3.0 Log4Shell as 10.0', () => {
    expect(calculateScore(CVSS30_LOG4SHELL)).toBe(10);
  });

  it('computes CVSS 3.0 Heartbleed correctly', () => {
    expect(calculateScore(CVSS30_HEARTBLEED)).toBe(7.5);
  });

  it('computes CVSS 3.0 XSS correctly', () => {
    expect(calculateScore(CVSS30_XSS)).toBe(6.1);
  });
});

describe('renderGlyph', () => {
  it('returns a valid SVG string', () => {
    const svg = renderGlyph({ vector: LOG4SHELL, score: 10 });
    expect(svg).toMatch(/^<svg /);
    expect(svg).toMatch(/<\/svg>$/);
  });

  it('respects size parameter', () => {
    const svg = renderGlyph({ vector: LOG4SHELL, score: 10, size: 64 });
    expect(svg).toContain('width="64"');
    expect(svg).toContain('height="64"');
  });

  it('renders all 16 test vectors without throwing', () => {
    for (const tv of testVectors) {
      const svg = renderGlyph({ vector: tv.vector, score: tv.score });
      expect(svg).toMatch(/^<svg /);
      expect(svg).toMatch(/<\/svg>$/);
    }
  });

  it('renders CVSS 3.1 vectors without throwing', () => {
    const vectors = [CVSS31_LOG4SHELL, CVSS31_HEARTBLEED, CVSS31_DIRTY_COW, CVSS31_XSS];
    for (const vector of vectors) {
      const svg = renderGlyph({ vector });
      expect(svg).toMatch(/^<svg /);
      expect(svg).toMatch(/<\/svg>$/);
    }
  });

  it('renders CVSS 3.1 with scope changed (split band)', () => {
    // S:C should create split band (renders without errors)
    const svg = renderGlyph({ vector: CVSS31_LOG4SHELL });
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('renders CVSS 3.1 with scope unchanged (no split)', () => {
    // S:U should not create split band (renders without errors)
    const svg = renderGlyph({ vector: CVSS31_HEARTBLEED });
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('renders CVSS 3.1 with UI:R (clean perimeter)', () => {
    // UI:R should result in clean perimeter - no spikes, no bumps (renders without errors)
    const svg = renderGlyph({ vector: CVSS31_XSS });
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('renders CVSS 3.0 vectors without throwing', () => {
    const vectors = [CVSS30_LOG4SHELL, CVSS30_HEARTBLEED, CVSS30_XSS];
    for (const vector of vectors) {
      const svg = renderGlyph({ vector });
      expect(svg).toMatch(/^<svg /);
      expect(svg).toMatch(/<\/svg>$/);
    }
  });

  it('renders CVSS 3.0 with scope changed (split band)', () => {
    // S:C should create split band (renders without errors)
    const svg = renderGlyph({ vector: CVSS30_LOG4SHELL });
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('renders CVSS 3.0 with scope unchanged (no split)', () => {
    // S:U should not create split band (renders without errors)
    const svg = renderGlyph({ vector: CVSS30_HEARTBLEED });
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('renders E:A as concentric rings behind the star', () => {
    const svg = renderGlyph({ vector: LOG4SHELL_E_A, score: 10 });
    expect(svg).toContain('<svg');
    expect(svg).toMatch(/<circle[^>]*stroke="hsla\(/);
  });

  it('renders E:P as a solid filled circle behind the star', () => {
    const svg = renderGlyph({ vector: LOG4SHELL_E_P, score: 10 });
    expect(svg).toContain('<svg');
    expect(svg).toMatch(/<circle[^>]*fill="hsla\(/);
  });

  it('renders E:U with no marker', () => {
    const svg = renderGlyph({ vector: LOG4SHELL_E_U, score: 10 });
    expect(svg).toContain('<svg');
    expect(svg).not.toMatch(/<circle[^>]*fill="hsla\(/);
    expect(svg).not.toMatch(/<circle[^>]*stroke="hsla\(/);
  });

  it('renders E:X with no marker', () => {
    const svg = renderGlyph({ vector: LOG4SHELL_E_X, score: 10 });
    expect(svg).toContain('<svg');
    expect(svg).not.toMatch(/<circle[^>]*fill="hsla\(/);
    expect(svg).not.toMatch(/<circle[^>]*stroke="hsla\(/);
  });

  it('does not render E marker for CVSS 3.x vectors', () => {
    const svg = renderGlyph({ vector: CVSS31_LOG4SHELL });
    expect(svg).not.toMatch(/<circle[^>]*fill="hsla\(/);
    expect(svg).not.toMatch(/<circle[^>]*stroke="hsla\(/);
  });
});

describe('CVSS 2.0', () => {
  it('parses bare vector with v2 metrics', () => {
    const m = parseCVSS(CVSS2_HEARTBLEED);
    expect(m.AV).toBe('N');
    expect(m.AC).toBe('L');
    expect(m.Au).toBe('N');
    expect(m.C).toBe('P');
    expect(m.I).toBe('N');
    expect(m.A).toBe('N');
  });

  it('parses prefixed vector identically to bare', () => {
    const m = parseCVSS(CVSS2_PREFIXED);
    expect(m.AV).toBe('N');
    expect(m.Au).toBe('N');
    expect(m.C).toBe('P');
  });

  it('parses temporal/environmental modifiers', () => {
    const m = parseCVSS(CVSS2_WITH_E_H);
    expect(m.E).toBe('H');
    expect(m.RL).toBe('OF');
    expect(m.RC).toBe('C');
  });

  it('parses AC:M (CVSS 2.0 Medium)', () => {
    const m = parseCVSS(CVSS2_AC_M);
    expect(m.AC).toBe('M');
    expect(m.Au).toBe('S');
  });

  it('accepts v2 vector wrapped in outer parentheses', () => {
    const wrapped = '(AV:N/AC:M/Au:N/C:N/I:P/A:N)';
    expect(detectCVSSVersion(wrapped)).toBe('2.0');
    const m = parseCVSS(wrapped);
    expect(m.AV).toBe('N');
    expect(m.AC).toBe('M');
    expect(m.Au).toBe('N');
    expect(m.C).toBe('N');
    expect(m.I).toBe('P');
    expect(m.A).toBe('N');
    // Parens-wrapped scores match the unwrapped equivalent.
    expect(calculateScore(wrapped)).toBeCloseTo(calculateScore('AV:N/AC:M/Au:N/C:N/I:P/A:N'), 1);
    const svg = renderGlyph({ vector: wrapped });
    expect(svg).toMatch(/^<svg /);
  });

  it('scores Heartbleed v2 as 5.0', () => {
    expect(calculateScore(CVSS2_HEARTBLEED)).toBeCloseTo(5.0, 1);
  });

  it('scores worst-case v2 as 10.0', () => {
    expect(calculateScore(CVSS2_WORST)).toBeCloseTo(10.0, 1);
  });

  it('scores prefixed v2 identically to bare', () => {
    const bare = 'AV:N/AC:L/Au:N/C:P/I:P/A:P';
    expect(calculateScore(CVSS2_PREFIXED)).toBeCloseTo(calculateScore(bare), 1);
  });

  it('renders bare v2 vector without throwing', () => {
    const svg = renderGlyph({ vector: CVSS2_HEARTBLEED });
    expect(svg).toMatch(/^<svg /);
    expect(svg).toMatch(/<\/svg>$/);
  });

  it('renders v2 with AC:M and Au:S without throwing', () => {
    const svg = renderGlyph({ vector: CVSS2_AC_M });
    expect(svg).toMatch(/^<svg /);
  });

  it('renders v2 with Au:M producing a star stroke', () => {
    const vec = 'AV:N/AC:L/Au:M/C:C/I:C/A:C';
    const svg = renderGlyph({ vector: vec });
    expect(svg).toMatch(/stroke-width="3.5"/);
  });

  it('renders v2 with Au:N producing no star stroke', () => {
    const svg = renderGlyph({ vector: CVSS2_WORST });
    expect(svg).not.toMatch(/stroke-width="3.5"/);
    expect(svg).not.toMatch(/stroke-width="1.5"/);
  });

  it('renders v2 E:H as concentric rings marker', () => {
    const svg = renderGlyph({ vector: CVSS2_WITH_E_H });
    expect(svg).toMatch(/<circle[^>]*stroke="hsla\(/);
  });

  it('renders v2 local low vector', () => {
    const svg = renderGlyph({ vector: CVSS2_LOCAL_LOW });
    expect(svg).toMatch(/^<svg /);
  });

  it('does not render a split band (no scope in v2)', () => {
    // Verified indirectly: with sc/si/sa = 0, hasAnySub is false so the
    // outer sub-band arcs aren't emitted — only one arc per sector.
    const svg = renderGlyph({ vector: CVSS2_WORST });
    const arcCount = (svg.match(/<path d="M/g) || []).length;
    // 3 vuln-band sectors + 1 star fill = 4. No outer sub-band paths.
    expect(arcCount).toBeLessThanOrEqual(5);
  });
});
