// 24×24 stroke icons, drawn with currentColor at stroke-width 1.6.
// Each value is the inner markup of the <svg>.

import type { IconName } from "../data/zone.ts";

export const icons: Record<IconName | "mail", string> = {
  // envelope, next to the email address
  mail: '<rect x="2.5" y="5" width="19" height="14" rx="1.5"/><path d="m3 6.5 9 6.5 9-6.5"/>',
  // wheelchair user, ramp down from the bus door, bus seen from the front
  "ramp-bus": '<circle cx="4.6" cy="6.2" r="1.3"/><path d="M4.6 9.2v4.3h3.6l1.7 3.7"/><path d="M3 11.7a3.6 3.6 0 1 0 4.9 5"/><rect x="13" y="2.5" width="10" height="16" rx="1.5"/><path d="M14.6 4.8h6.8v6.4h-6.8z"/><path d="M14.8 15.2h1.6M19.6 15.2h1.6M14.6 18.5v1.5M21.4 18.5v1.5"/><path d="M13 18.5 9.6 20.5H1.5"/>',
  // RIPE Atlas probe with antenna
  probe: '<rect x="5" y="12" width="14" height="8" rx="1"/><path d="M12 12V6"/><path d="M9 4.5a4.2 4.2 0 0 1 6 0M6.8 2.4a7.3 7.3 0 0 1 10.4 0"/><path d="M8 16h.01M11 16h5"/>',
  // package: builds published as an apt repository
  package: '<path d="M12 2.8 20 7.2v9.6L12 21.2 4 16.8V7.2z"/><path d="M4 7.2l8 4.4 8-4.4M12 11.6v9.6M8 5l8 4.4"/>',
  // satellite with a laser beam down to a ground station
  satellite: '<rect x="9.5" y="3" width="5" height="5"/><path d="M3 4h6.5M3 7h6.5M14.5 4H21M14.5 7H21"/><path d="M12 8v8" stroke-dasharray="1.6 1.6"/><path d="M8 21l4-5 4 5M7 21h10"/>',
  // contactless card with NFC waves
  "nfc-card": '<rect x="2" y="6" width="13" height="12" rx="1.5"/><rect x="5" y="9.5" width="4" height="3"/><path d="M18 9.5a3.5 3.5 0 0 1 0 5M20.5 7.5a6.5 6.5 0 0 1 0 9"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a13.5 13.5 0 0 1 0 18M12 3a13.5 13.5 0 0 0 0 18M4.5 7.5h15M4.5 16.5h15"/>',
};
