import { useState, useRef, useEffect } from "react";
import { RadioStation } from "@/types/station";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, X, SkipForward, SkipBack } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { AudioVisualizer } from "./AudioVisualizer";
import { getStationsWithSlugs } from "@/lib/station-utils";
import { useAudio } from "@/contexts/AudioContext";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const {
    setCurrentStation,
    filteredStations,
  } = useAudio();
  const isMobile = useIsMobile();

  // Change to next station without navigation
  const playNextStation = () => {
    if (!station) return;

    // Use filtered stations if available (search/tag results), otherwise use all stations
    const stations = filteredStations || getStationsWithSlugs();
    const currentIndex = stations.findIndex((s) => s.id === station.id);
    const nextIndex = (currentIndex + 1) % stations.length;
    const nextStation = stations[nextIndex];

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

    setCurrentStation(prevStation);
  };

  // Load station and auto-play
  useEffect(() => {
    if (!station || !audioRef.current) return;

    const audio = audioRef.current;
    let timeoutId: number | null = null;

    console.log(`🎵 Loading new station: ${station.name}`);
    setIsLoading(true);
    setLoadError(false);

    audio.src = station.link;
    audio.load();

    // Set timeout for station loading
    timeoutId = window.setTimeout(() => {
      console.error("⏱️ Station loading timeout");
      setIsLoading(false);
      setLoadError(true);
      audio.pause();
    }, STATION_TIMEOUT);

    const handleCanPlay = async () => {
      if (timeoutId) clearTimeout(timeoutId);
      console.log("✅ Station loaded - auto-playing");
      setIsLoading(false);
      setLoadError(false);

      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.log("Auto-play failed:", error);
        setIsPlaying(false);
      }
    };

    const handleError = () => {
      if (timeoutId) clearTimeout(timeoutId);
      console.error("❌ Station loading error");
      setIsLoading(false);
      setLoadError(true);
    };

    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
    };
  }, [station]);

  // Update playback time
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setPlaybackTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Volume control
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Media Session API
  useEffect(() => {
    if (!station || !("mediaSession" in navigator)) return;

    // Update metadata
    navigator.mediaSession.metadata = new MediaMetadata({
      title: station.name,
      artist: `${station.language || "Hindi"} • ${station.type}`,
      album: "DesiMelody.com",
      artwork: [{ src: station.image, sizes: "512x512", type: "image/jpeg" }],
    });

    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

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

    navigator.mediaSession.setActionHandler("play", handlePlay);
    navigator.mediaSession.setActionHandler("pause", handlePause);
    navigator.mediaSession.setActionHandler("nexttrack", playNextStation);
    navigator.mediaSession.setActionHandler("previoustrack", playPreviousStation);

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
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
      <audio ref={audioRef} crossOrigin="anonymous" preload="auto" playsInline />

      <AudioVisualizer audioRef={audioRef} isPlaying={isPlaying} />

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
                    <Pause className="w-4 h-4 sm:w-5 sm:w-5 fill-current" />
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
