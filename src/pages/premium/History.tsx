import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RadioStation } from "@/types/station";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { History as HistoryIcon, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAudio } from "@/contexts/AudioContext";
import { formatDistanceToNow } from "date-fns";
import { PremiumLayout } from "@/components/premium/PremiumLayout";

export default function History() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setCurrentStation } = useAudio();
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('listening_history')
      .select('*')
      .eq('user_id', user.id)
      .order('played_at', { ascending: false })
      .limit(50);

    if (error) {
      toast.error("Failed to load history");
    } else {
      setHistory(data || []);
    }
    setIsLoading(false);
  };

  const clearHistory = async () => {
    const { error } = await supabase
      .from('listening_history')
      .delete()
      .eq('user_id', user!.id);

    if (error) {
      toast.error("Failed to clear history");
    } else {
      toast.success("History cleared");
      loadHistory();
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
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <HistoryIcon className="h-7 w-7" />
                  Listening History
                </CardTitle>
                <CardDescription className="text-base">
                  Your recently played stations - never forget what you listened to
                </CardDescription>
              </div>
              {history.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearHistory}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {history.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <HistoryIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">No listening history yet. Start playing some stations!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-lg border-2 bg-card hover:bg-accent/20 transition-all"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {item.station_data?.favicon && (
                        <img
                          src={item.station_data.favicon}
                          alt={item.station_name}
                          className="w-14 h-14 rounded-lg object-cover border-2"
                        />
                      )}
                      <div>
                        <h3 className="font-semibold text-lg">{item.station_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(item.played_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => playStation(item.station_data)}
                      className="h-10 w-10"
                    >
                      <Play className="h-5 w-5" />
                    </Button>
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
