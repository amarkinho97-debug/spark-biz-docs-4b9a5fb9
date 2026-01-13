import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MessageCircle, Lock, Shield, Headphones, Laptop, Rocket, HeartPulse, Ruler, Briefcase } from "lucide-react";

const testimonials = [
  {
    name: "Carolina Silva",
    role: "CEO da Agência Aurora",
    avatar: "CS",
    type: "Agência digital",
    rating: 5,
    text: "Finalmente uma plataforma de gestão fiscal que entende o empreendedor digital. Simples, rápida e sem burocracia!",
  },
  {
    name: "Rafael Mendes",
    role: "Fundador da RM Dev Studio",
    avatar: "RM",
    type: "Desenvolvedor freelancer",
    rating: 5,
    text: "Abri minha empresa em 10 dias. O suporte pelo WhatsApp é excelente, sempre respondem rápido.",
  },
];

const segments = [
  "Devs",
  "Agências",
  "Profissionais da Saúde",
  "Arquitetos & Engenheiros",
  "Profissionais Liberais",
];
 
const Trust = () => {
  return (
    <section className="py-20 lg:py-24 bg-background">
      <div className="container">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            DNA 100% Digital
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
            Feita para quem vende inteligência
          </h2>
          <div className="mt-6 flex flex-wrap justify-center gap-2 md:gap-3">
            {segments.map((segment) => (
              <span
                key={segment}
                className="inline-flex items-center px-3 py-1 rounded-full bg-card border border-border/60 text-xs md:text-sm text-muted-foreground"
              >
                {segment}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Trust / specialization cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.0 }}
            className="bg-card rounded-2xl p-6 border border-border card-hover h-full flex flex-col items-center md:items-start"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 mx-auto md:mx-0">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2 text-center md:text-left">Segurança de Dados</h3>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1 text-center md:text-left">
              Criptografia de ponta a ponta em toda a jornada, com padrões de segurança no nível de bancos digitais.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-card rounded-2xl p-6 border border-border card-hover h-full flex flex-col items-center md:items-start"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 mx-auto md:mx-0">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2 text-center md:text-left">Compliance Total</h3>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1 text-center md:text-left">
              Processos e obrigações sempre alinhados às normas da Receita Federal e legislações aplicáveis.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-card rounded-2xl p-6 border border-border card-hover h-full flex flex-col items-center md:items-start"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 mx-auto md:mx-0">
              <Headphones className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2 text-center md:text-left">Suporte Técnico</h3>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1 text-center md:text-left">
              Time treinado na dinâmica de negócios digitais para orientar desenvolvedores, agências e consultores.
            </p>
          </motion.div>
        </div>

        {/* Testimonials */}
        <div className="mt-12 mb-16">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-foreground mb-1">O que nossos clientes dizem</h3>
            <p className="text-sm text-muted-foreground">
              Depoimentos reais de quem já tirou a burocracia do caminho.
            </p>
          </div>

          {/* Mobile testimonials stacked */}
          <div className="md:hidden -mx-4 px-4 space-y-4">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <div className="bg-card rounded-2xl p-5 border border-border card-hover shadow-xl shadow-primary/5 flex flex-col items-center text-center hover-scale">
                  <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-primary to-accent p-[2px] mb-4">
                    <div className="w-full h-full rounded-full bg-background flex items-center justify-center text-xs font-semibold text-primary">
                      {testimonial.avatar}
                    </div>
                  </div>
                  <p className="text-base leading-relaxed text-muted-foreground mb-3">
                    “{testimonial.text}”
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-muted-foreground mb-1">{testimonial.role}</p>
                  {testimonial.type && (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] mb-2">
                      {testimonial.type}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 text-primary text-sm">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <span key={i}>★</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Desktop grid */}
          <div className="hidden md:grid md:grid-cols-2 gap-8 lg:gap-10 max-w-3xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className="w-full"
              >
                <div className="bg-card rounded-2xl p-6 lg:p-7 border border-border card-hover shadow-xl shadow-primary/5 flex flex-col items-center text-center hover-scale">
                  <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-primary to-accent p-[2px] mb-4">
                    <div className="w-full h-full rounded-full bg-background flex items-center justify-center text-xs font-semibold text-primary">
                      {testimonial.avatar}
                    </div>
                  </div>
                  <p className="text-base leading-relaxed text-muted-foreground mb-3">
                    “{testimonial.text}”
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-muted-foreground mb-1">{testimonial.role}</p>
                  {testimonial.type && (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] mb-2">
                      {testimonial.type}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 text-primary text-sm">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <span key={i}>★</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

          {/* Expert section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-3xl px-6 pt-8 pb-10 lg:px-10 lg:pt-10 lg:pb-12 flex flex-col items-center justify-center text-center w-full h-auto"
          >
            <div className="flex flex-col items-center text-center gap-6 w-full">
                <h3 className="text-xl lg:text-2xl font-bold text-foreground text-center w-full mx-auto">
                  Tecnologia de fintech com suporte humano especializado
                </h3>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed px-4 md:px-0 max-w-[90%] mx-auto lg:max-w-none text-center">
                  A Qontax combina automação fiscal, leitura de dados em tempo real e uma rede de contadores parceiros especialistas para estar ao seu lado nas decisões importantes
                </p>
              <div className="flex flex-wrap justify-center gap-3 md:gap-4 w-full mt-2">
                <Button
                  asChild
                  variant="cta"
                  size="xl"
                  className="mx-auto transition-transform hover:scale-[1.02] active:scale-[0.97]"
                >
                  <a
                    href="https://wa.me/5543991521870?text=Oi!%20Vi%20os%20especialistas%20no%20site%20e%20tenho%20algumas%20d%C3%BAvidas%20sobre%20a%20plataforma%20antes%20de%20come%C3%A7ar."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Falar com o time Qontax
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>

      </div>
    </section>
  );
};

export default Trust;
