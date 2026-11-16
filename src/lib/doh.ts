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
