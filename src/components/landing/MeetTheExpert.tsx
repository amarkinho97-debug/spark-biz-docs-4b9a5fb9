import { motion } from "framer-motion";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import MarkCeoImage from "@/assets/mark-ceo.png";

const MeetTheExpert = () => {
  return (
    <section className="py-10 md:py-20 lg:py-24 gradient-hero">
      <div className="container flex flex-col items-center gap-4 md:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="space-y-4 flex flex-col items-center text-center max-w-2xl"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-[hsl(0_0%_100%)] text-xs font-semibold tracking-[0.18em] uppercase">
            <ShieldCheck className="w-4 h-4" />
            Responsabilidade Técnica
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[hsl(0_0%_100%)] text-balance">
            Tecnologia & Expertise
          </h2>
          <p className="text-base md:text-lg text-[hsl(0_0%_100%/_0.9)] max-w-xl text-balance">
            Automação ágil com a segurança de especialistas reais.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col items-center text-center gap-4 sm:gap-6 max-w-xl"
        >
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 rounded-full border-[6px] border-primary shadow-glow flex items-center justify-center bg-[hsl(222_47%_11%)]/40">
            <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full overflow-hidden bg-muted">
              <img
                src={MarkCeoImage}
                alt="Foto profissional do especialista responsável"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>

          <div className="space-y-3 w-full">
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[hsl(0_0%_100%)]/80">
                HEAD DE INTELIGÊNCIA FISCAL
              </p>
              <h3 className="text-lg md:text-xl font-semibold text-[hsl(0_0%_100%)]">
                Mark Alves
              </h3>
              <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[hsl(0_0%_100%)] text-xs font-medium mt-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Operação com Validação Técnica (CRC)</span>
              </div>
            </div>

            <p className="text-sm md:text-base text-[hsl(0_0%_96%)] leading-relaxed max-w-xl mx-auto">
              "Unimos tecnologia de ponta e supervisão jurídica para garantir que sua empresa cresça segura e eficiente."
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default MeetTheExpert;
