import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StationCard } from "@/components/StationCard";
import { AudioPlayer } from "@/components/AudioPlayer";
import { RadioStation } from "@/types/station";
import { radioStations } from "@/data/stations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, SlidersHorizontal } from "lucide-react";
import { useAudio } from "@/contexts/AudioContext";

const Browse = () => {
  const { currentStation, setCurrentStation } = useAudio();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("votes");

  // Initialize search from URL parameter
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch) {
      setSearchQuery(urlSearch);
    }
  }, [searchParams]);

  const languages = useMemo(() => {
    const langs = new Set(radioStations.map((s) => s.language).filter(Boolean));
    return Array.from(langs).sort();
  }, []);

  const filteredStations = useMemo(() => {
    let filtered = radioStations;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (station) =>
          station.name.toLowerCase().includes(query) ||
          station.language?.toLowerCase().includes(query) ||
          station.location?.toLowerCase().includes(query) ||
          station.type?.toLowerCase().includes(query) ||
          station.tags?.toLowerCase().includes(query)
      );
    }

    // Language filter
    if (languageFilter !== "all") {
      filtered = filtered.filter((station) => station.language === languageFilter);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === "votes") return b.votes - a.votes;
      if (sortBy === "clicks") return b.clicks - a.clicks;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });

    return filtered;
  }, [searchQuery, languageFilter, sortBy]);

  const handlePlay = (station: RadioStation) => {
    setCurrentStation(station);
  };

  return (
    <div className="min-h-screen flex flex-col pb-24">
      <Header />

      <div className="container py-8 space-y-8">
        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-3xl font-bold">Browse Stations</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, language, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="md:col-span-3">
              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Languages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  {languages.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="votes">Most Popular</SelectItem>
                  <SelectItem value="clicks">Trending</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredStations.length} station{filteredStations.length !== 1 && "s"}
            </p>
            {(searchQuery || languageFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setLanguageFilter("all");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Stations Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStations.map((station) => (
            <StationCard
              key={station.id}
              station={station}
              onPlay={handlePlay}
            />
          ))}
        </div>

        {filteredStations.length === 0 && (
          <div className="text-center py-16">
            <p className="text-lg text-muted-foreground">
              No stations found. Try adjusting your filters.
            </p>
          </div>
        )}
      </div>

      <Footer />

      <AudioPlayer station={currentStation} onClose={() => setCurrentStation(null)} />
    </div>
  );
};

export default Browse;
