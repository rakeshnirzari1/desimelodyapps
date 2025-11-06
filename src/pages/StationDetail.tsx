import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Header } from "@/components/Header";
import { AudioPlayer } from "@/components/AudioPlayer";
import { StationCard } from "@/components/StationCard";
import { OnlineListeners } from "@/components/OnlineListeners";
import { Button } from "@/components/ui/button";
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
  Mail
} from "lucide-react";
import { toast } from "sonner";

const StationDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [station, setStation] = useState<RadioStation | null>(null);
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [relatedStations, setRelatedStations] = useState<RadioStation[]>([]);

  useEffect(() => {
    if (!slug) return;
    
    const found = findStationBySlug(slug);
    if (found) {
      setStation(found);
      // Auto-play the station when page loads
      setCurrentStation(found);
      
      // Find related stations (same language or location)
      const allStations = getStationsWithSlugs();
      const related = allStations
        .filter((s) => 
          s.id !== found.id && 
          (s.language === found.language || s.location === found.location)
        )
        .slice(0, 4);
      setRelatedStations(related);
    } else {
      navigate("/");
    }
  }, [slug, navigate]);

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
  const pageDescription = `Listen to ${station.name} live online. ${station.language || 'Hindi'} ${station.type} radio from ${station.location}. Stream free on Desi Melody.`;

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
            <div className="absolute top-4 right-4">
              <OnlineListeners />
            </div>
          </div>

          <div className="flex flex-col justify-center space-y-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">{station.name}</h1>
              <div className="flex flex-wrap gap-3 mt-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
                  <MapPin className="w-4 h-4" />
                  <span>{station.location}</span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent">
                  <Radio className="w-4 h-4" />
                  <span>{station.language || "Hindi"}</span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary">
                  <Activity className="w-4 h-4" />
                  <span>{station.type}</span>
                </div>
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

            {station.website && (
              <Button
                onClick={() => window.open(station.website, "_blank")}
                variant="outline"
                className="gap-2"
              >
                <Globe className="w-4 h-4" />
                Visit Official Website
              </Button>
            )}

            {/* Social Sharing */}
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 mb-3">
                <Share2 className="w-4 h-4" />
                <span className="font-semibold">Share this station</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleShare("facebook")}
                  title="Share on Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleShare("twitter")}
                  title="Share on Twitter"
                >
                  <Twitter className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleShare("linkedin")}
                  title="Share on LinkedIn"
                >
                  <Linkedin className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleShare("email")}
                  title="Share via Email"
                >
                  <Mail className="w-4 h-4" />
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
        </div>

        {/* Related Stations */}
        {relatedStations.length > 0 && (
          <section className="mt-16">
            <h2 className="text-3xl font-bold mb-6">Related Stations</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedStations.map((relatedStation) => (
                <StationCard
                  key={relatedStation.id}
                  station={relatedStation}
                  onPlay={handlePlay}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <AudioPlayer station={currentStation} onClose={() => setCurrentStation(null)} />
    </div>
  );
};

export default StationDetail;
