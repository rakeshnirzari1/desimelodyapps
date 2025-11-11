import { useState, useEffect } from "react";
import { getStationsWithSlugs } from "@/lib/station-utils";
import { RadioStation } from "@/types/station";
import { MobilePlayer } from "@/components/mobile/MobilePlayer";
import { MobileStationList } from "@/components/mobile/MobileStationList";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Helmet } from "react-helmet";

const Mobile = () => {
  const [stations] = useState<RadioStation[]>(() => getStationsWithSlugs());
  const [searchQuery, setSearchQuery] = useState("");
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [filteredStations, setFilteredStations] = useState<RadioStation[]>([]);

  // Auto-play first station on load
  useEffect(() => {
    if (stations.length > 0 && !currentStation) {
      setCurrentStation(stations[0]);
    }
  }, [stations]);

  // Filter stations based on search
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = stations.filter(
        (station) =>
          station.name.toLowerCase().includes(query) ||
          station.language.toLowerCase().includes(query) ||
          station.tags?.toLowerCase().includes(query)
      );
      setFilteredStations(filtered);
    } else {
      setFilteredStations(stations);
    }
  }, [searchQuery, stations]);

  const handleStationSelect = (station: RadioStation) => {
    setCurrentStation(station);
  };

  const handleNext = () => {
    if (!currentStation) return;
    const currentIndex = filteredStations.findIndex((s) => s.id === currentStation.id);
    const nextIndex = (currentIndex + 1) % filteredStations.length;
    setCurrentStation(filteredStations[nextIndex]);
  };

  const handlePrevious = () => {
    if (!currentStation) return;
    const currentIndex = filteredStations.findIndex((s) => s.id === currentStation.id);
    const prevIndex = currentIndex === 0 ? filteredStations.length - 1 : currentIndex - 1;
    setCurrentStation(filteredStations[prevIndex]);
  };

  return (
    <>
      <Helmet>
        <title>DesiMelody Mobile - Indian Radio Stations</title>
        <meta name="description" content="Listen to your favorite Indian radio stations on mobile - Hindi, Punjabi, Tamil, Telugu and more" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        {/* Fixed Header with Search */}
        <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <img 
                src="/src/assets/desimelodylogo.png" 
                alt="DesiMelody" 
                className="h-8"
              />
              <h1 className="text-lg font-bold text-primary">DesiMelody</h1>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search stations, languages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 text-base"
              />
            </div>
          </div>
        </header>

        {/* Player - Fixed at top */}
        {currentStation && (
          <MobilePlayer
            station={currentStation}
            onNext={handleNext}
            onPrevious={handlePrevious}
            allStations={filteredStations}
          />
        )}

        {/* Station List - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <MobileStationList
            stations={filteredStations}
            currentStation={currentStation}
            onStationSelect={handleStationSelect}
          />
        </div>
      </div>
    </>
  );
};

export default Mobile;
