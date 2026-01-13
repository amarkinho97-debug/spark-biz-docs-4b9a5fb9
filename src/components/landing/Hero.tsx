import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Play } from "lucide-react";
import heroImage from "@/assets/hero-phone.png";
import { trackEvent } from "@/lib/analytics";
import { scrollToSection } from "@/lib/scrollToSection";

const Hero = () => {
  return (
    <section id="hero" className="gradient-hero relative overflow-hidden min-h-[90vh] lg:min-h-screen">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="container relative z-10 pt-20 pb-16 lg:pt-24 lg:pb-24 px-4 md:px-0">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center md:text-left"
          >
            {/* Single rating badge */}
            <div className="flex justify-center md:justify-start mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/8 border border-white/15 text-white/80 text-[10px] font-medium max-w-[90vw]">
                <span>⭐</span>
                <span>Avaliado com 5 estrelas por clientes beta</span>
              </div>
            </div>

            <h1 className="text-[2.3rem] md:text-6xl font-bold tracking-tight text-white leading-tight mb-3 text-balance">
              Abra sua empresa ou mude para a Qontax{" "}
              <span className="relative inline-block px-1">
                agora
                <motion.svg
                  aria-hidden="true"
                  viewBox="0 0 100 12"
                  className="pointer-events-none absolute -bottom-2 left-0 w-full h-3"
                  preserveAspectRatio="none"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, ease: "easeInOut" }}
                >
                  <motion.path
                    d="M2 8 C 20 12, 80 12, 98 6"
                    fill="none"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="stroke-[hsl(var(--yellow))]"
                  />
                </motion.svg>
              </span>
            </h1>

            <p className="text-base md:text-lg text-white/75 mb-6 max-w-md mx-auto lg:mx-0">
              Contabilidade e financeiro integrados com suporte de especialistas.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col items-center md:flex-row md:justify-start gap-3 md:gap-4 mb-6 md:mb-8">
              <Button
                asChild
                variant="cta"
                size="xl"
                className="w-full sm:w-auto"
                onClick={() => {
                  trackEvent("Hero", "Click", "CTA Primary");
                }}
              >
                <a
                  href="https://wa.me/5543991521870?text=Ol%C3%A1!%20Acessei%20o%20site%20e%20gostaria%20de%20saber%20como%20implantar%20a%20plataforma%20Qontax%20na%20minha%20empresa."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  Começar com a Qontax {"->"}
                  <ArrowRight className="w-5 h-5" />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="w-full sm:w-auto bg-transparent hover:bg-white/10 px-0 text-white font-medium flex items-center justify-center gap-2"
                onClick={() => {
                  trackEvent("Hero", "Click", "CTA Secondary");
                  scrollToSection("como-funciona", { highlight: false });
                }}
              >
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10">
                  <Play className="w-4 h-4" />
                </span>
                <span>Ver a plataforma em ação</span>
              </Button>
            </div>

            {/* Trust items */}
            <div className="hidden md:flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-white/60 text-sm">
              <span>✓ Automação fiscal ponta a ponta</span>
              <span>✓ Dados em tempo real para decisões melhores</span>
              <span>✓ Suporte humano quando você precisar</span>
            </div>
          </motion.div>

          {/* Hero image - Laptop mockup */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative flex justify-center lg:justify-end -mt-6 lg:mt-0"
          >
            <div className="relative w-[85%] max-w-[340px] mx-auto sm:max-w-md lg:max-w-lg scale-90 sm:scale-105 lg:scale-100 shadow-glow">
              {/* Floating card elements */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="absolute -left-4 top-1/4 bg-white rounded-xl p-3 shadow-lg z-10"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                    <span className="text-success text-lg">✓</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Imposto DAS</p>
                    <p className="text-sm font-semibold text-foreground">Pago com sucesso</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="absolute -right-4 bottom-1/3 bg-white rounded-xl p-3 shadow-lg z-10"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary text-lg">📄</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">NF-e emitida</p>
                    <p className="text-sm font-semibold text-foreground">R$ 2.500,00</p>
                  </div>
                </div>
              </motion.div>

              {/* Laptop/Macbook mockup with web dashboard */}
              <div className="relative bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                {/* Laptop frame */}
                <div className="bg-slate-800 rounded-t-xl overflow-hidden">
                  {/* Browser bar */}
                  <div className="bg-slate-700 px-3 py-2 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 bg-slate-600 rounded px-3 py-1 text-xs text-white/60">
                      app.qontax.com.br
                    </div>
                  </div>

                  {/* Dashboard content */}
                  <div className="bg-slate-900 p-4 aspect-[16/10] object-contain">
                    {/* Dashboard header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg gradient-cta flex items-center justify-center">
                          <span className="text-white text-sm font-bold">C</span>
                        </div>
                        <span className="text-white/80 text-sm font-medium">Dashboard</span>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-slate-700" />
                    </div>

                    {/* Dashboard cards */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-slate-800 rounded-lg p-2">
                        <p className="text-white/50 text-[10px]">Impostos</p>
                        <p className="text-success text-xs font-semibold">Em dia</p>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-2">
                        <p className="text-white/50 text-[10px]">Faturamento</p>
                        <p className="text-white text-xs font-semibold">R$ 12.5k</p>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-2">
                        <p className="text-white/50 text-[10px]">Documentos</p>
                        <p className="text-white text-xs font-semibold">24 arquivos</p>
                      </div>
                    </div>

                    {/* Mini chart */}
                    <div className="bg-slate-800 rounded-lg p-2 h-16 flex items-end gap-1">
                      {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-gradient-to-t from-primary to-accent rounded-sm"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Laptop base */}
                <div className="bg-slate-700 h-3 rounded-b-xl mx-8" />
                <div className="bg-slate-600 h-1 rounded-b-lg mx-16" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Wave decoration at bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path
            d="M0 50L48 45.7C96 41 192 33 288 35.8C384 39 480 53 576 58.2C672 63 768 59 864 51.2C960 43 1056 31 1152 28.8C1248 27 1344 35 1392 38.8L1440 43V100H1392C1344 100 1248 100 1152 100C1056 100 960 100 864 100C768 100 672 100 576 100C480 100 384 100 288 100C192 100 96 100 48 100H0V50Z"
            fill="hsl(0 0% 100%)"
          />
        </svg>
      </div>
    </section>
  );
};

export default Hero;
