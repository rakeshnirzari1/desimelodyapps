import { createContext, useContext, useState, ReactNode } from "react";
import { RadioStation } from "@/types/station";

interface AudioContextType {
  currentStation: RadioStation | null;
  setCurrentStation: (station: RadioStation | null) => void;
  filteredStations: RadioStation[] | null;
  setFilteredStations: (stations: RadioStation[] | null) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [filteredStations, setFilteredStations] = useState<RadioStation[] | null>(null);

  return (
    <AudioContext.Provider 
      value={{ 
        currentStation, 
        setCurrentStation,
        filteredStations,
        setFilteredStations
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
