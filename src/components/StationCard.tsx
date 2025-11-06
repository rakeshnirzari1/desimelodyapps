import { RadioStation } from "@/types/station";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, ExternalLink, ThumbsUp, TrendingUp } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { generateSlug } from "@/lib/slug";

interface StationCardProps {
  station: RadioStation;
  onPlay: (station: RadioStation) => void;
}

export const StationCard = ({ station, onPlay }: StationCardProps) => {
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();
  const slug = station.slug || generateSlug(station.name);

  const handleCardClick = () => {
    navigate(`/${slug}`);
  };

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-hover)] bg-gradient-to-br from-card to-muted/20 cursor-pointer" onClick={handleCardClick}>
      <div className="relative aspect-square overflow-hidden">
        <img
          src={imageError ? "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400" : station.image}
          alt={station.name}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <Button
          asChild
          size="lg"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100 rounded-full w-16 h-16 p-0"
        >
          <Link to={`/${slug}`} onClick={(e) => e.stopPropagation()}>
            <Play className="w-6 h-6 fill-current" />
          </Link>
        </Button>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <Link to={`/${slug}`}>
            <h3 className="font-semibold text-lg line-clamp-1 hover:text-primary transition-colors">
              {station.name}
            </h3>
          </Link>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {station.language || "Hindi"}
            </span>
            <span>•</span>
            <span>{station.type}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" />
              {station.votes.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {station.clicks}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            asChild
            className="flex-1"
            size="sm"
          >
            <Link to={`/${slug}`}>
              <Play className="w-3 h-3 mr-1 fill-current" />
              Listen Now
            </Link>
          </Button>
          {station.website && station.website !== "https://www.radio-browser.info/" && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="px-3"
              onClick={(e) => e.stopPropagation()}
            >
              <a href={station.website} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3 h-3" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
