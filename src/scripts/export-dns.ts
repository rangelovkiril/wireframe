// Reads data/zone.ts and writes the whole rangelov.dev zone as:
//   dns/dnsconfig.js  complete dnscontrol config, one file
//   dns/records.json  the same records as deSEC-style RRsets
//
// SOA and DNSKEY belong to deSEC and are never exported. Portfolio-only
// records are written as one block, so archiving the site means deleting it.
// This script never talks to deSEC or runs dnscontrol.

import { allRecords, DEFAULT_TTL, ORIGIN, type Managed, type Rdata, type RR } from "../data/zone.ts";
import { lookup } from "../lib/doh.ts";
import { formatRdata } from "../lib/zonefile.ts";

const MIN_TTL = 900; // deSEC minimum_ttl for rangelov.dev

type Published = Rdata & { type: Exclude<Rdata["type"], "URI" | "SOA" | "DNSKEY"> };
interface Out {
  owner: string;
  ttl: number;
  managed: Managed;
  rdata: Published;
  uri?: string; // original URI rdata, when published as TXT
  copyOf?: string;
}

// dnscontrol has no URI record type, so a URI is published as a TXT record
// holding the same URL.
const out: Out[] = allRecords
  .filter((r) => r.managed !== "desec")
  .map((r: RR) => {
    const d = r.rdata;
    if (d.type === "SOA" || d.type === "DNSKEY") throw new Error(`${r.owner} ${d.type} is deSEC's, mark it managed: "desec"`);
    if (d.type === "URI") return { ...r, rdata: { type: "TXT", strings: [d.target] }, uri: formatRdata(d) };
    return { ...r, rdata: d };
  });

// --- validation --------------------------------------------------------------

const bytes = (s: string) => new TextEncoder().encode(s).length;
const rrset = (r: Out) => `${r.owner} ${r.rdata.type}`;
const errors: string[] = [];
const seen = new Set<string>();
const ttls = new Map<string, number>();

for (const r of out) {
  const d = r.rdata;
  const where = rrset(r);
  if (r.owner !== r.owner.toLowerCase()) errors.push(`${where}: owner must be lowercase`);
  if (!r.owner.endsWith(ORIGIN)) errors.push(`${where}: owner outside ${ORIGIN}`);
  if (r.ttl < MIN_TTL) errors.push(`${where}: TTL ${r.ttl} is below deSEC's minimum of ${MIN_TTL}`);
  if (d.type === "TXT") for (const s of d.strings) if (bytes(s) > 255) errors.push(`${where}: TXT string over 255 bytes`);
  if ((d.type === "CNAME" || d.type === "SRV") && !d.target.endsWith(".")) errors.push(`${where}: target must be absolute`);
  if (d.type === "MX" && !d.exchange.endsWith(".")) errors.push(`${where}: exchange must be absolute`);

  // Identical records in an RRset collapse into one (RFC 2181 §5).
  const key = `${where} ${formatRdata(d)}`;
  if (seen.has(key)) errors.push(`duplicate record: ${key}`);
  seen.add(key);

  const ttl = ttls.get(where);
  if (ttl !== undefined && ttl !== r.ttl) errors.push(`${where}: mixed TTLs in one RRset`);
  ttls.set(where, r.ttl);
}

// A CNAME owner can have no other data (RFC 1034 §3.6.2).
for (const c of out.filter((r) => r.rdata.type === "CNAME")) {
  if (out.some((r) => r !== c && r.owner === c.owner)) errors.push(`${c.owner}: CNAME next to other records`);
}

// Flattened A/AAAA must still match the name they copy.
const copies = new Map<string, { name: string; type: "A" | "AAAA"; have: string[] }>();
for (const r of out) {
  const d = r.rdata;
  if (!r.copyOf || (d.type !== "A" && d.type !== "AAAA")) continue;
  const key = `${r.owner} ${d.type} ${r.copyOf}`;
  const c = copies.get(key) ?? { name: r.copyOf, type: d.type, have: [] };
  c.have.push(d.address.toLowerCase());
  copies.set(key, c);
}
for (const [key, c] of copies) {
  try {
    const live = (await lookup(c.name, c.type)).map((a) => a.toLowerCase()).sort();
    if (live.join() !== c.have.sort().join()) {
      errors.push(`${key}: ${c.name} now has ${c.type} ${live.join(", ") || "(none)"}; update data/zone.ts`);
    }
  } catch (e) {
    console.warn(`warning: could not check ${key} (${(e as Error).message})`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

// --- helpers -----------------------------------------------------------------

const subname = (owner: string) => (owner === ORIGIN ? "" : owner.slice(0, -(ORIGIN.length + 1)));
const js = (v: unknown) => JSON.stringify(v);

function dnscontrol(r: Out): string {
  const name = js(subname(r.owner) || "@");
  const ttl = r.ttl === DEFAULT_TTL ? "" : `, TTL(${r.ttl})`;
  const d = r.rdata;
  switch (d.type) {
    case "A":
    case "AAAA":
      return `${d.type}(${name}, ${js(d.address)}${ttl})`;
    case "SRV":
      return `SRV(${name}, ${d.priority}, ${d.weight}, ${d.port}, ${js(d.target)}${ttl})`;
    case "CAA":
      return `CAA(${name}, ${js(d.tag)}, ${js(d.value)}${ttl})`;
    case "CNAME":
      return `CNAME(${name}, ${js(d.target)}${ttl})`;
    case "TXT":
      return `TXT(${name}, ${js(d.strings.length === 1 ? d.strings[0] : d.strings)}${ttl})`;
    case "MX":
      return `MX(${name}, ${d.preference}, ${js(d.exchange)}${ttl})`;
  }
}

function block(records: Out[]): string[] {
  const lines: string[] = [];
  let last = "";
  for (const r of records) {
    const key = rrset(r);
    if (key !== last) {
      const what = r.uri ? `URI ${r.uri}` : r.copyOf ? `${r.rdata.type}, copy of ${r.copyOf} (no ALIAS at deSEC)` : r.rdata.type;
      lines.push(`\t// ${r.owner} ${what}`);
    }
    last = key;
    lines.push(`\t${dnscontrol(r)},`);
  }
  return lines;
}

// --- dns/dnsconfig.js --------------------------------------------------------

const config = [
  "// Generated by scripts/export-dns.ts from data/zone.ts. Do not edit by hand.",
  "// The whole rangelov.dev zone except SOA and DNSKEY, which deSEC manages.",
  "//",
  "//   dnscontrol preview --config dns/dnsconfig.js --creds ~/creds.json",
  "//",
  "// dnscontrol has no URI record type: URI records are published as TXT",
  "// records holding the same URL.",
  "",
  'var REG_NONE = NewRegistrar("none");',
  'var DSP_DESEC = NewDnsProvider("desec");',
  "",
  `D("${ORIGIN.slice(0, -1)}", REG_NONE,`,
  "\tDnsProvider(DSP_DESEC),",
  `\tDefaultTTL(${DEFAULT_TTL}),`,
  "",
  ...block(out.filter((r) => r.managed === "infra")),
  "",
  "\t// === portfolio.rangelov.dev: delete from here to END when the site is archived ===",
  ...block(out.filter((r) => r.managed === "portfolio")),
  "END);",
  "",
];

const dir = new URL("../dns/", import.meta.url);
await Bun.write(new URL("dnsconfig.js", dir), config.join("\n"));

// --- dns/records.json --------------------------------------------------------

const sets = new Map<string, { subname: string; type: string; ttl: number; records: string[] }>();
for (const r of out) {
  const key = rrset(r);
  const set = sets.get(key) ?? { subname: subname(r.owner), type: r.rdata.type, ttl: r.ttl, records: [] };
  set.records.push(formatRdata(r.rdata));
  sets.set(key, set);
}
await Bun.write(new URL("records.json", dir), JSON.stringify([...sets.values()], null, 2) + "\n");

console.log(`exported ${out.length} records in ${sets.size} RRsets to dns/dnsconfig.js and dns/records.json`);
