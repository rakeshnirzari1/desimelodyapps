import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RadioStation } from "@/types/station";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Heart, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAudio } from "@/contexts/AudioContext";
import { PremiumLayout } from "@/components/premium/PremiumLayout";

export default function Favorites() {
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
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Failed to load favorites");
    } else {
      setFavorites(data || []);
    }
    setIsLoading(false);
  };

  const removeFavorite = async (favoriteId: string) => {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', favoriteId);

    if (error) {
      toast.error("Failed to remove favorite");
    } else {
      toast.success("Removed from favorites");
      loadFavorites();
    }
  };

  const playStation = (stationData: any) => {
    setCurrentStation(stationData as RadioStation);
    navigate("/");
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <PremiumLayout>
      <div className="max-w-4xl mx-auto">
        <Card className="border-2">
          <CardHeader className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Heart className="h-7 w-7 text-red-500 fill-red-500" />
              My Favorites
            </CardTitle>
            <CardDescription className="text-base">
              Your saved radio stations - available across all your devices
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {favorites.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Heart className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">No favorites yet. Start adding stations you love!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {favorites.map((fav) => (
                  <div
                    key={fav.id}
                    className="flex items-center justify-between p-4 rounded-lg border-2 bg-card hover:bg-accent/20 transition-all"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {fav.station_data?.favicon && (
                        <img
                          src={fav.station_data.favicon}
                          alt={fav.station_name}
                          className="w-14 h-14 rounded-lg object-cover border-2"
                        />
                      )}
                      <div>
                        <h3 className="font-semibold text-lg">{fav.station_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {fav.station_data?.language} • {fav.station_data?.location}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => playStation(fav.station_data)}
                        className="h-10 w-10"
                      >
                        <Play className="h-5 w-5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeFavorite(fav.id)}
                        className="h-10 w-10"
                      >
                        <Trash2 className="h-5 w-5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PremiumLayout>
  );
}
