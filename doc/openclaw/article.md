
# Exploring 456 OpenClaw CVEs with VulnSig


Since OpenClaw (formerly Clawdbot, Moltbot) usage exploded early in 2026, a vast array of security issues have been found within the popular AI agent. A subset of those issues are documented in Common Vulnerabilities and Exposures (CVE) records. From February through May, an extraordinary 456 CVEs related to OpenClaw have been published.

While it is possible to find these OpenClaw CVEs via the NIST National Vulnerability Database or CVE.org, quickly scanning those results is difficult, and easily observing vulnerability severity and characteristics across this many CVEs is not possible.

The VulnSig glyph and the vulnsig.io site offer an alternative: VulnSig glyphs offer a visual understanding of vulnerability severity and characteristics, and vulnsig.io makes CVE discovery easy. For example, see all 456 OpenClaw CVEs [here](https://vulnsig.io/?tab=search&q=openclaw).

## The VulnSig Glyph

Followers of cybersecurity news are likely familiar with the Common Vulnerability Scoring Systems ([CVSS](https://www.first.org/cvss)), a system for defining the characteristics of a vulnerability and assigning it a score from 0 to 10, 10 being the most severe. The score is calculated based on a vector, a string of eight or more pairs of metrics (e.g. Attack Vector) and values (e.g. Network or Local). When presented as a vector string, metrics and values are separated by a colon; metric:value pairs are separated by a slash.

For example, the vector for CVE-2026-32846, an OpenClaw path traversal vulnerability, is given by the following vector. After the CVSS version identifier ("CVSS:4.0") metric:value pairs follow:

```
CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N
```

This CVE has a CVSS score of 8.7. The number, however, does not tell the full story available in the vector. AV:N tells us this is network-based attack; UI:N tells us no user interaction is required; and VC:H (along with VI:N and VA:N) tells us, among the confidentiality, integrity, and availability (CIA) triad, that confidentiality is the focus of this vulnerability.

The VulnSig glyph applies a visual interpretation to each of these metrics. As a network-based attack, we see an 8-pointed star. As a vulnerability that requires no user interaction, we see spikes on the outer ring. And as a vulnerability only affecting confidentiality (where CIA is mapped clockwise from the top in trisection a ring), we see only the top trisection ring activated:

![vulnsig](https://vulnsig.io/api/svg?vector=CVSS.4.0-AV.N-AC.L-AT.N-PR.N-UI.N-VC.H-VI.N-VA.N-SC.N-SI.N-SA.N&size=100)

We can contrast this with OpenClaw CVE-2026-22176, a command injection vulnerability:

```
CVSS:4.0/AV:L/AC:L/AT:N/PR:L/UI:N/VC:N/VI:H/VA:L/SC:N/SI:N/SA:N
```

The glyph for this vector is clearly distinguishable from the previous glyph.

![vulnsig](https://vulnsig.io/api/svg?vector=CVSS.4.0-AV.L-AC.L-AT.N-PR.L-UI.N-VC.N-VI.H-VA.L-SC.N-SI.N-SA.N&size=100)

The four-pointed star conveys attack vector (AV:L) as a local-based attack requiring OS-level access to the system. For CIA triad exposure, we see high vulnerability on integrity (VA:H) and low vulnerability on availability (VA:L).

While the overall coloring of the glyph is a representation of the score, VulnSig glyphs can provide distinguishing information even when the score is the same. Consider two more OpenClaw CVEs, CVE-2026-43585 and CVE-2026-32918, both having a 9.2 CVSS score:

![vulnsig](https://vulnsig.io/api/svg?vector=CVSS.4.0-AV.N-AC.H-AT.P-PR.N-UI.N-VC.H-VI.H-VA.H-SC.N-SI.N-SA.N-E.X-CR.X-IR.X-AR.X-MAV.X-MAC.X-MAT.X-MPR.X-MUI.X-MVC.X-MVI.X-MVA.X-MSC.X-MSI.X-MSA.X-S.X-AU.X-R.X-V.X-RE.X-U.X&size=100)

![vulnsig](https://vulnsig.io/api/svg?vector=CVSS.4.0-AV.L-AC.L-AT.N-PR.L-UI.N-VC.H-VI.H-VA.N-SC.H-SI.H-SA.N-E.X-CR.X-IR.X-AR.X-MAV.X-MAC.X-MAT.X-MPR.X-MUI.X-MVC.X-MVI.X-MVA.X-MSC.X-MSI.X-MSA.X-S.X-AU.X-R.X-V.X-RE.X-U.X&size=100)

The former glyph has a blunt star, reflecting high attack complexity (AC:H) and a full trisection ring reflecting full CIA impact (VC:H, VI:H, VA:H). Note, however, that the trisection ring is stripped, expressing that attack requirements are present (AT:P)

The latter glyph has a split trisection ring for confidentiality and integrity, showing that there is both high system and subsequent system impacts (VC:H, VI:H, SC:H, SI:H).

The two CVEs have indistinguishable scores but very different glyphs.

The general spirit of the visual encoding is that the greater the vulnerability threat, the sharper and more aggressive the glyph appears. While mapping to visual characteristics is highly subjective, with frequent exposure the encoding is at least explicit and identifiable. A complete [legend](https://vulnsig.io/?tab=legend) of encoding characteristics can be found on vulnsig.io, as well as a [quiz](https://vulnsig.io/?tab=quiz) to help practice reading glyphs.


## vulnsig.io

The vulnsig.io site provides tools to interactively explore CVSS vectors and how those vectors translate into scores and VulnSig glyphs. In addition, it lets users browse hundreds of VulnSig glyphs representing recent CVEs published in the NIST National Vulnerability Database (NVD) and the CISA Known Exploited Vulnerabilities (KEV) Catalog.

The site also provides a public API to provide SVG or PNG glyphs via a vulnsig.io URL, and links to VulnSig packages in TypeScript, React, Python, and Rust to derive VulnSig glyphs locally.

When NVD CVE data is ingested, an LLM is used to identify the key product associated with each CVE. The vulnsig.io site permits searching these products, providing, as shown above, easy discovery of the 456 OpenClaw CVEs in a shareable [link](https://vulnsig.io/?tab=search&q=openclaw).

Finally, vulnsig.io offers a free newsletter, providing an email with VulnSig glyphs and information about recent CVEs, accompanied by an LLM-generated summary of recent vulnerability trends. Sign up [here](https://vulnsig.io/?tab=subscribe).


## Conclusion

For OpenClaw, 456 CVEs in four months is impressive, but not inconceivable. Products with longer histories have even more significant counts of CVEs: for example, we find 4,113 CVEs associated with [Google Chrome](https://vulnsig.io/?tab=search&q=google+chrome).

While widespread use of CVSS scores provides a convenient expression of severity, it leaves behind rich characteristics embedded in the CVSS vector: VulnSig glyphs make those characteristics immediately visible. With the rapidly growing volume of CVEs owing to AI-accelerated vulnerability discovery, VulnSig aids in quickly assessing CVE features.

