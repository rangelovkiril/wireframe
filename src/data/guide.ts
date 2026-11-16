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
  intro: "Each section below is a DNS record of rangelov.dev. Tap a record to open it, or tap a type to see only those.",
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
      id: "srv",
      types: ["SRV"],
      label: "SRV",
      means: "Says which server offers a service, with a priority and a weight.",
      here: "what I work with; the weight is my confidence",
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
      here: "awards, hobbies, plans, and two projects",
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
