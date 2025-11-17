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

export const MobilePlayer = ({ station, onNext, onPrevious }: MobilePlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load and play station
  useEffect(() => {
    if (!station || !audioRef.current) return;

    const audio = audioRef.current;
    audio.src = station.link;
    setIsLoading(true);

    const handleCanPlay = async () => {
      setIsLoading(false);
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.log("Auto-play failed:", error);
      }
    };

    const handleError = () => {
      setIsLoading(false);
      console.error("Station loading error");
    };

    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);
    audio.load();

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

    navigator.mediaSession.setActionHandler("play", async () => {
      if (audioRef.current) {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    });

    navigator.mediaSession.setActionHandler("nexttrack", onNext);
    navigator.mediaSession.setActionHandler("previoustrack", onPrevious);

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
    };
  }, [station, isPlaying, onNext, onPrevious]);

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
      }
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 p-4">
      <audio ref={audioRef} preload="auto" playsInline />
      
      <div className="flex items-center gap-4">
        <img
          src={station.image}
          alt={station.name}
          className="w-14 h-14 rounded-lg object-cover"
          onError={(e) => {
            e.currentTarget.src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100";
          }}
        />

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold truncate marquee-text">{station.name}</h4>
          <p className="text-sm text-muted-foreground truncate">
            {isLoading ? "Loading..." : `${station.language || "Hindi"} • Live`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={onPrevious}
            size="icon"
            variant="ghost"
            className="w-10 h-10"
          >
            <SkipBack className="w-5 h-5" />
          </Button>

          <Button
            onClick={togglePlay}
            size="icon"
            className="w-12 h-12 rounded-full"
            disabled={isLoading}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-0.5" />
            )}
          </Button>

          <Button
            onClick={onNext}
            size="icon"
            variant="ghost"
            className="w-10 h-10"
          >
            <SkipForward className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
