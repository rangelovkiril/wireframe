# AGENTS.md: rangelov.dev portfolio

A personal portfolio for Kiril Rangelov, a platform engineer in the making and
internet enthusiast from Sofia, designed as the DNS zone of `rangelov.dev`. Every section of the page
is a DNS resource record, written exactly as it would appear in a zone file.
Technical correctness matters: record syntax must be valid.

Read this whole file before writing code. When something here conflicts with
your defaults, this file wins.

## Repository layout (homework requirement)

```
./AGENTS.md          this file
./src/               the Astro project root (all project paths below are relative to it)
./conversations/     exported agent sessions (not your concern)
./Skill-List.md      skills used (not your concern)
./.github/workflows/ deploy workflow; point withastro/action at ./src via its `path` input
```

## Stack and hosting

- Astro, static output, no UI framework (no React/Vue/Svelte islands).
- Client JS only where listed under "Interactivity", as plain `<script>` tags
  inside Astro components. Keep it small.
- Hosted on GitHub Pages, deployed by GitHub Actions with the official
  `withastro/action` + `actions/deploy-pages`. A `check` job (bun check,
  bun test, build, named-checkzone) runs first; the workflow also runs daily
  so the SOA serial and DNSKEY fetched at build time stay current.
- `layouts/Base.astro` holds the shared `<head>`: favicon (`public/favicon.svg`,
  the root zone's dot), Open Graph tags and `public/og.png` (1200×630).
  `pages/404.astro` is an NXDOMAIN page.
- Custom domain `portfolio.rangelov.dev` (add `public/CNAME`). The apex
  `rangelov.dev` serves the NFC vCard from Codeberg Pages (A/AAAA copied from
  `codeberg.page`, since deSEC has no ALIAS); don't point it at this site.
- Package manager: Bun.

## Project layout

```
src/
  data/zone.ts            single source of truth: every record + its content
  data/guide.ts           plain-language explanation of each record type
  lib/zonefile.ts         renders zone.ts as a BIND-format zone file
  lib/randomart.ts        drunken-bishop randomart from the DNSKEY
  lib/doh.ts              DNS-over-HTTPS helpers (build time and browser)
  components/
    Hero.astro
    Guide.astro           record-type guide that doubles as the filter
    Record.astro          one record line + its content block + verify button
    ZoneTransfer.astro    the AXFR panel at the bottom
  pages/
    index.astro
    rangelov.dev.zone.ts  static endpoint that serves the generated zone file
public/
  logos/protolith.svg     Protolith mark
  logos/devops-club.svg   TUES DevOps full wordmark, light background version
  CNAME
```

## DNS first

The records on the page are published for real in the `rangelov.dev` zone
(DNS at deSEC, managed by Kiril with dnscontrol in a separate repo).

- `zone.ts` holds the whole zone: the portfolio records plus the rest
  (Proton Mail, Codeberg Pages, hedgedoc). Each record is `managed:`
  `"desec"` (display only), `"infra"` (stays after archiving) or `"portfolio"`.
- `src/scripts/export-dns.ts` (`bun run export-dns`) writes the complete
  dnscontrol config `dns/dnsconfig.js` (one file; portfolio records in one
  block at the end, deleted when the site is archived) and `dns/records.json`.
- SOA and DNSKEY are managed by deSEC; they are only displayed, never exported.
- TXT strings must stay under 255 bytes each, one string per TXT record
  (dnscontrol joins multiple strings into one). Minimum TTL is 900 (deSEC).
- No URI records (dnscontrol has no URI type, and they add little): projects
  are CNAMEs to the host their source or site lives on.
- Never run `dnscontrol push` or call the deSEC API. Kiril reviews
  `dnscontrol preview` and pushes himself.

## Page order (fixed)

1. Hero
2. "What the records mean" guide (also the filter)
3. Records: `SOA` → `DNSKEY` → `CAA` → projects (`CNAME`/`TXT`) → `TXT` awards → `TXT` hobbies → `TXT` plans → `MX`
4. Zone transfer panel (download the zone file)
5. Footer

There is no WHOIS block.

## Hero

- `Kiril Rangelov` (h1, very large)
- `Platform engineer in the making and internet enthusiast.` (large, bold)
- One short line: `I mostly do platform engineering, and I care about how the internet works underneath. So I introduce myself through my own DNS zone.`
- Keep the hero about me, not about DNS. The guide carries the DNS explanation.

## Guide (`src/data/guide.ts`)

Heading `What the records mean`, then one line: `Each section below is a DNS record of rangelov.dev. Tap a record to open it, or tap a type to see only those.`

A list of rows. Each row is a button: type name in its type colour, what the
record means in plain language, and what it holds on this page. Tapping a row
filters the records to that type; tapping it again (or "Show all records")
clears the filter.

| button | means | here |
|---|---|---|
| SOA | Start of Authority. The first record of every zone: who is responsible for it. | who I am |
| DNSKEY | The zone's public key. Resolvers use it to check that answers were not tampered with (DNSSEC). | my picture, drawn from the key |
| CAA | Lists who is allowed to issue certificates for the domain. | certificates I have earned |
| CNAME | Makes one name an alias of another name. | my projects |
| TXT | Free-form text attached to a name. | awards, hobbies, plans, and the NFC card |
| MX | Where email for the domain should be delivered. | how to reach me |

## Records (`src/data/zone.ts`)

The record line is printed as a pure zone-file record, nothing before it:
`<fqdn> <ttl> IN <TYPE> <rdata>`. No `cname:`/`type:` prefixes, no labels,
no boxes. Owner names are lowercase (as in DNS); record types are uppercase.

| owner | ttl | type | rdata on the page |
|---|---|---|---|
| rangelov.dev. | 300 | SOA | `get.desec.io. get.desec.io. 2026113469` (as published; timers only in the zone file) |
| rangelov.dev. | 3600 | DNSKEY | `257 3 13 ( … )` |
| _certs.rangelov.dev. | 86400 | CAA | `0 issue "ripe.net"` (and `0 issue "netacad.com"`: one record per issuer) |
| protolith.rangelov.dev. | 3600 | CNAME | `codeberg.org.` (protolith.dev exists but is empty for now) |
| devops.rangelov.dev. | 3600 | CNAME | `devops.elsys.club.` |
| rampme.rangelov.dev. | 3600 | CNAME | `github.com.` |
| atlas.rangelov.dev. | 3600 | CNAME | `atlas.ripe.net.` |
| atlas-ports.rangelov.dev. | 3600 | CNAME | `codeberg.org.` |
| lms.rangelov.dev. | 3600 | CNAME | `github.com.` |
| _git-pages-repository.rangelov.dev. | 3600 | TXT | `"https://codeberg.org/rangelovkiril/contactless-vcard.git"` |
| tues-web.rangelov.dev. | 3600 | CNAME | `elsys.website.` |
| _awards.rangelov.dev. | 86400 | TXT | `"3rd place, TUES Fest"` |
| _hobbies.rangelov.dev. | 3600 | TXT | `"trains, coffee, languages, music"` |
| _plans.rangelov.dev. | 900 | TXT | `"gap-year, own-asn, kcna"` |
| rangelov.dev. | 3600 | MX | `10 mail.protonmail.ch.` (and `20 mailsec.protonmail.ch.`) |

The certificate records live at `_certs`, never at the apex: CAA is checked by
every CA, and `issue "ripe.net"` at `rangelov.dev.` would stop Let's Encrypt
from issuing certificates for the apex and every subdomain, including this
site on GitHub Pages.

A CNAME can only name a host, never a URL with a path, so each project's
CNAME points at the host (forge or site) and the full address is the link on
the page.

### Content under each record

**SOA, "Who I am":**
I study at TUES (Technology School "Electronic Systems") in Sofia and I'm a
diploma student at ITGix, a DevOps company. Most of my work is platform
engineering: GitOps, Kubernetes, CI/CD and software supply-chain security,
with a soft spot for digital sovereignty. This domain runs on European
infrastructure, registered at INWX with DNS at deSEC. Since RIPE 93 I'm also
deep into DNS, IPv6 and BGP, and I run the school's DevOps club.

**DNSKEY:** only the randomart. No heading, caption, label or box.

No skills section and no SRV records: numeric self-ratings read badly to a
reviewer (this portfolio is used for the RIPE NCC Fellowship application).

**CAA, "Certified by":**
- RIPE NCC: LIR Fundamentals, Aug 2026, issuer `ripe.net`
- RIPE NCC: IPv6 Fundamentals, Aug 2026, `ripe.net`
- RIPE NCC: RIPE Database, RIPE 93, Oct 2026, `ripe.net`
- RIPE NCC: BGP Security, RIPE 93, Oct 2026, `ripe.net`
- Cisco: Introduction to Networks, NetAcad, `netacad.com`

The four RIPE NCC entries show their RIPE NCC Academy badge (`assets/badges/`,
unmodified apart from scaling; allowed while the certificate is valid). The
Cisco entry is text only.

**Projects** (logo or icon, title, text, award, links; links always visible):
- **Protolith** (logo `protolith.svg`): A sovereign DevOps platform built from free software (Forgejo, Harbor, OpenBao), with SLSA Build L3 compatible builds, running on European cloud. My diploma thesis.
- **TUES DevOps Club** (logo `devops-club.svg` / `devops-club-dark.svg`, the transparent full wordmark for each theme, never just the wheel): The club I founded and run, plus the elsys.club domain that gives school clubs their own subdomains. Link: devops.elsys.club
- **RampMe** (icon: wheelchair user, ramp down from a bus seen from the front): Real-time accessibility for Sofia public transport, with wheelchair-ramp requests sent to the vehicle. Award: 3rd place at TUES Fest, showcased at Robotics Strategy Forum 2026. Link: Code on GitHub
- **RIPE Atlas probe** (icon: probe with antenna): I host RIPE Atlas probe 1018643 on a Raspberry Pi 2 and use RIPE Atlas for my own measurements. Link: Probe 1018643 on RIPE Atlas
- **RIPE Atlas ports** (icon: package): Unofficial armhf builds of the RIPE Atlas software probe, rebuilt automatically from upstream and published as a signed apt repository. Link: Source on Codeberg
- **Light My Satellite (LMS)** (logo `assets/logos/lms.png`): A distributed satellite laser ranging mini-station with a real-time 3D view. Award: TUES Fest, national IT olympiad. Link: Code on GitHub
- **NFC business card** (icon: card with NFC waves): A JavaCard running an NDEF applet. Tap it with a phone and you land on my contact card, served from Codeberg Pages at rangelov.dev. Link: rangelov.dev
- **TUES website infrastructure** (icon: globe): A proposal, not an official school project: infrastructure for a new school website. It started as a k3s cluster and moved to Terraform on Azure Container Apps with OIDC deploys, plus a scraper that moved about 1,830 records from the old site into Directus. Paused while the school decides what it wants. Links: k3s setup on Codeberg, Azure setup on GitHub

Icons: simple 24×24 inline stroke SVGs (currentColor, stroke 1.6).

The email address has a plain envelope icon. Every link to codeberg.org,
github.com or linkedin.com has that site's logo on its left
(`components/LinkLogo.astro`; LinkedIn's is the official "in" logo from
brand.linkedin.com, `assets/logos/linkedin.png` and `linkedin-white.png`,
unmodified and 21px high, LinkedIn's minimum), in the official light/dark
variants and otherwise unmodified: Codeberg's is CC0 (trademark of Codeberg
e.V.), GitHub's is the MIT-licensed octicons mark, used as a link to a
repository as github.com/logos allows. License notes are inside the SVGs.

**TXT _awards, "Proud of":** 3rd place at TUES Fest with RampMe · Four RIPE NCC
certifications in 2026 · Founded the TUES DevOps Club, about 40 members ·
Spoke at the mic in the RIPE 93 Security Working Group · Proposed my own
diploma topic, which rarely happens at TUES

**TXT _hobbies, "Off duty":** Train trips across Bulgaria · Specialty coffee and
Arabic sweets · A NetBSD netbook kept as a terminal-only playground ·
Languages: Bulgarian, English, Russian; learning Arabic and French · Music from
Bach to Balkan pop-folk

**TXT _plans, "Next":** A gap year to explore before specialising · My own ASN
and IPv6 space over BGP, after the thesis · A small home server · KCNA
(do not list the RIPE NCC Fellowship here)

**MX, "Get in touch":** big `contact@rangelov.dev` mailto, then links:
Codeberg (codeberg.org/rangelovkiril), GitHub (github.com/rangelovkiril),
LinkedIn (linkedin.com/in/rangelovkiril).

## Visual design

### Palette: "T568B" (Ethernet cable pair colours)

Light (default):
```
--bg      #FFFFFF   --panel   #F4F4F2   --surface #E8E8E4
--text    #1D1D1B   --muted   #5C5C57   --line    #E0E0DA
--accent  #1F5FBF   --ok      #2B7A35
type colours: SOA #C2570C  DNSKEY #7A4A1E  CAA #2B7A35
              URI #1F5FBF  CNAME #1F5FBF  TXT #C2570C  MX #7A4A1E
```
Dark, via `prefers-color-scheme: dark` only (no toggle):
```
--bg #121211  --panel #1B1B19  --surface #262623  --text #ECECE6
--muted #A3A39A  --line #2C2C29  --accent #6FA3F0  --ok #6CC27A
orange #F08A3C  brown #C79562  green #6CC27A  blue #6FA3F0
```
No purple anywhere (the RIPE NCC badges keep their own colours). No gradients,
no shadows, no rounded cards, no borders around records or types. No arrow
symbols (→, ↓ and the like) in text or decoration.

### Type
- Sans: Hanken Grotesk (400/500/700/800/900). Name in 900.
- Mono: Sometype Mono (400/500/700) for record lines, commands, the zone file
  and the randomart.

### Record line
Large mono heading, about `clamp(17px, 4.6vw, 24px)`, always on two rows so
it never breaks in odd places on a phone:
- row 1: fqdn (bold, text colour) with the `verify` button on the right
- row 2: `ttl IN` (muted), TYPE (bold, type colour), rdata (muted; may wrap),
  with the `+`/`−` marker on the right

Every record section starts with a 1px top rule in `--line` and ~28px of
space, so records are clearly separated. Content sits under the record line
behind a 3px left rule in `--line`.

### Layout
- Single column, max-width ~860px, left aligned.
- Phone first: test at 390px. No horizontal scrolling of the page. Tap
  targets ≥ 44px.
- Footer: `Built with Astro, served by GitHub Pages.` and an umbrella icon +
  `DNSSEC by deSEC` linking to https://desec.io (swap for deSEC's official
  logo if available).

## Interactivity

The full portfolio is always in the HTML. JS only enhances; with JS off,
everything is still visible and readable.

0. **Collapsible records.** Each record is a `<details>`/`<summary>`: the
   summary is the two-row record line with a `+`/`−` marker; the content is
   inside. Only the SOA is open by default, so the page reads like a zone
   file. Selecting a type in the guide opens all records of that type.
   An `Open all records` / `Close all records` button sits under the guide.
   The `verify` button stays outside the `<summary>` (no nested buttons).
1. **Guide as filter.** The guide rows are radio-style toggles. Filtering
   works with CSS `:has()` and no JS. The active row gets `--panel`
   background and a 4px inset bar in its type colour.
2. **Zone transfer (bottom).** Panel titled `Take the whole zone with you`
   with a one-line plain explanation, the command
   `$ dig AXFR rangelov.dev @ns1.desec.io`, and a `start transfer` button.
   - At build time, `lib/zonefile.ts` renders `zone.ts` as a valid BIND zone
     file (`$ORIGIN`, `$TTL`, one line per record), served at `/rangelov.dev.zone`.
   - On click, fetch that file and stream its lines into a `<pre>` (~60 ms
     per line), then show `;; XFR size: N records` and a
     `Download rangelov.dev.zone` link (`download` attribute).
   - With `prefers-reduced-motion: reduce`, show the whole file at once.
   - Without JS, the panel is just a plain link to `/rangelov.dev.zone`.
   - deSEC doesn't allow public AXFR; the file is generated, and the panel
     shouldn't claim it came from a live transfer.
3. **Live verify.** A small `verify` button per record. `lib/doh.ts` asks
   Quad9 (`https://dns.quad9.net/dns-query`), then DNS4EU if Quad9 fails, in
   DNS wire format (RFC 8484, GET `?dns=`, DO bit set; both allow CORS). No
   Google: the site is about European infrastructure. Show `✓ live, signed`
   if it resolves with the AD flag, `✓ live` without AD, `not published yet`
   otherwise. The result opens in a
   `<dialog>` (`components/VerifyDialog.astro`): the verdict with a plain
   explanation, the raw answer from the resolver including the RRSIG, whether it
   matches the record on the page (TXT compared with its strings joined, SOA by
   its names only), and the `dig +dnssec` command to check it yourself. The
   result is shown only in the dialog, not under the record. The guide has one
   sentence saying what the verify button does.
4. **Randomart at build time.** In `randomart.ts`, fetch the zone's DNSKEY
   (flag 257) over DoH during the build, SHA-256 the key, and run the
   OpenSSH drunken-bishop walk (17×9 field, same symbols as
   `ssh-keygen -lv`). Frame with `+-----------------+` and `|`, **no labels
   in the frame**. If the fetch fails, use a committed snapshot so the build
   never breaks.

## Accessibility
- Real `<button>`, `<a>`, `<input>`/`<label>`; visible focus outline in accent.
- Text contrast ≥ 4.5:1 in both themes.
- Randomart `<pre role="img" aria-label="Randomart of my DNSSEC key">`.
- Decorative SVGs `aria-hidden="true"`.

## Working rules
- Commit messages: Conventional Commits, subject line only. No body and no
  trailers of any kind (no `Co-Authored-By`, no "generated with").
- Don't add libraries for things that are a few lines of code.
- `zone.ts` and `guide.ts` are the only places content lives.
- Before finishing: `bun run build` passes, the generated zone file is valid
  (`named-checkzone rangelov.dev dist/rangelov.dev.zone` if available), and the
  page works at 390px and 1280px with JS on and off.
