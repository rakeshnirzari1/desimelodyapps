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
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<any>(null);
  const wasPlayingBeforeCallRef = useRef(false);
  const mediaSessionInitializedRef = useRef(false);
  const autoPlayAttemptedRef = useRef(false);

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

  // Phone call detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying) {
        // Phone might be in a call or screen locked
        wasPlayingBeforeCallRef.current = true;
      } else if (!document.hidden && wasPlayingBeforeCallRef.current) {
        // Resume after call ends
        const audio = audioRef.current;
        if (audio && !isPlaying) {
          handlePlay();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPlaying]);

  // Load and auto-play station
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !station) return;

    setIsLoading(true);
    autoPlayAttemptedRef.current = false;

    // Force reload with cache-buster
    const sep = station.link.includes("?") ? "&" : "?";
    audio.src = `${station.link}${sep}ts=${Date.now()}`;
    audio.load();

    const handleCanPlay = () => {
      setIsLoading(false);
      
      // Auto-play only once per station load
      if (!autoPlayAttemptedRef.current) {
        autoPlayAttemptedRef.current = true;
        handlePlay();
      }
    };

    const handleError = () => {
      console.error("Station load error");
      setIsLoading(false);
      setIsPlaying(false);
      // Auto-skip to next station after error
      setTimeout(onNext, 2000);
    };

    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
    };
  }, [station]);

  // Media Session API for lock screen controls
  useEffect(() => {
    if (!station || !("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: station.name,
      artist: `${station.language || "Hindi"} • ${station.type}`,
      album: "DesiMelody.com",
      artwork: [{ src: station.image, sizes: "512x512", type: "image/jpeg" }],
    });

    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    mediaSessionInitializedRef.current = true;

    const handleMediaPlay = async () => {
      console.log("Media Session PLAY");
      await handlePlay();
    };

    const handleMediaPause = () => {
      console.log("Media Session PAUSE");
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

    navigator.mediaSession.setActionHandler("play", handleMediaPlay);
    navigator.mediaSession.setActionHandler("pause", handleMediaPause);
    navigator.mediaSession.setActionHandler("nexttrack", handleMediaNext);
    navigator.mediaSession.setActionHandler("previoustrack", handleMediaPrevious);

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
      mediaSessionInitializedRef.current = false;
    };
  }, [station, isPlaying, onNext, onPrevious]);

  const handlePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      // Resume AudioContext if suspended
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      // Always reload and seek to live edge on resume
      const sep = station.link.includes("?") ? "&" : "?";
      audio.src = `${station.link}${sep}ts=${Date.now()}`;
      
      await new Promise<void>((resolve, reject) => {
        const handleCanPlay = () => {
          audio.removeEventListener("canplay", handleCanPlay);
          
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
        
        audio.addEventListener("canplay", handleCanPlay);
        audio.load();
        
        // Timeout after 10 seconds
        setTimeout(() => {
          audio.removeEventListener("canplay", handleCanPlay);
          reject(new Error("Load timeout"));
        }, 10000);
      });

      await audio.play();
      setIsPlaying(true);
      wasPlayingBeforeCallRef.current = false;

      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
      }
    } catch (error) {
      console.error("Play error:", error);
      setIsPlaying(false);
      
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
      }
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
