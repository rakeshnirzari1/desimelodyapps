import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RadioStation } from "@/types/station";
import IOSPlayer from "@/pages/ios";
import { useAudio } from "@/contexts/AudioContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FolderHeart } from "lucide-react";

interface Folder {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

export default function IOSFolders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const folderId = searchParams.get("folder");
  const { setFilteredStations } = useAudio();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [folderStations, setFolderStations] = useState<RadioStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const loadFolders = async () => {
      const { data, error } = await supabase
        .from("custom_folders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setFolders(data);
      }
      setIsLoading(false);
    };

    loadFolders();
  }, [user, navigate]);

  useEffect(() => {
    if (!folderId || !user) return;

    const loadFolderStations = async () => {
      const { data: folderData } = await supabase
        .from("custom_folders")
        .select("*")
        .eq("id", folderId)
        .eq("user_id", user.id)
        .single();

      if (folderData) {
        setCurrentFolder(folderData);
      }

      const { data, error } = await supabase
        .from("folder_stations")
        .select("*")
        .eq("folder_id", folderId)
        .order("added_at", { ascending: false });

      if (!error && data) {
        const stations = data.map((item) => item.station_data as unknown as RadioStation);
        setFolderStations(stations);
        setFilteredStations(stations);
      }
    };

    loadFolderStations();
    return () => setFilteredStations(null);
  }, [folderId, user, setFilteredStations]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading folders...</div>;
  }

  // If viewing a specific folder
  if (folderId && currentFolder) {
    if (folderStations.length === 0) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <Button onClick={() => navigate("/ios/folders")} variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Folders
          </Button>
          <p className="text-lg text-muted-foreground mb-4">
            No stations in "{currentFolder.name}" yet
          </p>
          <button onClick={() => navigate("/ios")} className="text-primary underline">
            Go back and add stations to this folder
          </button>
        </div>
      );
    }

    return <IOSPlayer />;
  }

  // Show folder list
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button onClick={() => navigate("/ios")} variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Player
          </Button>
          <h1 className="text-2xl font-bold">My Folders</h1>
        </div>

        {folders.length === 0 ? (
          <div className="text-center py-12">
            <FolderHeart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground mb-4">No folders yet</p>
            <p className="text-sm text-muted-foreground">
              Create folders from the desktop site to organize your stations
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => navigate(`/ios/folders?folder=${folder.id}`)}
                className="w-full p-4 bg-card hover:bg-accent/50 rounded-lg border-2 border-border transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: folder.color || "#6366f1" }}
                  >
                    {folder.icon || "📁"}
                  </div>
                  <div>
                    <h3 className="font-semibold">{folder.name}</h3>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
