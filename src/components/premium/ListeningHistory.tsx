import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RadioStation } from "@/types/station";

export const useListeningHistory = () => {
  const { user } = useAuth();

  const addToHistory = async (station: RadioStation) => {
    if (!user) return;

    await supabase
      .from('listening_history')
      .insert({
        user_id: user.id,
        station_id: station.id,
        station_name: station.name,
        station_data: station as any
      });
  };

  return { addToHistory };
};

export const HistoryTracker = ({ station }: { station: RadioStation | null }) => {
  const { addToHistory } = useListeningHistory();

  useEffect(() => {
    if (station) {
      addToHistory(station);
    }
  }, [station?.id]);

  return null;
};
