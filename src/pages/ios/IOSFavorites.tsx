import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RadioStation } from "@/types/station";
import { useAudio } from "@/contexts/AudioContext";
import { Heart, Play, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function IOSFavorites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setCurrentStation } = useAudio();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadFavorites();
  }, [user, navigate]);

  const loadFavorites = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("favorites")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load favorites");
    } else {
      setFavorites(data || []);
    }
    setIsLoading(false);
  };

  const playStation = (stationData: any) => {
    setCurrentStation(stationData as RadioStation);
    navigate("/ios");
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">Loading favorites...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 p-4">
          <button onClick={() => navigate("/ios")} className="p-2 hover:bg-accent rounded-lg">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Heart className="h-6 w-6 text-red-500 fill-red-500" />
            <h1 className="text-xl font-bold">My Favorites</h1>
          </div>
        </div>
      </div>

      <div className="p-4">
        {favorites.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-16 w-16 mx-auto mb-4 opacity-20 text-muted-foreground" />
            <p className="text-lg text-muted-foreground mb-4">No favorites yet</p>
            <button onClick={() => navigate("/ios")} className="text-primary underline">
              Go back and add some favorites
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="flex items-center gap-4 p-4 rounded-lg border-2 bg-card active:bg-accent/20 transition-all"
              >
                {fav.station_data?.favicon && (
                  <img
                    src={fav.station_data.favicon}
                    alt={fav.station_name}
                    className="w-14 h-14 rounded-lg object-cover border-2"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">{fav.station_name}</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {fav.station_data?.language} • {fav.station_data?.location}
                  </p>
                </div>
                <button
                  onClick={() => playStation(fav.station_data)}
                  className="p-3 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
                >
                  <Play className="h-6 w-6" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
