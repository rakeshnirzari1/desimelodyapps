import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { FolderHeart, Plus, Trash2, Play } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PremiumLayout } from "@/components/premium/PremiumLayout";
import { RadioStation } from "@/types/station";
import { useAudio } from "@/contexts/AudioContext";

export default function Folders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setCurrentStation } = useAudio();
  const [folders, setFolders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<any | null>(null);
  const [folderStations, setFolderStations] = useState<any[]>([]);
  const [newFolder, setNewFolder] = useState({
    name: "",
    icon: "📻",
    color: "#3b82f6"
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadFolders();
  }, [user]);

  const loadFolders = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('custom_folders')
      .select(`
        *,
        folder_stations(count)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Failed to load folders");
    } else {
      setFolders(data || []);
    }
    setIsLoading(false);
  };

  const createFolder = async () => {
    if (!user || !newFolder.name) {
      toast.error("Please enter a folder name");
      return;
    }

    const { error } = await supabase
      .from('custom_folders')
      .insert({
        user_id: user.id,
        name: newFolder.name,
        icon: newFolder.icon,
        color: newFolder.color
      });

    if (error) {
      toast.error("Failed to create folder");
    } else {
      toast.success("Folder created!");
      setIsDialogOpen(false);
      setNewFolder({ name: "", icon: "📻", color: "#3b82f6" });
      loadFolders();
    }
  };

  const deleteFolder = async (folderId: string) => {
    const { error } = await supabase
      .from('custom_folders')
      .delete()
      .eq('id', folderId);

    if (error) {
      toast.error("Failed to delete folder");
    } else {
      toast.success("Folder deleted");
      loadFolders();
    }
  };

  const loadFolderStations = async (folderId: string) => {
    const { data, error } = await supabase
      .from('folder_stations')
      .select('*')
      .eq('folder_id', folderId)
      .order('added_at', { ascending: false });

    if (error) {
      toast.error("Failed to load folder stations");
    } else {
      setFolderStations(data || []);
    }
  };

  const playFolderStation = (stationData: any) => {
    setCurrentStation(stationData as RadioStation);
    navigate("/");
  };

  const removeStationFromFolder = async (stationId: string) => {
    const { error } = await supabase
      .from('folder_stations')
      .delete()
      .eq('id', stationId);

    if (error) {
      toast.error("Failed to remove station");
    } else {
      toast.success("Station removed");
      if (selectedFolder) {
        loadFolderStations(selectedFolder.id);
      }
    }
  };

  const emojiOptions = ["📻", "🎵", "🎶", "🎧", "🎤", "🎼", "🔊", "📱", "⭐", "❤️", "🌟", "💫"];

  if (isLoading) {
    return (
      <PremiumLayout>
        <div className="flex items-center justify-center py-12">Loading...</div>
      </PremiumLayout>
    );
  }

  return (
    <PremiumLayout>
      <div className="max-w-6xl mx-auto">
        {!selectedFolder ? (
          <Card className="border-2">
            <CardHeader className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <FolderHeart className="h-7 w-7" />
                    My Folders
                  </CardTitle>
                  <CardDescription className="text-base">
                    Organize your stations into custom collections
                  </CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Folder
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Folder</DialogTitle>
                      <DialogDescription>
                        Create a custom folder to organize your stations
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="folder-name">Folder Name</Label>
                        <Input
                          id="folder-name"
                          value={newFolder.name}
                          onChange={(e) => setNewFolder({ ...newFolder, name: e.target.value })}
                          placeholder="e.g., Morning Bhajans, Gym Music"
                        />
                      </div>
                      <div>
                        <Label>Icon</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {emojiOptions.map((emoji) => (
                            <Button
                              key={emoji}
                              variant={newFolder.icon === emoji ? "default" : "outline"}
                              size="sm"
                              onClick={() => setNewFolder({ ...newFolder, icon: emoji })}
                            >
                              {emoji}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="folder-color">Color</Label>
                        <Input
                          id="folder-color"
                          type="color"
                          value={newFolder.color}
                          onChange={(e) => setNewFolder({ ...newFolder, color: e.target.value })}
                        />
                      </div>
                      <Button onClick={createFolder} className="w-full">Create Folder</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {folders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderHeart className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg">No folders yet. Create one to organize your stations!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      className="p-6 rounded-lg border-2 bg-card hover:bg-accent/20 transition-all cursor-pointer"
                      style={{ borderColor: folder.color + "40" }}
                      onClick={() => {
                        setSelectedFolder(folder);
                        loadFolderStations(folder.id);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className="text-4xl w-14 h-14 flex items-center justify-center rounded-lg"
                            style={{ backgroundColor: folder.color + "20" }}
                          >
                            {folder.icon}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{folder.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {folder.folder_stations?.[0]?.count || 0} stations
                            </p>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFolder(folder.id);
                          }}
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
        ) : (
          <Card className="border-2">
            <CardHeader className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedFolder(null);
                      setFolderStations([]);
                    }}
                  >
                    ← Back
                  </Button>
                  <div
                    className="text-3xl w-12 h-12 flex items-center justify-center rounded-lg"
                    style={{ backgroundColor: selectedFolder.color + "20" }}
                  >
                    {selectedFolder.icon}
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{selectedFolder.name}</CardTitle>
                    <CardDescription className="text-base">
                      {folderStations.length} stations in this folder
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {folderStations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderHeart className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg">No stations in this folder yet. Add some from the main page!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {folderStations.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 rounded-lg border-2 bg-card hover:bg-accent/20 transition-all"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        {item.station_data?.favicon && (
                          <img
                            src={item.station_data.favicon}
                            alt={item.station_data.name}
                            className="w-14 h-14 rounded-lg object-cover border-2"
                          />
                        )}
                        <div>
                          <h3 className="font-semibold text-lg">{item.station_data.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {item.station_data.language} • {item.station_data.location}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => playFolderStation(item.station_data)}
                          className="h-10 w-10"
                        >
                          <Play className="h-5 w-5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeStationFromFolder(item.id)}
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
        )}
      </div>
    </PremiumLayout>
  );
}
