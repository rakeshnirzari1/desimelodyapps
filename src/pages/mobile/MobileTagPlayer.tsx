import { useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStationsWithSlugs } from "@/lib/station-utils";
import { useAudio } from "@/contexts/AudioContext";
import CarPlayer from "@/pages/CarPlayer";

export default function MobileTagPlayer() {
  const { tag } = useParams<{ tag: string }>();
  const navigate = useNavigate();
  const { setFilteredStations } = useAudio();
  const decodedTag = decodeURIComponent(tag || "");

  const filteredStations = useMemo(() => {
    const allStations = getStationsWithSlugs();
    return allStations.filter(
      (station) =>
        station.location?.toLowerCase() === decodedTag.toLowerCase() ||
        station.language?.toLowerCase() === decodedTag.toLowerCase() ||
        station.type?.toLowerCase() === decodedTag.toLowerCase() ||
        station.tags?.toLowerCase().split(',').some(t => t.trim().toLowerCase() === decodedTag.toLowerCase())
    );
  }, [decodedTag]);

  useEffect(() => {
    if (!tag) {
      navigate("/m/tags");
      return;
    }
    
    setFilteredStations(filteredStations);
    return () => setFilteredStations(null);
  }, [tag, filteredStations, setFilteredStations, navigate]);

  return <CarPlayer />;
}
