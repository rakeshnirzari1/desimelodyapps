import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, RefreshCw } from "lucide-react";
import { RadioStation } from "@/types/station";
import { generateSlug } from "@/lib/slug";

const AdminRefresh = () => {
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const { toast } = useToast();

  const fetchAndTransformStations = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "https://de2.api.radio-browser.info/json/stations/search?limit=1200&countrycode=IN&hidebroken=true&order=clickcount&reverse=true"
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch stations");
      }

      const apiData = await response.json();

      // Transform API data to our RadioStation format (with cleaned tags)
      const stations: RadioStation[] = apiData.map((station: any, index: number) => {
        // Normalize and de-duplicate comma-separated tags from API
        const rawTags = (station.tags ?? "").toString();
        const tags = Array.from(
          new Set(
            rawTags
              .split(",")
              .map((t: string) => t.trim())
              .filter(Boolean)
          )
        ).join(",");

        return {
          id: String(index + 1),
          slug: generateSlug(station.name),
          name: station.name,
          image: station.favicon || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200",
          type: station.codec || "MP3",
          kbps: station.bitrate ? String(station.bitrate) : "128",
          votes: station.votes || 0,
          clicks: station.clickcount || 0,
          location: station.state || station.country || "India",
          language: station.language || "",
          link: station.url_resolved || station.url,
          website: station.homepage || "https://www.radio-browser.info/",
          tags,
        } as RadioStation;
      });

      // Generate the TypeScript file content
      const fileContent = `import { RadioStation } from "@/types/station";

export const radioStations: RadioStation[] = ${JSON.stringify(stations, null, 2)};
`;

      setGeneratedCode(fileContent);
      
      toast({
        title: "Success!",
        description: `Generated ${stations.length} stations. Copy the code below and replace src/data/stations.ts`,
      });
    } catch (error) {
      console.error("Error fetching stations:", error);
      toast({
        title: "Error",
        description: "Failed to fetch stations from API",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadAsFile = () => {
    const blob = new Blob([generatedCode], { type: "text/typescript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stations.ts";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded",
      description: "stations.ts file downloaded successfully",
    });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
    toast({
      title: "Copied",
      description: "Code copied to clipboard",
    });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Admin - Refresh Stations</CardTitle>
            <CardDescription>
              Fetch the latest stations from Radio Browser API and generate the stations.ts file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={fetchAndTransformStations}
              disabled={loading}
              size="lg"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching Stations...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Station List
                </>
              )}
            </Button>

            {generatedCode && (
              <>
                <div className="flex gap-2">
                  <Button onClick={copyToClipboard} variant="outline" className="flex-1">
                    Copy to Clipboard
                  </Button>
                  <Button onClick={downloadAsFile} variant="outline" className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Download File
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Generated Code:</label>
                  <Textarea
                    value={generatedCode}
                    readOnly
                    className="font-mono text-xs h-96"
                  />
                </div>

                <div className="bg-muted p-4 rounded-lg text-sm">
                  <p className="font-medium mb-2">Next Steps:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Copy the generated code or download the file</li>
                    <li>Replace the content of <code className="bg-background px-1 py-0.5 rounded">src/data/stations.ts</code></li>
                    <li>The app will automatically reload with the new stations</li>
                  </ol>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminRefresh;
