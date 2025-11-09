import { Helmet } from "react-helmet";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Mail, MapPin, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

const Contact = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Contact Us - Desi Melody</title>
        <meta name="description" content="Get in touch with Desi Melody - We'd love to hear from you" />
      </Helmet>
      <Header />
      
      <div className="container py-12 flex-grow">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-4 text-center">Contact Us</h1>
          <p className="text-lg text-muted-foreground text-center mb-12">
            Have questions or feedback? We'd love to hear from you!
          </p>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-card p-8 rounded-lg border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Email Us</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                Send us an email and we'll get back to you as soon as possible.
              </p>
              <a href="mailto:nirzaripatel26@gmail.com">
                <Button className="w-full gap-2">
                  <Mail className="w-4 h-4" />
                  nirzaripatel26@gmail.com
                </Button>
              </a>
            </div>

            <div className="bg-card p-8 rounded-lg border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <Radio className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-xl font-semibold">About Us</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                Desi Melody is your premier destination for streaming live radio from South Asia.
              </p>
              <p className="text-muted-foreground">
                We provide access to 1100+ radio stations, connecting millions of listeners worldwide 
                to their favorite music and content.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-8 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Get in Touch</h2>
            <p className="text-muted-foreground mb-6">
              Whether you have a question about our service, need technical support, want to suggest a 
              station, or are interested in advertising opportunities, our team is ready to help.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary mt-1" />
                <div>
                  <strong>General Inquiries:</strong>
                  <br />
                  <a href="mailto:nirzaripatel26@gmail.com" className="text-primary hover:underline">
                    nirzaripatel26@gmail.com
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Radio className="w-5 h-5 text-primary mt-1" />
                <div>
                  <strong>Station Suggestions:</strong>
                  <br />
                  <span className="text-muted-foreground">
                    Let us know if we're missing your favorite station
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-1" />
                <div>
                  <strong>Advertising:</strong>
                  <br />
                  <span className="text-muted-foreground">
                    Interested in reaching the desi community? Contact Nirzari Patel
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Contact;
