
# 462 CVEs in Four Months: Making Sense of OpenClaw Vulnerabilities


Since its viral rise earlier this year, OpenClaw (the self-hosted personal AI agent formerly known as Clawdbot and Moltbot) has accumulated 462 published Common Vulnerabilities and Exposures (CVEs) in just four months (February through May of 2026). While [some](https://blogs.cisco.com/ai/personal-ai-agents-like-openclaw-are-a-security-nightmare) have called OpenClaw a "security nightmare", more extensive [research](https://arxiv.org/html/2603.27517v1) traces the abundance of security failures to a lack of unified policy boundaries across the framework's many layers.

With agents now both generating vulnerable code and finding new vulnerabilities at breakneck pace, the number of CVEs is growing rapidly. While it is possible to find OpenClaw CVEs via the NIST National Vulnerability Database, CVE.org, or other CVE aggregators, understanding the broad characteristics of those CVEs is difficult.

To support comprehending large CVE volumes associated with specific products, we will use resources from `vulnsig.io`, an open-source toolkit I created. Aggregate metrics and all 462 OpenClaw CVEs referenced in this article are visible [here](https://vulnsig.io/?tab=search&q=openclaw).

This article will help you understand Common Vulnerability Scoring System ([CVSS](https://www.first.org/cvss)) vectors, the details of a handful of specific OpenClaw CVEs, and the broad characteristics of OpenClaw vulnerabilities.

## A Visual Interpretation of CVSS

If you follow cybersecurity news, you are likely familiar with CVSS, a tool for defining the characteristics of a vulnerability and assigning it a score from 0 to 10 (10 being the most severe). The score is calculated based on a vector, a string of eight or more pairs of metrics and values.

A vector starts with a CVSS version identifier, then continues with metric and value pairs; metrics and values are separated with a colon, pairs are separated with a slash. For example, CVE-2026-32846, an OpenClaw path traversal vulnerability, has the following vector:

```
CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N
```

The CVSS score of 8.7, however, does not tell the full vector story. This is a network-based attack (AV:N), no user interaction is required (UI:N), and among the confidentiality, integrity, and availability (CIA) triad, only confidentiality is impacted (VC:H).

VulnSig permits creating glyphs from vectors, offering a visual interpretation of CVSS metrics. The design principle is simple: the greater the threat, the sharper, more aggressive the geometry. While any such mapping is highly subjective, these are at least explicit and identifiable. Consider the VulnSig glyph for CVE-2026-32846:

![vulnsig](https://vulnsig.io/api/svg?vector=CVSS.4.0-AV.N-AC.L-AT.N-PR.N-UI.N-VC.H-VI.N-VA.N-SC.N-SI.N-SA.N&size=100)

The eight-pointed star denotes a network-based attack. As a vulnerability that requires no user interaction, we see spikes on the outer ring. As only confidentiality is affected (where C, I, and A are mapped clockwise from the top in three arcs of a ring), we see only the top arc activated.

Contrast this with the vector and glyph for CVE-2026-22176, an OpenClaw command injection vulnerability with a CVSS score of 6.9:

```
CVSS:4.0/AV:L/AC:L/AT:N/PR:L/UI:N/VC:N/VI:H/VA:L/SC:N/SI:N/SA:N
```

![vulnsig](https://vulnsig.io/api/svg?vector=CVSS.4.0-AV.L-AC.L-AT.N-PR.L-UI.N-VC.N-VI.H-VA.L-SC.N-SI.N-SA.N&size=100)

The four-pointed star marks it as a local attack (AV:L), and the CIA arcs show high integrity and low availability impact (VI:H, VA:L).

While a CVSS score collapses multiple metrics into a single number, the VulnSig glyph preserves metrics: even same-scored CVEs can have completely different appearances.


## Aggregate Characteristics of OpenClaw CVEs

While VulnSig glyphs provide a tool to rapidly apprehend CVSS characteristics, understanding the characteristics of hundreds or thousands of CVEs remains challenging. To meet this need, VulnSig product searches deliver aggregate metrics of CVSS scores and characteristics.

### Distribution of Severity

Examining the severity distribution of the 462 OpenClaw CVEs shows the following:

Severity | Low | Medium | High | Critical |
-|-|-|-|-|
Count    | 41  | 210    | 186  | 25

That almost half of the CVEs have High or Critical CVSS scores is significant: the CVEs are not only numerous, but pose significant risk.

An example of a critical vulnerability, with a CVSS score of 9.4, is CVE-2026-32922. A couple of analysts have described this CVE in depth ([blink.new](https://blink.new/blog/cve-2026-32922-openclaw-privilege-escalation-fix-guide), [armosec.io](https://www.armosec.io/blog/cve-2026-32922-openclaw-privilege-escalation-cloud-security/)). To exploit this vulnerability, an attacker can escalate a low-privilege web token into an admin token, permitting complete remote code execution.

At a glance, the glyph of CVE-2026-32922 tells us it is a network-based attack (AV:N, 8-pointed star) with low complexity (AC:L, narrow points) and no user interaction (UI:N, outer spikes). Both the vulnerable and subsequent systems show high impact across the CIA triad (VC:H/VI:H/VA:H/SC:H/SI:H/SA:H, split solid rings).

![vulnsig](https://vulnsig.io/api/svg?vector=CVSS.4.0-AV.N-AC.L-AT.N-PR.L-UI.N-VC.H-VI.H-VA.H-SC.H-SI.H-SA.H-E.X-CR.X-IR.X-AR.X-MAV.X-MAC.X-MAT.X-MPR.X-MUI.X-MVC.X-MVI.X-MVA.X-MSC.X-MSI.X-MSA.X-S.X-AU.X-R.X-V.X-RE.X-U.X&size=100)

Individual severity scores can understate risk when vulnerabilities are combined. For example, the [Claw Chain](https://www.cyera.com/blog/claw-chain-cyera-research-unveil-four-chainable-vulnerabilities-in-openclaw) employs four chainable OpenClaw flaws to go from initial foothold to data theft, privilege escalation, and persistence.


### Distribution of CVSS Metrics

First, consider the distribution of attack vector (AV) characteristics.

Attack Vector | Network | Adjacent | Local |
-|-|-|-|
Count  | 357     | 8        | 97    |

Of the 462 OpenClaw CVEs, over three-quarters are network based, meaning that an unpatched internet-facing OpenClaw instance is vulnerable from anywhere on the internet.

The 97 local CVEs represent threats from attackers who find their way on to a system running OpenClaw. For example, the vulnerability described by CVE-2026-32920 requires an attacker, on the vulnerable system, to place malicious code in the OpenClaw extensions directory: OpenClaw automatically discovers and loads plugins from this directory without verification, permitting arbitrary code execution.

![vulnsig](https://vulnsig.io/api/svg?vector=CVSS.4.0-AV.L-AC.L-AT.N-PR.N-UI.N-VC.H-VI.H-VA.H-SC.N-SI.N-SA.N-E.X-CR.X-IR.X-AR.X-MAV.X-MAC.X-MAT.X-MPR.X-MUI.X-MVC.X-MVI.X-MVA.X-MSC.X-MSI.X-MSA.X-S.X-AU.X-R.X-V.X-RE.X-U.X&size=100)


Second, the distribution of user interaction (UI) metrics (for both CVSS 3.1 and 4.0) shows that over 80% of OpenClaw vulnerabilities require no user interaction, making them easier to exploit by attackers.

User Interaction | None | Required | Passive | Active |
-|-|-|-|-|
Count | 381  | 8        | 45      | 28     |

The term "zero-click exploit" refers to vulnerabilities with a user interaction of "None": the attack is fully automated and requires no action from the user.

We can look at CVE-2026-28394 as example of the other extreme, when a vulnerability requires active user interaction. This vulnerability requires an attacker to prepare a "pathological" HTML site that, when loaded by OpenClaw, can crash the application due to memory exhaustion. The required user interaction is that the user (or agent) must load the specific site. The VulnSig glyph expresses the requirement of user interaction with the absence of "spikes" or "bumps" on the outer ring. Note also that, among the CIA triad, only availability is affected by this vulnerability:

![vulnsig](https://vulnsig.io/api/svg?vector=CVSS.4.0-AV.N-AC.L-AT.N-PR.N-UI.A-VC.N-VI.N-VA.H-SC.N-SI.N-SA.N-E.X-CR.X-IR.X-AR.X-MAV.X-MAC.X-MAT.X-MPR.X-MUI.X-MVC.X-MVI.X-MVA.X-MSC.X-MSI.X-MSA.X-S.X-AU.X-R.X-V.X-RE.X-U.X&size=100)

Third, we can consider the distribution of CIA impact across all vulnerabilities. As a single vulnerability can specify impact on any combination of confidentiality, integrity, and availability, the maximum possible count for each category is 462.

High CIA Impact | Confidentiality | Integrity | Availability |
-|-|-|-|
Count | 190  | 221        | 137    |

While each of the CIA components is well represented, integrity impact is the most common. If an exploit breaks integrity, the data, configurations, or system files can no longer be trusted as accurate and authentic.

While many OpenClaw vulnerabilities impact all of the CIA, CVE-2026-28454 only affects integrity: OpenClaw failed to validate the webhook secret of Telegram JSON payloads, allowing an unauthenticated attacker to execute privileged commands and arbitrarily alter the environment.

The VulnSig glyph for this vulnerability clearly shows the exclusive integrity impact. The striped arc expresses that attack requirements are present: the Telegram webhook must be active and the attacker must know a valid user's internal message identifiers.

![vulnsig](https://vulnsig.io/api/svg?vector=CVSS.4.0-AV.N-AC.L-AT.P-PR.N-UI.N-VC.N-VI.H-VA.N-SC.N-SI.N-SA.N-E.X-CR.X-IR.X-AR.X-MAV.X-MAC.X-MAT.X-MPR.X-MUI.X-MVC.X-MVI.X-MVA.X-MSC.X-MSI.X-MSA.X-S.X-AU.X-R.X-V.X-RE.X-U.X&size=100)

## Conclusion

The high severity, broad CIA impact, and prevalence of network-based attack vectors show the seriousness of OpenClaw vulnerabilities and the risks of hosting a vulnerable instance on the public internet. But OpenClaw is unlikely to be the last agent or vibe-coded tool to mint hundreds of CVEs in a matter of months. Tools like VulnSig support quickly understanding the full vector spectrum of vulnerability characteristics.



<!--
https://thehackernews.com/2026/05/four-openclaw-flaws-enable-data-theft.html

# Making Sense of the 462 OpenClaw CVEs in Four Months

-->

<!-- Hundreds of CVEs can be rapidly scanned to find distinct vector characteristics.  -->


<!--

OpenClaw is unlikely to be the last agent or vibe-coded tool to mint hundreds of CVEs in a matter of months. As vulnerability counts grow, VulnSig offers the full vector spectrum at a glance.
you can do better than just scanning CVSS scores:

# Exploring 462 OpenClaw CVEs with VulnSig
# Scanning 462 OpenClaw CVEs at a Glance with VulnSig
# Your CVSS Scores Are Hiding Something

CVSS scores alone mask informative characteristics that VulnSig glyphs preserve.


While widespread use of CVSS scores provides a convenient expression of severity, it leaves behind rich characteristics embedded in the CVSS vector: VulnSig glyphs make those characteristics immediately visible. With the rapidly growing volume of CVEs owing to AI-accelerated vulnerability discovery, VulnSig aids in quickly assessing CVE features.


462 CVEs in four months. The number will only get larger, and it won't only be OpenClaw. CVSS scores compress what's worth seeing; VulnSig glyphs preserve it. -->

<!-- Since OpenClaw (formerly Clawdbot, Moltbot) usage exploded early in 2026, a vast array of security issues have been found within the popular AI agent. A subset of those issues are documented in Common Vulnerabilities and Exposures (CVE) records. From February through May, an extraordinary 462 CVEs related to OpenClaw have been published. -->


<!-- That the agent runs shell commands, stores persistent credentials, and loads community-contributed skills . -->


<!--
We can contrast this with OpenClaw CVE-2026-22176, a command injection vulnerability:
The glyph for this vector is clearly distinguishable from the previous glyph. -->



<!-- The general spirit of the visual encoding is that the greater the vulnerability threat, the sharper and more aggressive the glyph appears. While mapping to visual characteristics is highly subjective, with frequent exposure the encoding is at least explicit and identifiable.  -->


<!-- The four-pointed star conveys attack vector (AV:L) as a local-based attack requiring OS-level access to the system. For CIA triad exposure, we see high vulnerability on integrity (VI:H) and low vulnerability on availability (VA:L). -->


<!-- A CVSS score collapses twelve metric dimensions into a single number. The glyph preserves them — which is why two CVEs with identical scores can look entirely different."


While the overall coloring of the glyph is a representation of the score, VulnSig glyphs can provide distinguishing information even when the score is the same.
-->


<!-- For OpenClaw, 462 CVEs in four months is impressive, but not inconceivable. Older products can carry far more: for example, we find 4,113 CVEs associated with [Google Chrome](https://vulnsig.io/?tab=search&q=google+chrome). -->


<!--
Lastly, examine CVE-2026-43585 and CVE-2026-32918, two OpenClaw vulnerabilities with identical CVSS scores of 9.2:

![vulnsig](https://vulnsig.io/api/svg?vector=CVSS.4.0-AV.N-AC.H-AT.P-PR.N-UI.N-VC.H-VI.H-VA.H-SC.N-SI.N-SA.N-E.X-CR.X-IR.X-AR.X-MAV.X-MAC.X-MAT.X-MPR.X-MUI.X-MVC.X-MVI.X-MVA.X-MSC.X-MSI.X-MSA.X-S.X-AU.X-R.X-V.X-RE.X-U.X&size=100)

![vulnsig](https://vulnsig.io/api/svg?vector=CVSS.4.0-AV.L-AC.L-AT.N-PR.L-UI.N-VC.H-VI.H-VA.N-SC.H-SI.H-SA.N-E.X-CR.X-IR.X-AR.X-MAV.X-MAC.X-MAT.X-MPR.X-MUI.X-MVC.X-MVI.X-MVA.X-MSC.X-MSI.X-MSA.X-S.X-AU.X-R.X-V.X-RE.X-U.X&size=100)

The former glyph is a blunt star, reflecting high attack complexity (AC:H) and a ring reflecting full CIA impact (VC:H, VI:H, VA:H). Here, the CIA ring is striped, showing that attack requirements are present (AT:P).

The latter glyph is a narrow star reflecting low attack complexity (AC:L) with confidentiality and integrity rings split, showing high impact on both the vulnerable system and subsequent systems (VC:H, VI:H, SC:H, SI:H).
 -->
