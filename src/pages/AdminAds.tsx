import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, Lock, ArrowLeft } from 'lucide-react';

const AD_COUNTRIES = [
  'australia',
  'uk',
  'india',
  'usa',
  'uae',
  'canada',
  'pakistan',
  'bangladesh',
  'kuwait',
  'south-africa'
];

// Simple password protection - in production, use proper authentication
const ADMIN_PASSWORD = 'desimelody2024'; // Change this to a secure password

export default function AdminAds() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      toast({
        title: 'Access Granted',
        description: 'Welcome to the Ad Management Dashboard',
      });
    } else {
      toast({
        title: 'Access Denied',
        description: 'Incorrect password',
        variant: 'destructive',
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'audio/mpeg' && !file.name.endsWith('.mp3')) {
        toast({
          title: 'Invalid File',
          description: 'Please select an MP3 file',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCountry || !selectedFile) {
      toast({
        title: 'Missing Information',
        description: 'Please select both country and file',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    // Note: This requires Lovable Cloud to be enabled for actual uploads
    // For now, this is a placeholder that shows the UI
    toast({
      title: 'Upload Feature',
      description: 'To enable file uploads, you need to activate Lovable Cloud with Storage enabled. This will allow you to upload ad files dynamically.',
      variant: 'default',
    });

    setIsUploading(false);
    setSelectedFile(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Admin Access Required</h1>
            <p className="text-sm text-muted-foreground">
              Enter password to manage advertisement files
            </p>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
              />
            </div>
            
            <Button type="submit" className="w-full">
              Access Dashboard
            </Button>
          </form>
          
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container max-w-4xl py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Ad Management</h1>
            <p className="text-muted-foreground">Upload and manage advertisement files by country</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        <Card className="p-6">
          <form onSubmit={handleUpload} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="country">Target Country</Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger id="country">
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {AD_COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Ads will be shown to listeners from this country
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Advertisement File (MP3)</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="file"
                  type="file"
                  accept=".mp3,audio/mpeg"
                  onChange={handleFileSelect}
                  className="flex-1"
                />
                {selectedFile && (
                  <span className="text-sm text-muted-foreground">
                    {selectedFile.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload MP3 files. Name them as ad1.mp3, ad2.mp3, etc. for multiple ads per country
              </p>
            </div>

            <Button 
              type="submit" 
              disabled={isUploading || !selectedCountry || !selectedFile}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Upload Advertisement'}
            </Button>
          </form>
        </Card>

        <Card className="p-6 bg-muted/50">
          <h3 className="font-semibold mb-3">Setup Instructions</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>📁 <strong>Current Setup:</strong> Manually place MP3 files in <code className="text-xs bg-background px-1 py-0.5 rounded">/public/ads/[country]/</code></p>
            <p>📝 <strong>File Naming:</strong> Use ad1.mp3, ad2.mp3, ad3.mp3, etc. in each country folder</p>
            <p>🎲 <strong>Random Play:</strong> System will randomly select from available ads per country</p>
            <p>🔄 <strong>Frequency:</strong> Ads play every 6th station change or after 15 minutes</p>
            <p>☁️ <strong>Dynamic Uploads:</strong> Enable Lovable Cloud + Storage to upload files through this interface</p>
          </div>
        </Card>

        <Card className="p-6 border-primary/20">
          <h3 className="font-semibold mb-3 text-primary">🔒 Security Note</h3>
          <p className="text-sm text-muted-foreground mb-3">
            This page is password-protected. For production use:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Change the admin password in the code</li>
            <li>Consider enabling Lovable Cloud for proper authentication</li>
            <li>Use role-based access control for team members</li>
            <li>Keep this URL private and don't share publicly</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
