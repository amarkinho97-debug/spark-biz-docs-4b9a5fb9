import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mail, Phone, MapPin, Shield, Lock, Award, MessageCircle } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

const Footer = () => {
  return (
    <footer className="bg-foreground text-white" id="contato">
      <section className="py-10 lg:py-24 border-b border-white/10">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto"
          >
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 md:mb-5 leading-relaxed text-balance text-center">
              Pronto para trazer a inteligência fiscal da Qontax para a sua operação?
            </h2>
            <p className="text-white/60 mb-6 md:mb-8 text-sm md:text-base max-w-xl mx-auto">
              A Qontax é sua plataforma de inteligência fiscal. Tecnologia e automação para sua gestão de serviços.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 md:gap-4 max-w-[90vw] mx-auto">
              <Button
                asChild
                variant="cta"
                size="xl"
                onClick={() => trackEvent("Footer", "Click", "CTA Primary")}
                className="w-full sm:w-auto text-sm sm:text-base px-6 justify-center"
              >
                <a
                  href="https://wa.me/5543991521870?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20os%20planos%20da%20Qontax%20para%20minha%20empresa."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 flex-wrap"
                >
                  Começar com a Qontax
                  <ArrowRight className="w-5 h-5" />
                </a>
              </Button>
              <Button
                asChild
                variant="heroOutline"
                size="xl"
                onClick={() => trackEvent("Contact", "Click", "WhatsApp")}
                className="w-full sm:w-auto text-sm sm:text-base px-6 justify-center gap-2 flex-wrap transition-transform hover:scale-[1.02] active:scale-[0.97]"
              >
                <a
                  href="https://wa.me/5543991521870?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20os%20planos%20da%20Qontax%20para%20minha%20empresa."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 flex-wrap"
                >
                  <MessageCircle className="w-5 h-5" />
                  Falar com o time Qontax no WhatsApp
                </a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main footer */}
      <div className="py-12 lg:py-20">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl gradient-cta flex items-center justify-center">
                  <span className="text-white font-bold">Q</span>
                </div>
                <span className="text-lg font-bold tracking-tight">Qontax</span>
              </div>
              <p className="text-white/50 text-sm mb-4 leading-relaxed">
                A Qontax é sua plataforma de inteligência fiscal. Tecnologia e automação para sua gestão de serviços.
              </p>
            </div>

            {/* Services */}
            <div>
              <h4 className="font-semibold mb-4 text-sm">Serviços</h4>
              <ul className="space-y-2 text-sm text-white/50">
                {["Migração Assistida", "BPO Financeiro", "Automação Fiscal", "Emissão de Notas"].map((link) => (
                  <li key={link}>
                    <a href="/#features" className="hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold mb-4 text-sm">Contato</h4>
              <ul className="space-y-2 text-sm text-white/50">
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <a href="mailto:contato@qontax.com.br" className="hover:text-white transition-colors">
                    contato@qontax.com.br
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <a href="tel:+5543991521870" className="hover:text-white transition-colors">
                    (43) 99152-1870
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>R Júlio César Ribeiro, 467 - Londrina - PR</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Trust badges */}
          <div className="pt-8 border-t border-white/10">
            <div className="flex flex-wrap items-center justify-center gap-6 mb-6">
              {[
                { icon: Shield, text: "SSL Seguro" },
                { icon: Lock, text: "LGPD Compliant" },
                { icon: Award, text: "CRC Certificado" },
              ].map((badge, i) => (
                <div key={i} className="flex items-center gap-2 text-white/40 text-sm">
                  <badge.icon className="w-4 h-4" />
                  <span>{badge.text}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/40">
              <div className="space-y-1 text-center md:text-left">
                <p>© 2026 Qontax. Todos os direitos reservados.</p>
                <p>GO EASY SOLUCOES INTEGRADAS LTDA - CNPJ: 64.122.285/0001-16</p>
                <p className="text-[0.7rem] text-white/50">
                  Serviços contábeis privativos são prestados por parceiros registrados no CRC.
                </p>
              </div>
              <div className="flex gap-4">
                <Link to="/termos" className="hover:text-white transition-colors">
                  Termos de Uso
                </Link>
                <Link to="/privacidade" className="hover:text-white transition-colors">
                  Política de Privacidade
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
