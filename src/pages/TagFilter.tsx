import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AudioPlayer } from "@/components/AudioPlayer";
import { StationCard } from "@/components/StationCard";
import { SearchBar } from "@/components/SearchBar";
import { RadioStation } from "@/types/station";
import { getStationsWithSlugs } from "@/lib/station-utils";
import { useAudio } from "@/contexts/AudioContext";
import { Tag } from "lucide-react";

const TagFilter = () => {
  const { tag } = useParams<{ tag: string }>();
  const navigate = useNavigate();
  const { currentStation, setCurrentStation } = useAudio();
  const decodedTag = decodeURIComponent(tag || "");

  const filteredStations = useMemo(() => {
    const allStations = getStationsWithSlugs();
    return allStations.filter(
      (station) =>
        station.location?.toLowerCase() === decodedTag.toLowerCase() ||
        station.language?.toLowerCase() === decodedTag.toLowerCase() ||
        station.type?.toLowerCase() === decodedTag.toLowerCase()
    );
  }, [decodedTag]);

  const handlePlay = (station: RadioStation) => {
    setCurrentStation(station);
  };

  if (!tag) {
    navigate("/browse");
    return null;
  }

  const pageTitle = `${decodedTag} Radio Stations | Desi Melody`;
  const pageDescription = `Browse and listen to ${decodedTag} radio stations. Stream live ${decodedTag} radio online for free on Desi Melody.`;

  return (
    <div className="min-h-screen flex flex-col pb-24">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
      </Helmet>
      <Header />

      {/* Search Bar */}
      <div className="container pt-6 pb-4">
        <SearchBar />
      </div>

      <div className="container py-8">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-8">
          <Tag className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-4xl md:text-5xl font-bold">{decodedTag}</h1>
            <p className="text-muted-foreground mt-2">
              {filteredStations.length} {filteredStations.length === 1 ? "station" : "stations"} found
            </p>
          </div>
        </div>

        {/* Stations Grid */}
        {filteredStations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredStations.map((station) => (
              <StationCard key={station.id} station={station} onPlay={handlePlay} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Tag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No stations found</h2>
            <p className="text-muted-foreground">
              No radio stations found with the tag "{decodedTag}". Try browsing other categories.
            </p>
          </div>
        )}
      </div>

      <AudioPlayer station={currentStation} onClose={() => setCurrentStation(null)} />
      <Footer />
    </div>
  );
};

export default TagFilter;
