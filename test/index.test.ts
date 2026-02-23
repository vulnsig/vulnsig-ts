import { describe, it, expect } from 'vitest';
import { renderGlyph, parseCVSS, scoreToHue, calculateScore } from '../src/index.js';
import testVectors from '../spec/test-vectors.json';

const LOG4SHELL = 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H';

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
});

describe('scoreToHue', () => {
  it('returns yellow for score 0', () => {
    expect(scoreToHue(0).hue).toBe(45);
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
});
