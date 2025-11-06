import { useState, useRef, useEffect } from "react";
import { RadioStation } from "@/types/station";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, X, SkipForward, SkipBack } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { AudioVisualizer } from "./AudioVisualizer";
import { getStationsWithSlugs } from "@/lib/station-utils";
import { useAudio } from "@/contexts/AudioContext";

interface AudioPlayerProps {
  station: RadioStation | null;
  onClose: () => void;
}

const STATION_TIMEOUT = 15000; // 15 seconds

export const AudioPlayer = ({ station, onClose }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { setCurrentStation } = useAudio();

  // Persistent refs for Media Session next/prev handlers
  const nextActionRef = useRef<() => void>(() => {});
  const prevActionRef = useRef<() => void>(() => {});

  // Playback timer
  useEffect(() => {
    if (isPlaying) {
      playbackTimerRef.current = setInterval(() => {
        setPlaybackTime((prev) => prev + 1);
      }, 1000);
    } else if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
    }

    return () => {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    };
  }, [isPlaying]);

  // Change to next station without navigation
  const playNextStation = () => {
    if (!station) return;

    const stations = getStationsWithSlugs();
    const currentIndex = stations.findIndex((s) => s.id === station.id);
    const nextIndex = (currentIndex + 1) % stations.length;
    const nextStation = stations[nextIndex];

    setCurrentStation(nextStation);
  };

  // Change to previous station without navigation
  const playPreviousStation = () => {
    if (!station) return;

    const stations = getStationsWithSlugs();
    const currentIndex = stations.findIndex((s) => s.id === station.id);
    const prevIndex = currentIndex === 0 ? stations.length - 1 : currentIndex - 1;
    const prevStation = stations[prevIndex];

    setCurrentStation(prevStation);
  };

  // Keep Media Session handlers updated with latest callbacks
  useEffect(() => {
    nextActionRef.current = playNextStation;
    prevActionRef.current = playPreviousStation;
  }, [station]);

  useEffect(() => {
    if (station && audioRef.current) {
      setPlaybackTime(0);
      setIsLoading(true);
      setLoadError(false);
      audioRef.current.src = station.link;
      audioRef.current.load();

      // Set timeout for station loading - auto-skip if station doesn't load
      stationTimeoutRef.current = setTimeout(() => {
        if (audioRef.current) {
          if (audioRef.current.readyState === 0 && audioRef.current.paused) {
            console.log("Station timed out - auto-skipping to next");
            setIsLoading(false);
            setLoadError(true);
            // Auto-skip to next station after 1 second
            setTimeout(() => {
              playNextStation();
            }, 1000);
          } else if (audioRef.current.paused) {
            console.log("Station loaded but autoplay blocked");
            setIsLoading(false);
            setIsPlaying(false);
          }
        }
      }, STATION_TIMEOUT);

      // Try to play immediately
      const playPromise = audioRef.current.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((error) => {
            console.log("Autoplay blocked:", error.name);
            setIsPlaying(false);
          });
      }

      const handlePlaying = () => {
        setIsLoading(false);
        setLoadError(false);
        setIsPlaying(true);
        if (stationTimeoutRef.current) {
          clearTimeout(stationTimeoutRef.current);
        }
      };

      const handleError = () => {
        console.log("Station error - auto-skipping to next");
        setIsLoading(false);
        setLoadError(true);
        if (stationTimeoutRef.current) {
          clearTimeout(stationTimeoutRef.current);
        }
        // Auto-skip to next station after 1 second
        setTimeout(() => {
          playNextStation();
        }, 1000);
      };

      audioRef.current.addEventListener("playing", handlePlaying);
      audioRef.current.addEventListener("error", handleError);

      return () => {
        audioRef.current?.removeEventListener("playing", handlePlaying);
        audioRef.current?.removeEventListener("error", handleError);
        if (stationTimeoutRef.current) {
          clearTimeout(stationTimeoutRef.current);
        }
      };
    }
  }, [station]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Media Session API for car controls and lock screen controls
  useEffect(() => {
    if (!station || !("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: station.name,
      artist: `${station.language || "Hindi"} • ${station.type}`,
      album: "Desi Melody",
      artwork: [{ src: station.image, sizes: "512x512", type: "image/jpeg" }],
    });

    // Keep session active so next/prev work even while loading or screen is off
    navigator.mediaSession.playbackState = isPlaying || isLoading ? "playing" : "paused";

    navigator.mediaSession.setActionHandler("play", () => {
      if (audioRef.current) {
        // Reload stream to get live audio
        audioRef.current.load();
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch(console.error);
      }
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    });

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
    };
  }, [station, isPlaying, isLoading]);

  // Register next/prev handlers once to remain active during screen-off
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      nextActionRef.current();
    });
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      prevActionRef.current();
    });
    return () => {
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        // Reload the stream to get live audio when resuming
        audioRef.current.load();
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((error) => {
            console.log("Play failed:", error);
            setIsPlaying(false);
          });
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!station) return null;

  return (
    <Card className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 relative overflow-hidden">
      <audio ref={audioRef} crossOrigin="anonymous" preload="auto" />

      <AudioVisualizer audioRef={audioRef} isPlaying={isPlaying} />

      <div className="container py-4 relative z-10">
        <div className="flex items-center gap-4">
          <img
            src={station.image}
            alt={station.name}
            className="w-14 h-14 rounded-lg object-cover shadow-md"
            onError={(e) => {
              e.currentTarget.src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100";
            }}
          />

          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate text-sm sm:text-base">
              {loadError ? "Station Offline" : isLoading ? "Loading..." : station.name}
            </h4>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {loadError
                ? "This station is currently unavailable"
                : isLoading
                  ? "Loading..."
                  : `${station.language || "Hindi"} • ${station.type}`}
            </p>
            {!loadError && !isLoading && (
              <p className="text-xs text-primary font-medium mt-1">Playing for {formatTime(playbackTime)}</p>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {loadError ? (
              <Button
                onClick={playNextStation}
                size="sm"
                className="rounded-full text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4"
              >
                Play Next
              </Button>
            ) : (
              <>
                <Button
                  onClick={playPreviousStation}
                  size="icon"
                  variant="outline"
                  className="rounded-full w-10 h-10"
                  title="Previous Station"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>

                <Button onClick={togglePlay} size="icon" className="rounded-full w-12 h-12" disabled={isLoading}>
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                </Button>

                <Button
                  onClick={playNextStation}
                  size="icon"
                  variant="outline"
                  className="rounded-full w-10 h-10"
                  title="Next Station"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>

                <div className="hidden sm:flex items-center gap-2 w-32">
                  <Button onClick={toggleMute} size="icon" variant="ghost" className="w-8 h-8">
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  <Slider
                    value={[volume]}
                    onValueChange={(value) => setVolume(value[0])}
                    max={100}
                    step={1}
                    className="w-20"
                  />
                </div>
              </>
            )}

            <Button onClick={onClose} size="icon" variant="ghost" className="w-8 h-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
