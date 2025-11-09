import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Radio, Facebook, Twitter, Linkedin } from "lucide-react";
import { toast } from "sonner";

export const Footer = () => {
  const shareUrl = window.location.origin;
  const shareTitle = "Desi Melody - Stream Live Radio from South Asia";

  const handleShare = (platform: string) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(shareTitle);
    
    let url = "";
    switch (platform) {
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case "twitter":
        url = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
        break;
      case "linkedin":
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
    }
    
    if (url) {
      window.open(url, "_blank", "width=600,height=400");
    }
  };

  return (
    <footer className="bg-card border-t py-12 mt-auto">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Radio className="w-6 h-6 text-primary" />
              <span className="font-bold text-xl">Desi Melody</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your premier destination for streaming live radio from South Asia. Access 1100+ stations anytime, anywhere.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
              <li><Link to="/browse" className="hover:text-primary transition-colors">Browse Stations</Link></li>
              <li><Link to="/india" className="hover:text-primary transition-colors">All Stations</Link></li>
              <li><Link to="/advertise" className="hover:text-primary transition-colors">Advertise</Link></li>
              <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Popular Languages</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/browse?language=hindi" className="hover:text-primary transition-colors">Hindi</Link></li>
              <li><Link to="/browse?language=tamil" className="hover:text-primary transition-colors">Tamil</Link></li>
              <li><Link to="/browse?language=punjabi" className="hover:text-primary transition-colors">Punjabi</Link></li>
              <li><Link to="/browse?language=bengali" className="hover:text-primary transition-colors">Bengali</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Connect</h4>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleShare("facebook")}
                title="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleShare("twitter")}
                title="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleShare("linkedin")}
                title="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        
        <div className="pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Desi Melody. All rights reserved. Stream live radio from India, Pakistan, Bangladesh, Sri Lanka and beyond.</p>
        </div>
      </div>
    </footer>
  );
};
