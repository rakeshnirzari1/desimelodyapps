import { useState } from "react";
import { Header } from "@/components/Header";
import { StationCard } from "@/components/StationCard";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Button } from "@/components/ui/button";
import { RadioStation } from "@/types/station";
import { radioStations } from "@/data/stations";
import { ArrowRight, Radio, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);

  const featuredStations = radioStations
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 8);

  const handlePlay = (station: RadioStation) => {
    setCurrentStation(station);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Radio className="w-4 h-4" />
              <span>1000+ Indian Radio Stations</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent leading-tight">
              Discover Indian Radio Stations
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Stream live radio from across India. From Bollywood hits to regional classics, find your perfect station.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Link to="/browse">
                <Button size="lg" className="gap-2">
                  Browse All Stations
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/about">
                <Button size="lg" variant="outline">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Stations */}
      <section className="py-16 bg-muted/30">
        <div className="container space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold flex items-center gap-2">
                <TrendingUp className="w-8 h-8 text-primary" />
                Most Popular Stations
              </h2>
              <p className="text-muted-foreground mt-2">
                Top-rated stations loved by millions of listeners
              </p>
            </div>
            <Link to="/browse">
              <Button variant="ghost" className="gap-2">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredStations.map((station) => (
              <StationCard
                key={station.id}
                station={station}
                onPlay={handlePlay}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-2">
              <div className="text-4xl font-bold text-primary">20+</div>
              <div className="text-muted-foreground">Radio Stations</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-4xl font-bold text-accent">10+</div>
              <div className="text-muted-foreground">Languages</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-4xl font-bold text-secondary">100K+</div>
              <div className="text-muted-foreground">Monthly Listeners</div>
            </div>
          </div>
        </div>
      </section>

      <AudioPlayer station={currentStation} onClose={() => setCurrentStation(null)} />
    </div>
  );
};

export default Index;
