import { HeroSection, ServicesSection, AboutSection, TestimonialsSection, CTASection } from '@/components/sections';
import { Header, Footer } from '@/components/layout';

export default function Home() {
  return (
    <div className="relative w-full min-h-screen bg-[var(--background)]">
      <Header />
      <main>
        <HeroSection />
        <ServicesSection />
        <AboutSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}