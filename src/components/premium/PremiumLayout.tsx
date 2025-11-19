import { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

interface PremiumLayoutProps {
  children: ReactNode;
}

export const PremiumLayout = ({ children }: PremiumLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto py-8 px-4">
        {children}
      </main>
      <Footer />
    </div>
  );
};
