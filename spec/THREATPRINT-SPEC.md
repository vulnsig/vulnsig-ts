# Threatprint — Specification

## Overview

Threatprint renders compact SVG glyphs that encode CVSS 4.0 vulnerability vectors into visual fingerprints. Each of the 11 CVSS 4.0 base metrics maps to a dedicated visual channel with zero redundancy. Glyphs are designed for dark backgrounds and are readable from 20px to 240px+.

Both the TypeScript and Python libraries accept a CVSS 4.0 vector string and return a self-contained SVG string. Scores are automatically calculated from the vector using third-party CVSS libraries.

## Repositories

Two independent repositories under `github.com/threatprint`:

### threatprint-ts (npm: `threatprint`)

```
threatprint-ts/
├── src/
│   ├── index.ts                 # Public exports
│   ├── render.ts                # renderGlyph() → SVG string
│   ├── parse.ts                 # CVSS vector parsing utilities
│   ├── score.ts                 # Auto-scoring via ae-cvss-calculator
│   ├── color.ts                 # Score-to-hue mapping
│   ├── geometry.ts              # Arc paths, star paths, radial cuts
│   └── types.ts                 # TypeScript interfaces
├── spec/
│   ├── SPEC.md                  # This document (shared across repos)
│   └── test-vectors.json        # 16 examples with expected visual properties
├── demo/                        # Interactive gallery (for development)
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

### threatprint-py (PyPI: `threatprint`)

```
threatprint-py/
├── threatprint/
│   ├── __init__.py
│   ├── render.py                # render_glyph() → SVG string
│   ├── parse.py                 # CVSS vector parsing
│   ├── score.py                 # Auto-scoring via cvss package
│   ├── color.py                 # Score-to-hue mapping
│   └── geometry.py              # Arc paths, star paths, radial cuts
├── spec/
│   ├── SPEC.md                  # This document (shared across repos)
│   └── test-vectors.json        # 16 examples with expected visual properties
├── tests/
│   └── test_vectors.py          # Loads spec/test-vectors.json
├── pyproject.toml
├── README.md
└── LICENSE
```

Both repos include identical copies of `spec/` to keep each repo self-contained. The spec and test vectors are the source of truth — changes should be mirrored across both repos.

## API

### TypeScript

```typescript
import { renderGlyph, parseCVSS, scoreToHue } from 'threatprint';

// Score auto-calculated from vector
const svg = renderGlyph({
  vector: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H',
  size: 120,
});

// Explicit score override
const svg2 = renderGlyph({
  vector: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H',
  score: 10.0,
  size: 64,
  showLabel: true,
});

document.getElementById('glyph').innerHTML = svg;
```

**Dependencies:**
- `ae-cvss-calculator` — CVSS 4.0 score calculation

### Python

```python
from threatprint import render_glyph, parse_cvss, score_to_hue

# Score auto-calculated from vector
svg = render_glyph(
    vector='CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H',
    size=120,
)

# Explicit score override
svg2 = render_glyph(
    vector='CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H',
    score=10.0,
    size=64,
)

# Jupyter notebook display
from IPython.display import SVG, display
display(SVG(svg))

# Save to file
with open('glyph.svg', 'w') as f:
    f.write(svg)
```

**Dependencies:**
- `cvss` (Red Hat Product Security) — CVSS 4.0 score calculation

### Function Signature

Both libraries expose the same core function:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `vector` | `string` | **required** | CVSS 4.0 vector string. `CVSS:4.0` prefix is optional. |
| `score` | `number \| null` | `null` | Explicit score override (0–10). When `null`, score is auto-calculated from the vector. |
| `size` | `number` | `120` | Rendered width/height in pixels. ViewBox is always `0 0 120 120` with `overflow: visible`. |
| `showLabel` | `boolean` | `true` | Render C/I/A sector labels when `size >= 140`. |

### Public Exports

| Export | Description |
|--------|-------------|
| `renderGlyph(options)` | Main entry point. Returns an SVG string. |
| `parseCVSS(vector)` | Parse vector string into metric key-value map. |
| `scoreToHue(score)` | Map a 0–10 score to the hue/saturation values used by the glyph. Useful for consumers who want matching colors in their UI. |
| `calculateScore(vector)` | Compute the CVSS 4.0 Base Score from a vector string. Wraps the third-party scoring library. |

### Output

The output is a self-contained SVG string with `viewBox="0 0 120 120"` and `overflow: visible` (spikes/bumps extend beyond the viewBox). All geometry is positioned relative to center point `(60, 60)`. The SVG contains no external references, scripts, or stylesheets — it can be embedded anywhere SVG is supported.

---

## Visual Encoding Specification

Each CVSS 4.0 base metric maps to exactly one visual channel. There is no double-encoding.

### Summary Table

| Visual Property | Metric(s) | Encoding | Values |
|----------------|-----------|----------|--------|
| **Overall hue** | CVSS Base Score | Continuous color spectrum | 0=teal → 5=purple → 10=amber |
| **Outer hue ring** | CVSS Base Score | Undivided ring, always full saturation | Constant reference |
| **Star points** | AV (Attack Vector) | Point count | N=8, A=6, L=4, P=3 |
| **Star pointiness** | AC (Attack Complexity) | Inner radius ratio | L=0.25 (sharp), H=0.55 (blunt) |
| **Star outline** | PR (Privileges Required) | Stroke width + opacity | N=thin/faint, L=medium, H=thick/bold |
| **Star fill** | CVSS Base Score | Full-intensity fill in score hue | Constant brightness, color varies |
| **Ring segmentation** | AT (Attack Requirements) | Centered radial wedge cuts | P=segmented, N=solid |
| **Spikes** | UI (User Interaction) | Radiating lines (butt cap) | N=spikes touching hue ring |
| **Bumps** | UI (User Interaction) | Filled semicircles | P=scalloped edge |
| *(smooth)* | UI (User Interaction) | No spikes or bumps | A=clean perimeter |
| **Ring sector brightness** | VC, VI, VA | Luminance per 120° sector | H=bright, L=mid, N=dark |
| **Split band brightness** | SC, SI, SA | Outer band luminance | H=bright, L=mid, N=dark |

---

## Detailed Encoding Rules

### 1. Color Hue — CVSS Base Score (0–10)

The score drives a continuous hue spectrum across the entire glyph. This hue tints the CIA ring segments, the star fill, the outer hue ring, and the spikes/bumps.

**Hue mapping (piecewise linear):**

| Score Range | Hue Range | Color |
|-------------|-----------|-------|
| 0.0 – 1.0 | 175° | Deep teal |
| 1.0 – 2.5 | 175° → 205° | Teal → Cyan |
| 2.5 – 4.0 | 205° → 245° | Cyan → Blue |
| 4.0 – 5.5 | 245° → 275° | Blue → Purple |
| 5.5 – 7.0 | 275° → 315° | Purple → Magenta |
| 7.0 – 8.0 | 315° → 345° | Magenta → Rose |
| 8.0 – 9.0 | 345° → 365° | Rose → Red |
| 9.0 – 10.0 | 5° → 40° | Red → Amber |

**Saturation:** `60 + (score/10) * 25` — ranges from 60% to 85%.

When `score` is `null` and auto-calculation fails, default to `w = 0.5` (mid-range purple).

### 2. Ring System — Proportional Three-Ring Architecture

The glyph uses a proportional ring system where all bands share the same width (`ringWidth = 4.375`) and are separated by equal gaps (`ringGap = 1.5`). From outside in:

**When CIA is split (subsequent impact exists):**
1. **Outer hue ring** — stroke-based circle, width = `ringWidth`
2. **Gap** — `ringGap`
3. **Sub band** (subsequent impact) — arc segments, width = `ringWidth`
4. **Gap** — `ringGap`
5. **Vuln band** (vulnerability impact) — arc segments, width = `ringWidth`

**When CIA is undivided (no subsequent impact):**
1. **Outer hue ring** — stroke-based circle, width = `ringWidth`
2. **Gap** — `ringGap`
3. **CIA band** — arc segments, width = `ringWidth * 2 + ringGap` (fills the full depth)

This ensures three visually equal rings when split, and a proportionally thicker CIA band when undivided.

### 3. Outer Hue Ring — Score Color Reference

A continuous, undivided circle rendered as a stroke. Always at full saturation in the score-derived hue, providing a consistent color reference regardless of CIA segment brightness.

- **Radius:** `outerR + ringGap + ringWidth / 2` (~48.1)
- **Stroke width:** `ringWidth` (4.375)
- **Color:** `hsl(hue, sat%, 52%)` — full saturation, never faded
- **No sector gaps, no segmentation** — always a complete circle

### 4. CIA Ring — VC, VI, VA (Vulnerability Impact)

Three 120° arc segments form the primary ring structure:

- **Confidentiality (C):** -150° to -30° (top)
- **Integrity (I):** -30° to 90° (bottom-right)
- **Availability (A):** 90° to 210° (bottom-left)

Each sector has a 3° gap between it and adjacent sectors.

**Brightness per sector (3-level):**

| Value | Lightness | HSL |
|-------|-----------|-----|
| None (N) | 12% | `hsla(hue, sat*0.1%, 12%, 0.9)` |
| Low (L) | 35% | `hsla(hue, sat*0.5%, 35%, 0.92)` |
| High (H) | 58% | `hsla(hue, sat*0.9%, 58%, 0.95)` |

**Ring dimensions (when split):**
- Sub band: `outerR` (44) to `outerR - ringWidth` (~39.6)
- Vuln band: `subInnerR - ringGap` (~38.1) to `vulnOuterR - ringWidth` (~33.8)

**Ring dimensions (when undivided):**
- CIA band: `outerR` (44) to `vulnInnerR` (~33.8)

### 5. Split Band — SC, SI, SA (Subsequent Impact)

When any of SC, SI, SA is greater than None, the CIA ring splits into two concentric bands of equal width, separated by a visible gap of background color.

Each band independently encodes brightness per sector:
- Inner band (vuln): VC, VI, VA brightness
- Outer band (sub): SC, SI, SA brightness

The gap is structural (physical space between arc paths), not a stroke overlay.

### 6. Ring Segmentation — AT (Attack Requirements)

When AT = Present, radial wedge cuts slice through the full depth of the CIA ring:

- **Cut pattern:** Alternating 4° visible fill, 3° dark cut
- **Pattern centering:** The cut pattern is centered within each sector so start and end have equal-sized fill regions. The total pattern span is calculated, then offset by `(sectorSpan - patternSpan) / 2`.
- **Cut extent:** From `vulnInnerR - 0.5` to `outerR + 0.5` (slight overshoot ensures clean edges)
- **Cut fill:** Background color (`hsl(hue, 4%, 5%)`)
- **Alignment:** Cuts punch through both vuln and subsequent bands at identical angular positions
- **AT = None:** Ring is solid (no cuts)

### 7. Star Shape — AV (Attack Vector)

A star/polygon sits inside the ring. Its point count encodes the attack vector:

| AV Value | Points | Description |
|----------|--------|-------------|
| Network (N) | 8 | Remotely exploitable |
| Adjacent (A) | 6 | Requires network adjacency |
| Local (L) | 4 | Requires local access |
| Physical (P) | 3 | Requires physical touch |

**Star geometry:**
- `starOuterR = innerR - 2` (~31.8)
- Points are evenly distributed, first point at -90° (top)
- Alternating outer/inner vertices create the star shape

### 8. Star Pointiness — AC (Attack Complexity)

The ratio of inner radius to outer radius controls how pointy the star is:

```
starInnerR = starOuterR * (0.75 - ac * 0.5)
```

| AC Value | Severity | Ratio | Visual |
|----------|----------|-------|--------|
| Low (L) | 1.0 | 0.25 | Very pointy — deep, sharp valleys |
| High (H) | 0.4 | 0.55 | Blunt — nearly polygonal, rounded feel |

### 9. Star Outline — PR (Privileges Required)

The star's stroke weight and opacity encode privilege requirements:

| PR Value | Stroke Width | Stroke Alpha | Visual |
|----------|-------------|--------------|--------|
| None (N) | 0.5 | 0.2 | Barely visible — open, exposed |
| Low (L) | 1.5 | 0.55 | Medium outline |
| High (H) | 2.5 | 0.8 | Thick bold border — shielded |

- **Stroke color:** `hsla(hue, sat*0.5%, 70%, alpha)`
- **Stroke line join:** round

### 10. Star Fill — Score Color

The star interior is filled at full intensity using the score-derived hue.

- **Fill:** Radial gradient from center (slightly brighter) to edge
  - Center: `hsla(hue, sfSat*1.1%, sfLight+6%, min(1, sfAlpha+0.1))`
  - Edge: `hsla(hue, sfSat%, sfLight%, sfAlpha)`
- **Constants:** `sfSat = sat * 0.85`, `sfLight = 35`, `sfAlpha = 0.85`

### 11. Spikes and Bumps — UI (User Interaction)

Three visually distinct states radiating from the outer hue ring. Spikes and bumps overlap the outer edge of the hue ring (no gap).

**UI:N (None) — Spikes:**
- Straight lines radiating outward from `spikeBase` for 4.7 units
- `spikeBase = hueRingR + ringWidth / 2 - 0.5` (~49.9, overlaps outer edge of hue ring)
- Count = same as star point count (AV encoding)
- Evenly distributed, first spike at -90° (top)
- Color: `hsla(hue, sat%, 65%, 0.7)`
- Stroke width: 4.5, **butt linecap** (square ends)

**UI:P (Passive) — Filled Semicircle Bumps:**
- Small filled half-circles protruding outward from the hue ring
- Count = same as star point count
- Bump radius: 4.7 units
- Center positioned at `spikeBase` along each radial direction
- Each semicircle is an SVG arc: flat side faces inward, dome faces outward
- Implementation: `M(perpL) A(bumpR,bumpR, 0 0,1) (perpR) Z`
- Fill: `hsla(hue, sat%, 60%, 0.65)`

**UI:A (Active) — Clean Perimeter:**
- No spikes, no bumps — smooth, unadorned edge

### 12. Background

The background fill for the inner circle and radial cuts:
- Color: `hsl(hue, 4%, 5%)` — very dark, subtly tinted by the score hue

---

## Geometry Constants

All values are in viewBox coordinate units (viewBox = `0 0 120 120`):

| Constant | Value | Description |
|----------|-------|-------------|
| `cx, cy` | 60, 60 | Center point |
| `outerR` | 44 | Outer edge of CIA ring area |
| `ringWidth` | 4.375 | Width of each ring band (hue, sub, vuln) |
| `ringGap` | 1.5 | Gap between adjacent rings |
| `hueRingR` | ~48.1 | Hue ring center radius (outerR + ringGap + ringWidth/2) |
| `subOuterR` | 44 | Outer edge of sub band |
| `subInnerR` | ~39.6 | Inner edge of sub band (outerR - ringWidth) |
| `vulnOuterR` | ~38.1 | Outer edge of vuln band (subInnerR - ringGap) |
| `vulnInnerR` | ~33.8 | Inner edge of vuln band (vulnOuterR - ringWidth) |
| `innerR` | ~33.8 | Inner edge of ring area (= vulnInnerR) |
| `starOuterR` | ~31.8 | Star outer radius (innerR - 2) |
| `gapDeg` | 3 | Angular gap between CIA sectors |
| `cutGapDeg` | 4 | Angular width of visible fill between AT:P cuts |
| `cutWidthDeg` | 3 | Angular width of each AT:P dark cut |
| `spikeBase` | ~49.9 | Start radius for spikes/bumps |
| `spikeLength` | 4.7 | Length of UI:N spikes |
| `spikeWidth` | 4.5 | Stroke width of UI:N spikes |
| `bumpR` | 4.7 | Radius of UI:P semicircle bumps |

---

## Z-Order (Back to Front)

1. **UI:N Spikes** (lines radiating from spikeBase outward)
2. **UI:P Bumps** (filled semicircles at spikeBase)
3. **Background circle** (innerR, dark fill)
4. **Star fill** (radial gradient)
5. **Star stroke** (PR-driven thickness)
6. **CIA ring vuln band** (inner band arcs)
7. **CIA ring sub band** (outer band arcs, when split)
8. **AT:P radial cuts** (background-color wedges overlaid on ring)
9. **Outer hue ring** (full-color circle at hueRingR)
10. **Sector labels** (C/I/A text, only at size >= 140)

---

## CVSS 4.0 Metric Parsing

The vector string is parsed by splitting on `/` and then on `:`. The `CVSS:4.0` prefix token is silently ignored.

**Required metrics for full rendering:** AV, AC, AT, PR, UI, VC, VI, VA

**Optional metrics:** SC, SI, SA (default to None if absent — no split band)

**Severity mapping per metric value:**

| Metric | Values → Severity |
|--------|------------------|
| AV | N=1.0, A=0.7, L=0.4, P=0.15 |
| AC | L=1.0, H=0.4 |
| AT | N=1.0, P=0.4 |
| PR | N=1.0, L=0.6, H=0.2 |
| UI | N=1.0, P=0.6, A=0.2 |
| VC/VI/VA | H=1.0, L=0.5, N=0.0 |
| SC/SI/SA | H=1.0, L=0.5, N=0.0 |

These severity values are used for:
- AC severity → star pointiness calculation
- AT severity → determining if `at < 0.5` (Present)
- VC/VI/VA severity → ring sector brightness
- SC/SI/SA severity → split band brightness and `hasAnySub` check
- AV raw value → star point count lookup

---

## Score Calculation

Both libraries automatically calculate the CVSS 4.0 Base Score from the vector string using third-party libraries. An explicit `score` parameter can override the auto-calculated value.

### TypeScript

Uses `ae-cvss-calculator` (npm):

```typescript
import { Cvss4P0 } from 'ae-cvss-calculator';

function calculateScore(vector: string): number {
  const cvss = new Cvss4P0();
  cvss.applyVector(vector);
  return cvss.calculateScores().base;
}
```

### Python

Uses `cvss` (pip, Red Hat Product Security):

```python
from cvss import CVSS4

def calculate_score(vector: str) -> float:
    c = CVSS4(vector)
    return c.scores()[0]
```

### Score Precedence

1. If `score` parameter is provided → use it directly
2. Otherwise → auto-calculate from vector
3. If auto-calculation fails → default to 5.0 (mid-range purple)

---

## TypeScript Types

```typescript
interface RenderOptions {
  /** CVSS 4.0 vector string */
  vector: string;
  /** Explicit score override (0-10). Auto-calculated when null. */
  score?: number | null;
  /** Rendered size in pixels. Default: 120 */
  size?: number;
  /** Show C/I/A sector labels when size >= 140. Default: true */
  showLabel?: boolean;
}

interface ParsedMetrics {
  AV: 'N' | 'A' | 'L' | 'P';
  AC: 'L' | 'H';
  AT: 'N' | 'P';
  PR: 'N' | 'L' | 'H';
  UI: 'N' | 'P' | 'A';
  VC: 'H' | 'L' | 'N';
  VI: 'H' | 'L' | 'N';
  VA: 'H' | 'L' | 'N';
  SC?: 'H' | 'L' | 'N';
  SI?: 'H' | 'L' | 'N';
  SA?: 'H' | 'L' | 'N';
}

interface HueResult {
  hue: number;
  sat: number;
}
```

---

## Test Vectors

These 16 examples should be used for visual regression testing. Each produces a distinct glyph:

| Name | CVE | Score | Vector | Key Features |
|------|-----|-------|--------|--------------|
| Log4Shell | CVE-2021-44228 | 10.0 | AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H | 8-pt sharp, all bright, split, spikes, amber |
| Heartbleed | CVE-2014-0160 | 8.7 | AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:N/VA:N/SC:L/SI:N/SA:N | Only C lit, split (C outer dim), red |
| Spectre | CVE-2017-5715 | 5.6 | AV:L/AC:H/AT:P/PR:L/UI:N/VC:H/VI:N/VA:N/SC:H/SI:N/SA:N | 4-pt blunt, segmented, split, spikes, purple |
| EternalBlue | CVE-2017-0144 | 9.3 | AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N | 8-pt sharp, all bright, no split, spikes, orange |
| Dirty COW | CVE-2016-5195 | 7.3 | AV:L/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N | 4-pt sharp, C+I bright A dark, spikes, magenta |
| BlueKeep | CVE-2019-0708 | 9.3 | AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:L/SI:L/SA:L | 8-pt, split (outer dim), spikes, orange |
| Phishing Link | Example | 5.1 | AV:N/AC:L/AT:N/PR:N/UI:A/VC:L/VI:L/VA:N/SC:N/SI:N/SA:N | 8-pt, no spikes (UI:A), clean edge, blue |
| USB Physical | Example | 7.3 | AV:P/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N | 3-pt triangle, spikes, magenta |
| Rowhammer | CVE-2015-0565 | 5.9 | AV:L/AC:H/AT:P/PR:L/UI:N/VC:H/VI:H/VA:N/SC:H/SI:H/SA:N | 4-pt blunt, segmented, split, spikes, purple |
| KRACK | CVE-2017-13077 | 5.6 | AV:A/AC:H/AT:P/PR:N/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N | 6-pt blunt, segmented, only C lit, purple |
| Shellshock | CVE-2014-6271 | 9.2 | AV:N/AC:L/AT:P/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H | 8-pt, segmented, split, all bright, red-orange |
| POODLE | CVE-2014-3566 | 2.3 | AV:N/AC:H/AT:P/PR:N/UI:N/VC:L/VI:N/VA:N/SC:N/SI:N/SA:N | 8-pt blunt, segmented, only C dim, cyan |
| Meltdown | CVE-2017-5754 | 5.6 | AV:L/AC:H/AT:P/PR:L/UI:N/VC:H/VI:N/VA:N/SC:H/SI:N/SA:N | 4-pt blunt, segmented, split, purple |
| Sudo Baron Samedit | CVE-2021-3156 | 8.4 | AV:L/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N | 4-pt sharp, all bright, spikes, rose |
| DDoS Amplification | Example | 8.7 | AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:H/SC:N/SI:N/SA:H | Only A lit, split, spikes, red |
| XSS Stored | Example | 5.1 | AV:N/AC:L/AT:N/PR:L/UI:P/VC:L/VI:L/VA:N/SC:N/SI:N/SA:N | 8-pt, bumps (UI:P), C+I dim, blue |

### test-vectors.json Format

```json
[
  {
    "name": "Log4Shell",
    "cve": "CVE-2021-44228",
    "score": 10.0,
    "vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H",
    "expect": {
      "starPoints": 8,
      "segmented": false,
      "splitBand": true,
      "spikes": "long",
      "bumps": false,
      "prStroke": "thin"
    }
  }
]
```

Both TS and Python repos include identical copies of this file. Test suites in each repo load their local `spec/test-vectors.json` and validate that rendered SVGs contain the expected structural elements.

---

## Scale Behavior

| Size Range | Visible Features |
|------------|-----------------|
| 20–31px | Star shape, ring brightness pattern, hue color |
| 32–47px | + spikes/bumps, outer hue ring |
| 48–79px | + segmentation pattern, split band gap, PR stroke weight |
| 80–139px | + all detail clearly readable |
| 140px+ | + C/I/A sector labels appear |
| 200px+ | + labels larger (8px vs 6px) |

---

## Reference Implementation

The reference implementation is in `cvss-glyph-v12.jsx` (React + inline SVG). This file contains the complete rendering logic, a demo gallery with 16 example vulnerabilities, and a comprehensive visual legend.

For the core libraries, extract only the pure rendering logic (parsing, color calculation, geometry, SVG string assembly). The interactive features (hover state, gallery UI, legend) are for the demo app only.

---

## Accessibility Notes

- The output is purely visual — consumers should provide text alternatives via surrounding markup or `aria-label` attributes
- The color encoding is reinforced by shape, pattern, and position so the glyph remains interpretable in grayscale (star points, pointiness, segmentation, split band, spikes/bumps, and stroke weight are all non-color channels)

---

## Future Considerations

- **CVSS 3.x compatibility:** The metric set differs (no AT, no SC/SI/SA). A utility function could map 3.x vectors to approximate 4.0 equivalents for glyph rendering.
- **Rust port:** A native Rust SVG string generator would enable direct glyph embedding in security tooling without a JS/Python runtime.
- **Dark/light theme:** Currently designed for dark backgrounds. A `theme` option could invert the background and adjust ring brightness for light UIs.
- **PNG/rasterization:** Python consumers may want a `render_png()` helper using cairosvg or Pillow for embedding in non-SVG contexts (PDFs, terminals).
