import { useState, useRef, useEffect } from "react";
import { RadioStation } from "@/types/station";
import { Play, Pause, SkipForward, SkipBack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAudio } from "@/contexts/AudioContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { getStationsWithSlugs } from "@/lib/station-utils";
import { Card } from "@/components/ui/card";
import { AudioVisualizer } from "./AudioVisualizer";
import { AdOverlay } from "./AdOverlay";
import {
  getAdUrlForRegion,
  shouldPlayAdOnStationChange,
  shouldPlayAdOnTimeInterval,
  logAdImpression,
} from "@/lib/adManager";

interface AudioPlayerProps {
  station: RadioStation | null;
  onClose: () => void;
}

export const AudioPlayer = ({ station, onClose }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [bufferingMessage, setBufferingMessage] = useState("");
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [isPlayingAd, setIsPlayingAd] = useState(false);
  const [adDuration, setAdDuration] = useState(0);

  // Single audio element (cleaner approach from Mobile(2).tsx)
  const audioRef = useRef<HTMLAudioElement>(null);
  const adAudioRef = useRef<HTMLAudioElement>(null);

  // Refs for maintaining state across renders
  const isUserPausedRef = useRef(false);
  const adInProgressRef = useRef(false);
  const wasPlayingBeforeCallRef = useRef(false);
  const wasPlayingBeforeOfflineRef = useRef(false);
  const audioContextRef = useRef<any>(null);
  const stationLoadTimeoutRef = useRef<number | null>(null);
  const keepAliveIntervalRef = useRef<number | null>(null);
  const sessionKeepaliveRef = useRef<number | null>(null);
  const mediaSessionSafeKeeperRef = useRef<number | null>(null);
  const playbackTimerRef = useRef<number | null>(null);
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

  // Register MediaSession handlers
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
      playNextStation();
    };

    const handleMediaPrevious = () => {
      console.log("⏮️ Media Session PREVIOUS from car controls");
      playPreviousStation();
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

  // Playback timer
  useEffect(() => {
    if (isPlaying) {
      playbackTimerRef.current = setInterval((): void => {
        setPlaybackTime((prev: number): number => prev + 1);
      }, 1000);
    } else {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    }

    return () => {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    };
  }, [isPlaying]);

  // Network switching - handle WiFi to mobile data transitions (from Mobile(2).tsx)
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
        }
      } else {
        // App coming back to foreground
        if (wasPlayingBeforeCallRef.current && !isUserPausedRef.current && audio.paused) {
          console.log("App returned from background (likely after call) - auto-resuming");
          wasPlayingBeforeCallRef.current = false;
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

  // Load and play from live edge (simplified from Mobile(2).tsx)
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
        console.log("Resuming suspended AudioContext");
        await audioContextRef.current.resume();
      }

      // Reload stream with cache-buster
      const sep = station.link.includes("?") ? "&" : "?";
      audio.src = `${station.link}${sep}ts=${Date.now()}`;
      audio.load();

      return new Promise((resolve, reject) => {
        const handleCanPlay = () => {
          // Seek to live edge if available
          if (audio.seekable.length > 0) {
            try {
              audio.currentTime = audio.seekable.end(0);
              console.log("Seeked to live edge:", audio.seekable.end(0));
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

              if ("mediaSession" in navigator) {
                navigator.mediaSession.playbackState = "playing";
              }

              cleanup();
              resolve();
            })
            .catch((error: any): void => {
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

        const handleWaiting = () => {
          setBufferingMessage("Buffering, please wait...");
        };

        const handlePlaying = () => {
          setBufferingMessage("");
          setIsPlaying(true);
        };

        const cleanup = () => {
          audio.removeEventListener("canplay", handleCanPlay);
          audio.removeEventListener("error", handleError);
          audio.removeEventListener("waiting", handleWaiting);
          audio.removeEventListener("playing", handlePlaying);
        };

        audio.addEventListener("canplay", handleCanPlay, { once: true });
        audio.addEventListener("error", handleError, { once: true });
        audio.addEventListener("waiting", handleWaiting);
        audio.addEventListener("playing", handlePlaying);
      });
    } catch (error) {
      console.error("Play from live edge error:", error);
      throw error;
    }
  };

  // Load station and auto-play
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

    // Load new station immediately
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
          navigator.mediaSession.playbackState = "paused";
        }

        // Auto-skip quickly
        setTimeout(() => {
          console.log("⏭️ Calling playNextStation() due to timeout");
          setBufferingMessage("");
          playNextStation();
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
      console.log("❌ Station error - auto-skipping to next");
      setIsLoading(false);
      setBufferingMessage("Station unavailable, skipping...");

      // Keep MediaSession controls visible even during error
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
      }

      // Auto-skip to next station quickly
      setTimeout(() => {
        console.log("⏭️ Calling playNextStation() to skip bad station");
        setBufferingMessage("");
        playNextStation();
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
  }, [station]);

  // Media Session SafeKeeper - re-register handlers every second for lock screen stability
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

    // Update playback state
    try {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    } catch (e) {
      console.warn("Error setting playback state:", e);
    }

    // SafeKeeper: Re-register handlers EVERY second to ensure they never get lost
    if (mediaSessionSafeKeeperRef.current) {
      clearInterval(mediaSessionSafeKeeperRef.current);
    }

    mediaSessionSafeKeeperRef.current = window.setInterval(() => {
      try {
        // ALWAYS re-register handlers
        registerMediaSessionHandlers();

        // ALWAYS update metadata
        if (station) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: station.name,
            artist: `${station.language || "Hindi"} • ${station.type}`,
            album: "DesiMelody.com",
            artwork: [{ src: station.image, sizes: "512x512", type: "image/jpeg" }],
          });
        }

        // ALWAYS sync playback state
        navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

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
  }, [station, isPlaying, bufferingMessage, isLoading]);

  // Check if ad should play on station change
  useEffect(() => {
    if (!station) return;

    if (shouldPlayAdOnStationChange(stationChangeCount, adAnalytics.lastAdTimestamp)) {
      console.log("Triggering ad on station change");
      playAd();
    }
  }, [station, stationChangeCount]);

  // Check for time-based ad intervals
  useEffect(() => {
    if (!isPlaying) return;

    adIntervalCheckRef.current = setInterval(() => {
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

  // Register next/prev handlers - disable during ads (mobile lock screen control)
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    if (isPlayingAd) {
      // Disable controls during ad
      console.log("📵 Disabling next/prev handlers - ad is playing");
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
    } else {
      // Enable controls when not playing ad
      console.log("✅ Enabling next/prev handlers - ad finished");
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        console.log("⏭️ Next track from lock screen");
        playNextStation();
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        console.log("⏮️ Previous track from lock screen");
        playPreviousStation();
      });
    }

    return () => {
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
    };
  }, [isPlayingAd]);

  // Setup ad audio element
  useEffect(() => {
    const adAudio = adAudioRef.current;
    if (!adAudio) return;

    const handleAdLoaded = () => {
      setAdDuration(Math.floor(adAudio.duration));
    };

    const handleAdEnded = () => {
      console.log("Ad finished - reloading live stream");
      setIsPlayingAd(false);

      // Pause and reset audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      // Reload the live stream
      if (audioRef.current && station) {
        const sep = station.link.includes("?") ? "&" : "?";
        audioRef.current.src = `${station.link}${sep}ts=${Date.now()}`;
        audioRef.current.load();

        // Play the reloaded stream
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            console.log("Radio reloaded and playing from live edge");
          })
          .catch((error) => {
            console.error("Failed to reload radio:", error);
            // Try again after a short delay
            setTimeout(() => {
              audioRef.current
                ?.play()
                .then(() => setIsPlaying(true))
                .catch(console.error);
            }, 500);
          });
      }
    };

    adAudio.addEventListener("loadedmetadata", handleAdLoaded);
    adAudio.addEventListener("ended", handleAdEnded);

    return () => {
      adAudio.removeEventListener("loadedmetadata", handleAdLoaded);
      adAudio.removeEventListener("ended", handleAdEnded);
    };
  }, [station]);

  // Play ad with regional targeting
  const playAd = async () => {
    if (adInProgressRef.current) {
      console.log("Ad already playing - skipping new ad trigger");
      return;
    }

    try {
      const adUrl = await getAdUrlForRegion();
      const adAudio = adAudioRef.current;

      if (!adAudio) return;

      console.log("Playing ad:", adUrl);
      setIsPlayingAd(true);

      // Pause audio and reset
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      // Load and play ad
      adAudio.src = adUrl;
      adAudio.volume = audioRef.current?.volume || 0.7;

      await adAudio.play();

      // Log ad impression
      const updatedAnalytics = await logAdImpression(adAnalytics);
      updateAdAnalytics(updatedAnalytics);
    } catch (error) {
      console.error("Error playing ad:", error);
      setIsPlayingAd(false);
      // Resume radio if ad fails
      if (audioRef.current && isPlaying) {
        audioRef.current.play().catch(console.error);
      }
    }
  };

  // Skip ad
  const skipAd = () => {
    console.log("Ad skipped by user - resuming radio");
    if (adAudioRef.current) {
      adAudioRef.current.pause();
      adAudioRef.current.currentTime = 0;
    }
    setIsPlayingAd(false);
    // Resume radio
    if (audioRef.current && station) {
      const sep = station.link.includes("?") ? "&" : "?";
      audioRef.current.src = `${station.link}${sep}ts=${Date.now()}`;
      audioRef.current.load();
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(console.error);
    }
  };

  // Change to next station
  const playNextStation = (): void => {
    if (!station) return;

    const stations = filteredStations || getStationsWithSlugs();
    const currentIndex = stations.findIndex((s: RadioStation): boolean => s.id === station.id);
    const nextIndex = (currentIndex + 1) % stations.length;
    const nextStation = stations[nextIndex];

    incrementStationChangeCount();
    setCurrentStation(nextStation);
  };

  // Change to previous station
  const playPreviousStation = (): void => {
    if (!station) return;

    const stations = filteredStations || getStationsWithSlugs();
    const currentIndex = stations.findIndex((s: RadioStation): boolean => s.id === station.id);
    const prevIndex = currentIndex === 0 ? stations.length - 1 : currentIndex - 1;
    const prevStation = stations[prevIndex];

    incrementStationChangeCount();
    setCurrentStation(prevStation);
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

      // Reload from live edge on every resume
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

  // Apply volume to both audio elements
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  if (!station) return null;

  return (
    <Card className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 relative overflow-hidden">
      {/* Single audio element */}
      <audio ref={audioRef} crossOrigin="anonymous" preload="auto" playsInline />
      <audio ref={adAudioRef} preload="auto" />

      <AdOverlay isVisible={isPlayingAd} duration={adDuration} onSkip={skipAd} />

      <AudioVisualizer audioRef={audioRef} isPlaying={isPlaying && !isPlayingAd} />

      <div className="container py-4 relative z-10 max-w-full">
        <div className="flex items-center gap-2 sm:gap-4 max-w-full">
          {/* Station Image */}
          <img
            src={station.image}
            alt={station.name}
            className="w-14 h-14 rounded-lg object-cover shadow-md"
            onError={(e: any): void => {
              e.currentTarget.src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100";
            }}
          />

          {/* Station Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground truncate">{station.name}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {station.language} • {station.type}
            </p>
            {bufferingMessage && <p className="text-xs text-primary mt-1 animate-pulse">{bufferingMessage}</p>}
            <p className="text-xs text-muted-foreground mt-1">{formatTime(playbackTime)}</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={playPreviousStation}
              className="h-10 w-10"
              disabled={isLoading || isPlayingAd}
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              variant="default"
              size="icon"
              onClick={togglePlayPause}
              className="h-12 w-12 rounded-full shadow-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
              ) : isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={playNextStation}
              className="h-10 w-10"
              disabled={isLoading || isPlayingAd}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
