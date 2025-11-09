import { useState, useMemo, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AudioPlayer } from "@/components/AudioPlayer";
import { StationCard } from "@/components/StationCard";
import { Input } from "@/components/ui/input";
import { RadioStation } from "@/types/station";
import { getStationsWithSlugs } from "@/lib/station-utils";
import { useAudio } from "@/contexts/AudioContext";
import { Search, Radio } from "lucide-react";

const India = () => {
  const { currentStation, setCurrentStation, setFilteredStations } = useAudio();
  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(20);

  const radioStations = getStationsWithSlugs();

  // Sort by trending (votes + clicks) and filter by search
  const filteredStations = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return radioStations
      .filter(
        (station) =>
          station.name.toLowerCase().includes(query) ||
          station.language?.toLowerCase().includes(query) ||
          station.location?.toLowerCase().includes(query)
      )
      .sort((a, b) => (b.votes + b.clicks) - (a.votes + a.clicks));
  }, [radioStations, searchQuery]);

  // Update filtered context when stations change
  useEffect(() => {
    setFilteredStations(filteredStations);
    return () => setFilteredStations(null);
  }, [filteredStations, setFilteredStations]);

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 500) {
        setDisplayCount(prev => Math.min(prev + 20, filteredStations.length));
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [filteredStations.length]);

  // Reset display count when search changes
  useEffect(() => {
    setDisplayCount(20);
  }, [searchQuery]);

  const displayedStations = filteredStations.slice(0, displayCount);

  const handlePlay = useCallback((station: RadioStation) => {
    setCurrentStation(station);
  }, [setCurrentStation]);

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>All Radio Stations - Browse 1100+ Live Stations | Desi Melody</title>
        <meta
          name="description"
          content="Browse all 1100+ live radio stations from India, Pakistan, Bangladesh, and Sri Lanka. Search by name or language and start streaming instantly."
        />
      </Helmet>
      <Header />

      {/* Search Header */}
      <section className="sticky top-16 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container py-4">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, language"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 h-12 text-base rounded-full border-2 focus:border-primary"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stations Grid */}
      <section className="py-8 flex-grow">
        <div className="container">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Radio className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">
                {searchQuery ? "Search Results" : "All Stations"}
              </h1>
              <span className="text-muted-foreground">
                ({filteredStations.length})
              </span>
            </div>
          </div>

          {displayedStations.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {displayedStations.map((station) => (
                  <StationCard
                    key={station.id}
                    station={station}
                    onPlay={handlePlay}
                  />
                ))}
              </div>
              {displayCount < filteredStations.length && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading more stations...</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-lg text-muted-foreground">
                No stations found matching "{searchQuery}"
              </p>
            </div>
          )}
        </div>
      </section>

      {currentStation && (
        <AudioPlayer
          station={currentStation}
          onClose={() => setCurrentStation(null)}
        />
      )}

      <Footer />
    </div>
  );
};

export default India;
