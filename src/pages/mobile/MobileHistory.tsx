import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RadioStation } from "@/types/station";
import CarPlayer from "@/pages/CarPlayer";
import { useAudio } from "@/contexts/AudioContext";

export default function MobileHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setFilteredStations } = useAudio();
  const [history, setHistory] = useState<RadioStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const loadHistory = async () => {
      const { data, error } = await supabase
        .from("listening_history")
        .select("*")
        .eq("user_id", user.id)
        .order("played_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        const stations = data.map((item) => item.station_data as unknown as RadioStation);
        // Remove duplicates
        const uniqueStations = stations.filter(
          (station, index, self) => index === self.findIndex((s) => s.id === station.id)
        );
        setHistory(uniqueStations);
        setFilteredStations(uniqueStations);
      }
      setIsLoading(false);
    };

    loadHistory();
    return () => setFilteredStations(null);
  }, [user, navigate, setFilteredStations]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading history...</div>;
  }

  if (history.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-lg text-muted-foreground mb-4">No listening history yet</p>
        <button onClick={() => navigate("/m")} className="text-primary underline">
          Go back and start listening
        </button>
      </div>
    );
  }

  return <CarPlayer />;
}
