import { useEffect } from "react";
import { Helmet } from "react-helmet";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StationCard } from "@/components/StationCard";
import { AudioPlayer } from "@/components/AudioPlayer";
import { SearchBar } from "@/components/SearchBar";
import { OnlineListeners } from "@/components/OnlineListeners";
import { Button } from "@/components/ui/button";
import { RadioStation } from "@/types/station";
import { getStationsWithSlugs } from "@/lib/station-utils";
import { ArrowRight, Radio, TrendingUp, Share2, Facebook, Twitter, Linkedin, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAudio } from "@/contexts/AudioContext";

const Index = () => {
  const { currentStation, setCurrentStation } = useAudio();

  const radioStations = getStationsWithSlugs();

  // Auto-play Radio Mirchi Hindi on homepage load
  useEffect(() => {
    const radioMirchiHindi = radioStations.find(
      (station) => station.name === "Radio Mirchi Hindi"
    );
    if (radioMirchiHindi) {
      setCurrentStation(radioMirchiHindi);
    }
  }, []);
  
  // Featured stations by name
  const featuredStationNames = [
    "Radio Mirchi Hindi",
    "Mirchi Love",
    "RADIO BOLLYWOOD 90s",
    "Hindi Retro",
    "Radio City Hindi",
    "City 92 FM",
    "Mirchi Love Hindi",
    "Radio Bollywood Gaane Purane"
  ];
  
  const featuredStations = radioStations
    .filter(station => featuredStationNames.some(name => 
      station.name.toLowerCase().includes(name.toLowerCase()) || 
      name.toLowerCase().includes(station.name.toLowerCase())
    ))
    .slice(0, 8);
  
  // Popular stations by name
  const popularStationNames = [
    "Radio Mirchi USA",
    "Namaste Bollywood",
    "Bhojpuri Songs",
    "Mixify Bollywood",
    "Mirchi Love Hindi",
    "90's Tamil Melodies",
    "latamangeshkarradio",
    "Red FM 93.5"
  ];
  
  const popularStations = radioStations
    .filter(station => popularStationNames.some(name => 
      station.name.toLowerCase().includes(name.toLowerCase()) || 
      name.toLowerCase().includes(station.name.toLowerCase())
    ))
    .slice(0, 8);

  const handlePlay = (station: RadioStation) => {
    setCurrentStation(station);
  };

  const shareUrl = window.location.href;
  const shareTitle = "Desi Melody - Stream Live Radio from South Asia";

  const handleShare = (platform: string) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(shareTitle);
    
    let url = "";
    switch (platform) {
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case "twitter":
        url = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
        break;
      case "linkedin":
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case "email":
        url = `mailto:?subject=${encodedTitle}&body=${encodedUrl}`;
        break;
      case "copy":
        navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard!");
        return;
    }
    
    if (url) {
      window.open(url, "_blank", "width=600,height=400");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Desi Melody - Stream 1100+ Live Radio Stations | India, Pakistan, Bangladesh, Sri Lanka</title>
        <meta name="description" content="Listen to 1100+ live radio stations from India, Pakistan, Bangladesh, Sri Lanka. Stream Bollywood hits, regional classics, and more. Free online radio streaming." />
        <meta property="og:title" content="Desi Melody - Stream 1100+ Live Radio Stations from South Asia" />
        <meta property="og:description" content="Listen to 1100+ live radio stations from India, Pakistan, Bangladesh, Sri Lanka. Stream Bollywood hits, regional classics, and more. Free online radio streaming." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.href} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Desi Melody - Stream 1100+ Live Radio Stations from South Asia" />
        <meta name="twitter:description" content="Listen to 1100+ live radio stations from India, Pakistan, Bangladesh, Sri Lanka. Stream Bollywood hits, regional classics, and more. Free online radio streaming." />
      </Helmet>
      <Header />

      {/* Hero Section */}
      <section className="relative py-12 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="flex justify-center mb-4">
              <OnlineListeners />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent leading-tight">
              <span className="hidden md:inline">Desi Melody - </span>Endless Vibes
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Stream live radio from India, Pakistan, Bangladesh, Sri Lanka and across South Asia. From Bollywood hits to regional classics.
            </p>
            
            <div className="pt-4">
              <SearchBar onStationSelect={handlePlay} />
            </div>

            <div className="flex items-center justify-center gap-4 pt-2">
              <Link to="/browse">
                <Button size="lg" className="gap-2">
                  Browse All Stations
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Audio Player - Positioned above featured stations */}
      {currentStation && (
        <section className="sticky top-16 z-40">
          <AudioPlayer station={currentStation} onClose={() => setCurrentStation(null)} />
        </section>
      )}

      {/* Featured Stations */}
      <section className="py-16 bg-muted/30">
        <div className="container space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <div>
                <h2 className="text-3xl font-bold flex items-center gap-2">
                  <Radio className="w-8 h-8 text-primary" />
                  Featured Stations
                </h2>
                <p className="text-muted-foreground mt-2">
                  Handpicked stations with the best music and entertainment
                </p>
              </div>
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

      {/* Most Popular Stations */}
      <section className="py-16">
        <div className="container space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <div>
                <h2 className="text-3xl font-bold flex items-center gap-2">
                  <TrendingUp className="w-8 h-8 text-primary" />
                  Most Popular Stations
                </h2>
                <p className="text-muted-foreground mt-2">
                  Top-rated stations loved by millions of listeners across South Asia
                </p>
              </div>
            </div>
            <Link to="/browse">
              <Button variant="ghost" className="gap-2">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularStations.map((station) => (
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
              <div className="text-4xl font-bold text-primary">1100+</div>
              <div className="text-muted-foreground">Radio Stations</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-4xl font-bold text-accent">15+</div>
              <div className="text-muted-foreground">Languages</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-4xl font-bold text-secondary">1M+</div>
              <div className="text-muted-foreground">Monthly Listeners</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold">Why Choose Us?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Your one-stop destination for all Indian radio stations with seamless streaming experience
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-4 p-6 rounded-lg bg-card hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Radio className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">1100+ Stations</h3>
              <p className="text-muted-foreground">
                Access to over 1100 radio stations from India, Pakistan, Bangladesh, Sri Lanka and more
              </p>
            </div>
            <div className="text-center space-y-4 p-6 rounded-lg bg-card hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 mx-auto bg-accent/10 rounded-full flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold">Always Updated</h3>
              <p className="text-muted-foreground">
                Latest hits and classics, constantly updated playlist across all stations
              </p>
            </div>
            <div className="text-center space-y-4 p-6 rounded-lg bg-card hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 mx-auto bg-secondary/10 rounded-full flex items-center justify-center">
                <ArrowRight className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold">Easy Navigation</h3>
              <p className="text-muted-foreground">
                Find your favorite stations quickly with our smart search and filters
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16">
        <div className="container">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold">Browse by Category</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Discover radio stations by your favorite genres and languages
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Hindi', 'Tamil', 'Malayalam', 'Kannada', 'Telugu', 'Punjabi', 'Bengali', 'Marathi'].map((lang) => (
              <Link key={lang} to={`/browse?language=${lang.toLowerCase()}`}>
                <div className="p-6 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 transition-all cursor-pointer text-center">
                  <h4 className="font-semibold text-lg">{lang}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {radioStations.filter(s => s.language?.toLowerCase().includes(lang.toLowerCase())).length} stations
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Social Share Section */}
      <section className="py-12 bg-muted/30">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="flex items-center justify-center gap-2">
              <Share2 className="w-5 h-5 text-primary" />
              <h3 className="text-2xl font-bold">Share Desi Melody</h3>
            </div>
            <p className="text-muted-foreground">
              Love our radio streaming service? Share it with your friends and family!
            </p>
            <div className="flex justify-center gap-3">
              <Button
                size="icon"
                variant="outline"
                onClick={() => handleShare("facebook")}
                title="Share on Facebook"
                className="w-12 h-12"
              >
                <Facebook className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => handleShare("twitter")}
                title="Share on Twitter"
                className="w-12 h-12"
              >
                <Twitter className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => handleShare("linkedin")}
                title="Share on LinkedIn"
                className="w-12 h-12"
              >
                <Linkedin className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => handleShare("email")}
                title="Share via Email"
                className="w-12 h-12"
              >
                <Mail className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                onClick={() => handleShare("copy")}
              >
                Copy Link
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
