import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { trackEvent } from "@/lib/analytics";

const faqs = [
  {
    id: "q1",
    question: "A Qontax atende minha cidade?",
    answer:
      "Sim! Somos uma plataforma de inteligência fiscal 100% digital e atendemos prestadores de serviço em todo o Brasil, seguindo as regras fiscais de cada prefeitura.",
  },
  {
    id: "q2",
    question: "Como funciona a migração de contador?",
    answer:
      "É gratuito e sem dor de cabeça. Nossa rede de especialistas parceiros entra em contato com seu contador antigo, solicita os documentos e faz toda a transferência técnica. Você não precisa se preocupar com nada.",
  },
  {
    id: "q3",
    question: "Existe contrato de fidelidade?",
    answer:
      "Não. Acreditamos na qualidade do nosso serviço. Você pode cancelar sua assinatura a qualquer momento, sem multas ou taxas surpresa.",
  },
  {
    id: "q4",
    question: "O suporte é feito por robôs?",
    answer:
      "Não. Temos tecnologia para agilizar processos, mas o atendimento é feito por contadores parceiros reais via WhatsApp e E-mail, prontos para entender seu negócio.",
  },
  {
    id: "q5",
    question: "Sou MEI, a Qontax serve para mim?",
    answer:
      "Com certeza. Temos um plano exclusivo para MEI que automatiza suas guias DAS, Declaração Anual e mantém seu CNPJ regularizado para você focar em crescer.",
  },
];

const FAQ = () => {
  return (
    <section className="pt-14 pb-8 lg:pt-24 lg:pb-12 bg-foreground text-white">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-white/80 text-sm font-semibold mb-4">
            Dúvidas finais
          </span>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-white/70 max-w-2xl mx-auto text-base md:text-lg">
            Tire suas dúvidas sobre a Qontax.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="border border-white/10 rounded-xl bg-white/5 px-4"
              >
                <AccordionTrigger
                  className="text-left text-sm md:text-base font-medium text-white py-3"
                  onClick={() => trackEvent("FAQ", "Expand", faq.question)}
                >
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm md:text-base text-white/80 pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
