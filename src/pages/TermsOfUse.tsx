import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const TermsOfUse = () => {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <section className="container py-16 md:py-20 lg:py-24 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
          Termos de Uso
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          Última atualização: {new Date().toLocaleDateString("pt-BR")}
        </p>

        <div className="space-y-8 text-sm md:text-base leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-2">
              1. Aceitação
            </h2>
            <p>
              Ao acessar ou utilizar a plataforma Qontax, você declara que leu,
              compreendeu e concorda com estes Termos de Uso. Se você não
              concordar com qualquer condição aqui descrita, não deverá utilizar
              a plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-2">
              2. Uso da Plataforma
            </h2>
            <p>
              A plataforma foi desenvolvida para gestão fiscal e contábil de
              negócios que prestam serviços. Você se compromete a utilizá-la de
              forma ética, em conformidade com a legislação vigente e apenas
              para fins lícitos relacionados às atividades da sua empresa.
            </p>
            <p className="mt-3">
              É de sua responsabilidade manter a confidencialidade das credenciais
              de acesso, bem como garantir que as informações inseridas na
              plataforma sejam verdadeiras, completas e atualizadas.
            </p>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-2">
              3. Pagamentos
            </h2>
            <p>
              Alguns recursos da plataforma podem depender da contratação de
              planos pagos, conforme condições comerciais apresentadas no
              momento da assinatura. Os valores, formas de pagamento e condições
              promocionais poderão ser atualizados periodicamente.
            </p>
            <p className="mt-3">
              A falta de pagamento poderá resultar na suspensão ou cancelamento
              do acesso aos recursos contratados, sem prejuízo da cobrança de
              valores eventualmente devidos.
            </p>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-2">
              4. Cancelamento
            </h2>
            <p>
              Você poderá solicitar o cancelamento do plano a qualquer momento,
              observadas as regras específicas do plano contratado. O cancelamento
              não implica restituição de valores já pagos, salvo disposição
              expressa em contrário em ofertas comerciais ou na legislação
              aplicável.
            </p>
            <p className="mt-3">
              A Qontax poderá, a seu critério, cancelar ou suspender o acesso em
              casos de uso indevido, fraude, violação destes Termos ou exigência
              legal ou regulatória.
            </p>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-2">
              5. Limitação de Responsabilidade
            </h2>
            <p>
              A Qontax disponibiliza ferramentas de apoio à gestão fiscal e
              contábil, mas decisões tributárias, financeiras e societárias
              continuam sendo de responsabilidade do usuário e de seus
              consultores.
            </p>
            <p className="mt-3">
              Em nenhuma hipótese a Qontax será responsável por danos indiretos,
              lucros cessantes ou prejuízos decorrentes de uso inadequado da
              plataforma, erros de informação fornecida pelo usuário ou falhas
              decorrentes de serviços de terceiros (como provedores de internet
              ou órgãos governamentais).
            </p>
          </section>

          <section>
            <p>
              Em caso de dúvidas sobre estes Termos de Uso, entre em contato com
              nosso time pelos canais oficiais de suporte.
            </p>
          </section>
        </div>
      </section>
      <Footer />
    </main>
  );
};

export default TermsOfUse;
