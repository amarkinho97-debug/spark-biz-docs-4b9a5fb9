import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const COOKIE_KEY = "qontax-cookie-consent";

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem(COOKIE_KEY);
      if (!stored) {
        setVisible(true);
      }
    } catch (error) {
      // If localStorage is not accessible, still show the banner
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(COOKIE_KEY, "true");
      } catch (error) {
        // Ignore write errors
      }
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50">
      <div className="bg-foreground text-background/90 py-3 md:py-4">
        <div className="container flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 text-xs md:text-sm">
          <p className="max-w-2xl leading-relaxed">
            Nós utilizamos cookies para melhorar sua experiência. Ao continuar navegando, você concorda com nossa
            <a
              href="/privacidade"
              className="underline font-medium ml-1 hover:text-background"
            >
              Política de Privacidade
            </a>
            .
          </p>
          <div className="flex-shrink-0">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="bg-background text-foreground hover:bg-background/90"
              onClick={handleAccept}
            >
              Entendi
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
