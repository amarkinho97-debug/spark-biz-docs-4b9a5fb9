import { CheckCircle2, Download, Mail, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { generateInvoicePDF, PdfInvoiceData } from "@/lib/pdfInvoice";

interface SuccessModalProps {
  open: boolean;
  invoiceNumber: string;
  onClose: () => void;
  onNewInvoice: () => void;
  invoiceData?: PdfInvoiceData;
  userId?: string;
}

export function SuccessModal({
  open,
  invoiceNumber,
  onClose,
  onNewInvoice,
  invoiceData,
  userId,
}: SuccessModalProps) {
  const handleDownload = async () => {
    if (!invoiceData || !userId) {
      alert("Dados da nota indisponíveis para download.");
      return;
    }

    if (invoiceData.officialPdfUrl) {
      try {
        window.open(invoiceData.officialPdfUrl, "_blank", "noopener,noreferrer");
        return;
      } catch {
        // Se falhar, gera o recibo interno
      }
    }

    await generateInvoicePDF({ invoice: invoiceData, userId }, { returnBlob: false });
  };

  const handleSendEmail = () => {
    // Mock email send
    console.log("Sending email for invoice:", invoiceNumber);
    alert("E-mail enviado (simulação)");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] text-center">
        <DialogHeader className="items-center pt-6">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-12 h-12 text-success" />
          </div>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Nota Fiscal Nº {invoiceNumber} Emitida!
          </DialogTitle>
        </DialogHeader>

        <p className="text-muted-foreground mb-6">
          Sua nota fiscal foi emitida com sucesso e já está disponível para download.
        </p>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleDownload}
            className="w-full h-12 bg-primary hover:bg-primary/90"
          >
            <Download className="mr-2 h-5 w-5" />
            Baixar PDF
          </Button>

          <Button
            onClick={handleSendEmail}
            variant="outline"
            className="w-full h-12"
          >
            <Mail className="mr-2 h-5 w-5" />
            Enviar por E-mail
          </Button>

          <Button
            onClick={onNewInvoice}
            variant="ghost"
            className="w-full h-12 text-primary hover:text-primary"
          >
            <Plus className="mr-2 h-5 w-5" />
            Emitir Outra
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
