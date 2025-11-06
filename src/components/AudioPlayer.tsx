import { useState, useRef, useEffect } from "react";
import { RadioStation } from "@/types/station";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";

interface AudioPlayerProps {
  station: RadioStation | null;
  onClose: () => void;
}

export const AudioPlayer = ({ station, onClose }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (station && audioRef.current) {
      audioRef.current.src = station.link;
      audioRef.current.load();
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [station]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  if (!station) return null;

  return (
    <Card className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <audio ref={audioRef} />
      <div className="container py-4">
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
            <h4 className="font-semibold truncate">{station.name}</h4>
            <p className="text-sm text-muted-foreground">
              {station.language || "Hindi"} • {station.type}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={togglePlay}
              size="icon"
              className="rounded-full w-12 h-12"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current" />
              )}
            </Button>

            <div className="hidden sm:flex items-center gap-2 w-32">
              <Button
                onClick={toggleMute}
                size="icon"
                variant="ghost"
                className="w-8 h-8"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>
              <Slider
                value={[volume]}
                onValueChange={(value) => setVolume(value[0])}
                max={100}
                step={1}
                className="w-20"
              />
            </div>

            <Button
              onClick={onClose}
              size="icon"
              variant="ghost"
              className="w-8 h-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
