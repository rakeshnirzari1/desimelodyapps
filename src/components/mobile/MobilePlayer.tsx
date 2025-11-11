import { useState, useRef, useEffect } from "react";
import { RadioStation } from "@/types/station";
import { Play, Pause, SkipForward, SkipBack } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobilePlayerProps {
  station: RadioStation;
  onNext: () => void;
  onPrevious: () => void;
  allStations: RadioStation[];
}

export const MobilePlayer = ({ station, onNext, onPrevious, allStations }: MobilePlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [bufferingMessage, setBufferingMessage] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<any>(null);
  const wasPlayingBeforeInterruptionRef = useRef(false);
  const mediaSessionInitializedRef = useRef(false);
  const autoPlayAttemptedRef = useRef(false);
  const keepAliveIntervalRef = useRef<number | null>(null);
  const networkChangeTimeoutRef = useRef<number | null>(null);
  const stationLoadTimeoutRef = useRef<number | null>(null);

  // Initialize AudioContext for mobile
  useEffect(() => {
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AC && !audioContextRef.current) {
        audioContextRef.current = new AC();
      }
    } catch (error) {
      console.error("Failed to initialize AudioContext:", error);
    }

    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, []);

  // Network change detection - handle Wi-Fi to mobile data switches
  useEffect(() => {
    const handleOnline = () => {
      console.log("Network back online");
      setBufferingMessage("Network restored, resuming...");
      if (wasPlayingBeforeInterruptionRef.current || isPlaying) {
        setTimeout(() => {
          handlePlay();
          wasPlayingBeforeInterruptionRef.current = false;
        }, 500);
      }
    };

    const handleOffline = () => {
      console.log("Network offline");
      setBufferingMessage("Network lost, reconnecting...");
      wasPlayingBeforeInterruptionRef.current = isPlaying;
    };

    // Handle network type changes (Wi-Fi to mobile data, etc.)
    const handleNetworkChange = () => {
      if (!isPlaying) return;
      
      console.log("Network change detected");
      setBufferingMessage("Switching network, please wait...");
      
      // Clear any existing timeout
      if (networkChangeTimeoutRef.current) {
        clearTimeout(networkChangeTimeoutRef.current);
      }
      
      // Reload stream after brief delay to allow network to stabilize
      networkChangeTimeoutRef.current = window.setTimeout(() => {
        handlePlay();
      }, 1000);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    // Monitor connection type changes
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener("change", handleNetworkChange);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (connection) {
        connection.removeEventListener("change", handleNetworkChange);
      }
      if (networkChangeTimeoutRef.current) {
        clearTimeout(networkChangeTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  // Enhanced call and interruption detection
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Detect audio interruptions (calls, Siri, alarms, etc.)
    const handleAudioInterruption = (e: Event) => {
      console.log("Audio interrupted - system event");
      if (isPlaying) {
        wasPlayingBeforeInterruptionRef.current = true;
        setIsPlaying(false);
      }
    };

    // Listen for the audio element being paused by the system
    audio.addEventListener("pause", handleAudioInterruption);

    // Use a more reliable approach for detecting when interruptions end
    const checkForResume = setInterval(() => {
      // If we were playing before an interruption and audio is now paused
      if (wasPlayingBeforeInterruptionRef.current && !isPlaying && !document.hidden) {
        console.log("Interruption ended - auto-resuming");
        handlePlay();
        wasPlayingBeforeInterruptionRef.current = false;
      }
    }, 1000);

    return () => {
      audio.removeEventListener("pause", handleAudioInterruption);
      clearInterval(checkForResume);
    };
  }, [isPlaying]);

  // Load and auto-play station immediately with fast buffering
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !station) return;

    setIsLoading(true);
    setBufferingMessage("Loading station...");
    autoPlayAttemptedRef.current = false;

    // Force reload with cache-buster for fresh stream
    const sep = station.link.includes("?") ? "&" : "?";
    audio.src = `${station.link}${sep}ts=${Date.now()}`;
    audio.load();

    const handleCanPlay = () => {
      setIsLoading(false);
      setBufferingMessage("");
      
      // Auto-play immediately
      if (!autoPlayAttemptedRef.current) {
        autoPlayAttemptedRef.current = true;
        // Immediate play for first station
        setTimeout(() => handlePlay(), 50);
      }
    };
    
    const handleWaiting = () => {
      setBufferingMessage("Buffering, please wait...");
    };
    
    const handlePlaying = () => {
      setBufferingMessage("");
    };

    const handleError = () => {
      console.error("Station load error");
      setIsLoading(false);
      setBufferingMessage("Station unavailable, skipping...");
      
      // Keep Media Session alive during skip
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
      }
      
      // Auto-skip to next station after error
      setTimeout(() => {
        setBufferingMessage("");
        onNext();
      }, 1500);
    };

    // Set timeout for station load - skip if takes too long
    if (stationLoadTimeoutRef.current) {
      clearTimeout(stationLoadTimeoutRef.current);
    }
    
    stationLoadTimeoutRef.current = window.setTimeout(() => {
      if (isLoading) {
        console.warn("Station load timeout - skipping to next");
        setBufferingMessage("Station timeout, skipping...");
        
        // Keep Media Session alive
        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "paused";
        }
        
        setTimeout(() => {
          setBufferingMessage("");
          onNext();
        }, 1000);
      }
    }, 15000); // 15 second timeout

    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("error", handleError);
      
      if (stationLoadTimeoutRef.current) {
        clearTimeout(stationLoadTimeoutRef.current);
      }
    };
  }, [station, onNext]);

  // Media Session API for lock screen controls - maintain after long pauses
  useEffect(() => {
    if (!station || !("mediaSession" in navigator)) return;

    // Always set/update metadata
    navigator.mediaSession.metadata = new MediaMetadata({
      title: station.name,
      artist: `${station.language || "Hindi"} • ${station.type}`,
      album: "DesiMelody.com",
      artwork: [{ src: station.image, sizes: "512x512", type: "image/jpeg" }],
    });

    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    mediaSessionInitializedRef.current = true;

    const handleMediaPlay = async () => {
      console.log("Media Session PLAY from lock screen");
      await handlePlay();
    };

    const handleMediaPause = () => {
      console.log("Media Session PAUSE from lock screen");
      handlePauseAction();
    };

    const handleMediaNext = () => {
      console.log("Media Session NEXT");
      onNext();
    };

    const handleMediaPrevious = () => {
      console.log("Media Session PREVIOUS");
      onPrevious();
    };

    // Always set handlers (even after long pauses or calls)
    navigator.mediaSession.setActionHandler("play", handleMediaPlay);
    navigator.mediaSession.setActionHandler("pause", handleMediaPause);
    navigator.mediaSession.setActionHandler("nexttrack", handleMediaNext);
    navigator.mediaSession.setActionHandler("previoustrack", handleMediaPrevious);

    // Keep session alive with periodic updates
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
    }
    
    keepAliveIntervalRef.current = window.setInterval(() => {
      if ("mediaSession" in navigator && navigator.mediaSession.metadata) {
        // Refresh playback state to keep session active
        navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
      }
    }, 5000); // Every 5 seconds

    return () => {
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }
    };
  }, [station, isPlaying, onNext, onPrevious]);

  const handlePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      console.log("Starting playback...");
      setBufferingMessage("Buffering, please wait...");
      
      // Resume AudioContext if suspended
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      // Always reload from live edge (critical for long pauses and calls)
      const sep = station.link.includes("?") ? "&" : "?";
      audio.src = `${station.link}${sep}ts=${Date.now()}`;
      
      await new Promise<void>((resolve, reject) => {
        const handleCanPlay = () => {
          audio.removeEventListener("canplay", handleCanPlay);
          audio.removeEventListener("error", handleLoadError);
          
          // Seek to live edge if possible
          if (audio.seekable.length > 0) {
            try {
              audio.currentTime = audio.seekable.end(0);
            } catch (e) {
              console.warn("Could not seek to live edge:", e);
            }
          }
          
          resolve();
        };
        
        const handleLoadError = () => {
          audio.removeEventListener("canplay", handleCanPlay);
          audio.removeEventListener("error", handleLoadError);
          reject(new Error("Load error"));
        };
        
        audio.addEventListener("canplay", handleCanPlay);
        audio.addEventListener("error", handleLoadError);
        audio.load();
        
        // Timeout after 10 seconds for faster feedback
        setTimeout(() => {
          audio.removeEventListener("canplay", handleCanPlay);
          audio.removeEventListener("error", handleLoadError);
          reject(new Error("Load timeout"));
        }, 10000);
      });

      await audio.play();
      setIsPlaying(true);
      setBufferingMessage("");
      wasPlayingBeforeInterruptionRef.current = false;

      // Ensure Media Session stays active (critical for calls, network changes, and long pauses)
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
        // Re-set metadata and handlers to keep session alive
        navigator.mediaSession.metadata = new MediaMetadata({
          title: station.name,
          artist: `${station.language || "Hindi"} • ${station.type}`,
          album: "DesiMelody.com",
          artwork: [{ src: station.image, sizes: "512x512", type: "image/jpeg" }],
        });
        
        // Re-register handlers to ensure they persist
        navigator.mediaSession.setActionHandler("play", () => handlePlay());
        navigator.mediaSession.setActionHandler("pause", () => handlePauseAction());
        navigator.mediaSession.setActionHandler("nexttrack", () => onNext());
        navigator.mediaSession.setActionHandler("previoustrack", () => onPrevious());
      }
      
      console.log("Playback started successfully");
    } catch (error) {
      console.error("Play error:", error);
      setBufferingMessage("Connection issue, retrying...");
      setIsPlaying(false);
      
      // Keep Media Session alive even on error
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
      }
      
      // Retry once after a short delay
      setTimeout(() => {
        console.log("Retrying playback...");
        handlePlay();
      }, 1500);
    }
  };

  const handlePauseAction = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setIsPlaying(false);

    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "paused";
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      handlePauseAction();
    } else {
      handlePlay();
    }
  };

  return (
    <div className="bg-card border-b border-border shadow-lg">
      <div className="px-4 py-4">
        {/* Station Info */}
        <div className="flex items-center gap-3 mb-4">
          <img
            src={station.image}
            alt={station.name}
            className="w-16 h-16 rounded-lg object-cover shadow-md"
          />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-base text-foreground truncate">
              {station.name}
            </h2>
            <p className="text-sm text-muted-foreground truncate">
              {station.language} • {station.type}
            </p>
            {bufferingMessage && (
              <p className="text-xs text-primary mt-1 animate-pulse">
                {bufferingMessage}
              </p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevious}
            className="h-12 w-12 rounded-full"
            disabled={isLoading}
          >
            <SkipBack className="h-6 w-6" />
          </Button>

          <Button
            variant="default"
            size="icon"
            onClick={togglePlayPause}
            className="h-16 w-16 rounded-full shadow-lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-foreground border-t-transparent" />
            ) : isPlaying ? (
              <Pause className="h-7 w-7" />
            ) : (
              <Play className="h-7 w-7 ml-1" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            className="h-12 w-12 rounded-full"
            disabled={isLoading}
          >
            <SkipForward className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} preload="none" />
    </div>
  );
};
