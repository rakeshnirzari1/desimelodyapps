import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ADMIN_PASSWORD = "desimelody2024"; // Change this for production

export default function AdminCache() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [isClearing, setIsClearing] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [cacheStatus, setCacheStatus] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    // Check if service worker is registered
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          setSwRegistration(registration);
          setCacheStatus("Service Worker is active");
        } else {
          setCacheStatus("Service Worker not registered");
        }
      });

      // Listen for cache cleared message
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'CACHE_CLEARED') {
          toast({
            title: "Cache Cleared Successfully",
            description: "All cached data has been removed. Page will reload.",
          });
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      });
    } else {
      setCacheStatus("Service Worker not supported in this browser");
    }
  }, [toast]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      toast({
        title: "Access Granted",
        description: "You can now manage cache settings.",
      });
    } else {
      toast({
        title: "Access Denied",
        description: "Incorrect password.",
        variant: "destructive",
      });
    }
  };

  const clearCache = async () => {
    setIsClearing(true);
    try {
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Clear service worker cache via message
      if (swRegistration && swRegistration.active) {
        swRegistration.active.postMessage({ type: 'CLEAR_CACHE' });
      }

      // Clear browser storage
      localStorage.clear();
      sessionStorage.clear();

      toast({
        title: "Cache Cleared",
        description: "All cached data removed. Reloading page...",
      });

      // Reload page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast({
        title: "Error",
        description: "Failed to clear cache completely. Try again.",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const forceReload = () => {
    window.location.reload();
  };

  const unregisterServiceWorker = async () => {
    if (swRegistration) {
      await swRegistration.unregister();
      toast({
        title: "Service Worker Unregistered",
        description: "Service worker has been removed. Reload to reinstall.",
      });
      setCacheStatus("Service Worker unregistered");
      setSwRegistration(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Cache Management</CardTitle>
            <CardDescription>Enter password to access cache controls</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                />
              </div>
              <Button type="submit" className="w-full">
                Access Cache Management
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-4">
      <div className="container max-w-4xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-6 h-6" />
              Cache Management
            </CardTitle>
            <CardDescription>
              Clear browser cache and force users to see the latest version
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Alert */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Status:</strong> {cacheStatus}
              </AlertDescription>
            </Alert>

            {/* Clear Cache Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Clear All Cache</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This will clear all cached data including service worker cache, localStorage, 
                  and sessionStorage. Users will be forced to download fresh content on their next visit.
                </p>
                <Button 
                  onClick={clearCache} 
                  disabled={isClearing}
                  className="w-full sm:w-auto"
                  variant="destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isClearing ? "Clearing Cache..." : "Clear All Cache"}
                </Button>
              </div>

              {/* Force Reload */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Force Reload</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Reload the page with a hard refresh (bypass cache).
                </p>
                <Button 
                  onClick={forceReload}
                  className="w-full sm:w-auto"
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Force Reload Page
                </Button>
              </div>

              {/* Service Worker Control */}
              {swRegistration && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Service Worker Control</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Unregister the service worker completely. Users will need to reload to reinstall it.
                  </p>
                  <Button 
                    onClick={unregisterServiceWorker}
                    className="w-full sm:w-auto"
                    variant="secondary"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Unregister Service Worker
                  </Button>
                </div>
              )}
            </div>

            {/* Instructions */}
            <Alert>
              <AlertDescription>
                <strong>How to force users to see latest version:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                  <li>Click "Clear All Cache" to remove all cached data</li>
                  <li>The page will automatically reload</li>
                  <li>Users visiting the site will download fresh content</li>
                  <li>Consider versioning your service worker for automatic updates</li>
                </ol>
              </AlertDescription>
            </Alert>

            {/* Technical Info */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Browser:</strong> {navigator.userAgent.split(' ').pop()}</p>
              <p><strong>Service Worker Support:</strong> {'serviceWorker' in navigator ? 'Yes' : 'No'}</p>
              <p><strong>Cache API Support:</strong> {'caches' in window ? 'Yes' : 'No'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
