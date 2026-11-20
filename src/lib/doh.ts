// DNS-over-HTTPS (RFC 8484, DNS wire format), usable at build time and in the
// browser. Quad9 first, DNS4EU if Quad9 does not answer in time: both are
// European, validate DNSSEC and allow requests from a web page (CORS).

export const RESOLVERS = [
  { name: "Quad9", url: "https://dns.quad9.net/dns-query", ip: "9.9.9.9" },
  { name: "DNS4EU", url: "https://unfiltered.joindns4.eu/dns-query", ip: "86.54.11.100" },
] as const;

const TYPE = { A: 1, NS: 2, CNAME: 5, SOA: 6, MX: 15, TXT: 16, AAAA: 28, SRV: 33, RRSIG: 46, DNSKEY: 48, URI: 256, CAA: 257 } as const;
export type QueryType = keyof typeof TYPE;
const NAMES: Record<number, string> = Object.fromEntries(Object.entries(TYPE).map(([k, v]) => [v, k]));

export interface DohAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string; // presentation format, as in a zone file
}

export interface DohResponse {
  Status: number; // DNS RCODE, 0 = NOERROR
  AD: boolean; // DNSSEC-validated by the resolver
  Answer: DohAnswer[];
  server: string; // which resolver answered
}

// --- wire format ---------------------------------------------------------------

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

/** A query with RD set and an EDNS OPT record asking for DNSSEC (DO). ID 0, so it can be cached (RFC 8484 §4.1). */
function query(name: string, type: QueryType): Uint8Array {
  const labels = name.replace(/\.$/, "").split(".").filter(Boolean);
  const qname = labels.flatMap((l) => [l.length, ...new TextEncoder().encode(l)]);
  const t = TYPE[type];
  return new Uint8Array([
    0, 0, 0x01, 0x00, 0, 1, 0, 0, 0, 0, 0, 1, // header: id 0, RD, 1 question, 1 additional
    ...qname, 0, t >> 8, t & 255, 0, 1, // question, class IN
    0, 0, 41, 0x10, 0x00, 0, 0, 0x80, 0, 0, 0, // OPT: root, type 41, udp 4096, DO bit, no options
  ]);
}

class Reader {
  buf: Uint8Array;
  pos = 0;
  constructor(buf: Uint8Array) {
    this.buf = buf;
  }
  u8() {
    return this.buf[this.pos++]!;
  }
  u16() {
    return (this.u8() << 8) | this.u8();
  }
  u32() {
    return this.u16() * 65536 + this.u16();
  }
  bytes(n: number) {
    const b = this.buf.subarray(this.pos, this.pos + n);
    this.pos += n;
    return b;
  }
  /** A domain name, following compression pointers. */
  name(): string {
    const labels: string[] = [];
    let pos = this.pos;
    let jumped = false;
    for (let hops = 0; hops < 64; hops++) {
      const len = this.buf[pos]!;
      if (len === 0) {
        pos++;
        break;
      }
      if ((len & 0xc0) === 0xc0) {
        if (!jumped) this.pos = pos + 2;
        pos = ((len & 0x3f) << 8) | this.buf[pos + 1]!;
        jumped = true;
        continue;
      }
      labels.push(new TextDecoder().decode(this.buf.subarray(pos + 1, pos + 1 + len)));
      pos += 1 + len;
    }
    if (!jumped) this.pos = pos;
    return labels.length ? `${labels.join(".")}.` : ".";
  }
}

/** A <character-string> in presentation format. */
const quoted = (b: Uint8Array) =>
  `"${[...b].map((c) => (c === 34 || c === 92 ? `\\${String.fromCharCode(c)}` : c >= 32 && c < 127 ? String.fromCharCode(c) : `\\${String(c).padStart(3, "0")}`)).join("")}"`;

const stamp = (s: number) => new Date(s * 1000).toISOString().replace(/[-:T]/g, "").slice(0, 14);

/** Rdata in presentation format, for the types this site shows (RFC 3597 form otherwise). */
function rdata(r: Reader, type: number, len: number): string {
  const end = r.pos + len;
  let out: string;
  switch (type) {
    case TYPE.A:
      out = [...r.bytes(4)].join(".");
      break;
    case TYPE.AAAA: {
      const g = Array.from({ length: 8 }, () => r.u16().toString(16));
      out = g.join(":").replace(/(^|:)0(:0)+(:|$)/, "::").replace(/:{3,}/, "::");
      break;
    }
    case TYPE.NS:
    case TYPE.CNAME:
      out = r.name();
      break;
    case TYPE.SOA:
      out = [r.name(), r.name(), r.u32(), r.u32(), r.u32(), r.u32(), r.u32()].join(" ");
      break;
    case TYPE.MX:
      out = `${r.u16()} ${r.name()}`;
      break;
    case TYPE.TXT: {
      const parts: string[] = [];
      while (r.pos < end) parts.push(quoted(r.bytes(r.u8())));
      out = parts.join(" ");
      break;
    }
    case TYPE.DNSKEY:
      out = `${r.u16()} ${r.u8()} ${r.u8()} ${b64(r.bytes(end - r.pos))}`;
      break;
    case TYPE.CAA: {
      const flags = r.u8();
      const tag = new TextDecoder().decode(r.bytes(r.u8()));
      out = `${flags} ${tag} ${quoted(r.bytes(end - r.pos))}`;
      break;
    }
    case TYPE.RRSIG: {
      const covered = r.u16();
      const head = [NAMES[covered] ?? `TYPE${covered}`, r.u8(), r.u8(), r.u32(), stamp(r.u32()), stamp(r.u32()), r.u16()];
      out = [...head, r.name(), b64(r.bytes(end - r.pos))].join(" ");
      break;
    }
    default:
      out = `\\# ${len} ${[...r.bytes(len)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
  }
  r.pos = end;
  return out;
}

function parse(buf: Uint8Array, server: string): DohResponse {
  const r = new Reader(buf);
  r.u16(); // id
  const flags = r.u16();
  const [qd, an] = [r.u16(), r.u16()];
  r.u16(); // authority
  r.u16(); // additional
  for (let i = 0; i < qd; i++) {
    r.name();
    r.pos += 4;
  }
  const Answer: DohAnswer[] = [];
  for (let i = 0; i < an; i++) {
    const name = r.name();
    const type = r.u16();
    r.u16(); // class
    const TTL = r.u32();
    Answer.push({ name, type, TTL, data: rdata(r, type, r.u16()) });
  }
  return { Status: flags & 0x0f, AD: (flags & 0x0020) !== 0, Answer, server };
}

const PER_RESOLVER_MS = 4000; // a slow resolver must leave time for the next one

/** Ask the resolvers in turn; the first one that answers wins. */
export async function resolve(name: string, type: QueryType, signal?: AbortSignal): Promise<DohResponse> {
  let last: unknown;
  for (const server of RESOLVERS) {
    try {
      const res = await fetch(`${server.url}?dns=${b64url(query(name, type))}`, {
        headers: { accept: "application/dns-message" },
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(PER_RESOLVER_MS)]) : AbortSignal.timeout(PER_RESOLVER_MS),
      });
      if (!res.ok) throw new Error(`${server.name}: HTTP ${res.status}`);
      return parse(new Uint8Array(await res.arrayBuffer()), server.name);
    } catch (e) {
      if (signal?.aborted) throw e;
      last = e;
    }
  }
  throw last;
}

/** Answer data of the queried type only (CNAMEs along the way are skipped). */
export async function lookup(name: string, type: QueryType, signal?: AbortSignal): Promise<string[]> {
  const r = await resolve(name, type, signal);
  return r.Answer.filter((a) => a.type === TYPE[type]).map((a) => a.data);
}

// --- comparing with the page -----------------------------------------------------

export type Verdict = "signed" | "live" | "missing";

/**
 * Rdata in a form both sides agree on: TXT by its strings joined, and an SOA
 * by its names only (the serial moves on with every change to the zone).
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
  server: string;
  /** The answer, one zone-file line per record, signatures included. */
  lines: string[];
  /** Whether the published RRset is exactly the one given (compared with `comparable`). */
  matches: boolean;
}

/** Look the record up and compare it with what the page shows. */
export async function check(name: string, type: QueryType, expected: string[], signal?: AbortSignal): Promise<Check> {
  const r = await resolve(name, type, signal);
  const own = r.Answer.filter((a) => a.type === TYPE[type]);
  const verdict: Verdict = r.Status !== 0 || own.length === 0 ? "missing" : r.AD ? "signed" : "live";
  const norm = (xs: string[]) => xs.map((x) => comparable(type, x)).sort().join("\n");
  return {
    verdict,
    server: r.server,
    // sorted RRset, signatures last
    lines: [
      ...[...own].sort((a, b) => a.data.localeCompare(b.data, "en", { numeric: true })),
      ...r.Answer.filter((a) => a.type !== TYPE[type]),
    ].map((a) => `${a.name} ${a.TTL} IN ${NAMES[a.type] ?? a.type} ${a.data}`),
    matches: own.length > 0 && norm(own.map((a) => a.data)) === norm(expected),
  };
}
