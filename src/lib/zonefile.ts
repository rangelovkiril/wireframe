import { DEFAULT_TTL, ORIGIN, type Rdata, type RR } from "../data/zone.ts";

/** RFC 1035 <character-string> in presentation format. */
export const quote = (s: string) => `"${s.replace(/[\\"]/g, (c) => `\\${c}`)}"`;

/** Rdata exactly as it appears in a BIND zone file. */
export function formatRdata(r: Rdata): string {
  switch (r.type) {
    case "A":
    case "AAAA":
      return r.address;
    case "SOA":
      return `${r.mname} ${r.rname} ${r.serial} ${r.refresh} ${r.retry} ${r.expire} ${r.minimum}`;
    case "DNSKEY":
      return `${r.flags} ${r.protocol} ${r.algorithm} ${r.key}`;
    case "SRV":
      return `${r.priority} ${r.weight} ${r.port} ${r.target}`;
    case "CAA":
      return `${r.flags} ${r.tag} ${quote(r.value)}`;
    case "URI":
      return `${r.priority} ${r.weight} ${quote(r.target)}`;
    case "CNAME":
    case "NS":
      return r.target;
    case "TXT":
      return r.strings.map(quote).join(" ");
    case "MX":
      return `${r.preference} ${r.exchange}`;
  }
}

/** Rdata as printed in the record line on the page: SOA without its timers, DNSKEY without the key. */
export function displayRdata(r: Rdata): string {
  switch (r.type) {
    case "SOA":
      return `${r.mname} ${r.rname} ${r.serial}`;
    case "DNSKEY":
      return `${r.flags} ${r.protocol} ${r.algorithm} ( … )`;
    default:
      return formatRdata(r);
  }
}

/** The records as a BIND zone file: SOA first, then NS, then everything else in page order. */
export function renderZone(records: RR[]): string {
  const rank = (r: RR) => (r.rdata.type === "SOA" ? 0 : r.rdata.type === "NS" ? 1 : 2);
  const ordered = [...records].sort((a, b) => rank(a) - rank(b)); // stable: page order kept within a rank
  const width = (f: (r: RR) => string) => Math.max(...ordered.map((r) => f(r).length));
  const ow = width((r) => r.owner);
  const tw = width((r) => String(r.ttl));
  const yw = width((r) => r.rdata.type);
  return [
    `; ${ORIGIN.slice(0, -1)}, generated from the portfolio's data when the site was built.`,
    "; Not a live transfer: deSEC does not allow AXFR.",
    `$ORIGIN ${ORIGIN}`,
    `$TTL ${DEFAULT_TTL}`,
    ...ordered.map(
      (r) =>
        `${r.owner.padEnd(ow)} ${String(r.ttl).padStart(tw)} IN ${r.rdata.type.padEnd(yw)} ${formatRdata(r.rdata)}` +
        (r.comment ? ` ; ${r.comment}` : ""),
    ),
    "",
  ].join("\n");
}
