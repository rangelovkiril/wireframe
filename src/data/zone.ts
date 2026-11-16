// Single source of truth for the rangelov.dev portfolio: every DNS record
// shown on the page, the content under it, and what gets published.

export const ORIGIN = "rangelov.dev.";
export const DEFAULT_TTL = 3600;

export type RRType =
  | "SOA"
  | "DNSKEY"
  | "SRV"
  | "CAA"
  | "URI"
  | "CNAME"
  | "TXT"
  | "MX";

export type Rdata =
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
  | { type: "MX"; preference: number; exchange: string };

/**
 * Who manages the record in the real zone:
 * - "desec":      created by deSEC itself (SOA, DNSKEY); display only
 * - "existing":   already in Kiril's dnscontrol config (mail); display only
 * - "dnscontrol": exported by scripts/export-dns.ts
 */
export type Managed = "desec" | "existing" | "dnscontrol";

export interface RR {
  owner: string; // absolute, lowercase, trailing dot
  ttl: number;
  rdata: Rdata;
  managed: Managed;
}

export interface Link {
  label: string;
  href: string;
}

export type Content =
  | { kind: "prose"; title: string; text: string }
  | { kind: "randomart" }
  | { kind: "skills"; title: string; note: string; items: { label: string; weight: number }[] }
  | {
      kind: "certs";
      title: string;
      items: { issuer: string; course: string; when: string; domain: string }[];
    }
  | {
      kind: "project";
      title: string;
      logo?: string; // path under public/
      logoAlt?: string;
      icon?: IconName;
      text: string;
      award?: string;
      links: Link[];
    }
  | { kind: "list"; title: string; items: string[] }
  | { kind: "contact"; title: string; email: string; links: Link[] };

export type IconName = "bus" | "probe" | "satellite" | "nfc-card" | "globe" | "drone";

export type SectionGroup = "soa" | "dnskey" | "srv" | "caa" | "projects" | "awards" | "hobbies" | "plans" | "mx";

export interface Section {
  id: string; // HTML id / anchor
  group: SectionGroup;
  /** The RRset behind the section. The page shows the first record; the zone file has all of them. */
  records: RR[];
  content: Content;
}

const fqdn = (label: string) => (label === "@" ? ORIGIN : `${label}.${ORIGIN}`);

// ---------------------------------------------------------------------------
// SRV: what I work with. The weight is my confidence out of 100.

const skills: { label: string; host: string; weight: number }[] = [
  { label: "Linux", host: "linux", weight: 80 },
  { label: "Containers, Podman", host: "containers", weight: 80 },
  { label: "GitHub and Forgejo Actions", host: "actions", weight: 75 },
  { label: "Kubernetes", host: "kubernetes", weight: 70 },
  { label: "Flux, GitOps", host: "gitops", weight: 70 },
  { label: "DNS", host: "dns", weight: 70 },
  { label: "OpenTofu", host: "opentofu", weight: 60 },
  { label: "TypeScript, Bun", host: "typescript", weight: 55 },
  { label: "BGP", host: "bgp", weight: 50 },
  { label: "Elixir", host: "elixir", weight: 40 },
  { label: "Java", host: "java", weight: 35 },
];

// ---------------------------------------------------------------------------
// CAA: certificates. RFC 2181 §5: identical records in an RRset collapse into
// one, so four bare `0 issue "ripe.net"` records would publish as a single
// record. Each one carries an RFC 8659 parameter to keep it distinct.

const certs: { issuer: string; course: string; when: string; domain: string; param: string }[] = [
  { issuer: "RIPE NCC", course: "LIR Fundamentals", when: "Aug 2026", domain: "ripe.net", param: "lir-fundamentals" },
  { issuer: "RIPE NCC", course: "IPv6 Fundamentals", when: "Aug 2026", domain: "ripe.net", param: "ipv6-fundamentals" },
  { issuer: "RIPE NCC", course: "RIPE Database", when: "RIPE 93, Oct 2026", domain: "ripe.net", param: "ripe-database" },
  { issuer: "RIPE NCC", course: "BGP Security", when: "RIPE 93, Oct 2026", domain: "ripe.net", param: "bgp-security" },
  { issuer: "Cisco", course: "Introduction to Networks", when: "NetAcad", domain: "netacad.com", param: "introduction-to-networks" },
];

// ---------------------------------------------------------------------------

const uri = (label: string, target: string): RR => ({
  owner: fqdn(label),
  ttl: 3600,
  rdata: { type: "URI", priority: 10, weight: 1, target },
  managed: "dnscontrol",
});

export const sections: Section[] = [
  {
    id: "soa",
    group: "soa",
    records: [
      {
        owner: ORIGIN,
        ttl: 3600,
        rdata: {
          type: "SOA",
          mname: "ns1.desec.io.",
          rname: "contact.rangelov.dev.",
          serial: 2026111601,
          // timers as deSEC publishes them
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
    id: "srv",
    group: "srv",
    records: skills.map((s) => ({
      owner: fqdn("_skills._tcp"),
      ttl: 3600,
      rdata: { type: "SRV", priority: 10, weight: s.weight, port: 443, target: fqdn(s.host) },
      managed: "dnscontrol",
    })),
    content: {
      kind: "skills",
      title: "What I work with",
      note: "The SRV weight is my own confidence, out of 100.",
      items: skills.map(({ label, weight }) => ({ label, weight })),
    },
  },
  {
    id: "caa",
    group: "caa",
    records: certs.map((c) => ({
      owner: fqdn("_certs"),
      ttl: 86400,
      rdata: { type: "CAA", flags: 0, tag: "issue", value: `${c.domain}; course=${c.param}` },
      managed: "dnscontrol",
    })),
    content: {
      kind: "certs",
      title: "Certified by",
      items: certs.map(({ issuer, course, when, domain }) => ({ issuer, course, when, domain })),
    },
  },

  // --- projects -------------------------------------------------------------
  {
    id: "protolith",
    group: "projects",
    records: [uri("protolith", "https://codeberg.org/protolith")],
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
    records: [
      {
        owner: fqdn("devops"),
        ttl: 3600,
        rdata: { type: "CNAME", target: "devops.elsys.club." },
        managed: "dnscontrol",
      },
    ],
    content: {
      kind: "project",
      title: "TUES DevOps Club",
      logo: "/logos/devops-club.svg",
      logoAlt: "TUES DevOps Club",
      text:
        "The club I founded and run, plus the elsys.club domain that gives school clubs their own subdomains.",
      links: [{ label: "devops.elsys.club", href: "https://devops.elsys.club" }],
    },
  },
  {
    id: "rampme",
    group: "projects",
    records: [uri("rampme", "https://github.com/rangelovkiril/rampme-software")],
    content: {
      kind: "project",
      title: "RampMe",
      icon: "bus",
      text:
        "Real-time accessibility for Sofia public transport, with wheelchair-ramp requests sent to the vehicle.",
      award: "3rd place at TUES Fest, showcased at Robotics Strategy Forum 2026",
      links: [{ label: "Code on GitHub", href: "https://github.com/rangelovkiril/rampme-software" }],
    },
  },
  {
    id: "atlas",
    group: "projects",
    records: [uri("atlas", "https://codeberg.org/rangelovkiril/ripe-atlas-ports")],
    content: {
      kind: "project",
      title: "RIPE Atlas probe",
      icon: "probe",
      text:
        "Probe 1018643 on a Raspberry Pi 2, and unofficial signed armhf builds of the software probe.",
      links: [
        { label: "ripe-atlas-ports on Codeberg", href: "https://codeberg.org/rangelovkiril/ripe-atlas-ports" },
      ],
    },
  },
  {
    id: "lms",
    group: "projects",
    records: [uri("lms", "https://github.com/rangelovkiril/lms-controller")],
    content: {
      kind: "project",
      title: "LMS",
      icon: "satellite",
      text: "A distributed satellite laser ranging mini-station with a real-time 3D view.",
      award: "TUES Fest, national IT olympiad",
      links: [{ label: "Code on GitHub", href: "https://github.com/rangelovkiril/lms-controller" }],
    },
  },
  {
    id: "card",
    group: "projects",
    records: [
      {
        owner: fqdn("card"),
        ttl: 3600,
        rdata: { type: "CNAME", target: "codeberg.page." },
        managed: "dnscontrol",
      },
    ],
    content: {
      kind: "project",
      title: "NFC business card",
      icon: "nfc-card",
      text:
        "A JavaCard running an NDEF applet. Tap it with a phone and you land on my contact card, served from Codeberg Pages at card.rangelov.dev.",
      links: [{ label: "card.rangelov.dev", href: "https://card.rangelov.dev" }],
    },
  },
  {
    id: "tues-web",
    group: "projects",
    records: [uri("tues-web", "https://codeberg.org/rangelovkiril/tues-website-infra")],
    content: {
      kind: "project",
      title: "TUES website infrastructure",
      icon: "globe",
      text:
        "Infrastructure for a new school website: Terraform on Azure Container Apps with OIDC deploys, plus a scraper that moved about 1,830 records from the old site into Directus. Paused while the school decides what it wants.",
      links: [
        { label: "Infra on Codeberg", href: "https://codeberg.org/rangelovkiril/tues-website-infra" },
      ],
    },
  },
  {
    id: "miget",
    group: "projects",
    records: [
      {
        owner: fqdn("miget"),
        ttl: 3600,
        rdata: { type: "TXT", strings: ["drone detection prototype, EDTH Sofia 2026"] },
        managed: "dnscontrol",
      },
    ],
    content: {
      kind: "project",
      title: "Project M.I.G.E.T.",
      icon: "drone",
      text: "Drone detection prototype from EDTH Sofia 2026. My role was DevOps.",
      links: [],
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
        managed: "dnscontrol",
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
        rdata: { type: "TXT", strings: ["trains", "coffee", "languages", "music"] },
        managed: "dnscontrol",
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
        ttl: 60,
        rdata: { type: "TXT", strings: ["gap-year", "own-asn", "kcna", "fellowship"] },
        managed: "dnscontrol",
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
        "RIPE NCC Fellowship",
      ],
    },
  },

  // --- MX -----------------------------------------------------------------
  {
    id: "mx",
    group: "mx",
    // The real, already-published Proton Mail exchangers.
    records: [
      { owner: ORIGIN, ttl: 3600, rdata: { type: "MX", preference: 10, exchange: "mail.protonmail.ch." }, managed: "existing" },
      { owner: ORIGIN, ttl: 3600, rdata: { type: "MX", preference: 20, exchange: "mailsec.protonmail.ch." }, managed: "existing" },
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

/** Records that belong to the zone but have no section on the page. */
export const extraRecords: RR[] = [
  {
    owner: fqdn("portfolio"),
    ttl: 3600,
    rdata: { type: "CNAME", target: "rangelovkiril.github.io." },
    managed: "dnscontrol",
  },
];

/** Every record, in page order, followed by the extras. */
export const allRecords: RR[] = [...sections.flatMap((s) => s.records), ...extraRecords];
