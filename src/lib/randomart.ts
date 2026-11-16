// OpenSSH's "drunken bishop" randomart (sshkey.c, fingerprint_randomart),
// drawn from the SHA-256 of the zone's DNSKEY public key.

const SYMBOLS = " .o+=*BOX@%&#/^SE";
const W = 17; // FLDSIZE_X
const H = 9; // FLDSIZE_Y

/** The walk itself, framed without labels. */
export function drunkenBishop(digest: Uint8Array): string {
  const len = SYMBOLS.length - 1;
  const field = Array.from({ length: W }, () => new Array<number>(H).fill(0));
  let x = W >> 1;
  let y = H >> 1;

  for (let input of digest) {
    for (let b = 0; b < 4; b++) {
      x = Math.min(Math.max(x + (input & 1 ? 1 : -1), 0), W - 1);
      y = Math.min(Math.max(y + (input & 2 ? 1 : -1), 0), H - 1);
      if (field[x]![y]! < len - 2) field[x]![y]!++;
      input >>= 2;
    }
  }
  field[W >> 1]![H >> 1] = len - 1; // S: start
  field[x]![y] = len; // E: end

  const border = `+${"-".repeat(W)}+`;
  const rows = Array.from({ length: H }, (_, row) => `|${field.map((col) => SYMBOLS[col[row]!]).join("")}|`);
  return [border, ...rows, border].join("\n");
}

/** Randomart of a base64 DNSKEY public key. */
export async function dnskeyRandomart(base64Key: string): Promise<string> {
  const bytes = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
  return drunkenBishop(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
}
