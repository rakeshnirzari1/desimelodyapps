import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { radioStations } from "@/data/stations";
import { useNavigate } from "react-router-dom";

export const SearchBar = () => {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    
    const filtered = radioStations.filter((station) =>
      station.name.toLowerCase().includes(query.toLowerCase()) ||
      station.language?.toLowerCase().includes(query.toLowerCase()) ||
      station.location?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8);
    
    return filtered;
  }, [query]);

  const handleSuggestionClick = (stationId: string) => {
    navigate(`/station/${stationId}`);
    setQuery("");
    setShowSuggestions(false);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search stations by name, language, or location..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className="pl-12 pr-4 h-14 text-lg rounded-full border-2 focus:border-primary"
        />
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {suggestions.map((station) => (
            <button
              key={station.id}
              onClick={() => handleSuggestionClick(station.id)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted transition-colors text-left"
            >
              <img
                src={station.image}
                alt={station.name}
                className="w-12 h-12 rounded object-cover"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100";
                }}
              />
              <div className="flex-1">
                <div className="font-medium">{station.name}</div>
                <div className="text-sm text-muted-foreground">
                  {station.language} • {station.location}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
