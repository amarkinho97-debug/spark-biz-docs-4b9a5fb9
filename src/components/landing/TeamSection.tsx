import { ExpertCard } from "@/components/landing/ExpertCard";
import CamilaCostaImage from "@/assets/team-camila-costa.jpg";
import DiegoAlvesImage from "@/assets/team-diego-alves.jpg";

const experts = [
  {
    name: "Mark Alves",
    role: "CEO & Head de Inteligência Fiscal",
    specialties: ["Tributário", "Planejamento Fiscal"],
    linkedinUrl: "https://www.linkedin.com/",
    imageUrl: "/file.png",
  },
  {
    name: "Dr. Diego Alves",
    role: "Consultor Jurídico Tributário",
    specialties: ["Direito Tributário", "Defesa Fiscal"],
    linkedinUrl: "https://www.linkedin.com/",
    imageUrl: DiegoAlvesImage,
  },
  {
    name: "Stephany Lourenço",
    role: "Gestora de Contas & Sucesso",
    specialties: ["Onboarding", "Sucesso do Cliente"],
    linkedinUrl: "https://www.linkedin.com/",
    imageUrl: CamilaCostaImage,
  },
];

const TeamSection = () => {
  return (
    <section className="pt-8 pb-16 bg-background">
      <div className="container">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-2">
            Nosso Time Especialista
          </h2>
          <p className="text-sm text-muted-foreground max-w-[420px] mx-auto">
            Pessoas reais por trás da tecnologia, prontas para ajudar sua empresa a crescer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {experts.map((expert) => (
            <ExpertCard
              key={expert.name}
              name={expert.name}
              role={expert.role}
              specialties={expert.specialties}
              linkedinUrl={expert.linkedinUrl}
              imageUrl={expert.imageUrl}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TeamSection;
