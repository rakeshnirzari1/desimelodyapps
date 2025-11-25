import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { Play, Radio, TrendingUp, Heart, Clock, Folder, Menu, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioStation } from "@/types/station";
import { getStationsWithSlugs } from "@/lib/station-utils";
import { useAudio } from "@/contexts/AudioContext";
import { Link } from "react-router-dom";
import logo from "@/assets/desimelodylogo.png";

export default function MobileHome() {
  const { setCurrentStation } = useAudio();
  const [isLoading, setIsLoading] = useState(true);
  const [popularStations, setPopularStations] = useState<RadioStation[]>([]);
  const [recentStations, setRecentStations] = useState<RadioStation[]>([]);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      const stations = getStationsWithSlugs();
      
      // Get popular stations (top by votes)
      const popular = [...stations]
        .sort((a, b) => (b.votes || 0) - (a.votes || 0))
        .slice(0, 6);
      setPopularStations(popular);

      // Get recent from localStorage or use first 4
      const recent = stations.slice(0, 4);
      setRecentStations(recent);
      
      setIsLoading(false);
    }, 1500);
  }, []);

  const categories = [
    { name: "Bollywood", icon: "🎬", color: "bg-gradient-to-br from-pink-500 to-rose-600" },
    { name: "Hindi", icon: "🇮🇳", color: "bg-gradient-to-br from-orange-500 to-amber-600" },
    { name: "Tamil", icon: "🎵", color: "bg-gradient-to-br from-blue-500 to-cyan-600" },
    { name: "Punjabi", icon: "🥁", color: "bg-gradient-to-br from-purple-500 to-indigo-600" },
    { name: "News", icon: "📰", color: "bg-gradient-to-br from-red-500 to-pink-600" },
    { name: "Devotional", icon: "🙏", color: "bg-gradient-to-br from-yellow-500 to-orange-600" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 flex items-center justify-center">
        <div className="text-center">
          <img src={logo} alt="DesiMelody" className="w-32 h-32 mx-auto mb-4 animate-pulse" />
          <h1 className="text-3xl font-bold text-white mb-2">DesiMelody</h1>
          <p className="text-white/80">Loading your music...</p>
          <div className="mt-4 w-48 h-1 bg-white/20 rounded-full overflow-hidden mx-auto">
            <div className="h-full bg-white rounded-full animate-[loading_1.5s_ease-in-out_infinite]" style={{
              animation: 'loading 1.5s ease-in-out infinite',
            }} />
          </div>
        </div>
        <style>{`
          @keyframes loading {
            0%, 100% { width: 0%; margin-left: 0%; }
            50% { width: 100%; margin-left: 0%; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-24">
      <Helmet>
        <title>DesiMelody - Radio Streaming</title>
      </Helmet>

      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <img src={logo} alt="DesiMelody" className="w-10 h-10" />
              <div>
                <h1 className="text-xl font-bold text-white">DesiMelody</h1>
                <p className="text-xs text-white/60">Live Radio Streaming</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-white">
              <Menu className="w-6 h-6" />
            </Button>
          </div>
          
          <Link to="/mobile">
            <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2 text-white/70">
              <Search className="w-4 h-4" />
              <span className="text-sm">Search stations...</span>
            </div>
          </Link>
        </div>
      </div>

      <div className="px-4 py-6 space-y-8">
        {/* Categories */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Browse by Genre</h2>
          <div className="grid grid-cols-3 gap-3">
            {categories.map((cat) => (
              <Link key={cat.name} to={`/tag/${cat.name.toLowerCase()}`}>
                <Card className={`${cat.color} border-0 p-4 h-24 flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform`}>
                  <span className="text-3xl">{cat.icon}</span>
                  <span className="text-xs font-medium text-white">{cat.name}</span>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Popular Stations */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-pink-400" />
              Popular Stations
            </h2>
            <Link to="/mobile">
              <Button variant="ghost" size="sm" className="text-pink-400 text-xs">
                See All
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {popularStations.map((station) => (
              <Card
                key={station.id}
                onClick={() => setCurrentStation(station)}
                className="bg-white/5 backdrop-blur-sm border-white/10 p-3 hover:bg-white/10 transition-all cursor-pointer"
              >
                <div className="aspect-square rounded-lg overflow-hidden mb-2 relative">
                  <img
                    src={station.image}
                    alt={station.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <Button
                    size="icon"
                    className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-pink-600 hover:bg-pink-700"
                  >
                    <Play className="w-4 h-4 fill-current" />
                  </Button>
                </div>
                <h3 className="text-sm font-semibold text-white truncate">{station.name}</h3>
                <p className="text-xs text-white/60 truncate">{station.language || "Hindi"}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Recently Played */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Continue Listening
            </h2>
          </div>
          <div className="space-y-2">
            {recentStations.map((station) => (
              <Card
                key={station.id}
                onClick={() => setCurrentStation(station)}
                className="bg-white/5 backdrop-blur-sm border-white/10 p-3 flex items-center gap-3 hover:bg-white/10 transition-all cursor-pointer"
              >
                <img
                  src={station.image}
                  alt={station.name}
                  className="w-14 h-14 rounded-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100";
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{station.name}</h3>
                  <p className="text-xs text-white/60">{station.language || "Hindi"}</p>
                </div>
                <Button size="icon" variant="ghost" className="text-pink-400 shrink-0">
                  <Play className="w-5 h-5" />
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 pt-4">
          <Link to="/premium/favorites">
            <Card className="bg-gradient-to-br from-pink-600/20 to-purple-600/20 backdrop-blur-sm border-pink-500/20 p-4 hover:scale-105 transition-transform">
              <Heart className="w-8 h-8 text-pink-400 mb-2" />
              <h3 className="text-sm font-semibold text-white">Favorites</h3>
              <p className="text-xs text-white/60">Your saved stations</p>
            </Card>
          </Link>
          <Link to="/premium/folders">
            <Card className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 backdrop-blur-sm border-blue-500/20 p-4 hover:scale-105 transition-transform">
              <Folder className="w-8 h-8 text-blue-400 mb-2" />
              <h3 className="text-sm font-semibold text-white">Playlists</h3>
              <p className="text-xs text-white/60">Organize stations</p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
