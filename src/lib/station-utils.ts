import { RadioStation } from "@/types/station";
import { radioStations } from "@/data/stations";
import { generateSlug } from "./slug";
import { EXCLUDED_STATION_NAMES } from "@/data/excludedStations";

// Enhance stations with slugs on-the-fly and filter out excluded stations
export const getStationsWithSlugs = (): RadioStation[] => {
  return radioStations
    .filter((station) => !EXCLUDED_STATION_NAMES.includes(station.name as any))
    .map((station) => ({
      ...station,
      slug: station.slug || generateSlug(station.name),
    }));
};

// Find station by slug
export const findStationBySlug = (slug: string): RadioStation | undefined => {
  const stations = getStationsWithSlugs();
  return stations.find((s) => s.slug === slug);
};

// Find station by ID
export const findStationById = (id: string): RadioStation | undefined => {
  return radioStations.find((s) => s.id === id);
};
