import { useEffect, useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AudioPlayer } from "@/components/AudioPlayer";
import { StationCard } from "@/components/StationCard";
import { OnlineListeners } from "@/components/OnlineListeners";
import { SearchBar } from "@/components/SearchBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioStation } from "@/types/station";
import { findStationBySlug, getStationsWithSlugs } from "@/lib/station-utils";
import {
  MapPin,
  Radio,
  Activity,
  TrendingUp,
  Globe,
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { useAudio } from "@/contexts/AudioContext";

const StationDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [station, setStation] = useState<RadioStation | null>(null);
  const { currentStation, setCurrentStation, setFilteredStations } = useAudio();
  const [relatedStations, setRelatedStations] = useState<RadioStation[]>([]);
  const searchQuery = searchParams.get("search");

  useEffect(() => {
    if (!slug) return;

    const found = findStationBySlug(slug);
    if (found) {
      setStation(found);
      // Auto-play the station when page loads
      setCurrentStation(found);

      const allStations = getStationsWithSlugs();

      // If coming from search results, filter by search query for next/prev
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const filtered = allStations.filter((s) => {
          return (
            s.name.toLowerCase().includes(searchLower) ||
            s.tags?.toLowerCase().includes(searchLower) ||
            s.language?.toLowerCase().includes(searchLower) ||
            s.location?.toLowerCase().includes(searchLower) ||
            s.type.toLowerCase().includes(searchLower)
          );
        });
        setFilteredStations(filtered);
        
        // Show related stations from search results
        const related = filtered.filter((s) => s.id !== found.id).slice(0, 8);
        setRelatedStations(related);
      } else {
        // Otherwise, find related stations (same language or location)
        const related = allStations
          .filter((s) => s.id !== found.id && (s.language === found.language || s.location === found.location))
          .slice(0, 8);
        setRelatedStations(related);
        
        // Set filtered stations to related stations for next/prev navigation
        setFilteredStations([found, ...related]);
      }

      // Scroll to show audio player control bar on mobile after a short delay
      setTimeout(() => {
        if (window.innerWidth < 768) {
          const scrollPosition = window.innerHeight * 0.8; // Scroll to show player controls on mobile
          window.scrollTo({ top: scrollPosition, behavior: "smooth" });
        }
      }, 800);
    } else {
      navigate("/");
    }
  }, [slug, navigate, searchQuery]);

  const handlePlay = (stationToPlay: RadioStation) => {
    setCurrentStation(stationToPlay);
  };

  const shareUrl = window.location.href;
  const shareTitle = `Listen to ${station?.name} on Desi Melody`;

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

  if (!station) return null;

  const pageTitle = `${station.name} - Live Radio | Desi Melody`;
  const pageDescription = `Listen to ${station.name} live online. ${station.language || "Hindi"} ${station.type} radio from ${station.location}. Stream free on Desi Melody.`;

  return (
    <div className="min-h-screen flex flex-col pb-24">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={station.image} />
        <meta property="og:type" content="music.radio_station" />
        <meta property="og:url" content={window.location.href} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={station.image} />
      </Helmet>
      <Header />

      {/* Search Bar */}
      <div className="container pt-6 pb-4">
        <SearchBar />
      </div>

      <div className="container py-8">
        {/* Station Hero Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="relative">
            <img
              src={station.image}
              alt={station.name}
              className="w-full aspect-square object-cover rounded-2xl shadow-2xl"
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500";
              }}
            />
          </div>

          <div className="flex flex-col justify-center space-y-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">{station.name}</h1>
              <div className="flex flex-wrap gap-3 mt-4">
                <Link to={`/tag/${encodeURIComponent(station.location)}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-primary/20 transition-colors px-4 py-2 text-sm">
                    <MapPin className="w-4 h-4 mr-2" />
                    {station.location}
                  </Badge>
                </Link>
                <Link to={`/tag/${encodeURIComponent(station.language || "Hindi")}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent/20 transition-colors px-4 py-2 text-sm">
                    <Radio className="w-4 h-4 mr-2" />
                    {station.language || "Hindi"}
                  </Badge>
                </Link>
                <Link to={`/tag/${encodeURIComponent(station.type)}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-secondary/20 transition-colors px-4 py-2 text-sm">
                    <Activity className="w-4 h-4 mr-2" />
                    {station.type}
                  </Badge>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Popularity</span>
                </div>
                <div className="text-2xl font-bold">{station.votes.toLocaleString()}</div>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Activity className="w-4 h-4" />
                  <span className="text-sm">Total Plays</span>
                </div>
                <div className="text-2xl font-bold">{station.clicks.toLocaleString()}</div>
              </div>
            </div>

            {/* Social Sharing */}
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 mb-3">
                <Share2 className="w-4 h-4" />
                <span className="font-semibold">Share this station</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="icon" variant="outline" onClick={() => handleShare("facebook")} title="Share on Facebook">
                  <Facebook className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="outline" onClick={() => handleShare("twitter")} title="Share on Twitter">
                  <Twitter className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="outline" onClick={() => handleShare("linkedin")} title="Share on LinkedIn">
                  <Linkedin className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="outline" onClick={() => handleShare("email")} title="Share via Email">
                  <Mail className="w-4 h-4" />
                </Button>
                <Button variant="outline" onClick={() => handleShare("copy")}>
                  Copy Link
                </Button>
                {station.website && (
                  <Button onClick={() => window.open(station.website, "_blank")} variant="outline" className="gap-2">
                    <Globe className="w-4 h-4" />
                    Visit Site
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AudioPlayer station={currentStation} onClose={() => setCurrentStation(null)} />

      {/* Related Stations - Below Audio Player */}
      {relatedStations.length > 0 && (
        <section className="container mt-8 mb-32">
          <h2 className="text-3xl font-bold mb-6">Related Stations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedStations.map((relatedStation) => (
              <StationCard key={relatedStation.id} station={relatedStation} onPlay={handlePlay} />
            ))}
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default StationDetail;
