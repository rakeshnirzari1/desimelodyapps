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
  const audioRef2 = useRef<HTMLAudioElement>(null); // Second audio for seamless transitions
  const activeAudioRef = useRef<"audio1" | "audio2">("audio1"); // Track which audio is active
  const adAudioRef = useRef<HTMLAudioElement>(null);
  const adInProgressRef = useRef(false); // Stable ref to prevent race conditions
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const adIntervalCheckRef = useRef<NodeJS.Timeout | null>(null);
  const {
    setCurrentStation,
    stationChangeCount,
    incrementStationChangeCount,
    adAnalytics,
    updateAdAnalytics,
    filteredStations,
  } = useAudio();
  const isMobile = useIsMobile();
  const lastPausedAtRef = useRef<number | null>(null);
  const wasBackgroundedRef = useRef(false);
  const wasPlayingBeforeOfflineRef = useRef(false);

  // Persistent refs for Media Session next/prev handlers
  const nextActionRef = useRef<() => void>(() => {});
  const prevActionRef = useRef<() => void>(() => {});

  // Helper to get active and inactive audio elements
  const getActiveAudio = () => (activeAudioRef.current === "audio1" ? audioRef.current : audioRef2.current);
  const getInactiveAudio = () => (activeAudioRef.current === "audio1" ? audioRef2.current : audioRef.current);
  const swapActiveAudio = () => {
    activeAudioRef.current = activeAudioRef.current === "audio1" ? "audio2" : "audio1";
  };

  // Sync adInProgressRef with isPlayingAd state
  useEffect(() => {
    adInProgressRef.current = isPlayingAd;
  }, [isPlayingAd]);

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

  // Playback timer
  useEffect(() => {
    if (isPlaying) {
      playbackTimerRef.current = setInterval(() => {
        setPlaybackTime((prev) => prev + 1);
      }, 1000);
    } else if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
    }

    return () => {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    };
  }, [isPlaying]);

  // Play ad with regional targeting - OVERLAY MODE (radio continues at low volume)
  const playAd = async () => {
    // Prevent concurrent ads
    if (adInProgressRef.current) {
      console.log("Ad already playing - skipping new ad trigger");
      return;
    }

    try {
      const adUrl = await getAdUrlForRegion();
      const adAudio = adAudioRef.current;
      const activeAudio = getActiveAudio();

      if (!adAudio || !activeAudio) return;

      console.log("Playing ad overlay:", adUrl);

      // Set ad state
      setIsPlayingAd(true);
      // Keep isPlaying true so radio controls stay active

      // OVERLAY MODE: Lower radio volume instead of stopping it
      if (activeAudio && isPlaying) {
        console.log("🔉 Lowering radio volume for ad overlay");
        activeAudio.volume = 0.02; // Very low volume (2%) so ad is clearly audible
      }

      // Load and play ad at maximum volume
      adAudio.src = adUrl;
      adAudio.volume = 1.0; // Ad plays at full volume (100%) to be clearly heard over low radio

      await adAudio.play();

      // Log ad impression
      const updatedAnalytics = await logAdImpression(adAnalytics);
      updateAdAnalytics(updatedAnalytics);
    } catch (error) {
      console.error("Error playing ad:", error);
      setIsPlayingAd(false);

      // Restore radio volume if ad fails
      const activeAudio = getActiveAudio();
      if (activeAudio && isPlaying) {
        activeAudio.volume = isMuted ? 0 : volume / 100; // Restore normal volume
      }

      console.log("Ad playback failed - radio volume restored");
    }
  };

  // Handle ad completion - restore normal radio volume
  const handleAdEnded = () => {
    console.log("Ad finished - restoring normal radio volume");
    setIsPlayingAd(false);

    const activeAudio = getActiveAudio();

    // OVERLAY MODE: Restore normal radio volume (radio never stopped playing)
    if (activeAudio && isPlaying) {
      console.log("🔊 Restoring normal radio volume after ad");
      activeAudio.volume = isMuted ? 0 : volume / 100; // Restore normal volume based on user settings
    }

    console.log("📻 Radio continues playing at normal volume");
  };

  // Skip ad (if user wants)
  const skipAd = () => {
    console.log("Ad skipped by user");
    if (adAudioRef.current) {
      adAudioRef.current.pause();
      adAudioRef.current.currentTime = 0;
    }

    // Restore radio volume immediately when skipped
    const activeAudio = getActiveAudio();
    if (activeAudio && isPlaying) {
      console.log("🔊 Restoring radio volume after ad skip");
      activeAudio.volume = isMuted ? 0 : volume / 100; // Restore normal volume based on user settings
    }

    handleAdEnded();
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

  // Keep Media Session handlers updated with latest callbacks
  useEffect(() => {
    nextActionRef.current = playNextStation;
    prevActionRef.current = playPreviousStation;
  }, [station, filteredStations]);

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

  useEffect(() => {
    if (station && audioRef.current && audioRef2.current) {
      // CRITICAL: Update media session BEFORE changing station for mobile locked screen
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: station.name,
          artist: `${station.language || "Hindi"} • ${station.type}`,
          album: "DesiMelody.com",
          artwork: [{ src: station.image, sizes: "512x512", type: "image/jpeg" }],
        });
        // Keep playback state as "playing" during transition to maintain mobile controls
        navigator.mediaSession.playbackState = "playing";
      }

      setPlaybackTime(0);
      setIsLoading(true);
      setLoadError(false);

      // MOBILE: Seamless transition with dual audio elements to maintain media controls
      // DESKTOP: Simple immediate switch for reliability
      if (isMobile) {
        // Get current active and inactive audio elements
        const currentAudio = getActiveAudio();
        const nextAudio = getInactiveAudio();

        if (!currentAudio || !nextAudio) return;

        // Load new station in the INACTIVE audio element (background loading)
        nextAudio.src = station.link;
        nextAudio.volume = isMuted ? 0 : volume / 100; // Always use normal user volume, not ad-lowered volume
        nextAudio.load();

        // Set timeout for station loading - auto-skip if station doesn't load
        stationTimeoutRef.current = setTimeout(() => {
          if (nextAudio.readyState === 0 && nextAudio.paused) {
            console.log("Station timed out - auto-skipping to next");
            setIsLoading(false);
            setLoadError(true);
            // Auto-skip to next station after 1 second
            setTimeout(() => {
              playNextStation();
            }, 1000);
          } else if (nextAudio.paused) {
            console.log("Station loaded but autoplay blocked");
            setIsLoading(false);
            setIsPlaying(false);
          }
        }, STATION_TIMEOUT);

        // Handler for when new station is ready to play
        const handleCanPlay = () => {
          // GUARD: Don't start station if ad is playing
          if (adInProgressRef.current) {
            console.log("New station ready but ad is playing - delaying start");
            return;
          }

          console.log("New station ready - seamless switching");

          // Play the new station
          const playPromise = nextAudio.play();

          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                // SUCCESS: New station is playing
                // Now fade out and stop the old station
                if (currentAudio && !currentAudio.paused) {
                  currentAudio.pause();
                  currentAudio.currentTime = 0;
                }

                // Swap active audio reference
                swapActiveAudio();

                // Ensure new station has correct volume - if ad is playing, keep radio low
                // If no ad, make sure it's at normal volume
                if (adInProgressRef.current) {
                  console.log("🔉 New station starting during ad - setting low volume");
                  nextAudio.volume = 0.02; // Keep low during ad
                } else {
                  console.log("🔊 New station starting normally - setting user volume");
                  nextAudio.volume = isMuted ? 0 : volume / 100; // Normal user volume
                }

                setIsPlaying(true);
                setIsLoading(false);
                setLoadError(false);

                // Confirm media session state
                if ("mediaSession" in navigator) {
                  navigator.mediaSession.playbackState = "playing";
                }

                if (stationTimeoutRef.current) {
                  clearTimeout(stationTimeoutRef.current);
                }
              })
              .catch((error) => {
                console.log("Autoplay blocked on new station:", error.name);
                setIsLoading(false);
                setIsPlaying(false);
              });
          }
        };

        const handleError = () => {
          console.log("Station error - auto-skipping to next");
          setIsLoading(false);
          setLoadError(true);
          if (stationTimeoutRef.current) {
            clearTimeout(stationTimeoutRef.current);
          }
          // Auto-skip to next station after 1 second
          setTimeout(() => {
            playNextStation();
          }, 1000);
        };

        // Listen for when new station is ready
        nextAudio.addEventListener("canplay", handleCanPlay);
        nextAudio.addEventListener("error", handleError);

        return () => {
          nextAudio.removeEventListener("canplay", handleCanPlay);
          nextAudio.removeEventListener("error", handleError);
          if (stationTimeoutRef.current) {
            clearTimeout(stationTimeoutRef.current);
          }
        };
      } else {
        // DESKTOP: Simple immediate switch (original behavior)
        const audio = audioRef.current;

        audio.src = station.link;
        audio.load();

        // Set timeout for station loading
        stationTimeoutRef.current = setTimeout(() => {
          if (audio.readyState === 0 && audio.paused) {
            console.log("Station timed out - auto-skipping to next");
            setIsLoading(false);
            setLoadError(true);
            setTimeout(() => {
              playNextStation();
            }, 1000);
          } else if (audio.paused) {
            console.log("Station loaded but autoplay blocked");
            setIsLoading(false);
            setIsPlaying(false);
          }
        }, STATION_TIMEOUT);

        const handleCanPlay = () => {
          // GUARD: Don't start station if ad is playing
          if (adInProgressRef.current) {
            console.log("New station ready but ad is playing - delaying start");
            return;
          }

          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setIsPlaying(true);
                setIsLoading(false);
                setLoadError(false);
                if (stationTimeoutRef.current) {
                  clearTimeout(stationTimeoutRef.current);
                }
              })
              .catch((error) => {
                console.log("Autoplay blocked:", error.name);
                setIsLoading(false);
                setIsPlaying(false);
              });
          }
        };

        const handleError = () => {
          console.log("Station error - auto-skipping to next");
          setIsLoading(false);
          setLoadError(true);
          if (stationTimeoutRef.current) {
            clearTimeout(stationTimeoutRef.current);
          }
          setTimeout(() => {
            playNextStation();
          }, 1000);
        };

        audio.addEventListener("canplay", handleCanPlay);
        audio.addEventListener("error", handleError);

        return () => {
          audio.removeEventListener("canplay", handleCanPlay);
          audio.removeEventListener("error", handleError);
          if (stationTimeoutRef.current) {
            clearTimeout(stationTimeoutRef.current);
          }
        };
      }
    }
  }, [station, isMobile]);

  useEffect(() => {
    const activeAudio = getActiveAudio();
    const inactiveAudio = getInactiveAudio();

    if (activeAudio) {
      activeAudio.volume = isMuted ? 0 : volume / 100;
    }
    if (inactiveAudio) {
      inactiveAudio.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Media Session API for car controls and lock screen controls
  useEffect(() => {
    if (!station || !("mediaSession" in navigator)) return;

    // Update metadata (may already be set in station change effect, but ensure it's current)
    navigator.mediaSession.metadata = new MediaMetadata({
      title: station.name,
      artist: `${station.language || "Hindi"} • ${station.type}`,
      album: "DesiMelody.com",
      artwork: [{ src: station.image, sizes: "512x512", type: "image/jpeg" }],
    });

    // Keep session active so next/prev work even while loading or screen is off
    // CRITICAL: Keep as "playing" during loading to maintain mobile controls
    navigator.mediaSession.playbackState = isPlaying || isLoading ? "playing" : "paused";

    navigator.mediaSession.setActionHandler("play", async () => {
      // GUARD: Don't allow play during ad
      if (adInProgressRef.current) {
        console.log("Play action blocked - ad is playing");
        return;
      }

      const audio = getActiveAudio();
      if (!audio) return;
      try {
        // Resume AudioContext (iOS) in response to user gesture
        try {
          const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
          if (AC) {
            const ac = new AC();
            if (ac.state === "suspended") await ac.resume();
            await ac.close();
          }
        } catch {}

        // Always pause inactive audio to avoid two streams running
        const inactive = getInactiveAudio();
        if (inactive && !inactive.paused) {
          try {
            inactive.pause();
            inactive.currentTime = 0;
          } catch {}
        }

        // ALWAYS-RELOAD on mobile: every resume reloads from live edge to guarantee live playback
        if (isMobile) {
          console.log("Mobile resume - always reloading from live edge");
          setIsLoading(true);
          setLoadError(false);
          // reset background/offline flags
          wasBackgroundedRef.current = false;
          wasPlayingBeforeOfflineRef.current = false;

          try {
            await reloadFromLiveEdge(audio);
            lastPausedAtRef.current = null;
          } catch (error) {
            console.error("Failed to reload from live edge:", error);
            setIsPlaying(false);
            setIsLoading(false);
          }
        } else {
          // Desktop - try a simple resume
          if (audio.readyState === 0) {
            audio.load();
          }
          await audio.play();
          setIsPlaying(true);
          lastPausedAtRef.current = null;
        }
      } catch (error) {
        console.error("Play error:", error);
        setIsPlaying(false);
      }
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      const audio = getActiveAudio();
      if (audio) {
        audio.pause();
        setIsPlaying(false);
        lastPausedAtRef.current = Date.now(); // Track pause time
      }
    });

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
    };
  }, [station, isPlaying, isLoading]);

  // Register next/prev handlers - disable during ads
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    if (isPlayingAd) {
      // Disable controls during ad
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
    } else {
      // Enable controls when not playing ad
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        nextActionRef.current();
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        prevActionRef.current();
      });
    }

    return () => {
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
    };
  }, [isPlayingAd]);

  // Track backgrounding to refresh stream on mobile resume
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        wasBackgroundedRef.current = true;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Network switching - handle WiFi to mobile data transitions
  useEffect(() => {
    if (!isMobile) return;

    const handleOnline = () => {
      console.log("Network back online");
      const audio = getActiveAudio();

      // If was playing before offline, auto-resume from live edge
      if (audio && wasPlayingBeforeOfflineRef.current && !adInProgressRef.current) {
        console.log("Auto-resuming playback after network restored");
        setIsLoading(true);
        reloadFromLiveEdge(audio).catch((error) => {
          console.error("Failed to resume after network change:", error);
        });
      }
    };

    const handleOffline = () => {
      console.log("Network went offline");
      const audio = getActiveAudio();
      if (audio && !audio.paused) {
        wasPlayingBeforeOfflineRef.current = true;
        audio.pause();
        setIsPlaying(false);
      }
    };

    const handleConnectionChange = () => {
      console.log("Network type changed");
      const audio = getActiveAudio();

      // If playing and network changed, reload to ensure continuity
      if (audio && isPlaying && !adInProgressRef.current && navigator.onLine) {
        console.log("Reloading stream due to network change");
        reloadFromLiveEdge(audio).catch((error) => {
          console.error("Failed to reload after network change:", error);
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
    };
  }, [isMobile, isPlaying]);

  const togglePlay = async () => {
    // GUARD: Don't allow play toggle during ad
    if (adInProgressRef.current) {
      console.log("Play toggle blocked - ad is playing");
      return;
    }

    const audio = getActiveAudio();
    if (!audio) return;

    if (isPlaying) {
      lastPausedAtRef.current = Date.now();
      wasBackgroundedRef.current = false;
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      // Resume AudioContext (iOS) in response to user gesture
      try {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AC) {
          const ac = new AC();
          if (ac.state === "suspended") await ac.resume();
          await ac.close();
        }
      } catch {}

      // Always pause inactive audio to avoid two streams running
      const inactive = getInactiveAudio();
      if (inactive && !inactive.paused) {
        try {
          inactive.pause();
          inactive.currentTime = 0;
        } catch {}
      }

      // ALWAYS-RELOAD on mobile: every resume reloads from live edge to guarantee live playback
      if (isMobile) {
        console.log("Mobile toggle play - always reloading from live edge");
        setIsLoading(true);
        setLoadError(false);
        wasBackgroundedRef.current = false;
        wasPlayingBeforeOfflineRef.current = false;

        try {
          await reloadFromLiveEdge(audio);
          lastPausedAtRef.current = null;
        } catch (error) {
          console.error("Failed to reload from live edge:", error);
          setIsPlaying(false);
          setIsLoading(false);
        }
      } else {
        // Desktop - try a simple resume
        if (audio.readyState === 0) {
          audio.load();
        }
        await audio.play();
        setIsPlaying(true);
        lastPausedAtRef.current = null;
      }
    } catch (error) {
      console.log("Play failed:", error);
      setIsPlaying(false);
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
      <audio ref={audioRef2} crossOrigin="anonymous" preload="auto" playsInline />
      <audio ref={adAudioRef} preload="auto" />

      <AdOverlay isVisible={isPlayingAd} duration={adDuration} onSkip={skipAd} />

      <AudioVisualizer
        audioRef={getActiveAudio() === audioRef.current ? audioRef : audioRef2}
        isPlaying={isPlaying && !isPlayingAd}
      />

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
