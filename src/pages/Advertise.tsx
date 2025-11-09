import { Helmet } from "react-helmet";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Mail, Radio, TrendingUp, Users, Globe, Target, CheckCircle2 } from "lucide-react";

const Advertise = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Advertise With Us - Reach the Desi Community | Desi Melody</title>
        <meta name="description" content="Advertise on Desi Melody and reach millions of South Asian listeners worldwide. Banner ads and audio promos available." />
      </Helmet>
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-background" />
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Advertise With Desi Melody
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Connect with millions of South Asian listeners worldwide. Grow your business with targeted advertising 
              that reaches the desi community across the globe.
            </p>
            <div className="pt-4">
              <a href="mailto:nirzaripatel26@gmail.com?subject=Advertising Inquiry - Desi Melody">
                <Button size="lg" className="gap-2 text-lg px-8 py-6">
                  <Mail className="w-5 h-5" />
                  Get Started - Email Nirzari Patel
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">1M+</div>
              <div className="text-muted-foreground">Monthly Listeners</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-accent mb-2">1100+</div>
              <div className="text-muted-foreground">Radio Stations</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-secondary mb-2">15+</div>
              <div className="text-muted-foreground">Languages</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground">Streaming</div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Advertise Section */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Advertise on Desi Melody?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Reach a highly engaged audience that's actively listening and discovering new content
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card p-8 rounded-lg border hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Targeted Audience</h3>
              <p className="text-muted-foreground">
                Connect directly with the South Asian diaspora and local audiences across India, 
                Pakistan, Bangladesh, and Sri Lanka.
              </p>
            </div>

            <div className="bg-card p-8 rounded-lg border hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                <Globe className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Global Reach</h3>
              <p className="text-muted-foreground">
                Your ads reach listeners in USA, UK, Canada, UAE, Australia, and across South Asia - 
                wherever the desi community lives.
              </p>
            </div>

            <div className="bg-card p-8 rounded-lg border hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">High Engagement</h3>
              <p className="text-muted-foreground">
                Listeners spend hours streaming their favorite stations, giving your brand maximum exposure 
                and impact.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Advertising Options */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Advertising Options</h2>
            <p className="text-lg text-muted-foreground">
              Choose the format that works best for your brand
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-card p-8 rounded-lg border">
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-8 h-8 text-primary" />
                <h3 className="text-2xl font-semibold">Banner Advertising</h3>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                  <span className="text-muted-foreground">Prominent placement across the website</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                  <span className="text-muted-foreground">Multiple sizes and positions available</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                  <span className="text-muted-foreground">Click-through tracking and analytics</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                  <span className="text-muted-foreground">High visibility on all pages</span>
                </li>
              </ul>
            </div>

            <div className="bg-card p-8 rounded-lg border">
              <div className="flex items-center gap-3 mb-4">
                <Radio className="w-8 h-8 text-accent" />
                <h3 className="text-2xl font-semibold">Audio Promos</h3>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-0.5" />
                  <span className="text-muted-foreground">15-30 second audio advertisements</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-0.5" />
                  <span className="text-muted-foreground">Played between station changes</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-0.5" />
                  <span className="text-muted-foreground">Maximum listener attention</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-0.5" />
                  <span className="text-muted-foreground">Multilingual options available</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Benefits of Advertising With Us</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-4 p-6 bg-card rounded-lg border">
                <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-2">Reasonable Pricing</h4>
                  <p className="text-muted-foreground text-sm">
                    Competitive rates that fit your budget and deliver excellent ROI
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-6 bg-card rounded-lg border">
                <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-2">Targeted Exposure</h4>
                  <p className="text-muted-foreground text-sm">
                    Reach the desi community specifically interested in South Asian content
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-6 bg-card rounded-lg border">
                <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-2">Limited Spots</h4>
                  <p className="text-muted-foreground text-sm">
                    Exclusive advertising opportunities - secure your spot before they're gone
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-6 bg-card rounded-lg border">
                <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-2">Brand Awareness</h4>
                  <p className="text-muted-foreground text-sm">
                    Build recognition and trust within the South Asian community worldwide
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">Ready to Get Started?</h2>
            <p className="text-lg text-muted-foreground">
              Don't miss this opportunity to connect with millions of engaged listeners. 
              Spots are limited - contact us today to discuss your advertising needs.
            </p>
            <div className="pt-4">
              <a href="mailto:nirzaripatel26@gmail.com?subject=Advertising Inquiry - Desi Melody">
                <Button size="lg" className="gap-2 text-lg px-8 py-6">
                  <Mail className="w-5 h-5" />
                  Email Nirzari Patel - nirzaripatel26@gmail.com
                </Button>
              </a>
            </div>
            <p className="text-sm text-muted-foreground pt-4">
              Response time: Within 24 hours on business days
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Advertise;
