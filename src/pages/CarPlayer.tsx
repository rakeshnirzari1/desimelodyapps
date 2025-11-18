import { useState, useRef, useEffect } from "react";
import { Helmet } from "react-helmet";
import { Play, Pause, SkipForward, SkipBack, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioStation } from "@/types/station";
import { getStationsWithSlugs } from "@/lib/station-utils";

export default function CarPlayer() {
  const [allStations, setAllStations] = useState<RadioStation[]>([]);
  const [filteredStations, setFilteredStations] = useState<RadioStation[]>([]);
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load stations
  useEffect(() => {
    const stations = getStationsWithSlugs();
    setAllStations(stations);
    setFilteredStations(stations);
    if (stations.length > 0) {
      setCurrentStation(stations[0]);
    }
  }, []);

  // Filter stations based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStations(allStations);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = allStations.filter(
        (station) =>
          station.name.toLowerCase().includes(query) ||
          station.language?.toLowerCase().includes(query) ||
          station.tags?.toLowerCase().includes(query) ||
          station.type.toLowerCase().includes(query)
      );
      setFilteredStations(filtered);
      if (filtered.length > 0 && !filtered.find(s => s.id === currentStation?.id)) {
        setCurrentStation(filtered[0]);
      }
    }
  }, [searchQuery, allStations, currentStation]);

  // Load and play station
  useEffect(() => {
    if (!currentStation || !audioRef.current) return;

    const audio = audioRef.current;
    audio.src = currentStation.link;
    setIsLoading(true);

    const handleCanPlay = async () => {
      setIsLoading(false);
      if (isPlaying) {
        try {
          await audio.play();
        } catch (error) {
          console.log("Auto-play failed:", error);
        }
      }
    };

    const handleError = () => {
      setIsLoading(false);
      console.error("Station loading error");
    };

    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);
    audio.load();

    return () => {
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
    };
  }, [currentStation, isPlaying]);

  // Media Session API for car controls
  useEffect(() => {
    if (!currentStation || !("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentStation.name,
      artist: `${currentStation.language || "Hindi"} • ${currentStation.type}`,
      album: "DesiMelody.com",
      artwork: [{ src: currentStation.image, sizes: "512x512", type: "image/jpeg" }],
    });

    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

    navigator.mediaSession.setActionHandler("play", async () => {
      if (audioRef.current) {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    });

    navigator.mediaSession.setActionHandler("nexttrack", handleNext);
    navigator.mediaSession.setActionHandler("previoustrack", handlePrevious);

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
    };
  }, [currentStation, isPlaying, filteredStations]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.log("Play failed:", error);
      }
    }
  };

  const handleNext = () => {
    if (filteredStations.length === 0) return;
    const currentIndex = filteredStations.findIndex((s) => s.id === currentStation?.id);
    const nextIndex = (currentIndex + 1) % filteredStations.length;
    setCurrentStation(filteredStations[nextIndex]);
  };

  const handlePrevious = () => {
    if (filteredStations.length === 0) return;
    const currentIndex = filteredStations.findIndex((s) => s.id === currentStation?.id);
    const prevIndex = currentIndex - 1 < 0 ? filteredStations.length - 1 : currentIndex - 1;
    setCurrentStation(filteredStations[prevIndex]);
  };

  return (
    <>
      <Helmet>
        <title>Car Player - DesiMelody.com</title>
        <meta name="description" content="Car-friendly radio player with steering wheel controls support" />
      </Helmet>

      <div className="min-h-screen bg-black text-white flex flex-col">
        <audio ref={audioRef} preload="auto" />

        {/* Search Bar */}
        <div className="p-4 border-b border-white/10">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
            <Input
              type="text"
              placeholder="Search stations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-white/30"
            />
          </div>
        </div>

        {/* Player */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
          {currentStation ? (
            <>
              {/* Station Image */}
              <img
                src={currentStation.image}
                alt={currentStation.name}
                className="w-32 h-32 md:w-48 md:h-48 rounded-2xl object-cover shadow-2xl"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400";
                }}
              />

              {/* Station Info */}
              <div className="text-center space-y-2 max-w-2xl">
                <h1 className="text-3xl md:text-5xl font-bold">{currentStation.name}</h1>
                <p className="text-lg md:text-xl text-white/70">
                  {currentStation.language || "Hindi"} • {currentStation.type}
                </p>
                {currentStation.tags && (
                  <p className="text-sm md:text-base text-white/50">{currentStation.tags}</p>
                )}
              </div>

              {/* Loading Indicator */}
              {isLoading && (
                <p className="text-white/50 animate-pulse">Loading station...</p>
              )}

              {/* Controls */}
              <div className="flex items-center gap-6 md:gap-8">
                <Button
                  onClick={handlePrevious}
                  size="icon"
                  variant="ghost"
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full hover:bg-white/10 text-white"
                >
                  <SkipBack className="w-8 h-8 md:w-10 md:h-10" />
                </Button>

                <Button
                  onClick={togglePlay}
                  size="icon"
                  disabled={isLoading}
                  className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {isPlaying ? (
                    <Pause className="w-10 h-10 md:w-14 md:h-14" />
                  ) : (
                    <Play className="w-10 h-10 md:w-14 md:h-14 ml-1" />
                  )}
                </Button>

                <Button
                  onClick={handleNext}
                  size="icon"
                  variant="ghost"
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full hover:bg-white/10 text-white"
                >
                  <SkipForward className="w-8 h-8 md:w-10 md:h-10" />
                </Button>
              </div>

              {/* Info Text */}
              <p className="text-center text-sm md:text-base text-white/50 max-w-md px-4">
                Steering wheel ⊂ / ⊃ = change station • Works in Android Auto & CarPlay
              </p>
            </>
          ) : (
            <p className="text-white/70 text-lg">No stations found</p>
          )}
        </div>
      </div>
    </>
  );
}
