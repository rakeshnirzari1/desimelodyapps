import { useState, useRef, useEffect } from "react";
import { RadioStation } from "@/types/station";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, X, SkipForward, SkipBack } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { AudioVisualizer } from "./AudioVisualizer";
import { getUserCountry, getAdUrl } from "@/lib/geolocation";
import { getStationsWithSlugs } from "@/lib/station-utils";
import { useNavigate } from "react-router-dom";

interface AudioPlayerProps {
  station: RadioStation | null;
  onClose: () => void;
}

const AD_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
const STATION_TIMEOUT = 15000; // 15 seconds

export const AudioPlayer = ({ station, onClose }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlayingAd, setIsPlayingAd] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [adUrl, setAdUrl] = useState<string>("/ads/india.mp3");
  const audioRef = useRef<HTMLAudioElement>(null);
  const adRef = useRef<HTMLAudioElement>(null);
  const adTimerRef = useRef<NodeJS.Timeout | null>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  // Detect user location and set appropriate ad
  useEffect(() => {
    const detectLocation = async () => {
      const country = await getUserCountry();
      setAdUrl(getAdUrl(country));
    };
    detectLocation();
  }, []);

  // Playback timer
  useEffect(() => {
    if (isPlaying && !isPlayingAd) {
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
  }, [isPlaying, isPlayingAd]);

  // Handle advertisement playback every 5 minutes
  useEffect(() => {
    if (!station || !isPlaying || isPlayingAd) return;

    const playAdvertisement = () => {
      if (audioRef.current && adRef.current) {
        // Lower radio volume instead of pausing
        const originalVolume = audioRef.current.volume;
        audioRef.current.volume = originalVolume * 0.15; // 15% volume for background
        setIsPlayingAd(true);

        // Play the ad on top
        adRef.current.src = adUrl;
        adRef.current.volume = isMuted ? 0 : volume / 100;
        adRef.current.play().catch((error) => {
          console.log("Ad play failed:", error);
          // Restore radio volume if ad fails
          if (audioRef.current) {
            audioRef.current.volume = originalVolume;
          }
          setIsPlayingAd(false);
        });
      }
    };

    // Set up the interval for ad playback
    adTimerRef.current = setInterval(playAdvertisement, AD_INTERVAL);

    return () => {
      if (adTimerRef.current) {
        clearInterval(adTimerRef.current);
      }
    };
  }, [station, isPlaying, volume, isMuted, isPlayingAd, adUrl]);

  // Handle ad end - restore radio to normal volume
  const handleAdEnd = () => {
    setIsPlayingAd(false);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  };

  // Navigate to next station
  const playNextStation = () => {
    if (!station) return;

    const stations = getStationsWithSlugs();
    const currentIndex = stations.findIndex((s) => s.id === station.id);
    const nextIndex = (currentIndex + 1) % stations.length;
    const nextStation = stations[nextIndex];

    if (nextStation.slug) {
      navigate(`/${nextStation.slug}`);
    }
  };

  // Navigate to previous station
  const playPreviousStation = () => {
    if (!station) return;

    const stations = getStationsWithSlugs();
    const currentIndex = stations.findIndex((s) => s.id === station.id);
    const prevIndex = currentIndex === 0 ? stations.length - 1 : currentIndex - 1;
    const prevStation = stations[prevIndex];

    if (prevStation.slug) {
      navigate(`/${prevStation.slug}`);
    }
  };

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
        playPromise.then(() => {
          setIsPlaying(true);
        }).catch((error) => {
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
    if (audioRef.current && !isPlayingAd) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
    if (adRef.current && isPlayingAd) {
      adRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted, isPlayingAd]);

  // Media Session API for car controls and lock screen controls
  useEffect(() => {
    if (!station || !('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: station.name,
      artist: `${station.language || 'Hindi'} • ${station.type}`,
      album: 'Desi Melody',
      artwork: [
        { src: station.image, sizes: '512x512', type: 'image/jpeg' }
      ]
    });

    // Set playback state to keep session active
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    navigator.mediaSession.setActionHandler('play', () => {
      if (audioRef.current) {
        // Reload stream to get live audio
        audioRef.current.load();
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(console.error);
      }
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    });

    navigator.mediaSession.setActionHandler('nexttrack', playNextStation);
    navigator.mediaSession.setActionHandler('previoustrack', playPreviousStation);

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
    };
  }, [station, isPlaying]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        // Reload the stream to get live audio when resuming
        audioRef.current.load();
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((error) => {
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
      <audio ref={adRef} onEnded={handleAdEnd} preload="auto" />

      <AudioVisualizer audioRef={audioRef} isPlaying={isPlaying && !isPlayingAd} />

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
              {isPlayingAd ? "Advertisement" : loadError ? "Station Offline" : isLoading ? "Loading..." : station.name}
            </h4>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {isPlayingAd
                ? "Please wait..."
                : loadError
                  ? "This station is currently unavailable"
                  : isLoading
                    ? "Loading..."
                    : `${station.language || "Hindi"} • ${station.type}`}
            </p>
            {!isPlayingAd && !loadError && !isLoading && (
              <p className="text-xs text-primary font-medium mt-1">Playing for {formatTime(playbackTime)}</p>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {loadError ? (
              <Button onClick={playNextStation} size="sm" className="rounded-full text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4">
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
