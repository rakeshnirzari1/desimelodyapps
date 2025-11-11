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
  const wasPlayingBeforeCallRef = useRef(false);
  const mediaSessionInitializedRef = useRef(false);
  const autoPlayAttemptedRef = useRef(false);
  const keepAliveIntervalRef = useRef<number | null>(null);
  const callDetectionIntervalRef = useRef<number | null>(null);

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

  // Enhanced phone call detection with multiple checks
  useEffect(() => {
    let wasInterrupted = false;
    
    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying) {
        console.log("Screen hidden while playing - pausing");
        wasPlayingBeforeCallRef.current = true;
        wasInterrupted = true;
        const audio = audioRef.current;
        if (audio) {
          audio.pause();
          setIsPlaying(false);
        }
      } else if (!document.hidden && wasPlayingBeforeCallRef.current) {
        console.log("Screen visible again - resuming playback");
        wasInterrupted = false;
        setTimeout(() => {
          handlePlay();
          wasPlayingBeforeCallRef.current = false;
        }, 500);
      }
    };

    // Additional check for audio interruptions (calls, alarms, etc.)
    const audio = audioRef.current;
    const handleAudioInterruption = () => {
      if (isPlaying) {
        console.log("Audio interrupted - likely a call");
        wasPlayingBeforeCallRef.current = true;
        wasInterrupted = true;
        setIsPlaying(false);
      }
    };
    
    const handleAudioResume = () => {
      if (wasInterrupted && wasPlayingBeforeCallRef.current) {
        console.log("Audio interruption ended - resuming");
        wasInterrupted = false;
        setTimeout(() => {
          handlePlay();
          wasPlayingBeforeCallRef.current = false;
        }, 1000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    audio?.addEventListener("pause", handleAudioInterruption);
    
    // Poll for call state changes
    callDetectionIntervalRef.current = window.setInterval(() => {
      if (wasPlayingBeforeCallRef.current && !document.hidden && !isPlaying) {
        console.log("Call ended detected - attempting resume");
        handlePlay();
        wasPlayingBeforeCallRef.current = false;
      }
    }, 2000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      audio?.removeEventListener("pause", handleAudioInterruption);
      if (callDetectionIntervalRef.current) {
        clearInterval(callDetectionIntervalRef.current);
      }
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
      setIsPlaying(false);
      // Auto-skip to next station after error
      setTimeout(() => {
        setBufferingMessage("");
        onNext();
      }, 2000);
    };

    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("error", handleError);
    };
  }, [station]);

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
      wasPlayingBeforeCallRef.current = false;

      // Ensure Media Session stays active (critical for calls and long pauses)
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
        // Re-set metadata to keep session alive
        navigator.mediaSession.metadata = new MediaMetadata({
          title: station.name,
          artist: `${station.language || "Hindi"} • ${station.type}`,
          album: "DesiMelody.com",
          artwork: [{ src: station.image, sizes: "512x512", type: "image/jpeg" }],
        });
      }
      
      console.log("Playback started successfully");
    } catch (error) {
      console.error("Play error:", error);
      setBufferingMessage("Connection issue, retrying...");
      setIsPlaying(false);
      
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
