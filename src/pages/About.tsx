import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Radio, Globe, Heart, Users } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="container py-16 space-y-12">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            About Radio India
          </h1>
          <p className="text-xl text-muted-foreground">
            Your one-stop platform to discover and enjoy Indian radio stations from across the country
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Radio className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Our Mission</h3>
            </div>
            <p className="text-muted-foreground">
              We aim to bring together all Indian radio stations in one convenient location, making it easy for listeners to discover and enjoy their favorite music, news, and entertainment.
            </p>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Globe className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold">Wide Coverage</h3>
            </div>
            <p className="text-muted-foreground">
              From Hindi to Tamil, Bengali to Punjabi, we feature stations in multiple Indian languages, ensuring everyone can find content they love.
            </p>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <Heart className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold">Free & Accessible</h3>
            </div>
            <p className="text-muted-foreground">
              All stations are completely free to listen to. No subscriptions, no hidden fees - just pure, uninterrupted radio streaming.
            </p>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Community Driven</h3>
            </div>
            <p className="text-muted-foreground">
              Our platform is built for the community, by the community. We continuously add new stations and features based on listener feedback.
            </p>
          </Card>
        </div>

        <div className="max-w-3xl mx-auto space-y-6 pt-8">
          <h2 className="text-3xl font-bold text-center">How It Works</h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              Radio India is a comprehensive directory that aggregates live streaming links from radio stations across India. We've curated a collection of stations spanning various genres, languages, and regions.
            </p>
            <p>
              Simply browse through our collection, use the search and filter features to find stations that match your preferences, and click play to start listening instantly. No downloads or registrations required.
            </p>
            <p>
              Whether you're looking for the latest Bollywood hits, classical music, news updates, or regional content, Radio India has something for everyone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
