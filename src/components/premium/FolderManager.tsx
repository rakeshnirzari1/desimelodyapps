import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RadioStation } from "@/types/station";
import { Button } from "@/components/ui/button";
import { FolderPlus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface FolderManagerProps {
  station: RadioStation;
  className?: string;
}

export const FolderManager = ({ station, className }: FolderManagerProps) => {
  const { user } = useAuth();
  const [folders, setFolders] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [stationFolders, setStationFolders] = useState<string[]>([]);

  useEffect(() => {
    if (user && isOpen) {
      loadFolders();
      loadStationFolders();
    }
  }, [user, isOpen, station.id]);

  const loadFolders = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('custom_folders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setFolders(data || []);
  };

  const loadStationFolders = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('folder_stations')
      .select('folder_id')
      .eq('station_id', station.id);

    setStationFolders(data?.map(item => item.folder_id) || []);
  };

  const toggleFolder = async (folderId: string) => {
    if (!user) {
      toast.error("Please sign in to use folders");
      return;
    }

    const isInFolder = stationFolders.includes(folderId);

    if (isInFolder) {
      const { error } = await supabase
        .from('folder_stations')
        .delete()
        .eq('folder_id', folderId)
        .eq('station_id', station.id);

      if (error) {
        toast.error("Failed to remove from folder");
      } else {
        setStationFolders(stationFolders.filter(id => id !== folderId));
        toast.success("Removed from folder");
      }
    } else {
      const { error } = await supabase
        .from('folder_stations')
        .insert({
          folder_id: folderId,
          station_id: station.id,
          station_data: station as any
        });

      if (error) {
        toast.error("Failed to add to folder");
      } else {
        setStationFolders([...stationFolders, folderId]);
        toast.success("Added to folder");
      }
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(className)}
        >
          <FolderPlus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Folder</DialogTitle>
          <DialogDescription>
            Choose folders for {station.name}
          </DialogDescription>
        </DialogHeader>
        {folders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No folders yet. Create one first!</p>
            <Button
              onClick={() => {
                setIsOpen(false);
                window.location.href = '/premium/folders';
              }}
              className="mt-4"
            >
              Go to Folders
            </Button>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {folders.map((folder) => {
              const isInFolder = stationFolders.includes(folder.id);
              return (
                <Button
                  key={folder.id}
                  variant={isInFolder ? "default" : "outline"}
                  className="w-full justify-start gap-3"
                  onClick={() => toggleFolder(folder.id)}
                >
                  <span className="text-2xl">{folder.icon}</span>
                  <span className="flex-1 text-left">{folder.name}</span>
                  {isInFolder && <span className="text-xs">✓</span>}
                </Button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
