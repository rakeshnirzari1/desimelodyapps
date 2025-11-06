import { Link } from "react-router-dom";
import { Radio, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-2xl">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[hsl(12,88%,55%)]">
            <Radio className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="bg-gradient-to-r from-primary to-[hsl(12,88%,55%)] bg-clip-text text-transparent">
            Radio India
          </span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">
            Home
          </Link>
          <Link to="/browse" className="text-sm font-medium hover:text-primary transition-colors">
            Browse Stations
          </Link>
          <Link to="/about" className="text-sm font-medium hover:text-primary transition-colors">
            About
          </Link>
        </nav>
        
        <Link to="/browse">
          <Button variant="default" size="sm" className="gap-2">
            <Search className="w-4 h-4" />
            Search
          </Button>
        </Link>
      </div>
    </header>
  );
};
