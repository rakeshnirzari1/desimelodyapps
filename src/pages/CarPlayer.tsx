import { useState, useRef, useEffect, useMemo } from "react";
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
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const silenceAudioRef = useRef<HTMLAudioElement>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadAttemptRef = useRef(0);
  const hasAutoSkippedRef = useRef(false);

  // Load stations
  useEffect(() => {
    const stations = getStationsWithSlugs();
    setAllStations(stations);
    setFilteredStations(stations);
    if (stations.length > 0) {
      setCurrentStation(stations[0]);
    }
  }, []);

  // Search results - don't auto-select
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allStations
      .filter(
        (station) =>
          station.name.toLowerCase().includes(query) ||
          station.language?.toLowerCase().includes(query) ||
          station.tags?.toLowerCase().includes(query) ||
          station.type.toLowerCase().includes(query),
      )
      .slice(0, 10); // Limit to 10 results
  }, [searchQuery, allStations]);

  // Update filtered stations based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStations(allStations);
    }
  }, [searchQuery, allStations]);

  // Load and play station with auto-skip on error
  useEffect(() => {
    if (!currentStation || !audioRef.current) return;

    const audio = audioRef.current;
    loadAttemptRef.current += 1;
    const currentAttempt = loadAttemptRef.current;

    audio.src = currentStation.link;
    setIsLoading(true);

    // Clear any existing error timeout
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }

    const handleCanPlay = async () => {
      if (currentAttempt !== loadAttemptRef.current) return;
      setIsLoading(false);
      // Stop silence audio when main station becomes ready
      if (silenceAudioRef.current) {
        silenceAudioRef.current.pause();
      }
      if (isPlaying) {
        try {
          await audio.play();
          if ("mediaSession" in navigator) {
            navigator.mediaSession.playbackState = "playing";
          }
        } catch (error) {
          console.log("Auto-play failed:", error);
          // Keep isPlaying true to maintain controls
        }
      }
    };

    const handleError = () => {
      if (currentAttempt !== loadAttemptRef.current) return;
      setIsLoading(false);
      console.error("Station loading error:", currentStation.name);

      // Play silence to keep lock screen controls active
      if (isPlaying && silenceAudioRef.current) {
        silenceAudioRef.current.play().catch((e) => console.log("Silence play failed:", e));
      }

      // Keep playing state true to maintain lock screen controls
      // Only auto-skip once until a station successfully loads
      if (isPlaying && !hasAutoSkippedRef.current) {
        hasAutoSkippedRef.current = true;
        errorTimeoutRef.current = setTimeout(() => {
          console.log("Auto-skipping to next station...");
          handleNext();
        }, 2000);
      }
    };

    const handleStalled = () => {
      if (currentAttempt !== loadAttemptRef.current) return;
      console.warn("Station stalled:", currentStation.name);

      const audioEl = audioRef.current;
      if (audioEl && !audioEl.paused && audioEl.readyState >= 3) {
        // If audio is actually playing, ignore transient stalled events
        return;
      }

      // Play silence to keep lock screen controls active
      if (isPlaying && silenceAudioRef.current) {
        silenceAudioRef.current.play().catch((e) => console.log("Silence play failed:", e));
      }

      // Only auto-skip once until a station successfully loads
      if (isPlaying && !hasAutoSkippedRef.current) {
        hasAutoSkippedRef.current = true;
        errorTimeoutRef.current = setTimeout(() => {
          console.log("Stream stalled, skipping to next...");
          handleNext();
        }, 8000);
      }
    };
    const handlePlaying = () => {
      if (currentAttempt !== loadAttemptRef.current) return;
      setIsLoading(false);
      if (silenceAudioRef.current) {
        silenceAudioRef.current.pause();
      }
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }
      hasAutoSkippedRef.current = false;
      // Explicitly sync Media Session when audio is actually playing
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
      }
    };

    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("error", handleError);
    audio.addEventListener("stalled", handleStalled);
    audio.load();

    return () => {
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("stalled", handleStalled);
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }
    };
  }, [currentStation]);

  // Handle silence audio to keep lock screen controls active
  useEffect(() => {
    if (!silenceAudioRef.current) return;

    const silenceAudio = silenceAudioRef.current;

    // Play silence when: loading while playing OR paused (to maintain lock screen presence)
    if ((isLoading && isPlaying) || !isPlaying) {
      silenceAudio.play().catch((e) => console.log("Silence play failed:", e));
    } else {
      // Stop silence when station is actually playing
      silenceAudio.pause();
    }
  }, [isLoading, isPlaying]);

  // Media Session API for car controls
  useEffect(() => {
    if (!currentStation || !("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentStation.name,
      artist: `${currentStation.language || "Hindi"} • ${currentStation.type}`,
      album: "DesiMelody.com",
      artwork: [{ src: currentStation.image, sizes: "512x512", type: "image/jpeg" }],
    });

    // Always set to 'playing' when isPlaying is true, even during loading
    // This keeps the lock screen controls visible
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

    // Set position state for live streaming (helps maintain lock screen presence)
    try {
      navigator.mediaSession.setPositionState({
        duration: Infinity, // Live stream has no duration
        playbackRate: 1,
        position: 0,
      });
    } catch (e) {
      console.log("Position state not supported");
    }

    navigator.mediaSession.setActionHandler("play", async () => {
      if (audioRef.current && currentStation) {
        // Always reload stream source for fresh live stream
        audioRef.current.src = currentStation.link;
        audioRef.current.load();
        // Stop silent audio
        if (silenceAudioRef.current) {
          silenceAudioRef.current.pause();
        }
        try {
          await audioRef.current.play();
          setIsPlaying(true);
          navigator.mediaSession.playbackState = "playing";
        } catch (error) {
          console.log("Play failed in media session:", error);
          // Keep isPlaying true to maintain controls
          setIsPlaying(true);
        }
      }
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        // Silent audio will play via useEffect to maintain lock screen
        navigator.mediaSession.playbackState = "paused";
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
    const silenceAudio = silenceAudioRef.current;
    if (!audio) return;

    if (isPlaying) {
      // Pausing: main audio pauses, silent audio will play (via useEffect)
      audio.pause();
      setIsPlaying(false);
      // Silent audio will start playing via useEffect to maintain lock screen
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
      }
    } else {
      // Resuming: ALWAYS reload source for fresh live stream
      if (currentStation) {
        audio.src = currentStation.link; // Always reload to get fresh live stream
        audio.load();
      }
      // Stop silent audio immediately when resuming
      if (silenceAudio) {
        silenceAudio.pause();
      }
      try {
        await audio.play();
        setIsPlaying(true);
        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "playing";
        }
      } catch (error) {
        console.log("Play failed:", error);
        setIsPlaying(true); // Keep state true to maintain controls
      }
    }
  };

  const handleNext = () => {
    if (filteredStations.length === 0) return;
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    hasAutoSkippedRef.current = false; // Reset on manual skip
    const currentIndex = filteredStations.findIndex((s) => s.id === currentStation?.id);
    const nextIndex = (currentIndex + 1) % filteredStations.length;
    setCurrentStation(filteredStations[nextIndex]);
  };

  const handlePrevious = () => {
    if (filteredStations.length === 0) return;
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    hasAutoSkippedRef.current = false; // Reset on manual skip
    const currentIndex = filteredStations.findIndex((s) => s.id === currentStation?.id);
    const prevIndex = currentIndex - 1 < 0 ? filteredStations.length - 1 : currentIndex - 1;
    setCurrentStation(filteredStations[prevIndex]);
  };

  const handleStationSelect = (station: RadioStation) => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    hasAutoSkippedRef.current = false; // Reset on manual selection
    setCurrentStation(station);
    setSearchQuery(""); // Clear search
    setShowSearchResults(false);
    setFilteredStations(allStations); // Reset to all stations for next/prev
    if (!isPlaying) {
      setIsPlaying(true);
    }
  };

  return (
    <>
      <Helmet>
        <title>Car Player - DesiMelody.com</title>
        <meta name="description" content="Car-friendly radio player with steering wheel controls support" />
      </Helmet>

      <div className="min-h-screen bg-black text-white flex flex-col">
        <audio ref={audioRef} preload="auto" />
        <audio ref={silenceAudioRef} src="/silence.mp3" loop preload="auto" style={{ display: "none" }} />

        {/* Search Bar */}
        <div className="p-4 border-b border-white/10">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50 z-10" />
            <Input
              type="text"
              placeholder="Search stations..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(e.target.value.trim().length > 0);
              }}
              onFocus={() => setShowSearchResults(searchQuery.trim().length > 0)}
              onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-white/30"
            />

            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-white/20 rounded-lg shadow-2xl max-h-96 overflow-y-auto z-50">
                {searchResults.map((station) => (
                  <button
                    key={station.id}
                    onClick={() => handleStationSelect(station)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-white/10 transition-colors text-left border-b border-white/5 last:border-0"
                  >
                    <img
                      src={station.image}
                      alt={station.name}
                      className="w-12 h-12 rounded-lg object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400";
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate">{station.name}</div>
                      <div className="text-sm text-white/60 truncate">
                        {station.language || "Hindi"} • {station.type}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
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
                {currentStation.tags && <p className="text-sm md:text-base text-white/50">{currentStation.tags}</p>}
              </div>

              {/* Loading Indicator */}
              {isLoading && <p className="text-white/50 animate-pulse">Loading station...</p>}

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
