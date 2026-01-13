import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export type EmissionStatus = "loading" | "success" | "error";

interface EmissionStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStep: number;
  status: EmissionStatus;
  logs: string[];
  payloadJson?: string | null;
  responseJson?: string | null;
  onViewInvoice?: () => void;
}

const steps = [
  { id: 1, label: "Validação Local" },
  { id: 2, label: "Geração da DPS" },
  { id: 3, label: "Transmissão" },
  { id: 4, label: "Conclusão" },
] as const;

export function EmissionStatusModal({
  open,
  onOpenChange,
  currentStep,
  status,
  logs,
  payloadJson,
  responseJson,
  onViewInvoice,
}: EmissionStatusModalProps) {
  const [logsAccordionValue, setLogsAccordionValue] = useState<string | undefined>();

  useEffect(() => {
    if (status === "error") {
      setLogsAccordionValue("logs");
    }
  }, [status]);

  const combinedLogs = [
    ...logs,
    payloadJson ? "" : undefined,
    payloadJson ? "=== JSON ENVIADO ===" : undefined,
    payloadJson ?? undefined,
    responseJson ? "" : undefined,
    responseJson ? "=== RESPOSTA DA API ===" : undefined,
    responseJson ?? undefined,
  ]
    .filter(Boolean)
    .join("\n");

  const canClose = status !== "loading";
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl sm:max-w-2xl"
        onInteractOutside={(event) => {
          if (!canClose) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className={cn("flex items-center gap-2", isError && "text-destructive")}>
            {isSuccess ? "Sucesso! Nota Emitida 🎉" : isError ? "Falha na Emissão" : "Processando Emissão..."}
          </DialogTitle>
          <DialogDescription>
            {isSuccess
              ? "Sua NFS-e foi emitida com sucesso. Você pode visualizar ou baixar o PDF abaixo."
              : isError
                ? "Não foi possível concluir a emissão. Revise os detalhes técnicos e tente novamente."
                : "Acompanhe as etapas de emissão da NFS-e em tempo real. Esta janela não será fechada até que o processo seja concluído."}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)]">
          {/* Timeline */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Etapas da emissão</h3>
            <ol className="space-y-3">
              {steps.map((step, index) => {
                let state: "pending" | "active" | "done" | "error" = "pending";

                if (status === "error" && currentStep === step.id) {
                  state = "error";
                } else if (step.id < currentStep) {
                  state = "done";
                } else if (step.id === currentStep) {
                  state = "active";
                }

                const Icon =
                  state === "done"
                    ? CheckCircle2
                    : state === "error"
                      ? XCircle
                      : state === "active"
                        ? Loader2
                        : Circle;

                return (
                  <li key={step.id} className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border text-muted-foreground",
                        state === "active" && "border-primary text-primary bg-primary/5",
                        state === "done" && "border-success text-success bg-success/5",
                        state === "error" && "border-destructive text-destructive bg-destructive/5",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          state === "active" && "animate-spin",
                        )}
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-foreground">{step.label}</p>
                      {index === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Conferindo dados obrigatórios, documentos e configurações da empresa.
                        </p>
                      )}
                      {index === 1 && (
                        <p className="text-xs text-muted-foreground">
                          Montando o JSON da DPS com códigos fiscais e valores.
                        </p>
                      )}
                      {index === 2 && (
                        <p className="text-xs text-muted-foreground">
                          Enviando os dados para a nuvem fiscal e aguardando resposta.
                        </p>
                      )}
                      {index === 3 && (
                        <p className="text-xs text-muted-foreground">
                          Atualizando o status da nota no painel e registrando o protocolo.
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Logs */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Detalhes Técnicos / Logs</h3>
            <Accordion
              type="single"
              collapsible
              value={logsAccordionValue}
              onValueChange={setLogsAccordionValue}
            >
              <AccordionItem value="logs" className="rounded-lg border border-border">
                <AccordionTrigger className="px-3 py-2 text-xs md:text-sm">
                  Visualizar JSON enviado e resposta da API
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 pt-0">
                  <textarea
                    readOnly
                    className="mt-2 h-56 w-full resize-none rounded-md border border-border bg-background p-3 font-mono text-xs leading-relaxed text-success/90"
                    value={combinedLogs || "Aguardando registros de log..."}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          {canClose && (
            <Button
              type="button"
              variant="outline"
              className="sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
          )}

          {status === "success" && (
            <Button
              type="button"
              className="sm:w-auto"
              onClick={() => {
                onViewInvoice?.();
              }}
            >
              📄 Visualizar/Baixar PDF
            </Button>
          )}

          {status === "error" && (
            <span className="text-xs text-destructive sm:mr-auto">
              Ocorreu um erro durante a emissão. Revise os detalhes técnicos acima.
            </span>
          )}

          {status === "loading" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground sm:mr-auto">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Emitindo NFS-e na nuvem fiscal...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
