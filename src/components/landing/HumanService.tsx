import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mail, Users, Heart } from "lucide-react";

const benefits = [
  { icon: MessageCircle, text: "Suporte humano via WhatsApp" },
  { icon: Mail, text: "Atendimento dedicado via e-mail" },
  { icon: Users, text: "Especialistas em automação fiscal e BPO" },
  { icon: Heart, text: "Cuidado em cada decisão" },
];

const HumanService = () => {
  return (
    <section className="py-12 lg:py-24 section-light relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />

      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center md:text-left"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-6">
              <Heart className="w-4 h-4" />
              Atendimento humano by Qontax
            </span>

            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4 md:mb-5 leading-tight text-balance">
              Tecnologia com
              <span className="gradient-text"> suporte humano</span>
            </h2>

            <p className="text-base md:text-lg text-muted-foreground mb-6 md:mb-8 leading-relaxed max-w-md mx-auto md:mx-0">
              Tecnologia cuida dos impostos. Nossa rede de especialistas parceiros tira dúvidas e apoia suas decisões fiscais.
            </p>

            {/* Benefits grid */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8 max-w-md mx-auto md:mx-0">
              {benefits.map((benefit, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                  className="flex items-center gap-2.5 md:gap-3"
                >
                  <div className="w-10 h-10 md:w-10 md:h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <benefit.icon className="w-5 h-5 md:w-5 md:h-5 text-accent" />
                  </div>
                  <span className="flex-1 text-sm md:text-sm font-medium text-foreground text-left leading-snug">
                    {benefit.text}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 max-w-md mx-auto md:mx-0">
              <Button
                asChild
                variant="cta"
                size="xl"
                className="w-full sm:w-auto transition-transform hover:scale-[1.02] active:scale-[0.97]"
              >
                <a
                  href="https://wa.me/5543991521870?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20como%20a%20plataforma%20Qontax%20pode%20ajudar%20na%20gest%C3%A3o%20fiscal%20da%20minha%20empresa."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  Falar com o time Qontax
                </a>
              </Button>
            </div>
          </motion.div>

          {/* Product preview */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative flex flex-col items-center"
          >
            {/* Section headline for product preview */}
            <div className="mb-10 text-center flex flex-col items-center max-w-sm mx-auto px-2 sm:px-0">
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2 leading-snug">
                Gerencie sua operação financeira em um único painel
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground max-w-xs sm:max-w-none mx-auto">
                Emissão de notas, controle de impostos e visão de dados em tempo real para decisões mais seguras
              </p>
            </div>

            <div className="relative max-w-[320px] sm:max-w-md">
              {/* Tablet mockup */}
              <div className="relative rounded-[28px] overflow-hidden shadow-2xl border border-white/10 bg-slate-950/80 backdrop-blur-xl">
                {/* Tablet top sensor */}
                <div className="px-4 pt-3 pb-2 flex justify-center">
                  <div className="h-1 w-16 rounded-full bg-white/25" />
                </div>

                {/* Tablet screen */}
                <div className="aspect-[3/2] bg-gradient-to-br from-primary/25 via-slate-900 to-accent/25 p-4 sm:p-5 flex flex-col gap-3 sm:gap-4">
                  {/* Dashboard header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] sm:text-xs text-white/65">Visão geral</p>
                      <p className="text-sm sm:text-base font-semibold text-white">
                        Dashboard financeiro
                      </p>
                    </div>
                    <div className="rounded-full px-3 py-1 bg-white/10 text-[11px] sm:text-xs text-white/85">
                      Hoje
                    </div>
                  </div>

                  {/* Revenue chart */}
                  <div className="bg-slate-900/85 rounded-xl p-3 sm:p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[11px] sm:text-xs text-white/75 mb-1">
                      <span>Receita do mês</span>
                      <span className="text-success font-semibold">+18,4%</span>
                    </div>
                    <div className="h-18 sm:h-20 flex items-end gap-1.5 sm:gap-2">
                      {[30, 45, 55, 40, 65, 80, 70, 90].map((value, index) => (
                        <div
                          key={index}
                          className="flex-1 rounded-full bg-gradient-to-t from-success/40 via-success to-success/90"
                          style={{ height: `${value}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-1">
                    {/* Últimas notas */}
                    <div className="bg-slate-900/85 rounded-xl p-3 sm:p-4 flex flex-col gap-1.5">
                      <p className="text-[11px] sm:text-xs font-medium text-white/75 mb-1">
                        Últimas notas emitidas
                      </p>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs sm:text-[13px] text-white/85">
                          <span>#254 - Consultoria</span>
                          <span className="font-semibold">R$ 1.250</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] sm:text-xs text-white/70">
                          <span>#253 - Projeto web</span>
                          <span className="font-semibold">R$ 3.800</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] sm:text-xs text-white/70">
                          <span>#252 - Assessoria</span>
                          <span className="font-semibold">R$ 950</span>
                        </div>
                      </div>
                    </div>

                    {/* Impostos a pagar */}
                    <div className="bg-slate-900/85 rounded-xl p-3 sm:p-4 flex flex-col justify-between gap-1">
                      <div>
                        <p className="text-[11px] sm:text-xs font-medium text-white/75 mb-1">
                          Impostos a pagar
                        </p>
                        <p className="text-base sm:text-lg font-semibold text-white leading-tight">
                          R$ 1.487,32
                        </p>
                        <p className="text-[11px] sm:text-xs text-amber-300 mt-0.5">
                          Vencimento em 5 dias
                        </p>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] sm:text-xs text-white/70">
                        <span>DAS - Simples</span>
                        <span className="text-white/85">R$ 890,00</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] sm:text-xs text-white/70">
                        <span>ISS Serviços</span>
                        <span className="text-white/85">R$ 597,32</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating social proof badges */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="absolute -top-4 -right-3 sm:-top-5 sm:-right-5 bg-white rounded-xl p-3 shadow-xl border border-border animate-float-slow"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-success/15 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">Resposta média</p>
                    <p className="text-sm font-semibold text-foreground">&lt; 2 horas</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="absolute -bottom-5 -left-3 sm:-bottom-6 sm:-left-4 bg-white rounded-xl p-3 shadow-xl border border-border animate-float-slower"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">Clientes em atendimento próximo</p>
                    <p className="text-sm font-semibold text-foreground">Foco em negócios de serviço</p>
                  </div>
                </div>
              </motion.div>
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

export default HumanService;
