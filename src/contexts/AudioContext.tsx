import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { RadioStation } from "@/types/station";
import { loadAdAnalytics, saveAdAnalytics, type AdAnalytics } from "@/lib/adManager";

interface AudioContextType {
  currentStation: RadioStation | null;
  setCurrentStation: (station: RadioStation | null) => void;
  stationChangeCount: number;
  incrementStationChangeCount: () => void;
  adAnalytics: AdAnalytics;
  updateAdAnalytics: (analytics: AdAnalytics) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [stationChangeCount, setStationChangeCount] = useState(0);
  const [adAnalytics, setAdAnalytics] = useState<AdAnalytics>(() => loadAdAnalytics());

  // Save analytics whenever they change
  useEffect(() => {
    saveAdAnalytics(adAnalytics);
  }, [adAnalytics]);

  const incrementStationChangeCount = () => {
    setStationChangeCount(prev => prev + 1);
  };

  const updateAdAnalytics = (analytics: AdAnalytics) => {
    setAdAnalytics(analytics);
  };

  return (
    <AudioContext.Provider 
      value={{ 
        currentStation, 
        setCurrentStation,
        stationChangeCount,
        incrementStationChangeCount,
        adAnalytics,
        updateAdAnalytics
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
};
