// Build time: replace the SOA and DNSKEY snapshots in data/zone.ts with what
// the zone publishes right now, fetched over DoH. If the fetch fails or the
// answer is not DNSSEC-validated, the committed snapshots are used, so the
// build never breaks.

import { allRecords, ORIGIN, sections, type Rdata, type RR, type Section } from "../data/zone.ts";
import { resolve } from "./doh.ts";

type Soa = Extract<Rdata, { type: "SOA" }>;
type Dnskey = Extract<Rdata, { type: "DNSKEY" }>;
interface Live {
  soa?: Soa;
  dnskey?: Dnskey;
}

function parseSoa(data: string): Soa | undefined {
  const [mname, rname, ...n] = data.split(/\s+/);
  const nums = n.map(Number);
  if (!mname || !rname || nums.length !== 5 || nums.some(Number.isNaN)) return undefined;
  const [serial, refresh, retry, expire, minimum] = nums as [number, number, number, number, number];
  return { type: "SOA", mname, rname, serial, refresh, retry, expire, minimum };
}

function parseDnskey(data: string): Dnskey | undefined {
  const [flags, protocol, algorithm, ...key] = data.split(/\s+/);
  if (flags !== "257" || !protocol || !algorithm || key.length === 0) return undefined;
  return { type: "DNSKEY", flags: 257, protocol: Number(protocol), algorithm: Number(algorithm), key: key.join("") };
}

async function fetchLive(): Promise<Live> {
  try {
    const signal = AbortSignal.timeout(8000);
    const [soa, key] = await Promise.all([resolve(ORIGIN, "SOA", signal), resolve(ORIGIN, "DNSKEY", signal)]);
    if (!soa.AD || !key.AD) throw new Error("answer not DNSSEC-validated (AD=0)");
    const live: Live = {
      soa: soa.Answer?.map((a) => (a.type === 6 ? parseSoa(a.data) : undefined)).find(Boolean),
      dnskey: key.Answer?.map((a) => (a.type === 48 ? parseDnskey(a.data) : undefined)).find(Boolean),
    };
    const snapshot = allRecords.find((r) => r.rdata.type === "DNSKEY")?.rdata as Dnskey | undefined;
    if (live.dnskey && snapshot && live.dnskey.key !== snapshot.key) {
      console.warn("[live] the published DNSKEY differs from the snapshot in data/zone.ts; update the snapshot");
    }
    console.log(`[live] SOA serial ${live.soa?.serial ?? "(snapshot)"}, DNSKEY ${live.dnskey ? "fetched" : "(snapshot)"}`);
    return live;
  } catch (e) {
    console.warn(`[live] using the snapshots in data/zone.ts: ${(e as Error).message}`);
    return {};
  }
}

let cached: Promise<Live> | undefined;
const getLive = () => (cached ??= fetchLive());

const patch = (r: RR, live: Live): RR =>
  r.rdata.type === "SOA" && live.soa
    ? { ...r, rdata: live.soa }
    : r.rdata.type === "DNSKEY" && live.dnskey
      ? { ...r, rdata: live.dnskey }
      : r;

export async function liveSections(): Promise<Section[]> {
  const live = await getLive();
  return sections.map((s) => ({ ...s, records: s.records.map((r) => patch(r, live)) }));
}

export async function liveRecords(): Promise<RR[]> {
  const live = await getLive();
  return allRecords.map((r) => patch(r, live));
}
