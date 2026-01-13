import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Menu, X, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { scrollToSection } from "@/lib/scrollToSection";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Como funciona", href: "#como-funciona" },
    { label: "Funcionalidades", href: "#funcionalidades" },
    { label: "Preços", href: "#precos" },
    { label: "Contato", href: "#contato" },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-lg border-b border-border shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="container">
        <div className="flex items-center justify-between h-16 lg:h-18">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-cta flex items-center justify-center">
              <span className="text-white font-bold text-lg">Q</span>
            </div>
            <span
              className={`text-xl font-bold tracking-tight transition-colors ${
                isScrolled ? "text-foreground" : "text-white"
              }`}
            >
              Qontax
            </span>
          </a>

          {/* Desktop navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={() => {
                  const id = link.href.replace("#", "");
                  scrollToSection(id, { highlight: id === "precos" });
                }}
                className={`text-sm font-medium transition-colors ${
                  isScrolled
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-white/80 hover:text-white"
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-4">
            <a
              href="https://wa.me/5543991521870"
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                isScrolled ? "text-muted-foreground" : "text-white/80"
              }`}
            >
              <Phone className="w-4 h-4" />
              (43) 99152-1870
            </a>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={isScrolled ? "text-muted-foreground" : "text-white"}
            >
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button variant="cta" size="sm" onClick={() => scrollToSection("contato")}>
              Agendar Demonstração
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`lg:hidden p-2 rounded-lg transition-colors ${
              isScrolled ? "text-foreground" : "text-white"
            }`}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white rounded-b-2xl shadow-lg overflow-hidden"
            >
              <div className="p-4 space-y-4">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block text-foreground font-medium py-2 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="pt-4 border-t border-border space-y-2">
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/auth">Entrar</Link>
                  </Button>
                  <Button
                    variant="cta"
                    className="w-full"
                    onClick={() => {
                      scrollToSection("contato");
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    Agendar Demonstração
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

export default Navbar;
