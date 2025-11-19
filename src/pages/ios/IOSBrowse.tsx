import { useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getStationsWithSlugs } from "@/lib/station-utils";
import { useAudio } from "@/contexts/AudioContext";
import IOSPlayer from "@/pages/ios";

export default function IOSBrowse() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setFilteredStations } = useAudio();
  const language = searchParams.get("language");
  const search = searchParams.get("search");

  const filteredStations = useMemo(() => {
    const allStations = getStationsWithSlugs();
    let filtered = allStations;

    if (language) {
      filtered = filtered.filter(
        (station) => station.language?.toLowerCase() === language.toLowerCase()
      );
    }

    if (search) {
      const query = search.toLowerCase();
      filtered = filtered.filter(
        (station) =>
          station.name.toLowerCase().includes(query) ||
          station.language?.toLowerCase().includes(query) ||
          station.location?.toLowerCase().includes(query) ||
          station.type?.toLowerCase().includes(query) ||
          station.tags?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [language, search]);

  useEffect(() => {
    if (!language && !search) {
      navigate("/ios/languages");
      return;
    }
    
    setFilteredStations(filteredStations);
    return () => setFilteredStations(null);
  }, [language, search, filteredStations, setFilteredStations, navigate]);

  return <IOSPlayer />;
}