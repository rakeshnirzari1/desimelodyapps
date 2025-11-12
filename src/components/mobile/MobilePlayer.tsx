import { useState, useRef, useEffect } from "react";
import { RadioStation } from "@/types/station";
import { Play, Pause, SkipForward, SkipBack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdOverlay } from "@/components/AdOverlay";
import {
  getAdUrlForRegion,
  shouldPlayAdOnTimeInterval,
  logAdImpression,
  loadAdAnalytics,
  saveAdAnalytics,
  type AdAnalytics,
} from "@/lib/adManager";

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
  const [isPlayingAd, setIsPlayingAd] = useState(false);
  const [adDuration, setAdDuration] = useState(0);
  const [wasPlayingBeforeAd, setWasPlayingBeforeAd] = useState(false);

  const [adAnalytics, setAdAnalytics] = useState<AdAnalytics>(() => loadAdAnalytics());
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<any>(null);
  const adAudioRef = useRef<HTMLAudioElement>(null);
  const adInProgressRef = useRef(false);
  const wasPlayingBeforeCallRef = useRef(false);
  const wasPlayingBeforeOfflineRef = useRef(false);
  const isUserPausedRef = useRef(false);
  const keepAliveIntervalRef = useRef<number | null>(null);
  const sessionKeepaliveRef = useRef<number | null>(null);
  const inCallRef = useRef(false);
  const stationLoadTimeoutRef = useRef<number | null>(null);
  const mediaSessionSafeKeeperRef = useRef<number | null>(null);
  const adIntervalCheckRef = useRef<number | null>(null);

  // Sync adInProgressRef with isPlayingAd state
  useEffect(() => {
    adInProgressRef.current = isPlayingAd;
  }, [isPlayingAd]);

  // Save analytics whenever they change
  useEffect(() => {
    saveAdAnalytics(adAnalytics);
  }, [adAnalytics]);

  // Play ad with regional targeting - OVERLAY MODE (radio continues at low volume)
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

      console.log("Playing ad overlay:", adUrl);

      // Remember if radio was playing before ad
      setWasPlayingBeforeAd(isPlaying);
      setIsPlayingAd(true);
      // Keep isPlaying true so radio controls stay active

      // OVERLAY MODE: Lower radio volume instead of stopping it
      if (radioAudio && isPlaying) {
        console.log("🔉 Lowering radio volume for ad overlay");
        radioAudio.volume = 0.02; // Very low volume (2%) so ad is clearly audible
      }

      // Load and play ad at maximum volume
      adAudio.src = adUrl;
      adAudio.volume = 1.0; // Ad plays at full volume (100%) to be clearly heard over low radio

      await adAudio.play();

      // Log ad impression
      const updatedAnalytics = await logAdImpression(adAnalytics);
      setAdAnalytics(updatedAnalytics);
    } catch (error) {
      console.error("Error playing ad:", error);
      setIsPlayingAd(false);

      // Restore radio volume if ad fails
      if (audioRef.current && isPlaying) {
        audioRef.current.volume = 0.8; // Restore normal volume
      }

      console.log("Ad playback failed - radio volume restored");
    }
  };

  // Handle ad completion - restore normal radio volume
  const handleAdEnded = () => {
    console.log("Ad finished - restoring normal radio volume");
    setIsPlayingAd(false);

    const radioAudio = audioRef.current;

    // OVERLAY MODE: Restore normal radio volume (radio never stopped playing)
    if (radioAudio && isPlaying) {
      console.log("🔊 Restoring normal radio volume after ad");
      radioAudio.volume = 0.8; // Restore normal volume
    }

    // Reset ad state
    setWasPlayingBeforeAd(false);

    console.log("📻 Radio continues playing at normal volume");
  };

  // Skip ad
  const skipAd = () => {
    console.log("Ad skipped by user");
    if (adAudioRef.current) {
      adAudioRef.current.pause();
      adAudioRef.current.currentTime = 0;
    }

    // Restore radio volume immediately when skipped
    if (audioRef.current && isPlaying) {
      console.log("🔊 Restoring radio volume after ad skip");
      audioRef.current.volume = 0.8; // Restore normal radio volume
    }

    handleAdEnded();
  };

  // Check for time-based ad intervals
  useEffect(() => {
    if (!isPlaying) return;

    adIntervalCheckRef.current = window.setInterval(() => {
      if (shouldPlayAdOnTimeInterval(adAnalytics.sessionStartTime, adAnalytics.lastAdTimestamp)) {
        console.log("Triggering ad on time interval");
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

  // Register MediaSession handlers - used by SafeKeeper
  const registerMediaSessionHandlers = () => {
    if (!("mediaSession" in navigator)) return;

    const handleMediaPlay = async () => {
      console.log("🎵 Media Session PLAY from lock screen/car controls");
      await handlePlay();
    };

    const handleMediaPause = () => {
      console.log("⏸️ Media Session PAUSE from lock screen/car controls");
      handlePauseAction();
    };

    const handleMediaNext = () => {
      console.log("⏭️ Media Session NEXT from car controls");
      onNext();
    };

    const handleMediaPrevious = () => {
      console.log("⏮️ Media Session PREVIOUS from car controls");
      onPrevious();
    };

    try {
      navigator.mediaSession.setActionHandler("play", handleMediaPlay);
      navigator.mediaSession.setActionHandler("pause", handleMediaPause);
      navigator.mediaSession.setActionHandler("nexttrack", handleMediaNext);
      navigator.mediaSession.setActionHandler("previoustrack", handleMediaPrevious);
      console.log("✅ MediaSession handlers registered successfully");
    } catch (e) {
      console.warn("Error registering MediaSession handlers:", e);
    }
  };

  // Load and play from live edge - Enhanced for long pause recovery
  const playFromLiveEdge = async (retryCount = 0): Promise<void> => {
    const MAX_RETRIES = 5; // Increased retries for better reliability after long pauses
    const audio = audioRef.current;

    if (!audio || !station) {
      return Promise.reject(new Error("No audio or station"));
    }

    // Don't play radio if ad is currently playing
    if (isPlayingAd) {
      console.log("Ignoring playFromLiveEdge request - ad is currently playing");
      return Promise.reject(new Error("Ad is playing"));
    }

    console.log(`Playing from live edge (attempt ${retryCount + 1}/${MAX_RETRIES})`);

    try {
      // Resume AudioContext first
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      // CRITICAL: Always force a completely fresh connection for live radio
      // Use a more aggressive cache-busting approach for long pauses
      const timestamp = Date.now();
      const randomParam = Math.random().toString(36).substring(7);
      const sep = station.link.includes("?") ? "&" : "?";

      // Clear existing source first to ensure fresh connection
      audio.src = "";
      audio.load();

      // Set new source with enhanced cache busting
      audio.src = `${station.link}${sep}ts=${timestamp}&r=${randomParam}&live=1`;
      console.log(`Loading fresh live stream: ${audio.src}`);
      audio.load();

      return new Promise((resolve, reject) => {
        // Timeout for this specific attempt
        const loadTimeout = setTimeout(() => {
          console.log(`Load timeout on attempt ${retryCount + 1}`);
          cleanup();

          if (retryCount < MAX_RETRIES - 1) {
            // Progressive backoff for retries
            const delay = Math.min(1000 * (retryCount + 1), 3000);
            setTimeout(() => {
              playFromLiveEdge(retryCount + 1)
                .then(resolve)
                .catch(reject);
            }, delay);
          } else {
            setIsPlaying(false);
            setIsLoading(false);
            setBufferingMessage("Cannot connect to live stream");
            reject(new Error("Load timeout - all retries failed"));
          }
        }, 10000); // 10 second timeout per attempt

        const handleCanPlay = () => {
          console.log("Stream ready - seeking to live edge");

          // Always seek to live edge for radio streams to ensure current content
          if (audio.seekable.length > 0) {
            try {
              const liveEdge = audio.seekable.end(0);
              audio.currentTime = liveEdge;
              console.log(`Seeked to live edge: ${liveEdge} seconds`);
            } catch (e) {
              console.warn("Could not seek to live edge:", e);
              // Continue anyway - some streams don't support seeking
            }
          }

          // Set appropriate volume based on ad state before playing
          audio.volume = isPlayingAd ? 0.02 : 0.8;

          audio
            .play()
            .then(() => {
              console.log(
                "Successfully playing live stream from fresh connection",
                isPlayingAd ? "at low volume (ad overlay)" : "at normal volume",
              );
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
                // Progressive backoff for retries
                const delay = Math.min(1000 * (retryCount + 1), 3000);
                setTimeout(() => {
                  playFromLiveEdge(retryCount + 1)
                    .then(resolve)
                    .catch(reject);
                }, delay);
              } else {
                setIsPlaying(false);
                setIsLoading(false);
                setBufferingMessage("Playback failed - check connection");
                reject(error);
              }
            });
        };

        const handleError = () => {
          console.error(`Stream load error on attempt ${retryCount + 1}`);
          cleanup();

          if (retryCount < MAX_RETRIES - 1) {
            // Progressive backoff for retries
            const delay = Math.min(1000 * (retryCount + 1), 3000);
            setTimeout(() => {
              playFromLiveEdge(retryCount + 1)
                .then(resolve)
                .catch(reject);
            }, delay);
          } else {
            setIsPlaying(false);
            setIsLoading(false);
            setBufferingMessage("Stream unavailable");
            reject(new Error("Failed to load - all retries failed"));
          }
        };

        const cleanup = () => {
          clearTimeout(loadTimeout);
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

    // Don't start radio if ad is currently playing (overlay mode handles this)
    if (isPlayingAd) {
      console.log("Ad is playing - radio will start at low volume for overlay");
      // In overlay mode, we allow radio to start but at low volume
    }

    try {
      console.log("Starting playback after pause...");
      setBufferingMessage("Connecting to live stream...");

      // ALWAYS force a fresh connection for live radio after any pause
      // This ensures we get the latest live content, not stale buffered content

      // Clear any existing source first
      audio.src = "";
      audio.load();

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

      // CRITICAL: Always reload from live edge on resume to ensure fresh live content
      setIsLoading(true);

      try {
        // Force fresh stream connection with cache-busting timestamp
        console.log("Forcing fresh live stream connection...");
        await playFromLiveEdge();

        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "playing";
        }

        console.log("Successfully resumed with fresh live stream");
      } catch (error) {
        console.error("Failed to reload from live edge:", error);
        setIsPlaying(false);
        setIsLoading(false);
        setBufferingMessage("Reconnecting to live stream...");

        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "paused";
        }

        // Enhanced retry with multiple attempts for long pauses
        let retryCount = 0;
        const maxRetries = 5;

        const retryWithBackoff = async () => {
          retryCount++;
          const delay = Math.min(1000 * retryCount, 5000); // Progressive backoff up to 5s

          console.log(`Retry attempt ${retryCount}/${maxRetries} after ${delay}ms delay...`);
          setBufferingMessage(`Reconnecting... (${retryCount}/${maxRetries})`);

          setTimeout(async () => {
            try {
              // Clear and reload again for fresh connection
              audio.src = "";
              audio.load();

              await playFromLiveEdge();

              if ("mediaSession" in navigator) {
                navigator.mediaSession.playbackState = "playing";
              }

              console.log(`Successfully connected on retry ${retryCount}`);
            } catch (e) {
              console.error(`Retry ${retryCount} failed:`, e);

              if (retryCount < maxRetries) {
                retryWithBackoff();
              } else {
                setBufferingMessage("Unable to connect to live stream");
                console.error("All retry attempts failed");
              }
            }
          }, delay);
        };

        retryWithBackoff();
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
      console.log("⏱️ Station loading timeout - auto-skipping to next");
      if (audio.readyState === 0) {
        setIsLoading(false);
        setBufferingMessage("Station timeout, skipping...");

        if ("mediaSession" in navigator) {
          // Keep metadata on lock screen
          navigator.mediaSession.playbackState = "paused";
        }

        // Auto-skip quickly
        setTimeout(() => {
          console.log("⏭️ Calling onNext() due to timeout");
          setBufferingMessage("");
          onNext();
        }, 500);
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

          // Set appropriate volume based on ad state
          audio.volume = isPlayingAd ? 0.02 : 0.8; // Very low volume if ad playing, normal otherwise

          const playPromise = audio.play();
          if (playPromise !== undefined) {
            await playPromise;
            console.log("Successfully playing", isPlayingAd ? "at low volume (ad overlay)" : "at normal volume");
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
      console.log("❌ Station error - auto-skipping to next");
      setIsLoading(false);
      setBufferingMessage("Station unavailable, skipping...");

      // CRITICAL: Keep MediaSession controls visible even during error
      if ("mediaSession" in navigator) {
        // Don't clear metadata - keep it visible on lock screen
        // Just update playback state
        navigator.mediaSession.playbackState = "paused";
      }

      // Auto-skip to next station quickly (500ms instead of 1s)
      setTimeout(() => {
        console.log("⏭️ Calling onNext() to skip bad station");
        setBufferingMessage("");
        onNext();
      }, 500);
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

  // Media Session API for lock screen controls - PERSISTENT with SafeKeeper
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    console.log("🔒 Starting MediaSession SafeKeeper");

    // Register handlers immediately
    registerMediaSessionHandlers();

    // Update metadata
    if (station) {
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
    }

    // Update playback state - show playing during ads if radio was playing
    try {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    } catch (e) {
      console.warn("Error setting playback state:", e);
    }

    // SafeKeeper: Re-register handlers EVERY second to ensure they never get lost
    // Even more critical when stations are failing - refreshes every second
    if (mediaSessionSafeKeeperRef.current) {
      clearInterval(mediaSessionSafeKeeperRef.current);
    }

    mediaSessionSafeKeeperRef.current = window.setInterval(() => {
      try {
        // ALWAYS re-register handlers (critical for failed stations)
        registerMediaSessionHandlers();

        // ALWAYS update metadata (keeps lock screen controls visible)
        if (station) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: station.name,
            artist: `${station.language || "Hindi"} • ${station.type}`,
            album: "DesiMelody.com",
            artwork: [{ src: station.image, sizes: "512x512", type: "image/jpeg" }],
          });
        }

        // ALWAYS sync playback state - radio remains active during ads
        navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

        // If we're loading or have an error message, that's when we need SafeKeeper most!
        if (isLoading || bufferingMessage) {
          console.log("🔄 SafeKeeper: Recovering from error state - handlers refreshed");
        }
      } catch (e) {
        console.warn("SafeKeeper error:", e);
      }
    }, 1000); // Every 1 second (aggressive)

    return () => {
      if (mediaSessionSafeKeeperRef.current) {
        clearInterval(mediaSessionSafeKeeperRef.current);
        mediaSessionSafeKeeperRef.current = null;
      }
    };
  }, [station, isPlaying, bufferingMessage, isLoading, onNext, onPrevious]);

  const togglePlayPause = () => {
    // If ad is playing, user can pause to stop everything
    if (isPlayingAd) {
      // Pause/skip the ad and pause radio
      skipAd();
      setIsPlaying(false);
      setWasPlayingBeforeAd(false);
      return;
    }

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
            <div className="overflow-hidden">
              <h2 className="font-semibold text-base text-foreground marquee-text inline-block whitespace-nowrap">
                {station.name}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {station.language} • {station.type}
            </p>
            {bufferingMessage && <p className="text-xs text-primary mt-1 animate-pulse">{bufferingMessage}</p>}
            {isPlayingAd && (
              <p className="text-xs text-yellow-600 mt-1">🎵 Advertisement overlay - Radio playing at low volume</p>
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
            ) : isPlaying || isPlayingAd ? (
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

      {/* Ad audio element */}
      <audio ref={adAudioRef} preload="auto" />

      {/* Ad Overlay */}
      <AdOverlay isVisible={isPlayingAd} duration={adDuration} onSkip={skipAd} />
    </div>
  );
};
