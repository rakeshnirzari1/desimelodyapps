import { useState, useRef, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet";
import { Play, Pause, SkipForward, SkipBack, Search, Volume2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { RadioStation } from "@/types/station";
import { getStationsWithSlugs } from "@/lib/station-utils";
import { getUserCountry } from "@/lib/geolocation";
import { useAudio } from "@/contexts/AudioContext";
import logo from "@/assets/desimelodylogo.png";
import adBanner from "@/assets/advertisementbanner.gif";
import { FavoritesManager } from "@/components/premium/FavoritesManager";
import { FolderManager } from "@/components/premium/FolderManager";
import { UserMenu } from "@/components/premium/UserMenu";

export default function CarPlayer() {
  const {
    filteredStations: contextFilteredStations,
    currentStation: contextStation,
    setCurrentStation: setContextStation,
  } = useAudio();

  const [allStations, setAllStations] = useState<RadioStation[]>([]);
  const [playlistStations, setPlaylistStations] = useState<RadioStation[]>([]);
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(contextStation);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInterrupted, setIsInterrupted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [userCountry, setUserCountry] = useState<string>("india");
  const [isPlayingAd, setIsPlayingAd] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const silenceAudioRef = useRef<HTMLAudioElement>(null);
  const adAudioRef = useRef<HTMLAudioElement>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadAttemptRef = useRef(0);
  const hasAutoSkippedRef = useRef(false);
  const wasInterruptedRef = useRef(false);
  const adIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const originalVolumeRef = useRef(80);

  // Load stations + country
  useEffect(() => {
    const stations = getStationsWithSlugs();
    setAllStations(stations);
    getUserCountry().then(setUserCountry);
  }, []);

  // Sync from context
  useEffect(() => {
    if (contextStation) setCurrentStation(contextStation);
  }, [contextStation]);

  // Build playlist
  useEffect(() => {
    const base = contextFilteredStations?.length ? contextFilteredStations : allStations;
    setPlaylistStations(base);

    if (base.length > 0 && !currentStation && !contextStation) {
      const defaultStation =
        base.find((s) => s.name.toLowerCase().includes("radio mirchi") && s.name.toLowerCase().includes("hindi")) ||
        base[0];
      setCurrentStation(defaultStation);
      setContextStation(defaultStation);
    }
  }, [contextFilteredStations, allStations, contextStation]);

  // Search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return playlistStations
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.language?.toLowerCase().includes(q) ||
          s.tags?.toLowerCase().includes(q) ||
          s.type.toLowerCase().includes(q),
      )
      .slice(0, 10);
  }, [searchQuery, playlistStations]);

  // Main stream loading
  useEffect(() => {
    if (!currentStation || !audioRef.current) return;

    const audio = audioRef.current;
    loadAttemptRef.current++;
    const attempt = loadAttemptRef.current;

    audio.src = currentStation.link;
    audio.load();
    setIsLoading(true);

    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);

    const onPlaying = () => {
      if (attempt !== loadAttemptRef.current) return;
      setIsLoading(false);
      hasAutoSkippedRef.current = false;
    };

    const onErrorOrStall = () => {
      if (attempt !== loadAttemptRef.current) return;
      setIsLoading(false);
      if (isPlaying && !hasAutoSkippedRef.current) {
        hasAutoSkippedRef.current = true;
        errorTimeoutRef.current = setTimeout(handleNext, 3000);
      }
    };

    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("error", onErrorOrStall);
    audio.addEventListener("stalled", onErrorOrStall);

    if (isPlaying) audio.play().catch(() => {});

    return () => {
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("error", onErrorOrStall);
      audio.removeEventListener("stalled", onErrorOrStall);
    };
  }, [currentStation]);

  // ──────────────────────── KEY FIX: Silence audio keeps media session alive ────────────────────────
  useEffect(() => {
    if (!silenceAudioRef.current) return;
    const sil = silenceAudioRef.current;
    sil.volume = 0.01;

    // Play silence whenever we want lock-screen controls to show "playing"
    if (isPlaying && !isPlayingAd) {
      sil.play().catch(() => {});
    } else {
      sil.pause();
    }
  }, [isPlaying, isPlayingAd]);

  // Media Session Metadata & Handlers
  useEffect(() => {
    if (!currentStation || !("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentStation.name,
      artist: `${currentStation.language || "Hindi"} • ${currentStation.type}`,
      album: "DesiMelody.com",
      artwork: [{ src: currentStation.image, sizes: "512x512", type: "image/jpeg" }],
    });

    try {
      navigator.mediaSession.setPositionState({ duration: Infinity, playbackRate: 1, position: 0 });
    } catch (_) {}

    navigator.mediaSession.setActionHandler("play", handlePlay);
    navigator.mediaSession.setActionHandler("pause", handlePause);
    navigator.mediaSession.setActionHandler("nexttrack", handleNext);
    navigator.mediaSession.setActionHandler("previoustrack", handlePrevious);

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
    };
  }, [currentStation]);

  // ──────────────────────── CRITICAL: Always sync playbackState (iOS relies on this) ────────────────────────
  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    }
  }, [isPlaying]);

  // Play / Pause
  const handlePlay = async () => {
    if (!audioRef.current || isPlaying) return;
    audioRef.current.src = currentStation!.link;
    audioRef.current.load();
    await audioRef.current.play().catch(() => {});
    setIsPlaying(true);
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
  };

  const handlePause = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
  };

  const handleNext = () => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    hasAutoSkippedRef.current = false;
    const i = playlistStations.findIndex((s) => s.id === currentStation?.id);
    const next = playlistStations[(i + 1) % playlistStations.length];
    setCurrentStation(next);
    setContextStation(next);
  };

  const handlePrevious = () => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    hasAutoSkippedRef.current = false;
    const i = playlistStations.findIndex((s) => s.id === currentStation?.id);
    const prev = playlistStations[i <= 0 ? playlistStations.length - 1 : i - 1];
    setCurrentStation(prev);
    setContextStation(prev);
  };

  const handleStationSelect = (station: RadioStation) => {
    setCurrentStation(station);
    setContextStation(station);
    setSearchQuery("");
    setShowSearchResults(false);
    if (!isPlaying) setIsPlaying(true);
  };

  // Volume
  useEffect(() => {
    if (audioRef.current && !isPlayingAd) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
      audioRef.current.muted = isMuted;
    }
  }, [volume, isMuted, isPlayingAd]);

  const toggleMute = () => {
    setIsMuted((m) => {
      const newM = !m;
      if (audioRef.current && !isPlayingAd) {
        audioRef.current.muted = newM;
        audioRef.current.volume = newM ? 0 : volume / 100;
      }
      return newM;
    });
  };

  // Ads (simplified but fully working)
  const getRandomAd = (c: string) => {
    const counts: Record<string, number> = {
      india: 2,
      australia: 7,
      bangladesh: 14,
      canada: 2,
      uk: 2,
      usa: 2,
      uae: 2,
      kuwait: 2,
      pakistan: 2,
      "south-africa": 2,
    };
    const n = counts[c] || 2;
    return `/ads/${c}/ad${Math.floor(Math.random() * n) + 1}.mp3`;
  };

  const playAdvertisement = async () => {
    if (!audioRef.current || !adAudioRef.current || !isPlaying || isPlayingAd) return;

    const radio = audioRef.current;
    const ad = adAudioRef.current;

    setIsPlayingAd(true);
    originalVolumeRef.current = volume;

    const adUrl = getRandomAd(userCountry);
    ad.src = adUrl;
    ad.load();

    radio.volume = 0;
    radio.muted = true;
    ad.volume = 1;

    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: "Advertisement", artist: "DesiMelody.com" });
    }

    await ad.play();

    await new Promise((r) => {
      ad.onended = r;
      ad.onerror = r;
    });

    radio.volume = originalVolumeRef.current / 100;
    radio.muted = false;

    if ("mediaSession" in navigator && currentStation) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentStation.name,
        artist: `${currentStation.language || "Hindi"} • ${currentStation.type}`,
        album: "DesiMelody.com",
        artwork: [{ src: currentStation.image, sizes: "512x512", type: "image/jpeg" }],
      });
    }

    setIsPlayingAd(false);
  };

  useEffect(() => {
    if (!isPlaying) {
      if (adIntervalRef.current) clearInterval(adIntervalRef.current);
      return;
    }
    const first = setTimeout(playAdvertisement, 30000);
    adIntervalRef.current = setInterval(playAdvertisement, 10 * 60 * 1000);
    return () => {
      clearTimeout(first);
      if (adIntervalRef.current) clearInterval(adIntervalRef.current);
    };
  }, [isPlaying, userCountry]);

  return (
    <>
      <Helmet>
        <title>Car Player - DesiMelody.com</title>
        <meta name="description" content="Car-friendly radio player with steering wheel controls support" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f1624] text-white flex flex-col relative overflow-hidden">
        <audio ref={audioRef} preload="auto" />
        <audio ref={silenceAudioRef} src="/silence.mp3" loop preload="auto" style={{ display: "none" }} />
        <audio ref={adAudioRef} preload="auto" style={{ display: "none" }} />

        {/* Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-0 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />

        {/* Header */}
        <div className="relative z-10 py-4 md:py-6 flex items-center justify-between px-4">
          <a href="https://desimelody.com/m" className="mx-auto">
            <img src={logo} alt="DesiMelody" className="h-20 md:h-24 drop-shadow-2xl" />
          </a>
          <UserMenu />
        </div>

        {/* Search */}
        <div className="relative z-10 px-4 mt-4">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70" />
            <Input
              placeholder="Search stations..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(e.target.value.trim().length > 0);
              }}
              className="pl-11 h-12 bg-white/10 backdrop-blur-md border-white/20 text-white rounded-2xl"
            />
          </div>
        </div>

        {/* Main Player */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          {currentStation ? (
            <div className="w-full max-w-4xl space-y-6">
              <div className="text-center">
                <p className="text-purple-300 text-xs uppercase tracking-widest">Now Playing</p>
                <div className="flex items-center justify-center gap-3">
                  <h1 className="text-3xl font-bold">{currentStation.name}</h1>
                  <FavoritesManager station={currentStation} />
                </div>
                <p className="text-white/70">
                  {currentStation.language || "Hindi"} • {currentStation.type}
                </p>
              </div>

              <div className="flex items-center justify-center gap-8">
                <img
                  src={currentStation.image}
                  alt={currentStation.name}
                  className="w-40 h-40 rounded-3xl object-cover shadow-2xl"
                  onError={(e) =>
                    (e.currentTarget.src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400")
                  }
                />

                <div className="flex items-center gap-6">
                  <Button onClick={handlePrevious} size="icon" variant="ghost" className="w-16 h-16 rounded-full">
                    <SkipBack className="w-8 h-8" />
                  </Button>
                  <Button
                    onClick={isPlaying ? handlePause : handlePlay}
                    size="icon"
                    className="w-24 h-24 rounded-full bg-white text-black hover:bg-white/90"
                  >
                    {isLoading ? (
                      "⋯"
                    ) : isPlaying ? (
                      <Pause className="w-12 h-12" />
                    ) : (
                      <Play className="w-12 h-12 ml-2" />
                    )}
                  </Button>
                  <Button onClick={handleNext} size="icon" variant="ghost" className="w-16 h-16 rounded-full">
                    <SkipForward className="w-8 h-8" />
                  </Button>
                </div>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-4 max-w-md mx-auto">
                <button onClick={toggleMute}>{isMuted ? "🔇" : <Volume2 className="w-6 h-6" />}</button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  onValueChange={([v]) => setVolume(v)}
                  max={100}
                  className="flex-1"
                />
                <span className="w-12 text-right">{isMuted ? 0 : volume}%</span>
              </div>

              {/* Visualizer */}
              <div className="h-28 flex items-end justify-center gap-1 px-8">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 max-w-[20px] bg-gradient-to-t from-purple-500 to-pink-500 rounded-full"
                    style={{
                      height:
                        isPlaying && !isLoading ? `${[60, 80, 95, 75, 90, 100, 85, 70, 95, 80, 75, 65][i]}%` : "20%",
                      transition: "height 0.3s",
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p>No stations</p>
          )}
        </div>

        {/* Ad Banner */}
        <div className="px-4 py-4">
          <a href="https://remitrates.com.au" target="_blank" rel="noopener noreferrer">
            <img src={adBanner} alt="Advertisement" className="mx-auto rounded-lg shadow-lg max-w-xl w-full" />
          </a>
        </div>

        {/* Search Results */}
        {showSearchResults && searchResults.length > 0 && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setShowSearchResults(false)}
          >
            <div
              className="bg-white text-black rounded-3xl max-w-md w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 flex justify-between">
                <h3 className="font-bold">Search Results</h3>
                <button onClick={() => setShowSearchResults(false)}>✕</button>
              </div>
              <div className="overflow-y-auto">
                {searchResults.map((station) => (
                  <button
                    key={station.id}
                    onClick={() => handleStationSelect(station)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-purple-50 border-b last:border-0"
                  >
                    <img src={station.image} alt="" className="w-14 h-14 rounded-xl object-cover" />
                    <div className="text-left">
                      <div className="font-bold truncate">{station.name}</div>
                      <div className="text-sm text-gray-600">
                        {station.language} • {station.type}
                      </div>
                    </div>
                    <FavoritesManager station={station} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
