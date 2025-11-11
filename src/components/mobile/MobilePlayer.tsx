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
  const audioRef2 = useRef<HTMLAudioElement>(null); // Second audio for seamless transitions
  const activeAudioRef = useRef<"audio1" | "audio2">("audio1"); // Track which audio is active
  const audioContextRef = useRef<any>(null);
  const wasPlayingBeforeInterruptionRef = useRef(false);
  const wasPlayingBeforeOfflineRef = useRef(false);
  const audioInterruptedRef = useRef(false);
  const isUserPausedRef = useRef(false);
  const mediaSessionInitializedRef = useRef(false);
  const autoPlayAttemptedRef = useRef(false);
  const keepAliveIntervalRef = useRef<number | null>(null);
  const sessionKeepaliveRef = useRef<number | null>(null);
  const networkChangeTimeoutRef = useRef<number | null>(null);
  const stationLoadTimeoutRef = useRef<number | null>(null);

  // Helper to get active and inactive audio elements
  const getActiveAudio = () => (activeAudioRef.current === "audio1" ? audioRef.current : audioRef2.current);
  const getInactiveAudio = () => (activeAudioRef.current === "audio1" ? audioRef2.current : audioRef.current);
  const swapActiveAudio = () => {
    activeAudioRef.current = activeAudioRef.current === "audio1" ? "audio2" : "audio1";
  };

  // Force reload from live edge with retry logic
  const reloadFromLiveEdge = async (audio: HTMLAudioElement, retryCount = 0): Promise<void> => {
    const MAX_RETRIES = 3;
    console.log(`Reloading from live edge (attempt ${retryCount + 1}/${MAX_RETRIES})`);

    return new Promise((resolve, reject) => {
      if (!station) {
        reject(new Error("No station"));
        return;
      }

      // Pause and reset
      audio.pause();
      audio.currentTime = 0;

      // Force reload with cache-buster
      const sep = station.link.includes("?") ? "&" : "?";
      audio.src = `${station.link}${sep}ts=${Date.now()}`;

      const handleCanPlay = () => {
        // Seek to live edge
        if (audio.seekable.length > 0) {
          try {
            audio.currentTime = audio.seekable.end(0);
            console.log("Seeked to live edge:", audio.seekable.end(0));
          } catch (e) {
            console.warn("Could not seek to live edge:", e);
          }
        }

        // Play
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
          .catch((error) => {
            console.error("Play failed:", error);
            cleanup();

            // Retry if we haven't exceeded max retries
            if (retryCount < MAX_RETRIES - 1) {
              setTimeout(
                () => {
                  reloadFromLiveEdge(audio, retryCount + 1)
                    .then(resolve)
                    .catch(reject);
                },
                500 * (retryCount + 1),
              ); // Exponential backoff
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
              reloadFromLiveEdge(audio, retryCount + 1)
                .then(resolve)
                .catch(reject);
            },
            500 * (retryCount + 1),
          );
        } else {
          setIsPlaying(false);
          setIsLoading(false);
          setBufferingMessage("Station unavailable, skipping...");
          reject(new Error("Failed to load"));
        }
      };

      const cleanup = () => {
        audio.removeEventListener("canplay", handleCanPlay);
        audio.removeEventListener("error", handleError);
      };

      audio.addEventListener("canplay", handleCanPlay, { once: true });
      audio.addEventListener("error", handleError, { once: true });
      audio.load();
    });
  };

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
    if (isPlaying) {
      sessionKeepaliveRef.current = window.setInterval(() => {
        const audio = getActiveAudio();
        if (audio && !audio.paused) {
          console.log("Session keepalive: touching audio element");
          // Touch the audio element to keep session alive
          const currentVol = audio.volume;
          audio.volume = currentVol; // No-op but keeps session active
        }
      }, 5 * 60 * 1000); // Every 5 minutes
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
      const audio = getActiveAudio();

      // If was playing before offline, auto-resume from live edge
      if (audio && wasPlayingBeforeOfflineRef.current) {
        console.log("Auto-resuming playback after network restored");
        setIsLoading(true);
        reloadFromLiveEdge(audio)
          .then(() => {
            wasPlayingBeforeOfflineRef.current = false;
          })
          .catch((error) => {
            console.error("Failed to resume after network change:", error);
            setBufferingMessage("Connection issue, retrying...");
          });
      }
    };

    const handleOffline = () => {
      console.log("Network went offline");
      setBufferingMessage("Network lost, reconnecting...");
      const audio = getActiveAudio();
      if (audio && !audio.paused) {
        wasPlayingBeforeOfflineRef.current = true;
        audio.pause();
        setIsPlaying(false);
      }
    };

    const handleConnectionChange = () => {
      console.log("Network type changed (WiFi <-> Mobile Data)");
      setBufferingMessage("Switching network, please wait...");
      const audio = getActiveAudio();

      // If playing and network changed, reload to ensure continuity
      if (audio && isPlaying && navigator.onLine) {
        console.log("Reloading stream due to network change");
        reloadFromLiveEdge(audio).catch((error) => {
          console.error("Failed to reload after network change:", error);
          setBufferingMessage("Connection issue, retrying...");
        });
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Connection API for detecting network type changes (WiFi <-> Mobile Data)
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
      if (networkChangeTimeoutRef.current) {
        clearTimeout(networkChangeTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  // Comprehensive audio interruption handler - for phone calls, Siri, etc.
  useEffect(() => {
    const handleInterruptionStart = () => {
      console.log("Audio interrupted (call/Siri) - pausing");
      const audio = getActiveAudio();
      if (audio && !audio.paused) {
        audioInterruptedRef.current = true;
        isUserPausedRef.current = false; // This is NOT a user pause
        audio.pause();
        setIsPlaying(false);

        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "paused";
        }
      }
    };

    const handleInterruptionEnd = async () => {
      console.log("Audio interruption ended - checking if should resume");

      // Only resume if it was interrupted (not user-paused)
      if (audioInterruptedRef.current && !isUserPausedRef.current) {
        console.log("Resuming from live edge after interruption");
        audioInterruptedRef.current = false;

        const audio = getActiveAudio();
        if (!audio) return;

        // Resume AudioContext first
        if (audioContextRef.current && audioContextRef.current.state === "suspended") {
          try {
            await audioContextRef.current.resume();
            console.log("AudioContext resumed after interruption");
          } catch (e) {
            console.error("Failed to resume AudioContext:", e);
          }
        }

        setIsLoading(true);
        setBufferingMessage("Resuming after interruption...");

        try {
          await reloadFromLiveEdge(audio);
          console.log("Successfully resumed after interruption");

          if ("mediaSession" in navigator) {
            navigator.mediaSession.playbackState = "playing";
          }
        } catch (error) {
          console.error("Failed to resume after interruption:", error);
          setBufferingMessage("Connection issue, retrying...");

          // Retry after delay
          setTimeout(async () => {
            console.log("Retrying resume after interruption...");
            try {
              await reloadFromLiveEdge(audio);
              if ("mediaSession" in navigator) {
                navigator.mediaSession.playbackState = "playing";
              }
            } catch (e) {
              console.error("Retry failed:", e);
              setBufferingMessage("Could not resume");
            }
          }, 2000);
        }
      } else {
        console.log("Not resuming - interrupted:", audioInterruptedRef.current, "userPaused:", isUserPausedRef.current);
      }
    };

    // Listen for system audio interruptions
    const handleAudioInterruption = (event: any) => {
      if (event.type === "pause" && !isUserPausedRef.current) {
        handleInterruptionStart();
      }
    };

    // Track AudioContext state changes
    if (audioContextRef.current) {
      const handleStateChange = () => {
        console.log("AudioContext state changed to:", audioContextRef.current.state);

        if (audioContextRef.current.state === "interrupted") {
          handleInterruptionStart();
        } else if (audioContextRef.current.state === "running" && audioInterruptedRef.current) {
          handleInterruptionEnd();
        }
      };

      audioContextRef.current.addEventListener("statechange", handleStateChange);
    }

    // Document visibility for detecting when coming back from calls
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Coming back to foreground
        if (audioInterruptedRef.current) {
          console.log("Coming back to foreground with interrupted flag set");
          // Wait a bit for system to settle
          setTimeout(() => {
            handleInterruptionEnd();
          }, 500);
        }
      }
    };

    // Page focus events (more reliable for some devices)
    const handleFocus = () => {
      if (audioInterruptedRef.current) {
        console.log("Page gained focus with interrupted flag");
        setTimeout(() => {
          handleInterruptionEnd();
        }, 500);
      }
    };

    const handleBlur = () => {
      const audio = getActiveAudio();
      if (audio && !audio.paused && !isUserPausedRef.current) {
        setTimeout(() => {
          if (audio.paused && !isUserPausedRef.current) {
            console.log("Audio paused after blur - likely interruption");
            handleInterruptionStart();
          }
        }, 200);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    // Audio element pause events (for system pauses)
    const audio1 = audioRef.current;
    const audio2 = audioRef2.current;

    if (audio1) audio1.addEventListener("pause", handleAudioInterruption);
    if (audio2) audio2.addEventListener("pause", handleAudioInterruption);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);

      if (audio1) audio1.removeEventListener("pause", handleAudioInterruption);
      if (audio2) audio2.removeEventListener("pause", handleAudioInterruption);

      if (audioContextRef.current) {
        try {
          audioContextRef.current.removeEventListener("statechange", () => {});
        } catch (e) {}
      }
    };
  }, [isPlaying]);

  // Load and auto-play station with seamless transitions
  useEffect(() => {
    if (!station || !audioRef.current || !audioRef2.current) return;

    // Update Media Session BEFORE changing station for lock screen
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: station.name,
        artist: `${station.language || "Hindi"} • ${station.type}`,
        album: "DesiMelody.com",
        artwork: [{ src: station.image, sizes: "512x512", type: "image/jpeg" }],
      });
      // Keep playback state as "playing" during transition
      navigator.mediaSession.playbackState = "playing";
    }

    setIsLoading(true);
    setBufferingMessage("Loading station...");
    autoPlayAttemptedRef.current = false;

    // Get current active and inactive audio elements
    const currentAudio = getActiveAudio();
    const nextAudio = getInactiveAudio();

    if (!currentAudio || !nextAudio) return;

    // Load new station in the INACTIVE audio element (background loading)
    const sep = station.link.includes("?") ? "&" : "?";
    nextAudio.src = `${station.link}${sep}ts=${Date.now()}`;
    nextAudio.volume = currentAudio.volume || 0.7; // Match volume
    nextAudio.load();

    // Set timeout for station loading - auto-skip if station doesn't load
    if (stationLoadTimeoutRef.current) {
      clearTimeout(stationLoadTimeoutRef.current);
    }

    stationLoadTimeoutRef.current = window.setTimeout(() => {
      if (nextAudio.readyState === 0 && nextAudio.paused) {
        console.log("Station timed out - auto-skipping to next");
        setIsLoading(false);
        setBufferingMessage("Station timeout, skipping...");

        // Keep Media Session alive
        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "paused";
        }

        setTimeout(() => {
          setBufferingMessage("");
          onNext();
        }, 1000);
      } else if (nextAudio.paused && !autoPlayAttemptedRef.current) {
        console.log("Station loaded - attempting autoplay");
        setIsLoading(false);
        autoPlayAttemptedRef.current = true;
        setTimeout(() => handlePlay(), 50);
      }
    }, 15000); // 15 second timeout

    // Handler for when new station is ready to play
    const handleCanPlay = () => {
      console.log("New station ready - seamless switching");
      setIsLoading(false);
      setBufferingMessage("");

      // Auto-play immediately for first load
      if (!autoPlayAttemptedRef.current) {
        autoPlayAttemptedRef.current = true;

        const playPromise = nextAudio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // SUCCESS: New station is playing
              // Now stop the old station
              if (currentAudio && !currentAudio.paused) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
              }

              // Swap active audio reference
              swapActiveAudio();

              setIsPlaying(true);
              setIsLoading(false);
              setBufferingMessage("");

              // Confirm media session state
              if ("mediaSession" in navigator) {
                navigator.mediaSession.playbackState = "playing";
              }

              if (stationLoadTimeoutRef.current) {
                clearTimeout(stationLoadTimeoutRef.current);
              }
            })
            .catch((error) => {
              console.log("Autoplay blocked on new station:", error.name);
              setIsLoading(false);
              setIsPlaying(false);
              setBufferingMessage("");
            });
        }
      }
    };

    const handleWaiting = () => {
      setBufferingMessage("Buffering, please wait...");
    };

    const handlePlaying = () => {
      setBufferingMessage("");
    };

    const handleError = () => {
      console.log("Station error - auto-skipping to next");
      setIsLoading(false);
      setBufferingMessage("Station unavailable, skipping...");

      // Keep Media Session alive
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
      }

      if (stationLoadTimeoutRef.current) {
        clearTimeout(stationLoadTimeoutRef.current);
      }

      // Auto-skip to next station after 1 second
      setTimeout(() => {
        setBufferingMessage("");
        onNext();
      }, 1000);
    };

    // Listen for when new station is ready
    nextAudio.addEventListener("canplay", handleCanPlay);
    nextAudio.addEventListener("waiting", handleWaiting);
    nextAudio.addEventListener("playing", handlePlaying);
    nextAudio.addEventListener("error", handleError);

    return () => {
      nextAudio.removeEventListener("canplay", handleCanPlay);
      nextAudio.removeEventListener("waiting", handleWaiting);
      nextAudio.removeEventListener("playing", handlePlaying);
      nextAudio.removeEventListener("error", handleError);

      if (stationLoadTimeoutRef.current) {
        clearTimeout(stationLoadTimeoutRef.current);
      }
    };
  }, [station, onNext]);

  // Media Session API for lock screen controls - maintain after long pauses
  useEffect(() => {
    if (!station || !("mediaSession" in navigator)) return;

    // Always set/update metadata
    navigator.mediaSession.metadata = new MediaMetadata({
      title: station.name,
      artist: `${station.language || "Hindi"} • ${station.type}`,
      album: "DesiMelody.com",
      artwork: [{ src: station.image, sizes: "512x512", type: "image/jpeg" }],
    });

    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    mediaSessionInitializedRef.current = true;

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

    // Always set handlers (even after long pauses or calls)
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
        // Refresh playback state to keep session active
        navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
      }
    }, 5000); // Every 5 seconds

    return () => {
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }
    };
  }, [station, isPlaying, onNext, onPrevious]);

  const handlePlay = async () => {
    const audio = getActiveAudio();
    if (!audio) return;

    try {
      console.log("Starting playback...");
      setBufferingMessage("Buffering, please wait...");

      // CRITICAL: Resume AudioContext FIRST
      if (audioContextRef.current) {
        if (audioContextRef.current.state === "suspended") {
          console.log("Resuming suspended AudioContext");
          await audioContextRef.current.resume();
        }
      } else {
        // Try to create and resume if not exists
        try {
          const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
          if (AC) {
            audioContextRef.current = new AC();
            if (audioContextRef.current.state === "suspended") {
              await audioContextRef.current.resume();
            }
          }
        } catch (e) {
          console.log("AudioContext creation failed:", e);
        }
      }

      // Always pause inactive audio to avoid two streams running
      const inactive = getInactiveAudio();
      if (inactive && !inactive.paused) {
        try {
          inactive.pause();
          inactive.currentTime = 0;
        } catch {}
      }

      // Clear flags
      isUserPausedRef.current = false;
      audioInterruptedRef.current = false;
      wasPlayingBeforeOfflineRef.current = false;

      // ALWAYS-RELOAD: every resume reloads from live edge to guarantee live playback
      console.log("Always reloading from live edge for mobile");
      setIsLoading(true);

      try {
        await reloadFromLiveEdge(audio);

        // Update playback state
        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "playing";
          // Re-set metadata to keep session alive
          navigator.mediaSession.metadata = new MediaMetadata({
            title: station.name,
            artist: `${station.language || "Hindi"} • ${station.type}`,
            album: "DesiMelody.com",
            artwork: [{ src: station.image, sizes: "512x512", type: "image/jpeg" }],
          });

          // Re-register handlers to ensure they persist
          navigator.mediaSession.setActionHandler("play", () => handlePlay());
          navigator.mediaSession.setActionHandler("pause", () => handlePauseAction());
          navigator.mediaSession.setActionHandler("nexttrack", () => onNext());
          navigator.mediaSession.setActionHandler("previoustrack", () => onPrevious());
        }

        console.log("Successfully resumed from lock screen");
      } catch (error) {
        console.error("Failed to reload from live edge:", error);
        setIsPlaying(false);
        setIsLoading(false);
        setBufferingMessage("Connection issue, retrying...");

        // Keep Media Session alive even on error
        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "paused";
        }

        // Retry once more after a delay
        setTimeout(async () => {
          console.log("Retrying play after failure...");
          try {
            await reloadFromLiveEdge(audio);
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

      // Set playback state to paused on error
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
      }
    }
  };

  const handlePauseAction = () => {
    const audio = getActiveAudio();
    if (!audio) return;

    isUserPausedRef.current = true; // Mark as user-initiated pause
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
            {bufferingMessage && (
              <p className="text-xs text-primary mt-1 animate-pulse">
                {bufferingMessage}
              </p>
            )}
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

      {/* Hidden audio elements - dual for seamless transitions */}
      <audio ref={audioRef} crossOrigin="anonymous" preload="auto" playsInline />
      <audio ref={audioRef2} crossOrigin="anonymous" preload="auto" playsInline />
    </div>
  );
};
