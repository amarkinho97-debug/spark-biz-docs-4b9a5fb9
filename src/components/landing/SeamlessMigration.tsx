import { motion } from "framer-motion";
import { CheckCircle2, User, Building2, Rocket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trackEvent } from "@/lib/analytics";

const migrationBenefits = [
  "Não precisa negociar com o contador atual",
  "Histórico fiscal organizado dentro da Qontax",
  "Suporte especializado para garantir sua conformidade desde o início",
];

const migrationSteps = [
  {
    icon: User,
    title: "Passo 1",
    description: "Você se cadastra na Qontax em poucos minutos",
  },
  {
    icon: Building2,
    title: "Passo 2",
    description: "Nossa rede de especialistas parceiros assume a conversa com seu contador atual e cuida da documentação",
  },
  {
    icon: Rocket,
    title: "Passo 3",
    description: "Sua empresa passa a operar com a Qontax, com dados organizados desde o primeiro mês",
  },
];

const SeamlessMigration = () => {
  return (
    <section className="py-12 lg:py-20 bg-muted/40">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left column - Offer */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center md:text-left"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-success/10 text-success text-sm font-semibold mb-4">
              Migração gratuita para a Qontax
            </span>

            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4 md:mb-5 leading-tight text-balance">
              Troque de contador sem dor de cabeça
            </h2>

            <p className="text-base md:text-lg text-muted-foreground mb-6 md:mb-8 leading-relaxed max-w-xl mx-auto md:mx-0">
              Nós falamos com seu contador atual e importamos todo o histórico. Migração grátis e sem stress.
            </p>

            <ul className="space-y-2.5 md:space-y-3 mb-6 md:mb-8 max-w-md mx-auto md:mx-0 text-left">
              {migrationBenefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2.5 md:gap-3">
                  <span className="mt-0.5">
                    <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-success" />
                  </span>
                  <span className="text-sm md:text-base text-foreground">{benefit}</span>
                </li>
              ))}
            </ul>

            <div className="flex justify-center md:justify-start">
               <Button size="xl" variant="cta" onClick={() => trackEvent("Migration", "Click", "Start Migration")}>
                 Quero migrar para a Qontax
               </Button>
             </div>
          </motion.div>

          {/* Right column - Process card */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-card/80 border-border/80 shadow-lg max-w-md mx-auto">
              <CardHeader className="pb-4 text-center">
                <CardTitle className="text-lg md:text-xl font-semibold text-foreground">
                  Como funciona a migração
                </CardTitle>
                 <p className="text-sm text-muted-foreground">
                   Um processo simples, seguro e 100% assistido pelo nosso time
                 </p>
              </CardHeader>
              <CardContent className="space-y-5">
                {migrationSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className="flex items-start gap-4"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
                      <step.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {step.title}
                        </span>
                        <span className="inline-block h-1 w-8 rounded-full bg-primary/40" />
                      </div>
                      <p className="text-sm md:text-base text-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SeamlessMigration;
