// DNS-over-HTTPS (JSON API), usable at build time and in the browser.

const TYPE = { A: 1, AAAA: 28, CNAME: 5, MX: 15, TXT: 16, SOA: 6, SRV: 33, DNSKEY: 48, CAA: 257, URI: 256 } as const;
export type QueryType = keyof typeof TYPE;

export interface DohAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

export interface DohResponse {
  Status: number; // DNS RCODE, 0 = NOERROR
  AD: boolean; // DNSSEC-validated
  Answer?: DohAnswer[];
}

export async function resolve(name: string, type: QueryType, signal?: AbortSignal): Promise<DohResponse> {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}&do=1`;
  const res = await fetch(url, { headers: { accept: "application/dns-json" }, signal });
  if (!res.ok) throw new Error(`DoH ${name} ${type}: HTTP ${res.status}`);
  return (await res.json()) as DohResponse;
}

/** Answer data of the queried type only (CNAMEs along the way are skipped). */
export async function lookup(name: string, type: QueryType, signal?: AbortSignal): Promise<string[]> {
  const r = await resolve(name, type, signal);
  return (r.Answer ?? []).filter((a) => a.type === TYPE[type]).map((a) => a.data);
}

export type Verdict = "signed" | "live" | "missing";

const NAMES: Record<number, string> = { ...Object.fromEntries(Object.entries(TYPE).map(([k, v]) => [v, k])), 46: "RRSIG" };

/**
 * Rdata in a form both sides agree on: dns.google joins the strings of a TXT
 * record, and an SOA is compared by its names only (the serial moves on with
 * every change to the zone).
 */
export function comparable(type: string, data: string): string {
  let d = data.trim().replace(/\s+/g, " ");
  if (type === "TXT" && d.startsWith('"')) {
    d = [...d.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]!.replace(/\\(.)/g, "$1")).join("");
  }
  if (type === "SOA") d = d.split(" ").slice(0, 2).join(" ");
  return d.toLowerCase();
}

export interface Check {
  verdict: Verdict;
  /** The answer, one zone-file line per record, signatures included. */
  lines: string[];
  /** Whether the published RRset is exactly the one given (compared with `comparable`). */
  matches: boolean;
}

/** Look the record up and compare it with what the page shows. */
export async function check(name: string, type: QueryType, expected: string[], signal?: AbortSignal): Promise<Check> {
  const r = await resolve(name, type, signal);
  const answers = r.Answer ?? [];
  const own = answers.filter((a) => a.type === TYPE[type]);
  const verdict: Verdict = r.Status !== 0 || own.length === 0 ? "missing" : r.AD ? "signed" : "live";
  const norm = (xs: string[]) => xs.map((x) => comparable(type, x)).sort().join("\n");
  return {
    verdict,
    // dns.google shuffles an RRset: sort it, signatures last
    lines: [
      ...[...own].sort((a, b) => a.data.localeCompare(b.data, "en", { numeric: true })),
      ...answers.filter((a) => a.type !== TYPE[type]),
    ].map((a) => `${a.name} ${a.TTL} IN ${NAMES[a.type] ?? a.type} ${a.data}`),
    matches: own.length > 0 && norm(own.map((a) => a.data)) === norm(expected),
  };
}
