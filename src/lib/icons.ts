// 24×24 stroke icons, drawn with currentColor at stroke-width 1.6.
// Each value is the inner markup of the <svg>.

import type { IconName } from "../data/zone.ts";

export const icons: Record<IconName | "umbrella", string> = {
  // bus with a wheelchair ramp folded out of the door
  bus: '<path d="M3 16V6a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v10z"/><path d="M3 10h15M13 10v6"/><circle cx="7" cy="17.5" r="1.5"/><path d="M18 16l4 3.5h-6"/>',
  // RIPE Atlas probe with antenna
  probe: '<rect x="5" y="12" width="14" height="8" rx="1"/><path d="M12 12V6"/><path d="M9 4.5a4.2 4.2 0 0 1 6 0M6.8 2.4a7.3 7.3 0 0 1 10.4 0"/><path d="M8 16h.01M11 16h5"/>',
  // satellite with a laser beam down to a ground station
  satellite: '<rect x="9.5" y="3" width="5" height="5"/><path d="M3 4h6.5M3 7h6.5M14.5 4H21M14.5 7H21"/><path d="M12 8v8" stroke-dasharray="1.6 1.6"/><path d="M8 21l4-5 4 5M7 21h10"/>',
  // contactless card with NFC waves
  "nfc-card": '<rect x="2" y="6" width="13" height="12" rx="1.5"/><rect x="5" y="9.5" width="4" height="3"/><path d="M18 9.5a3.5 3.5 0 0 1 0 5M20.5 7.5a6.5 6.5 0 0 1 0 9"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a13.5 13.5 0 0 1 0 18M12 3a13.5 13.5 0 0 0 0 18M4.5 7.5h15M4.5 16.5h15"/>',
  drone: '<rect x="9" y="10" width="6" height="4" rx="1"/><path d="M9 10.5 6 7.5M15 10.5l3-3M9 13.5l-3 3M15 13.5l3 3"/><path d="M3 7.5h6M15 7.5h6M3 16.5h6M15 16.5h6"/>',
  umbrella: '<path d="M3 12a9 9 0 0 1 18 0z"/><path d="M12 3V2M12 12v6.5a2 2 0 0 0 4 0"/>',
};
