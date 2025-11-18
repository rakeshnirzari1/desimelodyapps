import { useState, useRef, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet";
import { Play, Pause, SkipForward, SkipBack, Search, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { RadioStation } from "@/types/station";
import { getStationsWithSlugs } from "@/lib/station-utils";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import logo from "@/assets/desimelodylogo.png";
import adBanner from "@/assets/advertisementbanner.gif";

export default function CarPlayer() {
  const [allStations, setAllStations] = useState<RadioStation[]>([]);
  const [filteredStations, setFilteredStations] = useState<RadioStation[]>([]);
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInterrupted, setIsInterrupted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const silenceAudioRef = useRef<HTMLAudioElement>(null);
  const adAudioRef = useRef<HTMLAudioElement>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadAttemptRef = useRef(0);
  const hasAutoSkippedRef = useRef(false);
  const mediaSessionSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wasInterruptedRef = useRef(false);
  
  // Web Audio API for smooth ad transitions
  const audioContextRef = useRef<AudioContext | null>(null);
  const radioGainNodeRef = useRef<GainNode | null>(null);
  const adGainNodeRef = useRef<GainNode | null>(null);
  const radioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const adSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  
  // Ad management
  const [isPlayingAd, setIsPlayingAd] = useState(false);
  const adTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAdTimeRef = useRef<number>(Date.now());
  const isChangingStationRef = useRef(false);

  // Initialize Web Audio API for ad mixing
  useEffect(() => {
    if (!audioRef.current || !adAudioRef.current) return;
    
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      
      // Create gain nodes for volume control
      radioGainNodeRef.current = audioContextRef.current.createGain();
      adGainNodeRef.current = audioContextRef.current.createGain();
      
      // Create source nodes
      radioSourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      adSourceRef.current = audioContextRef.current.createMediaElementSource(adAudioRef.current);
      
      // Connect radio: source -> gain -> destination
      radioSourceRef.current.connect(radioGainNodeRef.current);
      radioGainNodeRef.current.connect(audioContextRef.current.destination);
      
      // Connect ad: source -> gain -> destination
      adSourceRef.current.connect(adGainNodeRef.current);
      adGainNodeRef.current.connect(audioContextRef.current.destination);
      
      // Initialize gains
      radioGainNodeRef.current.gain.value = 1.0;
      adGainNodeRef.current.gain.value = 0.0;
    }
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Load stations
  useEffect(() => {
    const stations = getStationsWithSlugs();
    setAllStations(stations);
    setFilteredStations(stations);
    if (stations.length > 0) {
      // Try to find Radio Mirchi Hindi as default, fallback to first station
      const defaultStation =
        stations.find((s) => s.name.toLowerCase().includes("radio mirchi") && s.name.toLowerCase().includes("hindi")) ||
        stations[0];
      setCurrentStation(defaultStation);
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
      artist: `${currentStation.language || "Hindi"} • ${currentStation.type}`,
      album: "DesiMelody.com, 1200 Radio Stations From South East Asia",
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

  // Ad playback logic with country-based selection
  const playAdvertisement = async () => {
    // Skip ad if station is being changed
    if (isChangingStationRef.current) {
      console.log("Station changing, skipping ad");
      return;
    }
    
    if (!adAudioRef.current || !radioGainNodeRef.current || !adGainNodeRef.current) return;
    
    try {
      // Get user's country
      const { getUserCountry } = await import("@/lib/geolocation");
      const country = await getUserCountry();
      
      // Count available ads for this country (check existence)
      const adCounts: Record<string, number> = {
        'australia': 7,
        'bangladesh': 14,
        'canada': 2,
        'india': 2,
        'kuwait': 2,
        'pakistan': 2,
        'south-africa': 2,
        'uae': 2,
        'uk': 2,
        'usa': 2
      };
      
      const maxAds = adCounts[country] || 2;
      const randomAd = Math.floor(Math.random() * maxAds) + 1;
      const adUrl = `/ads/${country}/ad${randomAd}.mp3`;
      
      console.log(`Playing ad: ${adUrl}`);
      setIsPlayingAd(true);
      
      const adAudio = adAudioRef.current;
      adAudio.src = adUrl;
      
      // Smooth fade: Radio down, Ad up
      const fadeDownRadio = async () => {
        if (!radioGainNodeRef.current || !audioContextRef.current) return;
        const now = audioContextRef.current.currentTime;
        radioGainNodeRef.current.gain.exponentialRampToValueAtTime(0.1, now + 1.5); // Fade to 10% in 1.5s
      };
      
      const fadeUpAd = async () => {
        if (!adGainNodeRef.current || !audioContextRef.current) return;
        const now = audioContextRef.current.currentTime;
        adGainNodeRef.current.gain.exponentialRampToValueAtTime(1.0, now + 1.5); // Fade to 100% in 1.5s
      };
      
      await fadeDownRadio();
      await fadeUpAd();
      
      adAudio.onended = async () => {
        // Check again if station is changing before restoring volume
        if (isChangingStationRef.current) {
          console.log("Station changed during ad, not restoring volume");
          setIsPlayingAd(false);
          if (adGainNodeRef.current && audioContextRef.current) {
            adGainNodeRef.current.gain.value = 0.0;
          }
          return;
        }
        
        console.log("Ad finished, restoring radio volume");
        
        // Smooth fade: Ad down, Radio up
        if (adGainNodeRef.current && audioContextRef.current) {
          const now = audioContextRef.current.currentTime;
          adGainNodeRef.current.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
        }
        
        if (radioGainNodeRef.current && audioContextRef.current) {
          const now = audioContextRef.current.currentTime;
          radioGainNodeRef.current.gain.exponentialRampToValueAtTime(1.0, now + 1.5);
        }
        
        setIsPlayingAd(false);
        lastAdTimeRef.current = Date.now();
      };
      
      await adAudio.play();
    } catch (error) {
      console.error("Ad playback error:", error);
      setIsPlayingAd(false);
      // Restore radio volume immediately on error
      if (radioGainNodeRef.current && audioContextRef.current) {
        const now = audioContextRef.current.currentTime;
        radioGainNodeRef.current.gain.exponentialRampToValueAtTime(1.0, now + 0.5);
      }
      if (adGainNodeRef.current && audioContextRef.current) {
        adGainNodeRef.current.gain.value = 0.0;
      }
    }
  };

  // 10-minute ad timer
  useEffect(() => {
    if (!isPlaying || isPlayingAd) {
      return;
    }
    
    // Check every minute if 10 minutes have passed
    const checkAdTimer = () => {
      const now = Date.now();
      const timeSinceLastAd = now - lastAdTimeRef.current;
      const tenMinutes = 10 * 60 * 1000;
      
      if (timeSinceLastAd >= tenMinutes && !isChangingStationRef.current) {
        playAdvertisement();
      }
    };
    
    // Check immediately on mount
    checkAdTimer();
    
    // Then check every minute
    adTimerRef.current = setInterval(checkAdTimer, 60 * 1000);
    
    return () => {
      if (adTimerRef.current) {
        clearInterval(adTimerRef.current);
        adTimerRef.current = null;
      }
    };
  }, [isPlaying, isPlayingAd]);

  const handleNext = () => {
    if (filteredStations.length === 0) return;
    
    // Mark that we're changing stations
    isChangingStationRef.current = true;
    
    // Stop any playing ad immediately
    if (isPlayingAd && adAudioRef.current) {
      adAudioRef.current.pause();
      adAudioRef.current.currentTime = 0;
      setIsPlayingAd(false);
      
      // Restore radio volume immediately
      if (radioGainNodeRef.current && audioContextRef.current) {
        radioGainNodeRef.current.gain.value = 1.0;
      }
      if (adGainNodeRef.current) {
        adGainNodeRef.current.gain.value = 0.0;
      }
    }
    
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    hasAutoSkippedRef.current = false;
    const currentIndex = filteredStations.findIndex((s) => s.id === currentStation?.id);
    const nextIndex = (currentIndex + 1) % filteredStations.length;
    setCurrentStation(filteredStations[nextIndex]);
    
    // Reset changing flag after a short delay
    setTimeout(() => {
      isChangingStationRef.current = false;
    }, 1000);
  };

  const handlePrevious = () => {
    if (filteredStations.length === 0) return;
    
    // Mark that we're changing stations
    isChangingStationRef.current = true;
    
    // Stop any playing ad immediately
    if (isPlayingAd && adAudioRef.current) {
      adAudioRef.current.pause();
      adAudioRef.current.currentTime = 0;
      setIsPlayingAd(false);
      
      // Restore radio volume immediately
      if (radioGainNodeRef.current && audioContextRef.current) {
        radioGainNodeRef.current.gain.value = 1.0;
      }
      if (adGainNodeRef.current) {
        adGainNodeRef.current.gain.value = 0.0;
      }
    }
    
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    hasAutoSkippedRef.current = false;
    const currentIndex = filteredStations.findIndex((s) => s.id === currentStation?.id);
    const prevIndex = currentIndex - 1 < 0 ? filteredStations.length - 1 : currentIndex - 1;
    setCurrentStation(filteredStations[prevIndex]);
    
    // Reset changing flag after a short delay
    setTimeout(() => {
      isChangingStationRef.current = false;
    }, 1000);
  };

  const handleStationSelect = (station: RadioStation) => {
    // Mark that we're changing stations
    isChangingStationRef.current = true;
    
    // Stop any playing ad immediately
    if (isPlayingAd && adAudioRef.current) {
      adAudioRef.current.pause();
      adAudioRef.current.currentTime = 0;
      setIsPlayingAd(false);
      
      // Restore radio volume immediately
      if (radioGainNodeRef.current && audioContextRef.current) {
        radioGainNodeRef.current.gain.value = 1.0;
      }
      if (adGainNodeRef.current) {
        adGainNodeRef.current.gain.value = 0.0;
      }
    }
    
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    hasAutoSkippedRef.current = false;
    setCurrentStation(station);
    setSearchQuery("");
    setShowSearchResults(false);
    setFilteredStations(allStations);
    if (!isPlaying) {
      setIsPlaying(true);
    }
    
    // Reset changing flag after a short delay
    setTimeout(() => {
      isChangingStationRef.current = false;
    }, 1000);
  };

  // Volume control
  useEffect(() => {
    if (audioRef.current) {
      const targetVolume = isMuted ? 0 : volume / 100;
      audioRef.current.volume = targetVolume;
      audioRef.current.muted = isMuted;
      console.log(
        "Volume effect - Volume:",
        targetVolume,
        "Muted:",
        isMuted,
        "Actual volume:",
        audioRef.current.volume,
        "Actual muted:",
        audioRef.current.muted,
      );
    }
  }, [volume, isMuted]);

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    console.log("Mute toggled:", newMutedState);

    // Force volume change immediately for iOS
    if (audioRef.current) {
      const targetVolume = newMutedState ? 0 : volume / 100;
      audioRef.current.volume = targetVolume;
      audioRef.current.muted = newMutedState;
      console.log("Audio muted property:", audioRef.current.muted, "Volume:", audioRef.current.volume);
    }
  };

  return (
    <>
      <Helmet>
        <title>Car Player - DesiMelody.com</title>
        <meta name="description" content="Car-friendly radio player with steering wheel controls support" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f1624] text-white flex flex-col relative overflow-hidden">
        <audio ref={audioRef} preload="auto" />
        <audio ref={adAudioRef} preload="auto" style={{ display: "none" }} />
        <audio ref={silenceAudioRef} src="/silence.mp3" loop preload="auto" style={{ display: "none" }} />

        {/* Animated background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent pointer-events-none" />
        <div
          className="absolute top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "4s" }}
        />
        <div
          className="absolute bottom-0 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "5s", animationDelay: "1s" }}
        />

        {/* Logo Header */}
        <div className="relative z-10 py-4 md:py-6 flex justify-center items-center">
          <div className="relative">
            <div className="absolute inset-0 blur-2xl bg-gradient-to-r from-purple-500 to-pink-500 opacity-30 animate-pulse" />
            <img src={logo} alt="DesiMelody.com" className="relative h-24 md:h-28 w-auto drop-shadow-2xl" />
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative z-10 px-4 pb-1 mt-4">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70 z-10" />
            <Input
              type="text"
              placeholder="Search stations..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(e.target.value.trim().length > 0);
              }}
              onFocus={() => setShowSearchResults(searchQuery.trim().length > 0)}
              className="pl-11 h-12 bg-white/10 backdrop-blur-md border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-purple-400/50 rounded-2xl shadow-lg text-base"
            />
          </div>
        </div>
        {/* Player */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-4">
          {currentStation ? (
            <div className="relative w-full max-w-4xl space-y-3">
              {/* Station Info - Compact */}
              <div className="text-center space-y-1">
                <p className="text-purple-300 text-xs uppercase tracking-widest font-semibold">Now Playing</p>
                <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-2xl">{currentStation.name}</h1>
                <p className="text-sm md:text-base text-white/70">
                  {currentStation.language || "Hindi"} • {currentStation.type}
                </p>
              </div>

              {/* Station Image + Controls in Row */}
              <div className="flex items-center justify-center gap-4">
                {/* Station Image */}
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-3xl blur-2xl opacity-50 animate-pulse" />
                  <img
                    src={currentStation.image}
                    alt={currentStation.name}
                    className="relative w-32 h-32 md:w-40 md:h-40 rounded-3xl object-cover shadow-2xl ring-2 ring-white/20"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400";
                    }}
                  />
                </div>

                {/* Controls */}
                <div className="flex items-center gap-4">
                  <Button
                    onClick={handlePrevious}
                    size="icon"
                    variant="ghost"
                    className="w-16 h-16 rounded-full hover:bg-white/20 text-white backdrop-blur-sm transition-all hover:scale-105 border border-white/10"
                  >
                    <SkipBack className="w-7 h-7" />
                  </Button>

                  <div className="relative">
                    <Button
                      onClick={handlePlay}
                      size="icon"
                      disabled={isLoading || isPlaying}
                      className="w-20 h-20 rounded-full bg-white hover:bg-white/90 text-[#1a1a2e] disabled:opacity-40 disabled:bg-white/50 shadow-2xl transition-all hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed border-4 border-white/20"
                    >
                      {isPlaying ? (
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mb-1" />
                          <span className="text-[10px] font-bold">LIVE</span>
                        </div>
                      ) : (
                        <Play className="w-10 h-10 ml-1" />
                      )}
                    </Button>
                    {isLoading && (
                      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <p className="text-white text-base font-semibold animate-pulse">Loading...</p>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleNext}
                    size="icon"
                    variant="ghost"
                    className="w-16 h-16 rounded-full hover:bg-white/20 text-white backdrop-blur-sm transition-all hover:scale-105 border border-white/10"
                  >
                    <SkipForward className="w-7 h-7" />
                  </Button>
                </div>
              </div>

              {/* Volume Control */}
              <div className="flex items-center justify-center gap-4 max-w-md mx-auto px-4">
                <button
                  onClick={toggleMute}
                  className="text-white/70 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                      />
                    </svg>
                  ) : (
                    <Volume2 className="w-6 h-6" />
                  )}
                </button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  onValueChange={(value) => {
                    console.log("Slider changed to:", value[0]);
                    const newVolume = value[0];
                    setVolume(newVolume);
                    if (newVolume > 0 && isMuted) {
                      setIsMuted(false);
                      if (audioRef.current) {
                        audioRef.current.muted = false;
                      }
                    }
                    // Directly update audio element
                    if (audioRef.current) {
                      audioRef.current.volume = newVolume / 100;
                      console.log("Audio volume directly set to:", audioRef.current.volume);
                    }
                  }}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-base text-white/70 font-medium w-12 text-right">{isMuted ? 0 : volume}%</span>
              </div>

              {/* Audio Visualizer - Equalizer Bars */}
              <div className="relative h-24 md:h-28 flex items-end justify-center gap-1.5 px-6 mt-2">
                {[...Array(12)].map((_, i) => {
                  const heights = [60, 80, 95, 75, 90, 100, 85, 70, 95, 80, 75, 65];
                  const colors = [
                    "from-red-500 to-red-600",
                    "from-orange-500 to-orange-600",
                    "from-amber-500 to-amber-600",
                    "from-yellow-500 to-yellow-600",
                    "from-lime-500 to-lime-600",
                    "from-green-500 to-green-600",
                    "from-emerald-500 to-emerald-600",
                    "from-cyan-500 to-cyan-600",
                    "from-sky-500 to-sky-600",
                    "from-blue-500 to-blue-600",
                    "from-purple-500 to-purple-600",
                    "from-pink-500 to-pink-600",
                  ];
                  return (
                    <div
                      key={i}
                      className={`flex-1 max-w-[24px] rounded-full bg-gradient-to-t ${colors[i]} transition-all duration-300 shadow-lg ${
                        isPlaying && !isLoading ? "animate-pulse" : "opacity-40"
                      }`}
                      style={{
                        height: isPlaying && !isLoading ? `${heights[i]}%` : "30%",
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
        {/* Advertisement Banner */}
        <div className="relative z-10 px-4 py-3">
          <div className="max-w-2xl mx-auto flex justify-center">
            <a
              href="https://remitrates.com.au"
              target="_blank"
              rel="noopener noreferrer"
              className="block transition-transform hover:scale-105"
            >
              <img
                src={adBanner}
                alt="RemitRates - Best Exchange Rates"
                className="w-full max-w-xl h-auto rounded-lg shadow-lg"
              />
            </a>
          </div>
        </div>
        {/* Bottom gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

        {/* Search Results Modal - Rendered outside all containers */}
        {showSearchResults && searchResults.length > 0 && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            style={{ pointerEvents: "auto" }}
            onClick={() => setShowSearchResults(false)}
          >
            <div
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl max-h-[75vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
              style={{ pointerEvents: "auto" }}
            >
              <div className="sticky top-0 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 text-white p-4 flex items-center justify-between">
                <h3 className="font-bold text-lg">Search Results ({searchResults.length})</h3>
                <button
                  onClick={() => setShowSearchResults(false)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto flex-1">
                {searchResults.map((station) => (
                  <button
                    key={station.id}
                    onClick={() => {
                      handleStationSelect(station);
                    }}
                    className="w-full flex items-center gap-4 p-4 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 active:from-purple-100 active:to-pink-100 transition-all text-left border-b border-gray-100 last:border-0"
                    style={{ cursor: "pointer", pointerEvents: "auto" }}
                  >
                    <img
                      src={station.image}
                      alt={station.name}
                      className="w-14 h-14 rounded-xl object-cover shadow-lg ring-2 ring-purple-200"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400";
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 truncate text-base">{station.name}</div>
                      <div className="text-sm text-gray-600 truncate">
                        {station.language || "Hindi"} • {station.type}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
