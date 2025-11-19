import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { FolderHeart, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Folders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [folders, setFolders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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

  const emojiOptions = ["📻", "🎵", "🎶", "🎧", "🎤", "🎼", "🔊", "📱", "⭐", "❤️", "🌟", "💫"];

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
                  <FolderHeart className="h-6 w-6" />
                  My Folders
                </CardTitle>
                <CardDescription>
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
          <CardContent>
            {folders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderHeart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No folders yet. Create one to organize your stations!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="p-6 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    style={{ borderColor: folder.color + "40" }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="text-3xl w-12 h-12 flex items-center justify-center rounded-lg"
                          style={{ backgroundColor: folder.color + "20" }}
                        >
                          {folder.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold">{folder.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {folder.folder_stations?.[0]?.count || 0} stations
                          </p>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteFolder(folder.id)}
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
    </div>
  );
}
