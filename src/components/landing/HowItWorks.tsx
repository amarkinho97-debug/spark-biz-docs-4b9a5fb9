import { motion } from "framer-motion";

const steps = [
  {
    title: "Faça seu cadastro",
    description:
      "Crie sua conta na Qontax em poucos minutos e responda a um fluxo guiado pensado para prestadores de serviço.",
  },
  {
    title: "Enviamos a documentação",
    description:
      "Nossa automação organiza os protocolos e nossos parceiros técnicos validam os registros da sua empresa.",
  },
  {
    title: "Empresa pronta para faturar",
    description:
      "Tudo pronto. Emitimos suas notas e cuidamos da burocracia para você faturar.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-12 lg:py-24 bg-background" id="como-funciona">
      <div className="container">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 lg:mb-14 max-w-3xl mx-auto"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-4">
            Como a Qontax funciona
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3">
            Em poucos passos você tira a burocracia do caminho
          </h2>
          <p className="text-muted-foreground text-base md:text-lg">
            A Qontax cuida da parte fiscal com automação e <span className="font-semibold">contadores parceiros</span> enquanto
            você foca em vender, atender e crescer.
          </p>
        </motion.div>

        {/* 3-step horizontal timeline */}
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-8 left-8 right-8 h-px bg-gradient-to-r from-primary/20 via-primary/60 to-primary/20" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative z-10">
              {steps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
                  whileHover={{ y: -6, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex flex-col items-center text-center gap-3"
                >
                  {/* Numbered circle */}
                  <div className="relative flex items-center justify-center mb-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground flex items-center justify-center shadow-md hover-scale">
                      <span className="text-base font-semibold">{index + 1}</span>
                    </div>
                  </div>

                  {/* Text content */}
                  <div className="space-y-1.5 max-w-xs">
                    <h3 className="text-base md:text-lg font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
