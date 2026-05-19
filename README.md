# vulnsig

Render CVSS vulnerability vectors as expressive SVG glyphs. Each glyph encodes all base metrics visually with shape, color, rings, and texture, so vulnerabilities are recognizable at a glance.

Supports CVSS 4.0, 3.1, 3.0, and 2.0.

Visit [vulnsig.io](https://vulnsig.io) to interactively explore CVSS glyph configurations and recent or well-known CVE vector glyphs.


## Install

```bash
npm install vulnsig
```

## Usage

```ts
import { renderGlyph } from 'vulnsig';

const svg = renderGlyph({ vector: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H' });

// override the score (e.g. if you already have it)
const svg2 = renderGlyph({ vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H', score: 10.0 });

// control rendered size in pixels (default 120)
const svg3 = renderGlyph({ vector: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N', size: 64 });
```

`renderGlyph` returns an SVG string ready to embed in HTML or write to a file.

## Examples

### CVSS 4.0

| Glyph | Name | Vector | Score |
|:-----:|------|--------|------:|
| <img src="https://raw.githubusercontent.com/vulnsig/vulnsig-ts/main/assets/log4shell.svg" width="80"> | Log4Shell | `AV:N AC:L AT:N PR:N UI:N VC:H VI:H VA:H SC:H SI:H SA:H` | 10.0 |
| <img src="https://raw.githubusercontent.com/vulnsig/vulnsig-ts/main/assets/eternalblue.svg" width="80"> | EternalBlue | `AV:N AC:L AT:N PR:N UI:N VC:H VI:H VA:H SC:N SI:N SA:N` | 9.3 |
| <img src="https://raw.githubusercontent.com/vulnsig/vulnsig-ts/main/assets/heartbleed.svg" width="80"> | Heartbleed | `AV:N AC:L AT:N PR:N UI:N VC:H VI:N VA:N SC:L SI:N SA:N` | 8.7 |
| <img src="https://raw.githubusercontent.com/vulnsig/vulnsig-ts/main/assets/spectre.svg" width="80"> | Spectre | `AV:L AC:H AT:P PR:L UI:N VC:H VI:N VA:N SC:H SI:N SA:N` | 5.6 |
| <img src="https://raw.githubusercontent.com/vulnsig/vulnsig-ts/main/assets/xss-stored.svg" width="80"> | XSS Stored | `AV:N AC:L AT:N PR:L UI:P VC:L VI:L VA:N SC:N SI:N SA:N` | 5.1 |
| <img src="https://raw.githubusercontent.com/vulnsig/vulnsig-ts/main/assets/usb-physical.svg" width="80"> | USB Drop | `AV:P AC:L AT:N PR:N UI:N VC:H VI:H VA:H SC:N SI:N SA:N` | 7.3 |

### CVSS 3.x

| Glyph | Name | Vector | Score |
|:-----:|------|--------|------:|
| <img src="https://raw.githubusercontent.com/vulnsig/vulnsig-ts/main/assets/log4shell-31.svg" width="80"> | Log4Shell | `AV:N AC:L PR:N UI:N S:C C:H I:H A:H` | 10.0 |
| <img src="https://raw.githubusercontent.com/vulnsig/vulnsig-ts/main/assets/xss-reflected-31.svg" width="80"> | XSS Reflected | `AV:N AC:L PR:N UI:R S:C C:L I:L A:N` | 6.1 |

### CVSS 2.0

CVSS 2.0 vectors are accepted both bare and prefixed (`CVSS:2.0/...`).

| Name | Vector | Score |
|------|--------|------:|
| Heartbleed | `AV:N/AC:L/Au:N/C:P/I:N/A:N` | 5.0 |
| Conficker | `AV:N/AC:L/Au:N/C:C/I:C/A:C` | 10.0 |
| Auth-required | `AV:N/AC:L/Au:S/C:P/I:P/A:P` | 6.5 |

## Visual encoding

Each metric maps to a distinct visual channel:

| Metric | Channel |
|--------|---------|
| Score | Hue — yellow (low) → orange → dark red (high) |
| AV | Star points — N=8, A=6, L=4, P=3 |
| AC | Star pointiness — L=sharp, M=medium, H=blunt |
| AT | Ring segmentation — N=solid, P=cut pattern (CVSS 4.0) |
| PR / Au | Star outline — PR: N=none, L=thin, H=thick · Au (CVSS 2.0): N=none, S=thin, M=thick |
| UI | Perimeter — N=spikes, P=bumps, A=clean (CVSS 3.x/4.0) |
| VC/VI/VA · C/I/A | Inner ring brightness per sector (v2 N/P/C and v3 N/L/H share the channel) |
| SC/SI/SA | Outer ring band (split when any > 0; CVSS 3.x/4.0 only) |
| E | Center marker — 4.0: A=rings, P=disc · 2.0: H=rings, POC/F=disc |

## Requirements

Node.js 18+




## What Is New in VulnSig

### 1.3.0

Added rendering of Exploit Maturity.

Improved rendering of PR.

### 1.2.0

Improved glyph rendering over diverse backgrounds.

### 1.1.0

Extension to the public interface.


