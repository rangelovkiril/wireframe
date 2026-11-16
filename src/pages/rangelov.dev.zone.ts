import type { APIRoute } from "astro";
import { liveRecords } from "../lib/live.ts";
import { renderZone } from "../lib/zonefile.ts";

// Built to dist/rangelov.dev.zone.
export const GET: APIRoute = async () =>
  new Response(renderZone(await liveRecords()), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
