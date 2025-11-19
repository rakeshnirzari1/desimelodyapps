import { useMemo } from "react";
import { Helmet } from "react-helmet";
import { NavLink } from "@/components/NavLink";
import { getStationsWithSlugs } from "@/lib/station-utils";
import { Languages } from "lucide-react";
import logo from "@/assets/desimelodylogo.png";

export default function IOSLanguageIndex() {
  const languages = useMemo(() => {
    const allStations = getStationsWithSlugs();
    const langSet = new Set<string>();
    
    allStations.forEach((station) => {
      if (station.language && station.language.trim()) {
        langSet.add(station.language.trim());
      }
    });
    
    return Array.from(langSet).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Browse by Language - iOS Radio | Desi Melody</title>
        <meta name="description" content="Browse Indian radio stations by language" />
      </Helmet>

      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <NavLink to="/ios" className="flex items-center gap-2">
            <img src={logo} alt="Desi Melody" className="h-8" />
          </NavLink>
          <h1 className="text-lg font-semibold">Browse by Language</h1>
        </div>
      </div>

      {/* Languages List */}
      <div className="p-4 space-y-2">
        {languages.map((language) => (
          <NavLink
            key={language}
            to={`/ios/browse?language=${encodeURIComponent(language.toLowerCase())}`}
            className="block p-4 bg-card rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-3">
              <Languages className="w-5 h-5 text-primary" />
              <span className="font-medium capitalize">{language}</span>
            </div>
          </NavLink>
        ))}
      </div>
    </div>
  );
}