import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Star, ArrowRight } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

const plans = [
  {
    name: "MEI",
    subtitle: "Para quem está começando com emissão recorrente de notas",
    price: "99,90",
    originalPrice: "119,90",
    period: "/mês",
    description: "Para quem quer sair do Excel e ter a Qontax como parceiro fiscal.",
    features: [
      "Migração assistida sem custos",
      "Emissão de notas facilitada (App e Web)",
      "Declaração anual (DASN) incluída",
      "Controle de limite de faturamento",
    ],
    popular: false,
    ctaText: "Começar plano MEI",
  },
  {
    name: "Simples Nacional",
    subtitle: "ME e EPP focadas em escala",
    price: "199,90",
    originalPrice: null,
    period: "/mês",
    description: "ME e EPP focadas em escala. Oferta de lançamento.",
    features: [
      "Tudo do plano MEI",
      "Gestão Fiscal Completa (com validação de contador)",
      "Folha de pagamento e pró-labore",
      "BPO Financeiro: Conciliação automática",
      "Suporte via WhatsApp com especialistas",
    ],
    popular: true,
    ctaText: "Contratar agora",
  },
  {
    name: "Lucro Presumido",
    subtitle: "Para operações com maior complexidade fiscal",
    price: "Sob Consulta",
    originalPrice: null,
    period: "",
    description: "",
    features: [
      "Planejamento tributário avançado",
      "Consultoria estratégica recorrente",
      "Atendimento prioritário",
      "Parceiros especialistas no seu nicho",
    ],
    popular: false,
    ctaText: "Falar com Especialista",
  },
];

const Pricing = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [expandedPlan, setExpandedPlan] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;

    const children = Array.from(container.children) as HTMLElement[];
    if (!children.length) return;

    const containerCenter = container.scrollLeft + container.clientWidth / 2;

    let closestIndex = 0;
    let minDistance = Infinity;

    children.forEach((child, index) => {
      const childCenter = child.offsetLeft + child.clientWidth / 2;
      const distance = Math.abs(containerCenter - childCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    setActiveIndex(closestIndex);
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      const children = Array.from(container.children) as HTMLElement[];
      if (!children.length) return;

      const middleIndex = Math.min(1, children.length - 1);
      const middleCard = children[middleIndex];

      const offsetLeft =
        middleCard.offsetLeft - (container.clientWidth - middleCard.clientWidth) / 2;

      container.scrollTo({ left: offsetLeft, behavior: "auto" });
      setActiveIndex(middleIndex);
    } else {
      handleScroll();
    }
  }, []);

  return (
    <section className="py-12 lg:py-24 section-light" id="precos">
      <div className="container">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-cta/10 text-cta text-sm font-semibold mb-4">
            Planos Qontax
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
            Planos transparentes para o seu momento
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-base md:text-lg">
            Planos sem letras miúdas. Você sabe quanto paga e o que recebe.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="max-w-5xl mx-auto">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-4 pt-8 md:pt-0 px-6 md:px-0 -mx-6 md:mx-0 no-scrollbar"
          >
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative flex-shrink-0 w-[85vw] max-w-sm md:w-auto md:max-w-none snap-center transition-transform duration-300 md:duration-200 animate-fade-in hover-scale ${
                  plan.popular ? "md:-mt-4 md:mb-4 lg:scale-105" : ""
                } ${
                  activeIndex === index
                    ? "scale-100"
                    : "scale-95 md:scale-100 opacity-80 md:opacity-100"
                }`}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className="flex items-center justify-center gap-2 px-6 py-2 rounded-full gradient-cta text-white text-sm md:text-base font-extrabold shadow-md whitespace-nowrap">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="leading-none">Plano mais escolhido</span>
                    </div>
                  </div>
                )}

                <div
                  className={`h-full rounded-2xl border-2 transition-all duration-300 w-full flex flex-col px-5 pt-7 pb-3 md:p-6 relative overflow-hidden ${
                    plan.popular
                      ? "bg-white border-cta shadow-xl md:pt-10 ring-2 ring-cta/30 hover:ring-cta/60 hover:shadow-2xl"
                      : "bg-white border-border hover:border-primary/30 hover:shadow-lg"
                  } ${plan.name === "Simples Nacional" ? "pb-10" : ""}`}
                >
                  {/* Plan header */}
                  <div className="mb-2 md:mb-3 text-center md:text-left">
                    <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.subtitle}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-2 md:mb-3 space-y-2.5 md:space-y-3">
                    {plan.name === "Simples Nacional" && (
                      <div className="flex flex-col items-center md:items-start gap-1">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide text-destructive text-center md:text-left">
                          Oferta de lançamento
                        </span>
                      </div>
                    )}
                    {plan.name === "Simples Nacional" ? (
                      <div className="flex flex-col items-center md:items-start gap-0.5">
                        <span className="text-xs text-muted-foreground">A partir de</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-muted-foreground text-base">R$</span>
                          <span className="font-extrabold text-success text-6xl">
                            {plan.price}
                          </span>
                          {plan.period && (
                            <span className="text-muted-foreground text-sm">{plan.period}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center md:items-start gap-1.5">
                        <div className="flex items-baseline gap-1">
                          {plan.name !== "Lucro Presumido" && (
                            <span className="text-muted-foreground text-base">R$</span>
                          )}
                          <span
                            className={`font-extrabold text-success ${
                              plan.name === "Lucro Presumido" ? "text-3xl md:text-4xl" : "text-6xl"
                            }`}
                          >
                            {plan.price}
                          </span>
                          {plan.period && (
                            <span className="text-muted-foreground text-sm">{plan.period}</span>
                          )}
                        </div>
                        {plan.originalPrice && (
                          <p className="text-xs text-muted-foreground text-center md:text-left">
                            <span className="line-through">R$ {plan.originalPrice}</span>
                            <span className="ml-2 text-success font-semibold uppercase tracking-wide">
                              ECONOMIA DE 20%
                            </span>
                          </p>
                        )}
                        {plan.name === "Simples Nacional" && (
                          <div className="mt-1 flex justify-center md:justify-start w-full">
                            <span className="inline-flex items-center justify-center px-3 py-0.5 rounded-full bg-success/10 text-success text-[11px] font-semibold uppercase tracking-wide text-center">
                              PRIMEIRO MÊS GRATUITO NA MIGRAÇÃO
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    {plan.name === "Simples Nacional" && (
                      <p className="text-xs text-muted-foreground text-center md:text-left">
                        Para prestadores de serviços sem funcionários.
                      </p>
                    )}
                    {plan.name !== "Simples Nacional" && plan.description && (
                      <p className="text-sm text-muted-foreground text-center md:text-left">
                        {plan.description}
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-3 md:mb-4 flex-1">
                    {(expandedPlan === index ? plan.features : plan.features.slice(0, 4)).map(
                      (feature, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-success" />
                          </div>
                          <span className="text-sm text-foreground text-left">{feature}</span>
                        </li>
                      ),
                    )}
                  </ul>
                  {plan.features.length > 4 && (
                    <button
                      type="button"
                      className="mb-6 text-xs font-medium text-primary hover:underline"
                      onClick={() =>
                        setExpandedPlan(expandedPlan === index ? null : index)
                      }
                    >
                      {expandedPlan === index
                        ? "Ver menos detalhes"
                        : "Ver todos os detalhes"}
                    </button>
                  )}

                  {/* CTA */}
                  {plan.name === "Lucro Presumido" ? (
                    <Button
                      asChild
                      variant="outline"
                      size="xl"
                      className="w-full mt-0.5 md:mt-2 text-base font-semibold whitespace-normal h-auto min-h-[48px] py-3 border-border bg-background hover:bg-accent/60 transition-transform hover:scale-[1.02] active:scale-[0.97]"
                      onClick={() => trackEvent("Pricing", "Select Plan", plan.name)}
                    >
                      <a
                        href="https://wa.me/5543991521870?text=Ol%C3%A1!%20Gostaria%20de%20uma%20proposta%20para%20Lucro%20Presumido%20usando%20a%20plataforma%20Qontax."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2"
                      >
                        {plan.ctaText}
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      variant={plan.name === "Lucro Presumido" ? "outline" : "cta"}
                      size="xl"
                      className={`w-full ${
                        plan.name === "Simples Nacional" ? "mt-4" : "mt-0.5 md:mt-2"
                      } text-base font-semibold whitespace-normal h-auto min-h-[48px] py-3`}
                      onClick={() => trackEvent("Pricing", "Select Plan", plan.name)}
                    >
                      <a
                        href={
                          plan.name === "MEI"
                            ? "https://wa.me/5543991521870?text=Ol%C3%A1!%20Vi%20o%20plano%20MEI%20na%20plataforma%20Qontax%20e%20quero%20contratar."
                            : plan.name === "Simples Nacional"
                            ? "https://wa.me/5543991521870?text=Ol%C3%A1!%20Tenho%20interesse%20no%20plano%20Simples%20Nacional%20com%20automacao%20fiscal%20da%20Qontax."
                            : "https://wa.me/5543991521870?text=Ol%C3%A1!%20Estou%20vendo%20os%20planos%20da%20plataforma%20Qontax%20e%20quero%20tirar%20d%C3%BAvidas."
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2"
                      >
                        {plan.ctaText}
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Dynamic dots indicator for mobile */}
          <div className="md:hidden flex items-center justify-center gap-2 mt-4">
            {plans.map((_, index) => (
              <span
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  activeIndex === index ? "w-4 bg-primary/80" : "w-2 bg-white/30"
                }`}
              />
            ))}
          </div>
          {/* Swipe hint - mobile */}
          <p className="md:hidden text-xs text-muted-foreground text-center mt-3">
            Arraste para o lado para ver todos os planos →
          </p>

          {/* Swipe hint - desktop */}
          <div className="hidden md:flex items-center justify-center gap-2 mt-6 text-xs text-muted-foreground">
            <span>Deslize horizontalmente para comparar os planos</span>
            <span aria-hidden="true" className="text-lg">↔</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
