import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const PrivacyPolicy = () => {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <section className="container py-16 md:py-20 lg:py-24 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
          Política de Privacidade
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          Última atualização: {new Date().toLocaleDateString("pt-BR")}
        </p>

        <div className="space-y-8 text-sm md:text-base leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-2">
              1. Coleta de Dados
            </h2>
            <p>
              Coletamos dados pessoais fornecidos diretamente por você ao criar
              sua conta, contratar nossos serviços ou interagir com a
              plataforma, como nome, e-mail, dados de faturamento e informações
              da sua empresa.
            </p>
            <p className="mt-3">
              Também podemos coletar dados de uso e registros de acesso, como
              endereço IP, data e hora de acesso e páginas visitadas, para fins
              de segurança e melhoria da experiência.
            </p>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-2">
              2. Finalidade do Tratamento
            </h2>
            <p>
              Os dados pessoais são tratados para viabilizar o uso da
              plataforma, cumprir obrigações legais e regulatórias, realizar
              atendimento e suporte, prevenir fraudes e enviar comunicações
              relacionadas ao serviço contratado.
            </p>
            <p className="mt-3">
              Não utilizamos seus dados para fins incompatíveis com aqueles
              informados nesta Política, e sempre buscamos limitar o tratamento
              ao mínimo necessário para cada finalidade.
            </p>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-2">
              3. Segurança
            </h2>
            <p>
              Adotamos medidas técnicas e organizacionais razoáveis para proteger
              os dados pessoais contra acessos não autorizados, perda, uso
              indevido ou alteração, incluindo criptografia, controle de acesso
              e monitoramento de segurança.
            </p>
            <p className="mt-3">
              Apesar dos esforços, nenhum ambiente é totalmente isento de
              riscos. Por isso, também é importante que você mantenha suas
              credenciais em sigilo e utilize dispositivos confiáveis ao acessar
              a plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-2">
              4. Direitos do Titular (LGPD)
            </h2>
            <p>
              Em conformidade com a Lei Geral de Proteção de Dados (LGPD), você
              pode solicitar, a qualquer momento, a confirmação da existência de
              tratamento, o acesso, a correção ou atualização de seus dados
              pessoais.
            </p>
            <p className="mt-3">
              Você também pode requisitar a anonimização, bloqueio ou
              eliminação de dados desnecessários, revogar consentimentos e
              solicitar informações sobre o compartilhamento de dados com
              terceiros, quando aplicável.
            </p>
          </section>

          <section>
            <p>
              Para exercer seus direitos ou em caso de dúvidas sobre esta
              Política de Privacidade, entre em contato pelos canais oficiais de
              suporte informados na plataforma.
            </p>
          </section>
        </div>
      </section>
      <Footer />
    </main>
  );
};

export default PrivacyPolicy;
