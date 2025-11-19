import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RadioStation } from "@/types/station";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FavoritesManagerProps {
  station: RadioStation;
  className?: string;
}

export const FavoritesManager = ({ station, className }: FavoritesManagerProps) => {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      checkFavorite();
    }
  }, [user, station.id]);

  const checkFavorite = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('station_id', station.id)
      .single();

    setIsFavorite(!!data);
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast.error("Please sign in to save favorites");
      return;
    }

    setIsLoading(true);

    if (isFavorite) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('station_id', station.id);

      if (error) {
        toast.error("Failed to remove favorite");
      } else {
        setIsFavorite(false);
        toast.success("Removed from favorites");
      }
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          station_id: station.id,
          station_name: station.name,
          station_data: station as any
        });

      if (error) {
        toast.error("Failed to add favorite");
      } else {
        setIsFavorite(true);
        toast.success("Added to favorites");
      }
    }

    setIsLoading(false);
  };

  if (!user) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleFavorite}
      disabled={isLoading}
      className={cn(className)}
    >
      <Heart className={cn("h-5 w-5", isFavorite && "fill-red-500 text-red-500")} />
    </Button>
  );
};
