import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TermsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TermsModal({ open, onOpenChange }: TermsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Termos de Serviço &amp; Política de Privacidade</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            Esta é uma versão resumida dos Termos de Serviço e da Política de
            Privacidade. Para o texto completo e juridicamente vinculante, acesse
            as páginas dedicadas abaixo.
          </p>
          <p>
            Ao criar sua conta, você concorda com o tratamento dos seus dados
            pessoais para fins de operação da plataforma, emissão de notas e
            comunicações essenciais, conforme descrito na nossa Política de
            Privacidade.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Você é responsável pela veracidade dos dados informados.</li>
            <li>Podemos enviar comunicações transacionais sobre sua conta.</li>
            <li>
              Você pode solicitar a exclusão da conta e dos dados conforme os
              limites legais aplicáveis.
            </li>
          </ul>
          <p>
            Leia os documentos completos em:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <a
                href="/terms-of-use"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Termos de Serviço
              </a>
            </li>
            <li>
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Política de Privacidade
              </a>
            </li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
