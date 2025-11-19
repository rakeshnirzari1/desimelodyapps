import { useState, useEffect } from "react";
import { getStationsWithSlugs } from "@/lib/station-utils";
import { RadioStation } from "@/types/station";
import { MobilePlayer } from "@/components/mobile/MobilePlayer";
import { MobileStationList } from "@/components/mobile/MobileStationList";
import { Input } from "@/components/ui/input";
import { Search, Radio, Tag, Languages } from "lucide-react";
import { Helmet } from "react-helmet";
import { NavLink } from "@/components/NavLink";
import adBanner from "@/assets/advertisementbanner.gif";

const Mobile = () => {
  // All stations sorted with Mirchi at top
  const [allStations] = useState<RadioStation[]>(() => {
    const stations = getStationsWithSlugs();
    return stations.sort((a, b) => {
      const aHasMirchi = a.name.toLowerCase().includes("mirchi");
      const bHasMirchi = b.name.toLowerCase().includes("mirchi");
      const aIsRadioMirchiHindi = a.name === "Radio Mirchi Hindi";
      const bIsRadioMirchiHindi = b.name === "Radio Mirchi Hindi";

      if (aIsRadioMirchiHindi) return -1;
      if (bIsRadioMirchiHindi) return 1;
      if (aHasMirchi && !bHasMirchi) return -1;
      if (!aHasMirchi && bHasMirchi) return 1;
      return 0;
    });
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [displayedStations, setDisplayedStations] = useState<RadioStation[]>([]);
  const [filteredStations, setFilteredStations] = useState<RadioStation[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const INITIAL_LOAD = 200; // Load first 20 stations quickly
  const LOAD_MORE = 100; // Load 50 more on scroll

  // Initial load - load first station immediately for fast auto-play
  useEffect(() => {
    if (allStations.length > 0 && !currentStation) {
      // Set first station immediately for auto-play
      setCurrentStation(allStations[0]);
      // Load initial batch of stations
      setDisplayedStations(allStations.slice(0, INITIAL_LOAD));
      // Load rest after a short delay to prioritize first station
      setTimeout(() => {
        setDisplayedStations(allStations.slice(0, Math.min(1000, allStations.length)));
      }, 1000);
    }
  }, [allStations]);

  // Filter stations based on search
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = allStations.filter(
        (station) =>
          station.name.toLowerCase().includes(query) ||
          station.language.toLowerCase().includes(query) ||
          station.tags?.toLowerCase().includes(query),
      );
      setFilteredStations(filtered);
    } else {
      setFilteredStations(displayedStations);
    }
  }, [searchQuery, displayedStations, allStations]);

  // Lazy load more stations on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (searchQuery.trim()) return; // Don't lazy load during search

      const scrollContainer = document.querySelector(".station-list-container");
      if (!scrollContainer) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

      if (scrollPercentage > 0.8 && !isLoadingMore && displayedStations.length < allStations.length) {
        setIsLoadingMore(true);
        setTimeout(() => {
          const nextBatch = Math.min(displayedStations.length + LOAD_MORE, allStations.length);
          setDisplayedStations(allStations.slice(0, nextBatch));
          setIsLoadingMore(false);
        }, 100);
      }
    };

    const scrollContainer = document.querySelector(".station-list-container");
    scrollContainer?.addEventListener("scroll", handleScroll);
    return () => scrollContainer?.removeEventListener("scroll", handleScroll);
  }, [displayedStations, allStations, searchQuery, isLoadingMore]);

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
        <meta
          name="description"
          content="Listen to your favorite Indian radio stations on mobile - Hindi, Punjabi, Tamil, Telugu and more"
        />
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
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center">
                <Radio className="w-4 h-4 text-primary-foreground" />
              </div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Desi Melody
              </h1>
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
        <div className="flex-1 overflow-y-auto station-list-container">
          <MobileStationList
            stations={filteredStations}
            currentStation={currentStation}
            onStationSelect={handleStationSelect}
          />
          {isLoadingMore && !searchQuery && (
            <div className="py-4 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          )}
          
          {/* Advertisement Banner */}
          <div className="px-4 py-6">
            <a
              href="https://remitrates.com.au"
              target="_blank"
              rel="noopener noreferrer"
              className="block transition-transform active:scale-95"
            >
              <img
                src={adBanner}
                alt="RemitRates - Best Exchange Rates"
                className="w-full h-auto rounded-lg shadow-lg"
              />
            </a>
          </div>

          {/* Tags Section */}
          <div className="px-4 py-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">Browse by Tags</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {["MP3", "Bollywood", "Classical", "Devotional", "Pop", "Rock", "Folk", "News"].map((tag) => (
                <NavLink
                  key={tag}
                  to={`/m/tag/${encodeURIComponent(tag.toLowerCase())}`}
                  className="flex items-center justify-center gap-2 p-4 bg-card rounded-lg border border-border hover:bg-accent active:bg-accent/80 transition-colors shadow-sm"
                >
                  <span className="font-medium text-center">{tag}</span>
                </NavLink>
              ))}
            </div>
          </div>

          {/* Languages Section */}
          <div className="px-4 py-6 pb-24 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Languages className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">Browse by Languages</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {["Hindi", "Tamil", "Malayalam", "Kannada", "Telugu", "Punjabi", "Bengali", "Marathi", "Gujarati"].map((language) => (
                <NavLink
                  key={language}
                  to={`/m/browse?language=${encodeURIComponent(language.toLowerCase())}`}
                  className="flex items-center justify-center gap-2 p-4 bg-card rounded-lg border border-border hover:bg-accent active:bg-accent/80 transition-colors shadow-sm"
                >
                  <span className="font-medium text-center">{language}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Mobile;
