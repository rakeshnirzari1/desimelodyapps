import { useState, useRef, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet";
import { Play, Pause, SkipForward, SkipBack, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioStation } from "@/types/station";
import { getStationsWithSlugs } from "@/lib/station-utils";

export default function CarPlayer() {
  const [allStations, setAllStations] = useState<RadioStation[]>([]);
  const [filteredStations, setFilteredStations] = useState<RadioStation[]>([]);
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadAttemptRef = useRef(0);
  const hasAutoSkippedRef = useRef(false);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const beaconIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load stations
  useEffect(() => {
    const stations = getStationsWithSlugs();
    setAllStations(stations);
    setFilteredStations(stations);
    if (stations.length > 0) {
      setCurrentStation(stations[0]);
    }
  }, []);

  // Search results - don't auto-select
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allStations.filter(
      (station) =>
        station.name.toLowerCase().includes(query) ||
        station.language?.toLowerCase().includes(query) ||
        station.tags?.toLowerCase().includes(query) ||
        station.type.toLowerCase().includes(query)
    ).slice(0, 10); // Limit to 10 results
  }, [searchQuery, allStations]);

  // Update filtered stations based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStations(allStations);
    }
  }, [searchQuery, allStations]);

  // Load and play station with auto-skip on error
  useEffect(() => {
    if (!currentStation || !audioRef.current) return;

    const audio = audioRef.current;
    loadAttemptRef.current += 1;
    const currentAttempt = loadAttemptRef.current;
    
    audio.src = currentStation.link;
    setIsLoading(true);

    // Clear any existing error timeout
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }

    const handleCanPlay = async () => {
      if (currentAttempt !== loadAttemptRef.current) return;
      setIsLoading(false);
      hasAutoSkippedRef.current = false; // Reset auto-skip flag on successful load
      if (isPlaying) {
        try {
          await audio.play();
          // Update media session to ensure it stays active
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'playing';
          }
        } catch (error) {
          console.log("Auto-play failed:", error);
          // Keep isPlaying true to maintain lock screen controls
        }
      }
    };

    const handleError = () => {
      if (currentAttempt !== loadAttemptRef.current) return;
      setIsLoading(false);
      console.error("Station loading error:", currentStation.name);
      
      // Play silent audio during error to maintain media session
      if (isPlaying && silentAudioRef.current) {
        silentAudioRef.current.play().catch(console.log);
      }
      
      // Keep playing state true to maintain lock screen controls
      // Only auto-skip once until a station successfully loads
      if (isPlaying && !hasAutoSkippedRef.current) {
        hasAutoSkippedRef.current = true;
        errorTimeoutRef.current = setTimeout(() => {
          silentAudioRef.current?.pause();
          handleNext();
        }, 2000);
      }
    };

    const handleStalled = () => {
      if (currentAttempt !== loadAttemptRef.current) return;
      console.warn("Station stalled:", currentStation.name);
      
      // Play silent audio during stall
      if (isPlaying && silentAudioRef.current) {
        silentAudioRef.current.play().catch(console.log);
      }
      
      // Only auto-skip once until a station successfully loads
      if (isPlaying && !hasAutoSkippedRef.current) {
        hasAutoSkippedRef.current = true;
        errorTimeoutRef.current = setTimeout(() => {
          silentAudioRef.current?.pause();
          handleNext();
        }, 8000);
      }
    };

    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);
    audio.addEventListener("stalled", handleStalled);
    audio.load();

    return () => {
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("stalled", handleStalled);
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [currentStation]);

  // Media Session API for car controls
  useEffect(() => {
    if (!currentStation || !("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentStation.name,
      artist: `${currentStation.language || "Hindi"} • ${currentStation.type}`,
      album: "DesiMelody.com",
      artwork: [{ src: currentStation.image, sizes: "512x512", type: "image/jpeg" }],
    });

    // Always set to 'playing' when isPlaying is true, even during loading
    // This keeps the lock screen controls visible
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

    // Set position state for live streaming (helps maintain lock screen presence)
    try {
      navigator.mediaSession.setPositionState({
        duration: Infinity, // Live stream has no duration
        playbackRate: 1,
        position: 0,
      });
    } catch (e) {
      console.log("Position state not supported");
    }

    navigator.mediaSession.setActionHandler("play", async () => {
      if (audioRef.current) {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.log("Play failed in media session:", error);
          // Keep isPlaying true to maintain controls
          setIsPlaying(true);
        }
      }
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    });

    navigator.mediaSession.setActionHandler("nexttrack", handleNext);
    navigator.mediaSession.setActionHandler("previoustrack", handlePrevious);

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
    };
  }, [currentStation, isPlaying, filteredStations]);

  // Create silent audio keep-alive
  useEffect(() => {
    const silentAudio = new Audio();
    silentAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
    silentAudio.loop = true;
    silentAudio.volume = 0;
    silentAudioRef.current = silentAudio;

    return () => {
      silentAudio.pause();
      silentAudio.src = "";
    };
  }, []);

  // Heartbeat to refresh media session
  useEffect(() => {
    if (!isPlaying || !('mediaSession' in navigator)) return;

    beaconIntervalRef.current = setInterval(() => {
      if (navigator.mediaSession && currentStation) {
        navigator.mediaSession.playbackState = 'playing';
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentStation.name,
          artist: `${currentStation.language || "Hindi"} • ${currentStation.type}`,
          album: "DesiMelody.com",
          artwork: [{ src: currentStation.image, sizes: "512x512", type: "image/jpeg" }],
        });
      }
    }, 5000);

    return () => {
      if (beaconIntervalRef.current) {
        clearInterval(beaconIntervalRef.current);
      }
    };
  }, [isPlaying, currentStation]);

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

  const handleNext = () => {
    if (filteredStations.length === 0) return;
    hasAutoSkippedRef.current = false; // Reset on manual skip
    const currentIndex = filteredStations.findIndex((s) => s.id === currentStation?.id);
    const nextIndex = (currentIndex + 1) % filteredStations.length;
    setCurrentStation(filteredStations[nextIndex]);
  };

  const handlePrevious = () => {
    if
