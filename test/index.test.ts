import { describe, it, expect } from 'vitest';
import { renderGlyph } from '../src/index.js';
import { parseCVSS, detectCVSSVersion, isVersion3 } from '../src/parse.js';
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

describe('parseCVSS', () => {
  it('parses a full vector', () => {
    const m = parseCVSS(LOG4SHELL);
    expect(m.AV).toBe('N');
    expect(m.AC).toBe('L');
    expect(m.SC).toBe('H');
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

  it('throws error for unsupported version', () => {
    expect(() => detectCVSSVersion('CVSS:2.0/AV:N/AC:L/Au:N/C:P/I:P/A:P')).toThrow(
      'Unsupported CVSS version'
    );
  });

  it('throws error for vector without CVSS prefix', () => {
    expect(() => detectCVSSVersion('AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H')).toThrow(
      'Unsupported CVSS version'
    );
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
});
