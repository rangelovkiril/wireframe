import { expect, test } from "bun:test";
import { dnskeyRandomart } from "./randomart.ts";

// Vectors from `ssh-keygen -lv -E sha256`, which hashes the same way
// (SHA-256 of the base64-decoded key blob). Only the frame labels differ.
const body = (art: string) => art.split("\n").slice(1, -1).join("\n");

test("matches ssh-keygen for an Ed25519 key", async () => {
  const art = await dnskeyRandomart("AAAAC3NzaC1lZDI1NTE5AAAAIDYY/NlUgQAGJl1KaUik7ivOHgkyd7fXrjEapkZaHW+1");
  expect(body(art)).toBe(
    [
      "|o ...=           |",
      "|+o  ++o          |",
      "|*o..+.o          |",
      "|Bo.O.  . .       |",
      "|===..   S .      |",
      "|=+E .  . o o     |",
      "|O=o. o  o +      |",
      "|B+ oo    .       |",
      "|..o              |",
    ].join("\n"),
  );
});

test("matches ssh-keygen for an ECDSA key", async () => {
  const art = await dnskeyRandomart(
    "AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBCksRZ9Rl+WQa1U2KSpGVBxHD0MB7l5oSdPDMtJIbXU612gndURmmDBlQtijeemmiPLbsmBahr93CHoCF5PRZ0o=",
  );
  expect(body(art)).toBe(
    [
      "|    . . +..      |",
      "|   o o B o .     |",
      "|  . = = B = .    |",
      "|   + = = O + .   |",
      "|    . E S . . ...|",
      "|     o + . o   o+|",
      "|        . . o ..=|",
      "|             *.o+|",
      "|            +o+=o|",
    ].join("\n"),
  );
});

test("frame has no labels", async () => {
  const lines = (await dnskeyRandomart("AAAA")).split("\n");
  expect(lines[0]).toBe("+-----------------+");
  expect(lines.at(-1)).toBe("+-----------------+");
  expect(lines).toHaveLength(11);
});
