import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import HumanService from "@/components/landing/HumanService";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import Trust from "@/components/landing/Trust";
import Coverage from "@/components/landing/Coverage";
import Footer from "@/components/landing/Footer";
import SeamlessMigration from "@/components/landing/SeamlessMigration";
import TeamSection from "@/components/landing/TeamSection";
import FloatingMobileCta from "@/components/landing/FloatingMobileCta";
import MeetTheExpert from "@/components/landing/MeetTheExpert";
 
const Index = () => {
  return (
    <main className="min-h-screen bg-background overflow-x-hidden scroll-smooth">
      <Navbar />
      <Hero />
      <FloatingMobileCta />
      <div id="funcionalidades">
        <Features />
      </div>
      <HowItWorks />
      <MeetTheExpert />
      <HumanService />
      <SeamlessMigration />
      <Trust />
      <TeamSection />
      <Coverage />
      <Pricing />
      <FAQ />
      <Footer />
    </main>
  );
};

export default Index;
