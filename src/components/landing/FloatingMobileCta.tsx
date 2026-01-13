import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const whatsappUrl =
  "https://wa.me/5543991521870?text=Ol%C3%A1!%20Estou%20no%20celular%20navegando%20no%20site%20da%20plataforma%20Qontax%20e%20preciso%20de%20ajuda.";

const FloatingMobileCta = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const heroElement = document.getElementById("hero");
    if (!heroElement || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isMobile = window.innerWidth < 768;
        setVisible(isMobile && !entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(heroElement);

    return () => {
      observer.disconnect();
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 md:hidden animate-fade-in">
      <div className="bg-background/95 backdrop-blur shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4">
        <div className="container px-0">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block">
            <Button variant="cta" size="xl" className="w-full text-base flex items-center justify-center gap-2">
              <span>Falar com Especialista</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
};

export default FloatingMobileCta;
