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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <HistoryIcon className="h-6 w-6" />
                  Listening History
                </CardTitle>
                <CardDescription>
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
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <HistoryIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No listening history yet. Start playing some stations!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {item.station_data?.favicon && (
                        <img
                          src={item.station_data.favicon}
                          alt={item.station_name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <h3 className="font-semibold">{item.station_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(item.played_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => playStation(item.station_data)}
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
    </div>
  );
}
