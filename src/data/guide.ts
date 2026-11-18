// Plain-language explanation of each record type. Each row doubles as a
// filter for the records below it.

import type { RRType } from "./zone.ts";

export interface GuideRow {
  id: string; // filter id
  types: RRType[]; // record types this row filters to
  label: string;
  means: string;
  here: string;
}

export const guide = {
  heading: "What the records mean",
  intro:
    "Each section below is a DNS record of rangelov.dev. Open a record to read it, or pick a type to filter. The verify button next to a record asks Quad9, a non-profit public DNS resolver, whether that record is published and validates with DNSSEC.",
  showAll: "Show all records",
  openAll: "Open all records",
  closeAll: "Close all records",
  rows: [
    {
      id: "soa",
      types: ["SOA"],
      label: "SOA",
      means: "Start of Authority. The first record of every zone: who is responsible for it.",
      here: "who I am",
    },
    {
      id: "dnskey",
      types: ["DNSKEY"],
      label: "DNSKEY",
      means: "The zone's public key. Resolvers use it to check that answers were not tampered with (DNSSEC).",
      here: "my picture, drawn from the key",
    },
    {
      id: "caa",
      types: ["CAA"],
      label: "CAA",
      means: "Lists who is allowed to issue certificates for the domain.",
      here: "certificates I have earned",
    },
    {
      id: "cname",
      types: ["CNAME"],
      label: "CNAME",
      means: "Makes one name an alias of another name.",
      here: "my projects",
    },
    {
      id: "txt",
      types: ["TXT"],
      label: "TXT",
      means: "Free-form text attached to a name.",
      here: "awards, hobbies, plans, and the NFC card",
    },
    {
      id: "mx",
      types: ["MX"],
      label: "MX",
      means: "Where email for the domain should be delivered.",
      here: "how to reach me",
    },
  ] satisfies GuideRow[],
};

/** Labels for the live check of each record and the dialog that shows it. */
export const ui = {
  verify: "verify",
  checking: "checking…",
  signed: "✓ live, signed",
  live: "✓ live",
  missing: "not published yet",
  failed: "lookup failed",
  explain: {
    signed: "A public resolver found this record and validated its DNSSEC signature, so the answer is the one the zone published.",
    live: "A public resolver found this record, but did not validate a DNSSEC signature for it.",
    missing: "A public resolver has no record of this type for this name, so it is not published yet.",
    failed: "The lookup did not finish. Try again, or ask DNS yourself:",
  },
  answer: "What {server} answered",
  matches: "Same as the record on this page.",
  differs: "Not the same as the record on this page.",
  soaNote: "Compared by name: the serial grows with every change to the zone.",
  yourself: "Check it yourself",
  close: "Close",
};
