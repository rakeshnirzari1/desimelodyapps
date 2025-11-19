import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RadioStation } from "@/types/station";
import IOSPlayer from "@/pages/ios";
import { useAudio } from "@/contexts/AudioContext";

export default function IOSFavorites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setFilteredStations } = useAudio();
  const [favorites, setFavorites] = useState<RadioStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const loadFavorites = async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const stations = data.map((fav) => fav.station_data as unknown as RadioStation);
        setFavorites(stations);
        setFilteredStations(stations);
      }
      setIsLoading(false);
    };

    loadFavorites();
    return () => setFilteredStations(null);
  }, [user, navigate, setFilteredStations]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading favorites...</div>;
  }

  if (favorites.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-lg text-muted-foreground mb-4">No favorites yet</p>
        <button onClick={() => navigate("/ios")} className="text-primary underline">
          Go back and add some favorites
        </button>
      </div>
    );
  }

  return <IOSPlayer />;
}
