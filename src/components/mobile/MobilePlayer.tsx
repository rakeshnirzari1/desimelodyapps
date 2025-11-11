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
  const wasPlayingBeforeOfflineRef = useRef(false);
  const isUserPausedRef = useRef(false);
  const keepAliveIntervalRef = useRef<number | null>(null);
  const sessionKeepaliveRef = useRef<number | null>(null);
  const inCallRef = useRef(false);
  const stationLoadTimeoutRef = useRef<number | null>(null);

  // Initialize AudioContext for mobile
  useEffect(() => {
    const initAudioContext = () => {
      try {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AC && !audioContextRef.current) {
          audioContextRef.current = new AC();
          console.log("AudioContext initialized:", audioContextRef.current.state);
        }
      } catch (error) {
        console.error("Failed to initialize AudioContext:", error);
      }
    };

    initAudioContext();

    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, []);

  // Session keepalive - touch audio every 5 minutes to prevent session loss
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      sessionKeepaliveRef.current = window.setInterval(
        () => {
          if (audioRef.current && !audioRef.current.paused) {
            console.log("Session keepalive: touching audio element");
            const currentVol = audioRef.current.volume;
            audioRef.current.volume = currentVol; // No-op but keeps session active
          }
        },
        5 * 60 * 1000,
      ); // Every 5 minutes
    } else {
      if (sessionKeepaliveRef.current) {
        clearInterval(sessionKeepaliveRef.current);
        sessionKeepaliveRef.current = null;
      }
    }

    return () => {
      if (sessionKeepaliveRef.current) {
        clearInterval(sessionKeepaliveRef.current);
        sessionKeepaliveRef.current = null;
      }
    };
  }, [isPlaying]);

  // Network switching - handle WiFi to mobile data transitions
  useEffect(() => {
    const handleOnline = () => {
      console.log("Network back online");
      setBufferingMessage("Network restored, resuming...");

      if (audioRef.current && wasPlayingBeforeOfflineRef.current) {
        console.log("Auto-resuming playback after network restored");
        wasPlayingBeforeOfflineRef.current = false;
        playFromLiveEdge().catch((error) => {
          console.error("Failed to resume after network change:", error);
          setBufferingMessage("Connection issue, retrying...");
        });
      }
    };

    const handleOffline = () => {
      console.log("Network went offline");
      setBufferingMessage("Network lost, reconnecting...");
      if (audioRef.current && !audioRef.current.paused) {
        wasPlayingBeforeOfflineRef.current = true;
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };

    const handleConnectionChange = () => {
      console.log("Network type changed (WiFi <-> Mobile Data)");
      setBufferingMessage("Switching network, please wait...");

      if (audioRef.current && isPlaying && navigator.onLine) {
        console.log("Reloading stream due to network change");
        playFromLiveEdge().catch((error) => {
          console.error("Failed to reload after network change:", error);
          setBufferingMessage("Connection issue, retrying...");
        });
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const connection =
      (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener("change", handleConnectionChange);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (connection) {
        connection.removeEventListener("change", handleConnectionChange);
      }
    };
  }, [isPlaying]);

  // Detect phone calls and auto-resume after call ends
  useEffect(() => {
    const handleVisibilityChange = () => {
      const audio = audioRef.current;
      if (!audio) return;

      if (document.hidden) {
        // Screen going off or app backgrounding
        if (!audio.paused && !isUserPausedRef.current) {
          console.log("App backgrounding while playing - flagging for call interruption");
          wasPlayingBeforeCallRef.current = true;
          inCallRef.current = true;
        }
      } else {
        // App coming back to foreground
        if (wasPlayingBeforeCallRef.current && !isUserPausedRef.current && audio.paused) {
          console.log("App returned from background (likely after call) - auto-resuming");
          wasPlayingBeforeCallRef.current = false;
          inCallRef.current = false;
          playFromLiveEdge().catch((error) => {
            console.error("Failed to resume after call:", error);
            setBufferingMessage("Connection issue, retrying...");
          });
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Load station and auto-play with immediate loading (single audio element)
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
    setBufferingMessage("Loading station...");
    isUserPausedRef.current = false; // New station should autoplay

    const audio = audioRef.current;

    // Load new station immediately (single element approach)
    const sep = station.link.includes("?") ? "&" : "?";
    audio.src = `${station.link}${sep}ts=${Date.now()}`;
    audio.load();

    // Set timeout for station loading
    if (stationLoadTimeoutRef.current) {
      clearTimeout(stationLoadTimeoutRef.current);
    }

    stationLoadTimeoutRef.current = window.setTimeout(() => {
      if (audio.readyState === 0) {
        console.log("Station timed out - auto-skipping to next");
        setIsLoading(false);
        setBufferingMessage("Station timeout, skipping...");
        setTimeout(() => {
          setBufferingMessage("");
          onNext();
        }, 1000);
      }
    }, 15000); // 15 second timeout

    const handleCanPlay = async () => {
      console.log("Station ready to play");
      setIsLoading(false);
      setBufferingMessage("");

      // Seek to live edge if available
      if (audio.seekable.length > 0) {
        try {
          audio.currentTime = audio.seekable.end(0);
          console.log("Seeked to live edge:", audio.seekable.end(0));
        } catch (e) {
          console.warn("Could not seek to live edge:", e);
        }
      }

      // Auto-play only if not user-paused
      if (!isUserPausedRef.current) {
        try {
          // Resume AudioContext before play
          if (audioContextRef.current && audioContextRef.current.state === "suspended") {
            console.log("Resuming suspended AudioContext");
            await audioContextRef.current.resume();
          }

          const playPromise = audio.play();
          if (playPromise !== undefined) {
            await playPromise;
            console.log("Successfully playing");
            setIsPlaying(true);

            if ("mediaSession" in navigator) {
              navigator.mediaSession.playbackState = "playing";
            }
          }
        } catch (error: any) {
          console.log("Autoplay failed:", error.name);
          setIsPlaying(false);
        }
      }

      if (stationLoadTimeoutRef.current) {
        clearTimeout(stationLoadTimeoutRef.current);
      }
    };

    const handleWaiting = () => {
      setBufferingMessage("Buffering, please wait...");
    };

    const handlePlaying = () => {
      setBufferingMessage("");
      setIsPlaying(true);
    };

    const handleError = () => {
      console.log("Station error - auto-skipping to next");
      setIsLoading(false);
      setBufferingMessage("Station unavailable, skipping...");

      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
      }

      setTimeout(() => {
        setBufferingMessage("");
        onNext();
      }, 1000);
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

      if (stationLoadTimeoutRef.current) {
        clearTimeout(stationLoadTimeoutRef.current);
      }
    };
  }, [station, onNext]);

  // Media Session API for lock screen controls
  useEffect(() => {
    if (!station || !("mediaSession" in navigator)) return;

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
        navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
      }
    }, 5000);

    return () => {
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }
    };
  }, [station, isPlaying, onNext, onPrevious]);

  // Load and play from live edge
  const playFromLiveEdge = async (retryCount = 0): Promise<void> => {
    const MAX_RETRIES = 3;
    const audio = audioRef.current;

    if (!audio || !station) {
      return Promise.reject(new Error("No audio or station"));
    }

    console.log(`Playing from live edge (attempt ${retryCount + 1}/${MAX_RETRIES})`);

    try {
      // Resume AudioContext first
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      // Reload stream
      const sep = station.link.includes("?") ? "&" : "?";
      audio.src = `${station.link}${sep}ts=${Date.now()}`;
      audio.load();

      return new Promise((resolve, reject) => {
        const handleCanPlay = () => {
          // Seek to live edge
          if (audio.seekable.length > 0) {
            try {
              audio.currentTime = audio.seekable.end(0);
            } catch (e) {
              console.warn("Could not seek to live edge:", e);
            }
          }

          audio
            .play()
            .then(() => {
              console.log("Successfully playing from live edge");
              setIsPlaying(true);
              setIsLoading(false);
              setBufferingMessage("");
              cleanup();
              resolve();
            })
            .catch((error: any) => {
              console.error("Play failed:", error);
              cleanup();

              if (retryCount < MAX_RETRIES - 1) {
                setTimeout(
                  () => {
                    playFromLiveEdge(retryCount + 1)
                      .then(resolve)
                      .catch(reject);
                  },
                  500 * (retryCount + 1),
                );
              } else {
                setIsPlaying(false);
                setIsLoading(false);
                setBufferingMessage("Connection issue, retrying...");
                reject(error);
              }
            });
        };

        const handleError = () => {
          console.error("Load error");
          cleanup();

          if (retryCount < MAX_RETRIES - 1) {
            setTimeout(
              () => {
                playFromLiveEdge(retryCount + 1)
                  .then(resolve)
                  .catch(reject);
              },
              500 * (retryCount + 1),
            );
          } else {
            setIsPlaying(false);
            setIsLoading(false);
            setBufferingMessage("Station unavailable");
            reject(new Error("Failed to load"));
          }
        };

        const cleanup = () => {
          audio.removeEventListener("canplay", handleCanPlay);
          audio.removeEventListener("error", handleError);
        };

        audio.addEventListener("canplay", handleCanPlay, { once: true });
        audio.addEventListener("error", handleError, { once: true });
      });
    } catch (error) {
      console.error("Play from live edge error:", error);
      throw error;
    }
  };

  const handlePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      console.log("Starting playback...");
      setBufferingMessage("Buffering, please wait...");

      // Resume AudioContext FIRST
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        console.log("Resuming suspended AudioContext");
        await audioContextRef.current.resume();
      } else if (!audioContextRef.current) {
        // Create if not exists
        try {
          const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
          if (AC) {
            audioContextRef.current = new AC();
            await audioContextRef.current.resume();
          }
        } catch (e) {
          console.log("AudioContext creation failed:", e);
        }
      }

      isUserPausedRef.current = false;
      wasPlayingBeforeCallRef.current = false;

      // Reload from live edge on every resume (ensures live playback)
      setIsLoading(true);

      try {
        await playFromLiveEdge();

        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "playing";
        }

        console.log("Successfully resumed");
      } catch (error) {
        console.error("Failed to reload from live edge:", error);
        setIsPlaying(false);
        setIsLoading(false);
        setBufferingMessage("Connection issue, retrying...");

        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "paused";
        }

        // Retry after delay
        setTimeout(async () => {
          console.log("Retrying play after failure...");
          try {
            await playFromLiveEdge();
            if ("mediaSession" in navigator) {
              navigator.mediaSession.playbackState = "playing";
            }
          } catch (e) {
            console.error("Retry failed:", e);
            setBufferingMessage("Could not connect");
          }
        }, 1500);
      }
    } catch (error) {
      console.error("Play error:", error);
      setBufferingMessage("Connection issue, retrying...");
      setIsPlaying(false);

      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
      }
    }
  };

  const handlePauseAction = () => {
    const audio = audioRef.current;
    if (!audio) return;

    isUserPausedRef.current = true;
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
          <img src={station.image} alt={station.name} className="w-16 h-16 rounded-lg object-cover shadow-md" />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-base text-foreground truncate">{station.name}</h2>
            <p className="text-sm text-muted-foreground truncate">
              {station.language} • {station.type}
            </p>
            {bufferingMessage && <p className="text-xs text-primary mt-1 animate-pulse">{bufferingMessage}</p>}
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

          <Button variant="ghost" size="icon" onClick={onNext} className="h-12 w-12 rounded-full" disabled={isLoading}>
            <SkipForward className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Single audio element - much simpler! */}
      <audio ref={audioRef} crossOrigin="anonymous" preload="auto" playsInline />
    </div>
  );
};
