import type { Rdata } from "../data/zone.ts";

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
