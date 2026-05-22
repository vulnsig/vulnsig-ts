
# Exploring 456 OpenClaw CVEs with VulnSig

Since its viral rise earlier this year, OpenClaw (the self-hosted personal AI agent formerly known as Clawdbot and Moltbot) has accumulated an extraordinary 456 published Common Vulnerabilities and Exposures (CVEs) in just four months. [Researchers](https://arxiv.org/html/2603.27517v1) have traced the abundance of security failures to a lack of unified policy boundaries across the framework's many layers.

With agents now both generating vulnerable code and finding new vulnerabilities at breakneck pace, the number of CVEs is growing rapidly. While it is possible to find OpenClaw CVEs via the NIST National Vulnerability Database or CVE.org, quickly scanning those results is difficult, and easily observing vulnerability severity and characteristics across this many CVEs is not possible.

Visual encoding can do what text and numbers cannot. VulnSig glyphs translate CVSS vectors into a visual signature, and vulnsig.io makes CVE discovery easy. For example, browse all 456 OpenClaw CVEs [here](https://vulnsig.io/?tab=search&q=openclaw).


## The VulnSig Glyph

If you follow cybersecurity news, you are likely familiar with the Common Vulnerability Scoring System ([CVSS](https://www.first.org/cvss)), a tool for defining the characteristics of a vulnerability and assigning it a score from 0 to 10 (10 being the most severe). The score is calculated based on a vector, a string of eight or more pairs of metrics and values.

A vector string starts with a version identifier, then continues with metric and value pairs; metrics and values are separated with a colon, pairs are separated with a slash. For example, CVE-2026-32846, an OpenClaw path traversal vulnerability, has the following vector:

```
CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N
```

The CVSS score of 8.7, however, does not tell the full vector story. This is a network-based attack (AV:N), no user interaction is required (UI:N), and among the confidentiality, integrity, and availability (CIA) triad, only confidentiality is vulnerable (VC:H).

The VulnSig glyph applies a visual interpretation to each of these metrics. The design principle is simple: the greater the threat, the sharper, more aggressive the geometry. While any such mapping is highly subjective, these are at least explicit and identifiable. Consider the VulnSig glyph for CVE-2026-32846:

![vulnsig](https://vulnsig.io/api/svg?vector=CVSS.4.0-AV.N-AC.L-AT.N-PR.N-UI.N-VC.H-VI.N-VA.N-SC.N-SI.N-SA.N&size=100)

The 8-pointed star denotes a network-based attack. As a vulnerability that requires no user interaction, we see spikes on the outer ring. As a vulnerability only affecting confidentiality (where C, I, and A are mapped clockwise from the top in three arcs of a ring), we see only the top arc activated.

Contrast this with the vector and glyph for the OpenClaw CVE-2026-22176, a command injection vulnerability:

```
CVSS:4.0/AV:L/AC:L/AT:N/PR:L/UI:N/VC:N/VI:H/VA:L/SC:N/SI:N/SA:N
```

![vulnsig](https://vulnsig.io/api/svg?vector=CVSS.4.0-AV.L-AC.L-AT.N-PR.L-UI.N-VC.N-VI.H-VA.L-SC.N-SI.N-SA.N&size=100)

The four-pointed star marks it as a local attack (AV:L), and the CIA arcs show high integrity and low availability vulnerabilities (VI:H, VA:L).

Finally, examine CVE-2026-43585 and CVE-2026-32918, both OpenClaw vulnerabilities with a score of 9.2:

![vulnsig](https://vulnsig.io/api/svg?vector=CVSS.4.0-AV.N-AC.H-AT.P-PR.N-UI.N-VC.H-VI.H-VA.H-SC.N-SI.N-SA.N-E.X-CR.X-IR.X-AR.X-MAV.X-MAC.X-MAT.X-MPR.X-MUI.X-MVC.X-MVI.X-MVA.X-MSC.X-MSI.X-MSA.X-S.X-AU.X-R.X-V.X-RE.X-U.X&size=100)

![vulnsig](https://vulnsig.io/api/svg?vector=CVSS.4.0-AV.L-AC.L-AT.N-PR.L-UI.N-VC.H-VI.H-VA.N-SC.H-SI.H-SA.N-E.X-CR.X-IR.X-AR.X-MAV.X-MAC.X-MAT.X-MPR.X-MUI.X-MVC.X-MVI.X-MVA.X-MSC.X-MSI.X-MSA.X-S.X-AU.X-R.X-V.X-RE.X-U.X&size=100)

The former glyph is a blunt star, reflecting high attack complexity (AC:H) and a ring reflecting full CIA impact (VC:H, VI:H, VA:H). Here, the CIA ring is striped, showing that attack requirements are present (AT:P).

The latter glyph is a narrow star reflecting low attack complexity (AC:L) with confidentiality and integrity rings split, showing high impact on both the vulnerable system and subsequent systems (VC:H, VI:H, SC:H, SI:H).

While a CVSS score collapses multiple metrics into a single number, the VulnSig glyph preserves metrics, permitting same-scored CVEs to have completely different appearances.

A complete [legend](https://vulnsig.io/?tab=legend) of encoding characteristics can be found on vulnsig.io, as well as a [quiz](https://vulnsig.io/?tab=quiz) to help practice reading glyphs.


## vulnsig.io

The vulnsig.io site provides tools to interactively explore CVSS vectors and how those vectors translate into scores and VulnSig glyphs. Users can also browse hundreds of glyphs for recent CVEs published in the NIST National Vulnerability Database (NVD) and the CISA Known Exploited Vulnerabilities (KEV) Catalog.

When NVD CVE data is ingested, an LLM identifies the key product associated with each CVE. LLM tagging makes product-level CVE enrichment feasible, with the tradeoff of occasional errors. The vulnsig.io site permits searching these products, providing easy discovery of the 456 OpenClaw CVEs and a shareable [link](https://vulnsig.io/?tab=search&q=openclaw).

A public API serves SVG or PNG glyphs for any CVSS vector via a URL, and packages for TypeScript, React, Python, and Rust let you derive glyphs locally -- useful for embedding in dashboards, vulnerability reports, or CI integrations.

Finally, the VulnSig Digest is a free newsletter delivering recent CVEs as glyphs, with an LLM-generated summary of vulnerability trends. Sign up [here](https://vulnsig.io/?tab=subscribe).


## Conclusion

OpenClaw is unlikely to be the last agent or vibe-coded tool to mint hundreds of CVEs in a matter of months. Stop just scanning CVSS scores: use VulnSig glyphs to see the full vector spectrum at a glance.

<!--
CVSS scores alone mask informative characteristics that VulnSig glyphs preserve.


While widespread use of CVSS scores provides a convenient expression of severity, it leaves behind rich characteristics embedded in the CVSS vector: VulnSig glyphs make those characteristics immediately visible. With the rapidly growing volume of CVEs owing to AI-accelerated vulnerability discovery, VulnSig aids in quickly assessing CVE features.


456 CVEs in four months. The number will only get larger, and it won't only be OpenClaw. CVSS scores compress what's worth seeing; VulnSig glyphs preserve it. -->

<!-- Since OpenClaw (formerly Clawdbot, Moltbot) usage exploded early in 2026, a vast array of security issues have been found within the popular AI agent. A subset of those issues are documented in Common Vulnerabilities and Exposures (CVE) records. From February through May, an extraordinary 456 CVEs related to OpenClaw have been published. -->


<!-- That the agent runs shell commands, stores persistent credentials, and loads community-contributed skills . -->


<!--
We can contrast this with OpenClaw CVE-2026-22176, a command injection vulnerability:
The glyph for this vector is clearly distinguishable from the previous glyph. -->



<!-- The general spirit of the visual encoding is that the greater the vulnerability threat, the sharper and more aggressive the glyph appears. While mapping to visual characteristics is highly subjective, with frequent exposure the encoding is at least explicit and identifiable.  -->


<!-- The four-pointed star conveys attack vector (AV:L) as a local-based attack requiring OS-level access to the system. For CIA triad exposure, we see high vulnerability on integrity (VI:H) and low vulnerability on availability (VA:L). -->


<!-- A CVSS score collapses twelve metric dimensions into a single number. The glyph preserves them — which is why two CVEs with identical scores can look entirely different."


While the overall coloring of the glyph is a representation of the score, VulnSig glyphs can provide distinguishing information even when the score is the same.
-->


<!-- For OpenClaw, 456 CVEs in four months is impressive, but not inconceivable. Older products can carry far more: for example, we find 4,113 CVEs associated with [Google Chrome](https://vulnsig.io/?tab=search&q=google+chrome). -->