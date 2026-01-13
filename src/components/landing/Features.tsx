import { motion } from "framer-motion";
import {
  Zap,
  Headset,
  BarChart3,
  ShieldCheck,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Automação Completa",
    description: "Emissão de notas e guias 100% automáticas. Adeus, planilhas.",
  },
  {
    icon: Headset,
    title: "Especialistas Parceiros",
    description: "Suporte rápido por WhatsApp com especialistas no seu mercado.",
  },
  {
    icon: BarChart3,
    title: "Visão de Lucro",
    description: "Relatórios simples para decisões de crescimento.",
  },
  {
    icon: ShieldCheck,
    title: "CNPJ Blindado",
    description: "Monitoramento fiscal contínuo para manter sua empresa regular.",
  },
];

const Features = () => {
  return (
    <section className="py-12 lg:py-24 bg-background relative">
      <div className="container">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            O que a Qontax faz por você
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
            Uma fintech completa para sua empresa
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg">
            Controle impostos, faturamento e documentos em um só lugar, unindo automação e especialistas.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="group text-center"
            >
              <div className="bg-card rounded-2xl p-4 lg:p-6 border border-border card-hover h-full flex flex-col justify-between">
                <div className="badge-icon mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xs lg:text-base font-semibold text-foreground mb-1">
                  {feature.title}
                </h3>
                <p className="text-[11px] lg:text-sm text-muted-foreground leading-snug">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
