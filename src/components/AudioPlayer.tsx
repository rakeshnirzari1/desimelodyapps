import { useState, useRef, useEffect } from "react";
import { RadioStation } from "@/types/station";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, X, SkipForward } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { AudioVisualizer } from "./AudioVisualizer";
import { getUserCountry, getAdUrl } from "@/lib/geolocation";
import { radioStations } from "@/data/stations";
import { useNavigate } from "react-router-dom";

interface AudioPlayerProps {
  station: RadioStation | null;
  onClose: () => void;
}

const AD_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds
const STATION_TIMEOUT = 10000; // 10 seconds

export const AudioPlayer = ({ station, onClose }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlayingAd, setIsPlayingAd] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
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
        setPlaybackTime(prev => prev + 1);
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

  // Handle advertisement playback every 10 minutes
  useEffect(() => {
    if (!station || !isPlaying || isPlayingAd) return;

    const playAdvertisement = () => {
      if (audioRef.current && adRef.current) {
        // Pause the radio
        audioRef.current.pause();
        setIsPlayingAd(true);

        // Play the ad
        adRef.current.src = adUrl;
        adRef.current.volume = isMuted ? 0 : volume / 100;
        adRef.current.play();
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

  // Handle ad end - resume radio playback
  const handleAdEnd = () => {
    setIsPlayingAd(false);
    if (audioRef.current) {
      audioRef.current.play();
    }
  };

  // Auto-skip to next station if current doesn't load within 10 seconds
  const playNextStation = () => {
    if (!station) return;
    
    const currentIndex = radioStations.findIndex(s => s.id === station.id);
    const nextIndex = (currentIndex + 1) % radioStations.length;
    const nextStation = radioStations[nextIndex];
    
    navigate(`/station/${nextStation.id}`);
  };

  useEffect(() => {
    if (station && audioRef.current) {
      setPlaybackTime(0);
      audioRef.current.src = station.link;
      audioRef.current.load();
      
      // Set timeout for station loading
      stationTimeoutRef.current = setTimeout(() => {
        if (audioRef.current && audioRef.current.paused) {
          console.log("Station timed out, playing next...");
          playNextStation();
        }
      }, STATION_TIMEOUT);

      audioRef.current.play().catch(() => {
        console.log("Failed to play, trying next station...");
        playNextStation();
      });
      
      setIsPlaying(true);

      // Clear timeout when station starts playing
      const handlePlaying = () => {
        if (stationTimeoutRef.current) {
          clearTimeout(stationTimeoutRef.current);
        }
      };
      
      audioRef.current.addEventListener('playing', handlePlaying);

      return () => {
        audioRef.current?.removeEventListener('playing', handlePlaying);
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
    if (adRef.current && isPlayingAd) {
      adRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted, isPlayingAd]);

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

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!station) return null;

  return (
    <Card className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 relative overflow-hidden">
      <audio ref={audioRef} crossOrigin="anonymous" />
      <audio ref={adRef} onEnded={handleAdEnd} />
      
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
            <h4 className="font-semibold truncate">{isPlayingAd ? "Advertisement" : station.name}</h4>
            <p className="text-sm text-muted-foreground">
              {isPlayingAd ? "Please wait..." : `${station.language || "Hindi"} • ${station.type}`}
            </p>
            {!isPlayingAd && (
              <p className="text-xs text-primary font-medium mt-1">
                Playing for {formatTime(playbackTime)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={togglePlay} size="icon" className="rounded-full w-12 h-12">
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

            <Button onClick={onClose} size="icon" variant="ghost" className="w-8 h-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
