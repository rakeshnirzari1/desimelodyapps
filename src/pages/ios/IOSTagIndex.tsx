import { useMemo } from "react";
import { Helmet } from "react-helmet";
import { NavLink } from "@/components/NavLink";
import { getStationsWithSlugs } from "@/lib/station-utils";
import { Tag } from "lucide-react";
import logo from "@/assets/desimelodylogo.png";

export default function IOSTagIndex() {
  const tags = useMemo(() => {
    const allStations = getStationsWithSlugs();
    const tagSet = new Set<string>();
    
    allStations.forEach((station) => {
      if (station.tags) {
        station.tags.split(',').forEach(tag => {
          const trimmedTag = tag.trim();
          if (trimmedTag) tagSet.add(trimmedTag);
        });
      }
    });
    
    return Array.from(tagSet).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Browse by Tags - iOS Radio | Desi Melody</title>
        <meta name="description" content="Browse Indian radio stations by music tags and genres" />
      </Helmet>

      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <NavLink to="/ios" className="flex items-center gap-2">
            <img src={logo} alt="Desi Melody" className="h-8" />
          </NavLink>
          <h1 className="text-lg font-semibold">Browse by Tags</h1>
        </div>
      </div>

      {/* Tags List */}
      <div className="p-4 space-y-2">
        {tags.map((tag) => (
          <NavLink
            key={tag}
            to={`/ios/tag/${encodeURIComponent(tag.toLowerCase())}`}
            className="block p-4 bg-card rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-3">
              <Tag className="w-5 h-5 text-primary" />
              <span className="font-medium capitalize">{tag}</span>
            </div>
          </NavLink>
        ))}
      </div>
    </div>
  );
}