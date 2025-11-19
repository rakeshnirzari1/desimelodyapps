import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, Heart, History, FolderHeart } from "lucide-react";
import { toast } from "sonner";

export const UserMenu = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [basePath, setBasePath] = useState("");

  useEffect(() => {
    // Detect if we're on mobile or iOS routes
    if (location.pathname.startsWith("/m")) {
      setBasePath("/m");
    } else if (location.pathname.startsWith("/ios")) {
      setBasePath("/ios");
    } else {
      setBasePath("");
    }
  }, [location.pathname]);

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut();
    setIsLoading(false);
    toast.success("Signed out successfully");
    navigate("/");
  };

  if (!user) {
    return (
      <Button variant="default" onClick={() => navigate("/auth")}>
        Sign In
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">My Account</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate(`${basePath}/premium/favorites`)}>
          <Heart className="mr-2 h-4 w-4" />
          Favorites
        </DropdownMenuItem>
        {basePath === "" && (
          <>
            <DropdownMenuItem onClick={() => navigate(`${basePath}/premium/history`)}>
              <History className="mr-2 h-4 w-4" />
              Listening History
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`${basePath}/premium/folders`)}>
              <FolderHeart className="mr-2 h-4 w-4" />
              My Folders
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} disabled={isLoading}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
