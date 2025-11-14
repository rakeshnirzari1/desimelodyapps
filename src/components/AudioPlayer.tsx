import { useState, useRef, useEffect } from "react";
import { RadioStation } from "@/types/station";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, X, SkipForward, SkipBack } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { AudioVisualizer } from "./AudioVisualizer";
import { AdOverlay } from "./AdOverlay";
import { getStationsWithSlugs } from "@/lib/station-utils";
import { useAudio } from "@/contexts/AudioContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { getAdUrlForRegion, shouldPlayAdOnTimeInterval, logAdImpression } from "@/lib/adManager";

interface AudioPlayerProps {
  station: RadioStation | null;
  onClose: () => void;
}

const STATION_TIMEOUT = 15000; // 15 seconds
// ALWAYS-RELOAD: Every resume reloads from live edge to guarantee live playback.
// This ensures users always hear the current live stream, not buffered/paused content.
// Trade-off: every resume takes ~1-2 seconds to reload, but guarantees live content.

export const AudioPlayer = ({ station, onClose }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isPlayingAd, setIsPlayingAd] = useState(false);
  const [adDuration, setAdDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const adAudioRef = useRef<HTMLAudioElement>(null);
  const adInProgressRef = useRef(false);
  const adIntervalCheckRef = useRef<number | null>(null);
  const {
    setCurrentStation,
    stationChangeCount,
    incrementStationChangeCount,
    adAnalytics,
    updateAdAnalytics,
    filteredStations,
  } = useAudio();
  const isMobile = useIsMobile();

  // Sync adInProgressRef with isPlayingAd state
  useEffect(() => {
    adInProgressRef.current = isPlayingAd;
  }, [isPlayingAd]);

  // Crossfade helper
  const crossfade = (audio: HTMLAudioElement, fromVolume: number, toVolume: number, duration: number) => {
    return new Promise<void>((resolve) => {
      const startTime = performance.now();
      const volumeDiff = toVolume - fromVolume;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const eased = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        audio.volume = Math.max(0, Math.min(1, fromVolume + volumeDiff * eased));

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  };

  // Play ad with smooth crossfade transitions
  const playAd = async () => {
    if (adInProgressRef.current) {
      console.log("Ad already playing - skipping new ad trigger");
      return;
    }

    try {
      const adUrl = await getAdUrlForRegion();
      const adAudio = adAudioRef.current;
      const radioAudio = audioRef.current;

      if (!adAudio || !radioAudio) return;

      console.log("Playing ad with smooth transition:", adUrl);

      setIsPlayingAd(true);

      // Fade out and stop radio
      if (radioAudio && isPlaying) {
        await crossfade(radioAudio, radioAudio.volume, 0, 500);
        radioAudio.pause();
        radioAudio.src = "";
        radioAudio.load();
      }

      // Load ad and fade in
      adAudio.src = adUrl;
      adAudio.volume = 0;
      await adAudio.play();
      await crossfade(adAudio, 0, 1.0, 300);

      const updatedAnalytics = await logAdImpression(adAnalytics);
      updateAdAnalytics(updatedAnalytics);
    } catch (error) {
      console.error("Error playing ad:", error);
      setIsPlayingAd(false);

      // Restore radio if ad fails
      if (audioRef.current && station && isPlaying) {
        const audio = audioRef.current;
        const sep = station.link.includes("?") ? "&" : "?";
        audio.src = `${station.link}${sep}ts=${Date.now()}`;
        audio.load();
        await audio.play();
      }
    }
  };

  // Handle ad completion - restore radio with crossfade
  const handleAdEnded = async () => {
    console.log("Ad finished - restoring radio");
    
    const adAudio = adAudioRef.current;
    
    if (adAudio) {
      await crossfade(adAudio, 1.0, 0, 300);
      adAudio.pause();
      adAudio.src = "";
    }

    setIsPlayingAd(false);

    // Restore radio
    if (station && audioRef.current) {
      const audio = audioRef.current;
      const sep = station.link.includes("?") ? "&" : "?";
      audio.src = `${station.link}${sep}ts=${Date.now()}`;
      audio.volume = 0;
      audio.load();
      
      await audio.play();
      await crossfade(audio, 0, isMuted ? 0 : volume / 100, 500);
      setIsPlaying(true);
    }
  };

  // Skip ad
  const skipAd = async () => {
    console.log("Ad skipped by user");
    const adAudio = adAudioRef.current;
    
    if (adAudio) {
      adAudio.pause();
      adAudio.src = "";
    }

    await handleAdEnded();
  };

  // Change to next station without navigation
  const playNextStation = () => {
    if (!station) return;

    // Use filtered stations if available (search/tag results), otherwise use all stations
    const stations = filteredStations || getStationsWithSlugs();
    const currentIndex = stations.findIndex((s) => s.id === station.id);
    const nextIndex = (currentIndex + 1) % stations.length;
    const nextStation = stations[nextIndex];

    incrementStationChangeCount();
    setCurrentStation(nextStation);
  };

  // Change to previous station without navigation
  const playPreviousStation = () => {
    if (!station) return;

    // Use filtered stations if available (search/tag results), otherwise use all stations
    const stations = filteredStations || getStationsWithSlugs();
    const currentIndex = stations.findIndex((s) => s.id === station.id);
    const prevIndex = currentIndex === 0 ? stations.length - 1 : currentIndex - 1;
    const prevStation = stations[prevIndex];

    incrementStationChangeCount();
    setCurrentStation(prevStation);
  };

  // Check for time-based ad intervals
  useEffect(() => {
    if (!isPlaying) return;

    adIntervalCheckRef.current = window.setInterval(() => {
      const now = Date.now();
      const timeSinceSession = now - adAnalytics.sessionStartTime;
      const timeSinceLastAd = adAnalytics.lastAdTimestamp ? now - adAnalytics.lastAdTimestamp : Infinity;

      console.log("🕐 Ad time check:", {
        timeSinceSession: Math.floor(timeSinceSession / 1000) + "s",
        timeSinceLastAd: adAnalytics.lastAdTimestamp ? Math.floor(timeSinceLastAd / 1000) + "s" : "never",
        shouldTrigger: shouldPlayAdOnTimeInterval(adAnalytics.sessionStartTime, adAnalytics.lastAdTimestamp),
      });

      if (shouldPlayAdOnTimeInterval(adAnalytics.sessionStartTime, adAnalytics.lastAdTimestamp)) {
        console.log("✅ Triggering ad on time interval");
        playAd();
      }
    }, 60000); // Check every minute

    return () => {
      if (adIntervalCheckRef.current) {
        clearInterval(adIntervalCheckRef.current);
      }
    };
  }, [isPlaying, adAnalytics]);

  // Setup ad audio element
  useEffect(() => {
    const adAudio = adAudioRef.current;
    if (!adAudio) return;

    const handleAdLoaded = () => {
      setAdDuration(Math.floor(adAudio.duration));
    };

    adAudio.addEventListener("loadedmetadata", handleAdLoaded);
    adAudio.addEventListener("ended", handleAdEnded);

    return () => {
      adAudio.removeEventListener("loadedmetadata", handleAdLoaded);
      adAudio.removeEventListener("ended", handleAdEnded);
    };
  }, []);

  // Load station and auto-play (simple single audio element like MobilePlayer)
  useEffect(() => {
    if (!station || !audioRef.current) return;

    // Update Media Session metadata immediately
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: station.name,
        artist: `${station.language || "Hindi"} • ${station.type}`,
        album: "DesiMelody.com",
        artwork: [{ src: station.image, sizes: "512x512", type: "image/jpeg" }],
      });
    }

    setIsLoading(true);
    setPlaybackTime(0);

    const audio = audioRef.current;

    // Load new station immediately (single element approach like MobilePlayer)
    const sep = station.link.includes("?") ? "&" : "?";
    audio.src = `${station.link}${sep}ts=${Date.now()}`;
    audio.load();

    const handleCanPlay = async () => {
      console.log("Station ready to play");
      setIsLoading(false);

      // Seek to live edge if available
      if (audio.seekable.length > 0) {
        try {
          audio.currentTime = audio.seekable.end(0);
          console.log("Seeked to live edge:", audio.seekable.end(0));
        } catch (e) {
          console.warn("Could not seek to live edge:", e);
        }
      }

      // Auto-play
      try {
        // Set appropriate volume based on ad state
        audio.volume = isPlayingAd ? 0.02 : isMuted ? 0 : volume / 100;

        await audio.play();
        console.log("Successfully playing", isPlayingAd ? "at low volume (ad overlay)" : "at normal volume");
        setIsPlaying(true);

        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "playing";
        }
      } catch (error) {
        console.log("Autoplay failed:", error);
        setIsPlaying(false);
      }
    };

    const handleError = () => {
      console.log("❌ Station error - auto-skipping to next");
      setIsLoading(false);
      // Auto-skip to next station
      setTimeout(() => {
        playNextStation();
      }, 500);
    };

    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
    };
  }, [station, isPlayingAd, isMuted, volume]);

  // Simple volume management like MobilePlayer
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Apply volume changes, but respect ad overlay mode
    if (isPlayingAd) {
      audio.volume = 0.02; // Keep low during ad
      console.log("🔉 Volume change during ad - keeping radio low");
    } else {
      audio.volume = isMuted ? 0 : volume / 100;
      console.log(`🔊 Setting audio volume to ${Math.round((isMuted ? 0 : volume / 100) * 100)}%`);
    }
  }, [volume, isMuted, isPlayingAd]);

  // MediaSession with SafeKeeper - prevents loss of lock screen controls
  const mediaSessionSafeKeeperRef = useRef<number | null>(null);

  const registerMediaSessionHandlers = () => {
    if (!("mediaSession" in navigator)) return;

    const handlePlay = async () => {
      console.log("🎵 Media Session PLAY");
      const audio = audioRef.current;
      if (!audio) return;

      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.error("Play error:", error);
      }
    };

    const handlePause = () => {
      console.log("⏸️ Media Session PAUSE");
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        setIsPlaying(false);
      }
    };

    try {
      navigator.mediaSession.setActionHandler("play", handlePlay);
      navigator.mediaSession.setActionHandler("pause", handlePause);
      navigator.mediaSession.setActionHandler("nexttrack", playNextStation);
      navigator.mediaSession.setActionHandler("previoustrack", playPreviousStation);
    } catch (e) {
      console.warn("Error registering MediaSession handlers:", e);
    }
  };

  useEffect(() => {
    if (!station || !("mediaSession" in navigator)) return;

    console.log("🔒 Starting MediaSession SafeKeeper for AudioPlayer");

    // Register handlers immediately
    registerMediaSessionHandlers();

    // Update metadata
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: station.name,
        artist: `${station.language || "Hindi"} • ${station.type}`,
        album: "DesiMelody.com",
        artwork: [{ src: station.image, sizes: "512x512", type: "image/jpeg" }],
      });
    } catch (e) {
      console.warn("Error setting metadata:", e);
    }

    // Update playback state
    try {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    } catch (e) {
      console.warn("Error setting playback state:", e);
    }

    // SafeKeeper: Re-register handlers every second to prevent loss
    if (mediaSessionSafeKeeperRef.current) {
      clearInterval(mediaSessionSafeKeeperRef.current);
    }

    mediaSessionSafeKeeperRef.current = window.setInterval(() => {
      try {
        registerMediaSessionHandlers();

        if (station) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: station.name,
            artist: `${station.language || "Hindi"} • ${station.type}`,
            album: "DesiMelody.com",
            artwork: [{ src: station.image, sizes: "512x512", type: "image/jpeg" }],
          });
        }

        navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
      } catch (e) {
        console.warn("SafeKeeper error:", e);
      }
    }, 1000); // Every second

    return () => {
      if (mediaSessionSafeKeeperRef.current) {
        clearInterval(mediaSessionSafeKeeperRef.current);
      }
      
      try {
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("nexttrack", null);
        navigator.mediaSession.setActionHandler("previoustrack", null);
      } catch (e) {
        console.warn("Error cleaning up handlers:", e);
      }
    };
  }, [station, isPlaying]);

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
        setIsPlaying(false);
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
      {/* Single audio element like MobilePlayer */}
      <audio ref={audioRef} crossOrigin="anonymous" preload="auto" playsInline />
      {/* Ad audio element */}
      <audio ref={adAudioRef} preload="auto" />

      <AdOverlay isVisible={isPlayingAd} duration={adDuration} onSkip={skipAd} />

      <AudioVisualizer audioRef={audioRef} isPlaying={isPlaying && !isPlayingAd} />

      <div className="container py-4 relative z-10 max-w-full">
        <div className="flex items-center gap-2 sm:gap-4 max-w-full">
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
                  ? "Connecting to station..."
                  : `${station.language || "Hindi"} • ${station.type}`}
            </p>
            {!loadError && !isLoading && (
              <p className="text-xs text-primary font-medium mt-1">Playing for {formatTime(playbackTime)}</p>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
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
                  className="rounded-full w-8 h-8 sm:w-10 sm:h-10"
                  title="Previous Station"
                  disabled={isPlayingAd}
                >
                  <SkipBack className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>

                <Button
                  onClick={togglePlay}
                  size="icon"
                  className="rounded-full w-10 h-10 sm:w-12 sm:h-12"
                  disabled={isLoading}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  )}
                </Button>

                <Button
                  onClick={playNextStation}
                  size="icon"
                  variant="outline"
                  className="rounded-full w-8 h-8 sm:w-10 sm:h-10"
                  title="Next Station"
                  disabled={isPlayingAd}
                >
                  <SkipForward className="w-3 h-3 sm:w-4 sm:h-4" />
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

            <Button onClick={onClose} size="icon" variant="ghost" className="w-8 h-8 shrink-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
