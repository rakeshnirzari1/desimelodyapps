import { RadioStation } from "@/types/station";
import { Radio } from "lucide-react";

interface MobileStationListProps {
  stations: RadioStation[];
  currentStation: RadioStation | null;
  onStationSelect: (station: RadioStation) => void;
}

export const MobileStationList = ({ stations, currentStation, onStationSelect }: MobileStationListProps) => {
  return (
    <div className="divide-y divide-border">
      {stations.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No stations found</p>
        </div>
      ) : (
        stations.map((station) => {
          const isActive = currentStation?.id === station.id;

          return (
            <button
              key={station.id}
              onClick={() => onStationSelect(station)}
              className={`w-full flex items-center gap-3 px-4 py-4 transition-colors ${
                isActive ? "bg-primary/10 border-l-4 border-primary" : "hover:bg-muted/50 active:bg-muted"
              }`}
            >
              <img src={station.image} alt={station.name} className="w-14 h-14 rounded-lg object-cover shadow-sm" />
              <div className="flex-1 min-w-0 text-left">
                <h3 className={`font-medium text-base truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                  {station.name}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {station.language} • {station.type}
                </p>
                {station.tags && (
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {station.tags
                      .split(",")
                      .slice(0, 3)
                      .map((tag, idx) => (
                        <span key={idx} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {tag.trim()}
                        </span>
                      ))}
                  </div>
                )}
              </div>
              {isActive && (
                <div className="flex-shrink-0">
                  <Radio className="h-5 w-5 text-primary animate-pulse" />
                </div>
              )}
            </button>
          );
        })
      )}
    </div>
  );
};
