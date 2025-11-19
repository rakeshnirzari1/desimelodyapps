import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Clock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getStationsWithSlugs } from "@/lib/station-utils";
import { PremiumLayout } from "@/components/premium/PremiumLayout";

export default function Alarms() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alarms, setAlarms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAlarm, setNewAlarm] = useState({
    label: "",
    time: "07:00",
    days: [true, true, true, true, true, false, false], // Mon-Fri default
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadAlarms();
  }, [user]);

  const loadAlarms = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('alarms')
      .select('*')
      .eq('user_id', user.id)
      .order('alarm_time', { ascending: true });

    if (error) {
      toast.error("Failed to load alarms");
    } else {
      setAlarms(data || []);
    }
    setIsLoading(false);
  };

  const toggleAlarm = async (alarmId: string, currentState: boolean) => {
    const { error } = await supabase
      .from('alarms')
      .update({ is_enabled: !currentState })
      .eq('id', alarmId);

    if (error) {
      toast.error("Failed to update alarm");
    } else {
      loadAlarms();
    }
  };

  const deleteAlarm = async (alarmId: string) => {
    const { error } = await supabase
      .from('alarms')
      .delete()
      .eq('id', alarmId);

    if (error) {
      toast.error("Failed to delete alarm");
    } else {
      toast.success("Alarm deleted");
      loadAlarms();
    }
  };

  const createAlarm = async () => {
    if (!user) return;

    const stations = getStationsWithSlugs();
    const randomStation = stations[Math.floor(Math.random() * stations.length)];

    const activeDays = newAlarm.days
      .map((active, index) => active ? index : -1)
      .filter(index => index !== -1);

    const { error } = await supabase
      .from('alarms')
      .insert([{
        user_id: user.id,
        label: newAlarm.label || "Morning Alarm",
        station_id: randomStation.id,
        station_data: randomStation as any,
        alarm_time: newAlarm.time,
        days_of_week: activeDays,
        is_enabled: true
      }]);

    if (error) {
      toast.error("Failed to create alarm");
    } else {
      toast.success("Alarm created!");
      setIsDialogOpen(false);
      setNewAlarm({ label: "", time: "07:00", days: [true, true, true, true, true, false, false] });
      loadAlarms();
    }
  };

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
                  <Clock className="h-6 w-6" />
                  Radio Alarms
                </CardTitle>
                <CardDescription>
                  Wake up to your favorite radio stations
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Alarm
                  </Button>
                </DialogTrigger>
...
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {alarms.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">No alarms set. Create one to wake up with radio!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alarms.map((alarm) => (
                  <div
                    key={alarm.id}
                    className="flex items-center justify-between p-4 rounded-lg border-2 bg-card"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-3xl font-bold">{alarm.alarm_time}</h3>
                        <div>
                          <p className="font-semibold text-lg">{alarm.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {alarm.days_of_week.map((dayIndex: number) => 
                              dayNames[dayIndex]
                            ).join(", ")}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={alarm.is_enabled}
                        onCheckedChange={() => toggleAlarm(alarm.id, alarm.is_enabled)}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteAlarm(alarm.id)}
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
