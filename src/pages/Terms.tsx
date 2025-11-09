import { Helmet } from "react-helmet";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Terms and Conditions - Desi Melody</title>
        <meta name="description" content="Terms and Conditions for using Desi Melody radio streaming service" />
      </Helmet>
      <Header />
      
      <div className="container py-12 flex-grow">
        <h1 className="text-4xl font-bold mb-8">Terms and Conditions</h1>
        
        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Agreement to Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using Desi Melody, you agree to be bound by these Terms and Conditions. 
              If you do not agree with any part of these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Use of Service</h2>
            <p className="text-muted-foreground mb-4">
              Desi Melody provides access to live radio stations from South Asia. You agree to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Use the service for personal, non-commercial purposes only</li>
              <li>Not attempt to copy, reproduce, or redistribute the streaming content</li>
              <li>Not use automated systems to access or scrape the service</li>
              <li>Respect the intellectual property rights of content creators and stations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Content and Ownership</h2>
            <p className="text-muted-foreground">
              The radio streams and content available through Desi Melody are owned by their respective broadcasters. 
              Desi Melody acts as an aggregator and does not claim ownership of the streamed content. All trademarks, 
              logos, and brand names belong to their respective owners.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Availability and Modifications</h2>
            <p className="text-muted-foreground">
              We strive to provide uninterrupted service, but we do not guarantee that the service will be available 
              at all times. We reserve the right to modify, suspend, or discontinue any part of the service without 
              prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Third-Party Links</h2>
            <p className="text-muted-foreground">
              Our service may contain links to third-party websites or radio stations. We are not responsible for 
              the content, privacy practices, or availability of these external sites.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Disclaimer of Warranties</h2>
            <p className="text-muted-foreground">
              Desi Melody is provided "as is" without any warranties, express or implied. We do not warrant that 
              the service will be error-free, secure, or uninterrupted. Use of the service is at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
            <p className="text-muted-foreground">
              To the maximum extent permitted by law, Desi Melody shall not be liable for any indirect, incidental, 
              special, or consequential damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Advertising</h2>
            <p className="text-muted-foreground">
              Our service may include advertisements. These ads help us keep the service free for all users. 
              Advertisers are solely responsible for their ad content and offers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these Terms and Conditions at any time. Continued use of the service 
              after changes constitutes acceptance of the modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
            <p className="text-muted-foreground">
              For questions about these Terms and Conditions, please contact us at{" "}
              <a href="mailto:nirzaripatel26@gmail.com" className="text-primary hover:underline">
                nirzaripatel26@gmail.com
              </a>
            </p>
          </section>

          <section>
            <p className="text-muted-foreground mt-8">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Terms;
