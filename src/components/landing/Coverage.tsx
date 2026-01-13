import { motion } from "framer-motion";
import { MapPin, Building2, Users, Globe } from "lucide-react";

const stats = [
  { icon: Globe, title: "Atendimento em todo o Brasil", description: "Atuação 100% digital para empresas de serviços em qualquer estado." },
  { icon: Building2, title: "Foco em serviços", description: "Especializada em negócios de serviço, de solo founder a equipes maiores." },
  { icon: Users, title: "Rede dedicada de parceiros", description: "Rede de especialistas preparada para a rotina de negócios digitais e recorrentes." },
  { icon: MapPin, title: "Sem fronteiras físicas", description: "Sua gestão fiscal organizada independente da cidade onde você está." },
];

const Coverage = () => {
  return (
    <section className="py-12 lg:py-24 gradient-hero relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
      </div>

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
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white/90 text-sm font-semibold mb-5">
              <MapPin className="w-4 h-4" />
              Cobertura nacional
            </span>

            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight text-balance max-w-md mx-auto md:mx-0">
              Atendemos empresas de serviço em todo o país
            </h2>

            <p className="text-white/70 mb-6 leading-relaxed max-w-md mx-auto md:mx-0">
              Atuação 100% digital com atendimento humano para negócios de serviço em todos os estados.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 flex flex-col items-center text-center"
                >
                  <div className="w-full flex justify-center mb-2">
                    <stat.icon className="w-6 h-6 text-white/70" />
                  </div>
                  <p className="text-sm font-semibold text-white mb-1 text-center">{stat.title}</p>
                  <p className="text-xs text-white/70 leading-relaxed text-center">{stat.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Brazil map */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative flex justify-center"
          >
            <div className="relative w-full max-w-sm">
              {/* Glowing dots */}
              <div className="absolute inset-0">
                {[
                  { top: "15%", left: "65%", delay: 0 },
                  { top: "25%", left: "75%", delay: 0.2 },
                  { top: "35%", left: "55%", delay: 0.4 },
                  { top: "45%", left: "70%", delay: 0.6 },
                  { top: "55%", left: "50%", delay: 0.8 },
                  { top: "50%", left: "35%", delay: 1 },
                  { top: "65%", left: "55%", delay: 1.2 },
                  { top: "75%", left: "48%", delay: 1.4 },
                ].map((pos, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-3 h-3 rounded-full bg-cta shadow-lg"
                    style={{ top: pos.top, left: pos.left, boxShadow: "0 0 20px hsl(165 80% 45% / 0.6)" }}
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.8, 1, 0.8],
                    }}
                    transition={{
                      duration: 2,
                      delay: pos.delay,
                      repeat: Infinity,
                    }}
                  />
                ))}
              </div>

              {/* Stylized Brazil map */}
              <svg
                viewBox="0 0 300 340"
                className="w-full h-auto drop-shadow-2xl"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M150 20 L220 40 L260 80 L270 140 L260 200 L230 260 L180 300 L130 320 L80 300 L50 260 L30 200 L40 140 L60 80 L100 40 Z"
                  fill="url(#brazilGradient2)"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="2"
                />
                <defs>
                  <linearGradient id="brazilGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Coverage;
