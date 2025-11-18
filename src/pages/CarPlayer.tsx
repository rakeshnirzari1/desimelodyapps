import { useState, useRef, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet";
import { Play, Pause, SkipForward, SkipBack, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioStation } from "@/types/station";
import { getStationsWithSlugs } from "@/lib/station-utils";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import logo from "@/assets/desimelodylogo.png";

export default function CarPlayer() {
  const [allStations, setAllStations] = useState<RadioStation[]>([]);
  const [filteredStations, setFilteredStations] = useState<RadioStation[]>([]);
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInterrupted, setIsInterrupted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const silenceAudioRef = useRef<HTMLAudioElement>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadAttemptRef = useRef(0);
  const hasAutoSkippedRef = useRef(false);
  const mediaSessionSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wasInterruptedRef = useRef(false);

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

  // Handle silence audio to keep lock screen controls active during loading and interruptions
  useEffect(() => {
    if (!silenceAudioRef.current) return;

    const silenceAudio = silenceAudioRef.current;
    // Set volume to very low to prevent it from taking over media controls
    silenceAudio.volume = 0.01;

    // Clear any pending media session sync
    if (mediaSessionSyncTimeoutRef.current) {
      clearTimeout(mediaSessionSyncTimeoutRef.current);
      mediaSessionSyncTimeoutRef.current = null;
    }

    // Play silence during loading OR when interrupted (phone call) to maintain lock screen controls
    if ((isLoading && isPlaying) || isInterrupted) {
      silenceAudio.play().catch((e) => console.log("Silence play failed:", e));
    } else {
      // Stop silence when station is actually playing
      silenceAudio.pause();
    }

    return () => {
      if (mediaSessionSyncTimeoutRef.current) {
        clearTimeout(mediaSessionSyncTimeoutRef.current);
        mediaSessionSyncTimeoutRef.current = null;
      }
    };
  }, [isLoading, isPlaying, isInterrupted]);

  // Media Session API for car controls
  useEffect(() => {
    if (!currentStation || !("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentStation.name,
      artist: `DesiMelody.com • ${currentStation.language || "Hindi"} • ${currentStation.type}`,
      album: "DesiMelody.com",
      artwork: [{ src: currentStation.image, sizes: "512x512", type: "image/jpeg" }],
    });

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

    // Explicitly disable play and pause handlers to hide those buttons
    try {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
    } catch (e) {
      console.log("Could not disable play/pause handlers");
    }

    // Only next and previous handlers
    navigator.mediaSession.setActionHandler("nexttrack", handleNext);
    navigator.mediaSession.setActionHandler("previoustrack", handlePrevious);

    return () => {
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
    };
  }, [currentStation, isPlaying, filteredStations]);

  // Handle phone call interruptions
  useEffect(() => {
    if (!audioRef.current || !silenceAudioRef.current) return;

    const audio = audioRef.current;
    const silenceAudio = silenceAudioRef.current;

    // Handle when main audio is interrupted (e.g., phone call)
    const handleAudioInterruption = () => {
      if (isPlaying && !isInterrupted) {
        console.log("Audio interrupted - likely phone call");
        wasInterruptedRef.current = true;
        setIsInterrupted(true);
        // Silent audio will start playing via the effect above
      }
    };

    // Handle when interruption ends and we can resume
    const handleVisibilityChange = () => {
      if (!document.hidden && wasInterruptedRef.current && isPlaying) {
        console.log("App visible again after interruption - resuming");
        wasInterruptedRef.current = false;
        setIsInterrupted(false);
        // Stop silent audio and reload/resume main station
        silenceAudio.pause();
        if (currentStation) {
          audio.src = currentStation.link;
          audio.load();
          audio.play().catch((e) => console.log("Resume failed:", e));
        }
      }
    };

    // Listen for audio pause events (could be phone call)
    audio.addEventListener("pause", handleAudioInterruption);

    // Listen for visibility changes (when call ends and user returns)
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      audio.removeEventListener("pause", handleAudioInterruption);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentStation, isPlaying]);

  const handlePlay = async () => {
    const audio = audioRef.current;
    const silenceAudio = silenceAudioRef.current;
    if (!audio || isPlaying) return; // Do nothing if already playing

    // Always reload source for fresh live stream
    if (currentStation) {
      audio.src = currentStation.link;
      audio.load();
    }
    // Stop silent audio immediately when playing
    if (silenceAudio) {
      silenceAudio.pause();
    }
    try {
      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      console.log("Play failed:", error);
      setIsPlaying(true); // Keep state true to maintain controls
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

      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white flex flex-col relative overflow-hidden">
        <audio ref={audioRef} preload="auto" />
        <audio ref={silenceAudioRef} src="/silence.mp3" loop preload="auto" style={{ display: "none" }} />

        {/* Animated background effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-700/20 via-transparent to-transparent pointer-events-none" />
        
        {/* Logo Header */}
        <div className="relative z-10 p-4 md:p-6 flex justify-center items-center">
          <img src={logo} alt="DesiMelody.com" className="h-20 md:h-28 w-auto drop-shadow-2xl" />
        </div>

        {/* Search Bar */}
        <div className="relative z-10 px-4 pb-4">
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
              className="pl-10 bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-white/30 rounded-2xl"
            />

            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900/95 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl max-h-96 overflow-y-auto z-50">
                {searchResults.map((station) => (
                  <button
                    key={station.id}
                    onMouseDown={() => handleStationSelect(station)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-white/20 transition-colors text-left border-b border-white/10 last:border-0 first:rounded-t-2xl last:rounded-b-2xl cursor-pointer"
                  >
                    <img
                      src={station.image}
                      alt={station.name}
                      className="w-12 h-12 rounded-xl object-cover shadow-lg"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400";
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate">{station.name}</div>
                      <div className="text-sm text-white/70 truncate">
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
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 md:p-8">
          {currentStation ? (
            <div className="w-full max-w-md space-y-6 md:space-y-8">
              {/* Station Info */}
              <div className="text-center space-y-3 px-4">
                <div className="space-y-1">
                  <p className="text-white/60 text-xs md:text-sm uppercase tracking-wider">Now Playing</p>
                  <h1 className="text-2xl md:text-4xl font-bold text-white drop-shadow-lg">{currentStation.name}</h1>
                </div>
                <p className="text-base md:text-lg text-white/80">
                  {currentStation.language || "Hindi"} • {currentStation.type}
                </p>
                {currentStation.tags && (
                  <p className="text-xs md:text-sm text-white/50">{currentStation.tags}</p>
                )}
              </div>

              {/* Station Image - Circular with glow */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 rounded-full blur-2xl opacity-50 animate-pulse" />
                  <img
                    src={currentStation.image}
                    alt={currentStation.name}
                    className="relative w-40 h-40 md:w-48 md:h-48 rounded-full object-cover shadow-2xl ring-4 ring-white/20"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400";
                    }}
                  />
                </div>
              </div>

              {/* Loading Indicator */}
              {isLoading && (
                <div className="text-center">
                  <p className="text-white/70 text-sm animate-pulse">Loading station...</p>
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center justify-center gap-4 md:gap-6 pt-4">
                <Button
                  onClick={handlePrevious}
                  size="icon"
                  variant="ghost"
                  className="w-14 h-14 md:w-16 md:h-16 rounded-full hover:bg-white/20 text-white backdrop-blur-sm transition-all hover:scale-110"
                >
                  <SkipBack className="w-6 h-6 md:w-7 md:h-7" />
                </Button>

                <Button
                  onClick={handlePlay}
                  size="icon"
                  disabled={isLoading || isPlaying}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white disabled:opacity-50 shadow-2xl transition-all hover:scale-105 disabled:scale-100"
                >
                  <Play className="w-9 h-9 md:w-11 md:h-11 ml-1" />
                </Button>

                <Button
                  onClick={handleNext}
                  size="icon"
                  variant="ghost"
                  className="w-14 h-14 md:w-16 md:h-16 rounded-full hover:bg-white/20 text-white backdrop-blur-sm transition-all hover:scale-110"
                >
                  <SkipForward className="w-6 h-6 md:w-7 md:h-7" />
                </Button>
              </div>

              {/* Audio Visualizer - Equalizer Bars */}
              <div className="relative h-24 md:h-32 flex items-end justify-center gap-1 px-8 pt-6">
                {[...Array(12)].map((_, i) => {
                  const heights = [60, 80, 95, 75, 90, 100, 85, 70, 95, 80, 75, 65];
                  const colors = [
                    'from-red-500 to-red-600',
                    'from-orange-500 to-orange-600',
                    'from-amber-500 to-amber-600',
                    'from-yellow-500 to-yellow-600',
                    'from-lime-500 to-lime-600',
                    'from-green-500 to-green-600',
                    'from-emerald-500 to-emerald-600',
                    'from-cyan-500 to-cyan-600',
                    'from-sky-500 to-sky-600',
                    'from-blue-500 to-blue-600',
                    'from-purple-500 to-purple-600',
                    'from-pink-500 to-pink-600',
                  ];
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-t-lg bg-gradient-to-t ${colors[i]} transition-all duration-300 shadow-lg ${
                        isPlaying && !isLoading ? 'animate-pulse' : 'opacity-60'
                      }`}
                      style={{
                        height: isPlaying && !isLoading ? `${heights[i]}%` : '30%',
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: `${0.8 + Math.random() * 0.4}s`,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-white/70 text-lg">No stations found</p>
          )}
        </div>

        {/* Bottom gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      </div>
    </>
  );
}
