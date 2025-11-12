/**
 * List of station names to exclude from display on both main site and mobile page.
 * These stations will be filtered out even if present in stations.ts.
 *
 * Add station names exactly as they appear in the database.
 */
export const EXCLUDED_STATION_NAMES = [
  "Fnf.Fm Hindi",
  "clubmirchi",
  "Vivid Bharti",
  "Hindi Gold Radio",
  // Add more station names below as needed
] as const;
