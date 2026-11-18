// Single source of truth for the rangelov.dev portfolio: every DNS record
// shown on the page, the content under it, and what gets published.

export const ORIGIN = "rangelov.dev.";
export const DEFAULT_TTL = 3600;

export const profile = {
  name: "Kiril Rangelov",
  tagline: "Student. I build platforms and dig into how the internet works.",
  intro: "I care about how things work underneath, so I introduce myself through my own DNS zone.",
};

export const transfer = {
  title: "Take the whole zone with you",
  text: "The whole rangelov.dev zone in one file, in the format name servers load. It is generated when the site is built: deSEC does not allow public zone transfers.",
  command: "$ dig AXFR rangelov.dev @ns1.desec.io",
  start: "start transfer",
  download: "Download rangelov.dev.zone",
  file: "/rangelov.dev.zone",
  size: ";; XFR size: {n} records",
  failed: ";; transfer failed, download the file instead",
};

export const notFound = {
  title: "NXDOMAIN · Kiril Rangelov",
  header: ";; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN",
  text: "This name does not exist in the rangelov.dev zone.",
  back: "Back to the zone",
};

export const footer = {
  built: "Built with Astro, served by GitHub Pages.",
  dnssec: { label: "DNSSEC by deSEC", href: "https://desec.io" },
};

export type RRType =
  | "A"
  | "AAAA"
  | "SOA"
  | "DNSKEY"
  | "SRV"
  | "CAA"
  | "URI"
  | "CNAME"
  | "TXT"
  | "MX"
  | "NS";

export type Rdata =
  | { type: "A"; address: string }
  | { type: "AAAA"; address: string }
  | {
      type: "SOA";
      mname: string;
      rname: string;
      serial: number;
      refresh: number;
      retry: number;
      expire: number;
      minimum: number;
    }
  | { type: "DNSKEY"; flags: number; protocol: number; algorithm: number; key: string }
  | { type: "SRV"; priority: number; weight: number; port: number; target: string }
  | { type: "CAA"; flags: number; tag: "issue" | "issuewild" | "iodef"; value: string }
  | { type: "URI"; priority: number; weight: number; target: string }
  | { type: "CNAME"; target: string }
  | { type: "TXT"; strings: string[] }
  | { type: "MX"; preference: number; exchange: string }
  | { type: "NS"; target: string };

/**
 * Who manages the record in the real zone:
 * - "desec":     created by deSEC itself (SOA, DNSKEY); display only, never exported
 * - "infra":     the rest of the zone (mail, Pages, hedgedoc); exported, stays when the portfolio is archived
 * - "portfolio": exists only for this site; exported as one block that can be deleted on archive
 */
export type Managed = "desec" | "infra" | "portfolio";

export interface RR {
  owner: string; // absolute, lowercase, trailing dot
  ttl: number;
  rdata: Rdata;
  managed: Managed;
  /** A/AAAA copied from this name's addresses (deSEC has no ALIAS). export-dns checks they still match. */
  copyOf?: string;
  /** Shown after the record in the zone file. */
  comment?: string;
}

export interface Link {
  label: string;
  href: string;
}

export type Content =
  | { kind: "prose"; title: string; text: string }
  | { kind: "randomart" }
  | {
      kind: "certs";
      title: string;
      items: { issuer: string; course: string; when: string; domain: string; badge?: string }[];
    }
  | {
      kind: "project";
      title: string;
      logo?: string; // path under public/
      logoDark?: string; // variant for the dark theme
      logoAsset?: string; // raster logo in assets/logos/, optimised at build time
      logoAlt?: string;
      icon?: IconName;
      text: string;
      award?: string;
      links: Link[];
    }
  | { kind: "list"; title: string; items: string[] }
  | { kind: "contact"; title: string; email: string; links: Link[] };

export type IconName = "ramp-bus" | "probe" | "package" | "satellite" | "nfc-card" | "globe";

export type SectionGroup = "soa" | "dnskey" | "caa" | "projects" | "awards" | "hobbies" | "plans" | "mx";

export interface Section {
  id: string; // HTML id / anchor
  group: SectionGroup;
  /** The RRset behind the section. The page shows the first record; the zone file has all of them. */
  records: RR[];
  content: Content;
}

const fqdn = (label: string) => (label === "@" ? ORIGIN : `${label}.${ORIGIN}`);

const VCARD_REPO = "https://codeberg.org/rangelovkiril/contactless-vcard.git";

// ---------------------------------------------------------------------------
// CAA: one record per issuer (the issuing organisation's domain), the
// certificates themselves are listed on the page. Cisco's course badge comes
// from the Networking Academy, so netacad.com rather than cisco.com, which
// would read like a Cisco certification.
//
// badge: file in assets/badges/. RIPE NCC Academy badges may be shown, unmodified,
// while the certificate is valid (three years; terms and conditions, Art. 8 and 11).
const certs: { issuer: string; course: string; when: string; domain: string; badge?: string }[] = [
  { issuer: "RIPE NCC", course: "LIR Fundamentals", when: "Aug 2026", domain: "ripe.net", badge: "lir-fundamentals.png" },
  { issuer: "RIPE NCC", course: "IPv6 Fundamentals", when: "Aug 2026", domain: "ripe.net", badge: "ipv6-fundamentals.png" },
  { issuer: "RIPE NCC", course: "RIPE Database", when: "RIPE 93, Oct 2026", domain: "ripe.net", badge: "ripe-database.png" },
  { issuer: "RIPE NCC", course: "BGP Security", when: "RIPE 93, Oct 2026", domain: "ripe.net", badge: "bgp-security.png" },
  { issuer: "Cisco", course: "Introduction to Networks", when: "NetAcad", domain: "netacad.com" },
];
const issuers = [...new Set(certs.map((c) => c.domain))];

// ---------------------------------------------------------------------------

// A CNAME can only name a host, so a project points at the host its source or
// site lives on; the full address is the link on the page.
const cname = (label: string, target: string): RR => ({
  owner: fqdn(label),
  ttl: 3600,
  rdata: { type: "CNAME", target },
  managed: "portfolio",
});

export const sections: Section[] = [
  {
    id: "soa",
    group: "soa",
    records: [
      {
        owner: ORIGIN,
        ttl: 300,
        // As deSEC publishes it. The page shows mname, rname and serial; the
        // zone file needs the timers too.
        rdata: {
          type: "SOA",
          mname: "get.desec.io.",
          rname: "get.desec.io.",
          serial: 2026113469,
          refresh: 86400,
          retry: 3600,
          expire: 2419200,
          minimum: 3600,
        },
        managed: "desec",
      },
    ],
    content: {
      kind: "prose",
      title: "Who I am",
      text:
        "I study at TUES (Technology School \"Electronic Systems\") in Sofia and I'm a diploma student at ITGix, a DevOps company. " +
        "Most of my work is platform engineering: GitOps, Kubernetes, CI/CD and software supply-chain security, with a soft spot for digital sovereignty. " +
        "This domain runs on European infrastructure, registered at INWX with DNS at deSEC. " +
        "Since RIPE 93 I'm also deep into DNS, IPv6 and BGP, and I run the school's DevOps club.",
    },
  },
  {
    id: "dnskey",
    group: "dnskey",
    records: [
      {
        owner: ORIGIN,
        ttl: 3600,
        // Snapshot of the KSK (flag 257). The build re-fetches it over DoH and
        // falls back to this value if the fetch fails.
        rdata: {
          type: "DNSKEY",
          flags: 257,
          protocol: 3,
          algorithm: 13,
          key: "ulV4LGNcvUPt/3eDd6MkFaPKAc/z6MS/dDoTrBJJrbQxdJwzE2wCntLPW+ygiP63Av44IbTer12zawcrJSSyvg==",
        },
        managed: "desec",
      },
    ],
    content: { kind: "randomart" },
  },
  {
    id: "caa",
    group: "caa",
    records: issuers.map((domain) => ({
      owner: fqdn("_certs"),
      ttl: 86400,
      rdata: { type: "CAA", flags: 0, tag: "issue", value: domain },
      managed: "portfolio",
    })),
    content: {
      kind: "certs",
      title: "Certified by",
      items: certs.map(({ issuer, course, when, domain, badge }) => ({ issuer, course, when, domain, badge })),
    },
  },

  // --- projects -------------------------------------------------------------
  {
    id: "protolith",
    group: "projects",
    records: [cname("protolith", "codeberg.org.")],
    content: {
      kind: "project",
      title: "Protolith",
      logo: "/logos/protolith.svg",
      logoAlt: "Protolith logo",
      text:
        "A sovereign DevOps platform built from free software (Forgejo, Harbor, OpenBao), with SLSA Build L3 compatible builds, running on European cloud. My diploma thesis.",
      links: [{ label: "Protolith on Codeberg", href: "https://codeberg.org/protolith" }],
    },
  },
  {
    id: "devops",
    group: "projects",
    records: [cname("devops", "devops.elsys.club.")],
    content: {
      kind: "project",
      title: "TUES DevOps Club",
      logo: "/logos/devops-club.svg",
      logoDark: "/logos/devops-club-dark.svg",
      logoAlt: "TUES DevOps Club",
      text:
        "The club I founded and run, plus the elsys.club domain that gives school clubs their own subdomains.",
      links: [{ label: "devops.elsys.club", href: "https://devops.elsys.club" }],
    },
  },
  {
    id: "rampme",
    group: "projects",
    records: [cname("rampme", "github.com.")],
    content: {
      kind: "project",
      title: "RampMe",
      icon: "ramp-bus",
      text:
        "Real-time accessibility for Sofia public transport, with wheelchair-ramp requests sent to the vehicle.",
      award: "3rd place at TUES Fest, showcased at Robotics Strategy Forum 2026",
      links: [{ label: "Code on GitHub", href: "https://github.com/rangelovkiril/rampme-software" }],
    },
  },
  {
    id: "atlas",
    group: "projects",
    records: [cname("atlas", "atlas.ripe.net.")],
    content: {
      kind: "project",
      title: "RIPE Atlas probe",
      icon: "probe",
      text: "I host RIPE Atlas probe 1018643 on a Raspberry Pi 2 and use RIPE Atlas for my own measurements.",
      links: [{ label: "Probe 1018643 on RIPE Atlas", href: "https://atlas.ripe.net/probes/1018643/" }],
    },
  },
  {
    id: "atlas-ports",
    group: "projects",
    records: [cname("atlas-ports", "codeberg.org.")],
    content: {
      kind: "project",
      title: "RIPE Atlas ports",
      icon: "package",
      text:
        "Unofficial armhf builds of the RIPE Atlas software probe, rebuilt automatically from upstream and published as a signed apt repository.",
      links: [{ label: "Source on Codeberg", href: "https://codeberg.org/rangelovkiril/ripe-atlas-ports" }],
    },
  },
  {
    id: "lms",
    group: "projects",
    records: [cname("lms", "github.com.")],
    content: {
      kind: "project",
      title: "Light My Satellite (LMS)",
      logoAsset: "lms.png",
      logoAlt: "LMS logo",
      text: "A distributed satellite laser ranging mini-station with a real-time 3D view.",
      award: "TUES Fest, national IT olympiad",
      links: [{ label: "Code on GitHub", href: "https://github.com/rangelovkiril/lms-controller" }],
    },
  },
  {
    id: "card",
    group: "projects",
    // Codeberg Pages serves this repository at the apex (A/AAAA in extraRecords).
    records: [
      {
        owner: fqdn("_git-pages-repository"),
        ttl: 3600,
        rdata: { type: "TXT", strings: [VCARD_REPO] },
        managed: "infra", // the card itself, not just this site
      },
    ],
    content: {
      kind: "project",
      title: "NFC business card",
      icon: "nfc-card",
      text:
        "A JavaCard running an NDEF applet. Tap it with a phone and you land on my contact card, served from Codeberg Pages at rangelov.dev.",
      links: [{ label: "rangelov.dev", href: "https://rangelov.dev" }],
    },
  },
  {
    id: "tues-web",
    group: "projects",
    records: [cname("tues-web", "elsys.website.")],
    content: {
      kind: "project",
      title: "TUES website infrastructure",
      icon: "globe",
      text:
        "A proposal, not an official school project: infrastructure for a new school website. It started as a k3s cluster and moved to Terraform on Azure Container Apps with OIDC deploys, plus a scraper that moved about 1,830 records from the old site into Directus. Paused while the school decides what it wants.",
      links: [
        { label: "k3s setup on Codeberg", href: "https://codeberg.org/rangelovkiril/tues-website-infra" },
        { label: "Azure setup on GitHub", href: "https://github.com/TUES-2026-PBL-11-klas/websaitut-infra" },
      ],
    },
  },
  // --- TXT ----------------------------------------------------------------
  {
    id: "awards",
    group: "awards",
    records: [
      {
        owner: fqdn("_awards"),
        ttl: 86400,
        rdata: { type: "TXT", strings: ["3rd place, TUES Fest"] },
        managed: "portfolio",
      },
    ],
    content: {
      kind: "list",
      title: "Proud of",
      items: [
        "3rd place at TUES Fest with RampMe",
        "Four RIPE NCC certifications in 2026",
        "Founded the TUES DevOps Club, about 40 members",
        "Spoke at the mic in the RIPE 93 Security Working Group",
        "Proposed my own diploma topic, which rarely happens at TUES",
      ],
    },
  },
  {
    id: "hobbies",
    group: "hobbies",
    records: [
      {
        owner: fqdn("_hobbies"),
        ttl: 3600,
        rdata: { type: "TXT", strings: ["trains, coffee, languages, music"] },
        managed: "portfolio",
      },
    ],
    content: {
      kind: "list",
      title: "Off duty",
      items: [
        "Train trips across Bulgaria",
        "Specialty coffee and Arabic sweets",
        "A NetBSD netbook kept as a terminal-only playground",
        "Languages: Bulgarian, English, Russian; learning Arabic and French",
        "Music from Bach to Balkan pop-folk",
      ],
    },
  },
  {
    id: "plans",
    group: "plans",
    records: [
      {
        owner: fqdn("_plans"),
        ttl: 900,
        rdata: { type: "TXT", strings: ["gap-year, own-asn, kcna"] },
        managed: "portfolio",
      },
    ],
    content: {
      kind: "list",
      title: "Next",
      items: [
        "A gap year to explore before specialising",
        "My own ASN and IPv6 space over BGP, after the thesis",
        "A small home server",
        "KCNA",
      ],
    },
  },

  // --- MX -----------------------------------------------------------------
  {
    id: "mx",
    group: "mx",
    // Proton Mail, the reason contact@rangelov.dev works.
    records: [
      { owner: ORIGIN, ttl: 3600, rdata: { type: "MX", preference: 10, exchange: "mail.protonmail.ch." }, managed: "infra" },
      { owner: ORIGIN, ttl: 3600, rdata: { type: "MX", preference: 20, exchange: "mailsec.protonmail.ch." }, managed: "infra" },
    ],
    content: {
      kind: "contact",
      title: "Get in touch",
      email: "contact@rangelov.dev",
      links: [
        { label: "Codeberg", href: "https://codeberg.org/rangelovkiril" },
        { label: "GitHub", href: "https://github.com/rangelovkiril" },
        { label: "LinkedIn", href: "https://www.linkedin.com/in/rangelovkiril" },
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Records that belong to the zone but have no section on the page.

const infra = (label: string, rdata: Rdata, ttl = DEFAULT_TTL): RR => ({ owner: fqdn(label), ttl, rdata, managed: "infra" });
const PROTON_DKIM = "domainkey.dkjpwfn5mnmkeczsyz2abjd4idelvbc7qaebbbszhc75nh54k4e5q.domains.proton.ch.";
export const extraRecords: RR[] = [
  // deSEC's name servers
  { owner: ORIGIN, ttl: 900, rdata: { type: "NS", target: "ns1.desec.io." }, managed: "desec" },
  { owner: ORIGIN, ttl: 900, rdata: { type: "NS", target: "ns2.desec.org." }, managed: "desec" },

  // GitHub Pages: this site
  {
    owner: fqdn("portfolio"),
    ttl: 3600,
    rdata: { type: "CNAME", target: "rangelovkiril.github.io." },
    managed: "portfolio",
  },
  // GitHub Pages domain verification for the account: no other GitHub account
  // can take over rangelov.dev or any subdomain of it.
  infra("_github-pages-challenge-rangelovkiril", { type: "TXT", strings: ["7a8af9eb2030e6f6c99d4f252e8b9c"] }),

  // Proton Mail (the MX records are the MX section above)
  infra("@", { type: "TXT", strings: ["v=spf1 include:_spf.protonmail.ch ~all"] }),
  infra("@", { type: "TXT", strings: ["protonmail-verification=1554c8c567c39ca28c9d28989d8469deaf895b01"] }),
  infra("protonmail._domainkey", { type: "CNAME", target: `protonmail.${PROTON_DKIM}` }),
  infra("protonmail2._domainkey", { type: "CNAME", target: `protonmail2.${PROTON_DKIM}` }),
  infra("protonmail3._domainkey", { type: "CNAME", target: `protonmail3.${PROTON_DKIM}` }),
  infra("_dmarc", { type: "TXT", strings: ["v=DMARC1; p=quarantine"] }),

  // Codeberg Pages at the apex: the NFC card (the _git-pages-repository TXT is
  // the card project above). deSEC has no ALIAS/CNAME flattening, so the
  // addresses of codeberg.page are copied here and checked on every export.
  { ...infra("@", { type: "A", address: "217.197.84.141" }), copyOf: "codeberg.page." },
  { ...infra("@", { type: "AAAA", address: "2a0a:4580:103f:c0de::2" }), copyOf: "codeberg.page." },
  infra("_git-pages-repository.card", { type: "TXT", strings: [VCARD_REPO] }),

  // HedgeDoc
  infra("hedgedoc", { type: "A", address: "57.131.192.218" }),
  infra("hedgedoc", { type: "AAAA", address: "2001:41d0:601:1100::a392" }),
  infra("hedgedoc", { type: "CAA", flags: 0, tag: "issue", value: "letsencrypt.org; validationmethods=tls-alpn-01" }),
  infra("hedgedoc", { type: "CAA", flags: 0, tag: "issuewild", value: ";" }),
];

/** Every record, in page order, followed by the extras. */
export const allRecords: RR[] = [...sections.flatMap((s) => s.records), ...extraRecords];
