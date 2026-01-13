import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  FileText,
  ChevronDown,
  Users,
  Plus,
  ChevronsUpDown,
  Info,
  AlertCircle,
  Check as CheckIcon,
  Lightbulb,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SuccessModal } from "@/components/dashboard/SuccessModal";
import { EmissionStatusModal } from "@/components/dashboard/EmissionStatusModal";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useToast } from "@/hooks/use-toast";
import { useConfetti } from "@/hooks/useConfetti";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CitySearchInput } from "@/components/CitySearchInput";
import { generateNfseXml } from "@/lib/nfseXml";
import { CNPJCPFInput, CEPInput } from "@/components/ui/masked-input";
import { validateCPForCNPJ, fetchAddressByCEP } from "@/lib/documentValidation";
import { generateInvoicePDF, PdfInvoiceData } from "@/lib/pdfInvoice";
import { COMMON_LC116, COMMON_NBS } from "@/constants/taxData";
import { formatFormToDPS } from "@/utils/dpsFormatter";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

const invoiceSchema = z.object({
  clientMode: z.enum(["registered", "manual"]).default("registered"),
  clientId: z.string().optional(),
  // Campo oculto para armazenar o documento do tomador quando o cliente é cadastrado
  registeredClientCnpj: z.string().optional(),
  // Manual client fields
  manualClientCnpj: z.string().optional(),
  manualClientRazaoSocial: z.string().optional(),
  manualClientEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  manualClientCep: z.string().optional(),
  manualClientEndereco: z.string().optional(),
  manualClientNumero: z.string().optional(),
  manualClientBairro: z.string().optional(),
  manualClientCidade: z.string().optional(),
  manualClientEstado: z.string().optional(),
  descricao: z
    .string()
    .min(10, "Descreva o serviço com mais detalhes")
    .max(1000, "Descrição muito longa"),
  valor: z.string().min(1, "Valor é obrigatório"),
  descontoIncondicionado: z.string().optional(),
  codigoServico: z.string().min(1, "Selecione o código do serviço"),
  codigoNbs: z.string().optional(),
  naturezaOperacao: z.enum([
    "Tributação no município",
    "Tributação fora do município",
    "Isenta",
    "Imune",
    "Exigibilidade Suspensa por Decisão Judicial",
    "Exportação de Serviço",
  ]),
  dataCompetencia: z.string().min(1, "Data de competência é obrigatória"),
  localPrestacao: z.enum(["mesmo_municipio", "outro_municipio"]),
  ibgeMunicipio: z.string().optional(),
  issRetido: z.boolean(),
  issRetidoValor: z.string().optional(),
  pis: z.string().optional(),
  cofins: z.string().optional(),
  inss: z.string().optional(),
  ir: z.string().optional(),
  csll: z.string().optional(),
  observacoes: z.string().max(1000, "Máximo de 1000 caracteres").optional(),
}).refine((data) => {
  if (data.clientMode === "registered") {
    return data.clientId && data.clientId.length > 0;
  }
  if (data.clientMode === "manual") {
    return data.manualClientCnpj && data.manualClientCnpj.length > 0 &&
           data.manualClientRazaoSocial && data.manualClientRazaoSocial.length > 0;
  }
  return false;
}, {
  message: "Selecione um cliente ou preencha os dados manualmente",
  path: ["clientId"],
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface Client {
  id: string;
  razao_social: string;
  cnpj: string;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
}

interface TaxServiceCode {
  id: string;
  code_lc116: string;
  description: string;
  code_nbs: string | null;
  keywords: string | null;
}

interface NbsCode {
  code: string;
  description: string;
  category: string | null;
}

const formatCurrencyDisplay = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
};

const formatCurrencyInput = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDateToBR = (value: string | undefined | null) => {
  if (!value) return "-";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("pt-BR");
  } catch {
    return value;
  }
};

export default function EmitirNota() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invoiceIdFromUrl = searchParams.get("id");
  const { fireConfetti } = useConfetti();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftInvoiceId, setDraftInvoiceId] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState("");
  const [serviceCodeOpen, setServiceCodeOpen] = useState(false);
  const [nbsCodeOpen, setNbsCodeOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [taxSummary, setTaxSummary] = useState({
    issValor: 0,
    totalRetencoes: 0,
    valorLiquido: 0,
  });
  const [suggestedServiceCode, setSuggestedServiceCode] = useState<TaxServiceCode | null>(null);
  const [userSelectedCode, setUserSelectedCode] = useState(false);
  const [cnpjCpfError, setCnpjCpfError] = useState<string | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const lastFetchedCnpjRef = useRef<string | null>(null);
  const [lastInvoiceData, setLastInvoiceData] = useState<PdfInvoiceData | null>(null);
  const [companyProfile, setCompanyProfile] = useState<{
    cnpj: string | null;
    regime_tributario: string | null;
    razao_social: string | null;
    inscricao_municipal: string | null;
  } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [emissionModalOpen, setEmissionModalOpen] = useState(false);
  const [emissionCurrentStep, setEmissionCurrentStep] = useState(1);
  const [emissionStatus, setEmissionStatus] = useState<"loading" | "success" | "error">("loading");
  const [emissionLogs, setEmissionLogs] = useState<string[]>([]);
  const [emissionPayload, setEmissionPayload] = useState<string | null>(null);
  const [emissionResponse, setEmissionResponse] = useState<string | null>(null);
  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      clientMode: "registered",
      clientId: "",
      registeredClientCnpj: "",
      manualClientCnpj: "",
      manualClientRazaoSocial: "",
      manualClientEmail: "",
      manualClientCep: "",
      manualClientEndereco: "",
      manualClientNumero: "",
      manualClientBairro: "",
      manualClientCidade: "",
      manualClientEstado: "",
      descricao: "",
      valor: "",
      descontoIncondicionado: "",
      codigoServico: "",
      codigoNbs: "",
      naturezaOperacao: "Tributação no município",
      dataCompetencia: new Date().toISOString().slice(0, 10),
      localPrestacao: "mesmo_municipio",
      ibgeMunicipio: "",
      issRetido: false,
      issRetidoValor: "",
      pis: "",
      cofins: "",
      inss: "",
      ir: "",
      csll: "",
      observacoes: "",
    },
  });

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("cnpj, regime_tributario, razao_social, nome_fantasia, inscricao_municipal")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && data) {
        console.log("Company Data Loaded:", data);
        setCompanyProfile({
          cnpj: data.cnpj,
          regime_tributario: data.regime_tributario,
          razao_social: data.razao_social,
          inscricao_municipal: data.inscricao_municipal,
        });
      }
      setLoadingProfile(false);
    }
    fetchProfile();
  }, [user]);

  useEffect(() => {
    async function fetchClients() {
      if (!user) return;
      const { data, error } = await supabase
        .from("clients")
        .select("id, razao_social, cnpj, endereco, cidade, estado, cep")
        .eq("user_id", user.id)
        .order("razao_social", { ascending: true });

      if (!error && data) {
        setClients(data as Client[]);
      }
      setLoadingClients(false);
    }
    fetchClients();
  }, [user]);

  useEffect(() => {
    if (!user || !invoiceIdFromUrl) return;

    const loadInvoice = async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(
          "id, client_id, descricao_servico, valor, status, data_emissao, operation_nature, service_location_code, retention_codes",
        )
        .eq("id", invoiceIdFromUrl)
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        toast({
          variant: "destructive",
          title: "Erro ao carregar rascunho",
          description: "Não foi possível carregar a nota selecionada.",
        });
        return;
      }

      const retention: any = (data as any).retention_codes || {};

      form.reset({
        clientMode: "registered",
        clientId: (data as any).client_id || "",
        manualClientCnpj: "",
        manualClientRazaoSocial: "",
        manualClientEmail: "",
        manualClientCep: "",
        manualClientEndereco: "",
        manualClientNumero: "",
        manualClientBairro: "",
        manualClientCidade: "",
        manualClientEstado: "",
        descricao: (data as any).descricao_servico || "",
        valor: formatCurrencyInput(Number((data as any).valor)),
        descontoIncondicionado: formatCurrencyInput(Number((data as any).discount_unconditional || 0)),
        codigoServico: "",
        naturezaOperacao: ((data as any).operation_nature as any) || "Tributação no município",
        dataCompetencia: (data as any).data_emissao
          ? new Date((data as any).data_emissao).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        localPrestacao: (data as any).service_location_code ? "outro_municipio" : "mesmo_municipio",
        ibgeMunicipio: ((data as any).service_location_code as string | null) ?? "",
        issRetido: !!retention.iss?.retained,
        issRetidoValor: formatCurrencyInput(retention.iss?.amount),
        pis: formatCurrencyInput(retention.pis?.amount),
        cofins: formatCurrencyInput(retention.cofins?.amount),
        inss: formatCurrencyInput(retention.inss?.amount),
        ir: formatCurrencyInput(retention.ir?.amount),
        csll: formatCurrencyInput(retention.csll?.amount),
      });

      setDraftInvoiceId((data as any).id);
    };

    loadInvoice();
  }, [user, invoiceIdFromUrl, form, toast]);

  const parseCurrency = (value: string | undefined | null): number => {
    if (!value) return 0;
    return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
  };

  const appendEmissionLog = useCallback((entry: string) => {
    setEmissionLogs((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString("pt-BR")}: ${entry}`,
    ]);
  }, []);

  const formatServiceCodeLabel = (code: TaxServiceCode) => {
    return `${code.code_lc116} - ${code.description}${code.code_nbs ? ` (NBS: ${code.code_nbs})` : ""}`;
  };

  const formatNbsCodeLabel = (code: NbsCode) => {
    return `${code.code} - ${code.description}`;
  };

  const onSubmit = async (data: InvoiceFormData) => {
    console.log("🟢 CLICK: Iniciando processo de emissão...", { data });

    try {
      if (!user) {
        console.error("❌ Bloqueio: Usuário não autenticado ao tentar emitir NFS-e");
        toast({
          variant: "destructive",
          title: "Sessão expirada ou usuário não autenticado",
          description: "Faça login novamente para emitir a NFS-e.",
        });
        return;
      }

      setIsSubmitting(true);
      setEmissionModalOpen(true);
      setEmissionStatus("loading");
      setEmissionCurrentStep(1);
      setEmissionLogs([]);
      setEmissionPayload(null);
      setEmissionResponse(null);
      appendEmissionLog("Validando dados...");

      // Garante que os dados da empresa foram carregados
      if (loadingProfile) {
        console.error("❌ Bloqueio: loadingProfile ainda true ao emitir NFS-e");
        toast({
          variant: "destructive",
          title: "Carregando dados da empresa",
          description: "Aguarde enquanto carregamos os dados da sua empresa.",
        });
        setEmissionStatus("error");
        appendEmissionLog("Erro: Dados da empresa ainda estão carregando.");
        setIsSubmitting(false);
        return;
      }

      // Validar CNPJ e inscrição municipal antes de emitir
      if (!companyProfile?.cnpj || !companyProfile?.inscricao_municipal) {
        console.error("❌ Bloqueio: companyProfile sem CNPJ ou Inscrição Municipal", {
          companyProfile,
        });
        toast({
          variant: "destructive",
          title: "Configure os dados da sua empresa",
          description:
            "Configure CNPJ e Inscrição Municipal em Configurações antes de emitir.",
        });
        setEmissionStatus("error");
        appendEmissionLog("Erro: CNPJ ou Inscrição Municipal da empresa não configurados.");
        setIsSubmitting(false);
        navigate("/configuracoes");
        return;
      }

      let dpsPayload;
      try {
        setEmissionCurrentStep(2);
        appendEmissionLog("Gerando JSON da DPS...");

        dpsPayload = formatFormToDPS(data, {
          cnpj: companyProfile.cnpj,
          regime_tributario: companyProfile.regime_tributario || undefined,
          inscricao_municipal: companyProfile.inscricao_municipal || undefined,
        });
        console.log("DPS Payload pronto para emissão:", dpsPayload);
        setEmissionPayload(JSON.stringify(dpsPayload, null, 2));
        toast({
          title: "Iniciando emissão...",
          description: "Enviando sua NFS-e para processamento.",
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao preparar os dados da DPS. Verifique os campos obrigatórios.";

        toast({
          variant: "destructive",
          title: "Erro ao preparar DPS",
          description: message,
        });

        setEmissionStatus("error");
        appendEmissionLog(`Erro ao gerar DPS: ${message}`);
        setIsSubmitting(false);
        return;
      }

      try {
        let finalClientId = data.clientId;

        // Handle manual client entry (Shadow Register)
        if (data.clientMode === "manual" && data.manualClientCnpj && data.manualClientRazaoSocial) {
          // Check if client already exists by CNPJ
          const { data: existingClient } = await supabase
            .from("clients")
            .select("id")
            .eq("cnpj", data.manualClientCnpj.replace(/\D/g, ""))
            .eq("user_id", user.id)
            .maybeSingle();

          if (existingClient) {
            // Update existing client with new address data if provided
            const updatePayload: any = {};
            if (data.manualClientRazaoSocial) updatePayload.razao_social = data.manualClientRazaoSocial;
            if (data.manualClientEmail) updatePayload.email = data.manualClientEmail;
            if (data.manualClientCep) updatePayload.cep = data.manualClientCep;
            if (data.manualClientCidade) updatePayload.cidade = data.manualClientCidade;
            if (data.manualClientEstado) updatePayload.estado = data.manualClientEstado;
            if (data.manualClientEndereco || data.manualClientNumero || data.manualClientBairro) {
              const parts = [
                data.manualClientEndereco,
                data.manualClientNumero ? `nº ${data.manualClientNumero}` : null,
                data.manualClientBairro,
              ].filter(Boolean);
              updatePayload.endereco = parts.join(", ");
            }

            if (Object.keys(updatePayload).length > 0) {
              await supabase
                .from("clients")
                .update(updatePayload)
                .eq("id", existingClient.id);
            }

            finalClientId = existingClient.id;
          } else {
            // Create new client
            const addressParts = [
              data.manualClientEndereco,
              data.manualClientNumero ? `nº ${data.manualClientNumero}` : null,
              data.manualClientBairro,
            ].filter(Boolean);

            const { data: newClient, error: clientError } = await supabase
              .from("clients")
              .insert({
                user_id: user.id,
                cnpj: data.manualClientCnpj.replace(/\D/g, ""),
                razao_social: data.manualClientRazaoSocial,
                email: data.manualClientEmail || null,
                cep: data.manualClientCep || null,
                endereco: addressParts.length > 0 ? addressParts.join(", ") : null,
                cidade: data.manualClientCidade || null,
                estado: data.manualClientEstado || null,
              })
              .select("id")
              .single();

            if (clientError) throw clientError;
            finalClientId = newClient?.id;
          }
        }

        if (!finalClientId) {
          throw new Error("Cliente não identificado. Selecione ou preencha os dados do cliente.");
        }

        const generatedNumber = `${new Date().getFullYear()}/${String(
          Math.floor(Math.random() * 9000 + 1000),
        )}`;
        const valorNumerico = parseCurrency(data.valor);
        const desconto = parseCurrency(data.descontoIncondicionado);
        const issValor = data.issRetido ? parseCurrency(data.issRetidoValor) : 0;
        const pisValor = parseCurrency(data.pis);
        const cofinsValor = parseCurrency(data.cofins);
        const inssValor = parseCurrency(data.inss);
        const irValor = parseCurrency(data.ir);
        const csllValor = parseCurrency(data.csll);
        const totalRetencoesFederais =
          pisValor + cofinsValor + inssValor + irValor + csllValor;
        const valorLiquido = Math.max(
          valorNumerico - desconto - issValor - totalRetencoesFederais,
          0,
        );

        const retentionCodes = {
          iss: { retained: data.issRetido, amount: issValor },
          pis: { retained: pisValor > 0, amount: pisValor },
          cofins: { retained: cofinsValor > 0, amount: cofinsValor },
          inss: { retained: inssValor > 0, amount: inssValor },
          ir: { retained: irValor > 0, amount: irValor },
          csll: { retained: csllValor > 0, amount: csllValor },
        };

        const xmlContent = generateNfseXml({
          numeroNota: generatedNumber,
          dataEmissao: new Date().toISOString(),
          dataCompetencia: data.dataCompetencia,
          descricaoServico: data.descricao,
          valorServicos: valorNumerico,
          valorLiquido,
          naturezaOperacao: data.naturezaOperacao,
          localPrestacao: data.localPrestacao,
          serviceLocationCode:
            data.localPrestacao === "outro_municipio" ? data.ibgeMunicipio || null : null,
          issRetido: data.issRetido,
          tributos: {
            issRetidoValor: issValor,
            pis: pisValor,
            cofins: cofinsValor,
            inss: inssValor,
            ir: irValor,
            csll: csllValor,
          },
        });

        const payload = {
          user_id: user.id,
          client_id: finalClientId,
          numero_nota: generatedNumber,
          descricao_servico: data.descricao,
          valor: valorNumerico,
          discount_unconditional: desconto,
          status: "draft" as const,
          data_emissao: new Date().toISOString(),
          operation_nature: data.naturezaOperacao,
          service_location_code:
            data.localPrestacao === "outro_municipio" ? data.ibgeMunicipio || null : null,
          retention_codes: retentionCodes,
          xml_content: xmlContent,
        };

        let currentInvoiceId = draftInvoiceId;

        if (currentInvoiceId) {
          const { error } = await supabase
            .from("invoices")
            .update(payload)
            .eq("id", currentInvoiceId);

          if (error) throw error;
        } else {
          const { data: inserted, error } = await supabase
            .from("invoices")
            .insert(payload)
            .select("id")
            .single();

          if (error) throw error;
          currentInvoiceId = inserted?.id ?? null;
          if (currentInvoiceId) {
            setDraftInvoiceId(currentInvoiceId);
          }
        }

        if (!currentInvoiceId) {
          throw new Error("Não foi possível obter o ID da nota para emissão.");
        }

        // Marca a nota como em processamento antes de chamar a Nuvem Fiscal
        await supabase
          .from("invoices")
          .update({ status: "processing" })
          .eq("id", currentInvoiceId);

        setEmissionCurrentStep(3);
        appendEmissionLog("Enviando para Nuvem Fiscal (função de nuvem)...");

        const { data: emitData, error: fnError } = await supabase.functions.invoke("emit-invoice", {
          body: dpsPayload,
        });

        setEmissionResponse(JSON.stringify(emitData, null, 2));

        if (fnError || (emitData as any)?.error) {
          const backendMessage = (emitData as any)?.error || (emitData as any)?.details?.message;

          // Persiste o erro na própria nota para aparecer no histórico
          await supabase
            .from("invoices")
            .update({
              status: "draft",
              error_message:
                backendMessage || fnError?.message || "Erro ao emitir nota na Nuvem Fiscal.",
            })
            .eq("id", currentInvoiceId);

          throw new Error(
            backendMessage || fnError?.message || "Erro ao emitir nota na Nuvem Fiscal.",
          );
        }

        const protocolo =
          (emitData as any)?.protocolo || (emitData as any)?.numero || (emitData as any)?.id;
        const externalId = (emitData as any)?.id ?? null;

        // Atualiza a nota com os dados oficiais retornados
        const { error: updateError } = await supabase
          .from("invoices")
          .update({
            status: "issued",
            protocol_number: protocolo ?? null,
            external_id: externalId,
            error_message: null,
          })
          .eq("id", currentInvoiceId);

        if (updateError) {
          throw updateError;
        }

        toast({
          title: "Nota emitida com sucesso!",
          description: protocolo ? `Protocolo: ${protocolo}` : undefined,
        });
        setLastInvoiceNumber(generatedNumber);

        setEmissionCurrentStep(4);
        setEmissionStatus("success");
        appendEmissionLog(
          protocolo
            ? `Emissão concluída com sucesso. Protocolo: ${protocolo}`
            : "Emissão concluída com sucesso.",
        );

        const selectedClientForPreview = clients.find((c) => c.id === data.clientId) || null;

        const clientInfo = data.clientMode === "registered"
          ? selectedClientForPreview && {
              razaoSocial: selectedClientForPreview.razao_social,
              cnpj: selectedClientForPreview.cnpj,
              email: null,
              enderecoCompleto: [
                selectedClientForPreview.endereco,
                selectedClientForPreview.cidade,
                selectedClientForPreview.estado,
                selectedClientForPreview.cep,
              ]
                .filter(Boolean)
                .join(" - ") || null,
            }
          : {
              razaoSocial: data.manualClientRazaoSocial || null,
              cnpj: data.manualClientCnpj || null,
              email: data.manualClientEmail || null,
              enderecoCompleto: [
                data.manualClientEndereco,
                data.manualClientNumero ? `nº ${data.manualClientNumero}` : null,
                data.manualClientBairro,
                data.manualClientCidade,
                data.manualClientEstado,
                data.manualClientCep,
              ]
                .filter(Boolean)
                .join(" - ") || null,
            };

        const pdfInvoiceData: PdfInvoiceData = {
          id: currentInvoiceId,
          numeroNota: generatedNumber,
          descricaoServico: data.descricao,
          valor: valorNumerico,
          status: "issued",
          dataEmissao: new Date().toISOString(),
          client: clientInfo,
          competencia: data.dataCompetencia,
          naturezaOperacao: data.naturezaOperacao,
          serviceCode: data.codigoServico,
          nbsCode: data.codigoNbs || undefined,
          desconto,
          issValor,
          pisValor,
          cofinsValor,
          inssValor,
          irValor,
          csllValor,
          totalRetencoes: totalRetencoesFederais,
          valorLiquido,
          observacoes: data.observacoes || undefined,
          officialPdfUrl: null,
        };

        setLastInvoiceData(pdfInvoiceData);
        setSuccessModalOpen(true);
        fireConfetti();
      } catch (error: any) {
        console.error("Erro ao emitir nota", error);
        setEmissionCurrentStep(4);
        setEmissionStatus("error");
        appendEmissionLog(`Erro na emissão: ${error?.message || "Erro desconhecido"}`);
        toast({
          variant: "destructive",
          title: "Erro ao emitir nota",
          description: error.message || "Tente novamente.",
        });
      } finally {
        setIsSubmitting(false);
      }
    } catch (error: any) {
      console.error("🔴 ERRO CRÍTICO NO CLICK:", error);
      toast({
        variant: "destructive",
        title: "Erro ao processar emissão",
        description: "Erro ao processar emissão. Verifique o console.",
      });
      setIsSubmitting(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setSuccessModalOpen(false);
    setLastInvoiceData(null);
    navigate("/dashboard/notas");
  };

  const handleNewInvoice = () => {
    setSuccessModalOpen(false);
    setLastInvoiceData(null);
    form.reset();
  };

  const generatePreviewPDF = async () => {
    if (!user) return;

    const values = form.getValues();

    if (!values.descricao || !values.valor) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description:
          "Preencha ao menos a descrição e o valor do serviço para visualizar o rascunho.",
      });
      return;
    }

    if (loadingProfile) {
      toast({
        variant: "destructive",
        title: "Carregando dados da empresa",
        description: "Aguarde enquanto carregamos os dados da sua empresa.",
      });
      return;
    }

    if (!companyProfile?.cnpj || !companyProfile?.inscricao_municipal) {
      toast({
        variant: "destructive",
        title: "Configure os dados da sua empresa",
        description:
          "Configure CNPJ e Inscrição Municipal em Configurações antes de gerar o rascunho.",
      });
      navigate("/configuracoes");
      return;
    }

    setPreviewLoading(true);

    try {
      const selectedClientForPreview = clients.find((c) => c.id === values.clientId) || null;

      const valorBruto = parseCurrency(values.valor);
      const desconto = parseCurrency(values.descontoIncondicionado);
      const issValor = values.issRetido ? parseCurrency(values.issRetidoValor) : 0;
      const pisValor = parseCurrency(values.pis);
      const cofinsValor = parseCurrency(values.cofins);
      const inssValor = parseCurrency(values.inss);
      const irValor = parseCurrency(values.ir);
      const csllValor = parseCurrency(values.csll);
      const totalRetencoesFederais =
        pisValor + cofinsValor + inssValor + irValor + csllValor;
      const valorLiquido = Math.max(
        valorBruto - desconto - issValor - totalRetencoesFederais,
        0,
      );

      // Normaliza dados fiscais (LC116 e IBGE) usando o mesmo formatter da emissão real
      const formattedDps = formatFormToDPS(values, {
        cnpj: companyProfile?.cnpj || undefined,
        regime_tributario: (companyProfile as any)?.regime_tributario || undefined,
        inscricao_municipal: companyProfile?.inscricao_municipal || undefined,
      });

      const ibgeCode = formattedDps.infDPS.toma.end.endNac.cMun;
      const ibgeWarning = "(IBGE Pendente - Verifique o CEP)";

      const buildCityWithIbge = (city?: string | null, uf?: string | null) => {
        const baseCity = [city, uf].filter(Boolean).join(" - ");

        if (ibgeCode) {
          return baseCity
            ? `${baseCity} (Cód. IBGE: ${ibgeCode})`
            : `Cód. IBGE: ${ibgeCode}`;
        }

        return baseCity ? `${baseCity} ${ibgeWarning}` : ibgeWarning;
      };

      const clientInfo = values.clientMode === "registered"
        ? selectedClientForPreview && {
            razaoSocial: selectedClientForPreview.razao_social,
            cnpj: selectedClientForPreview.cnpj,
            email: null,
            enderecoCompleto: [
              selectedClientForPreview.endereco,
              buildCityWithIbge(
                selectedClientForPreview.cidade,
                selectedClientForPreview.estado,
              ),
              selectedClientForPreview.cep,
            ]
              .filter(Boolean)
              .join(" - ") || null,
          }
        : {
            razaoSocial: values.manualClientRazaoSocial || null,
            cnpj: values.manualClientCnpj || null,
            email: values.manualClientEmail || null,
            enderecoCompleto: [
              values.manualClientEndereco,
              values.manualClientNumero ? `nº ${values.manualClientNumero}` : null,
              values.manualClientBairro,
              buildCityWithIbge(values.manualClientCidade, values.manualClientEstado),
              values.manualClientCep,
            ]
              .filter(Boolean)
              .join(" - ") || null,
          };

      const selectedServiceCodeForPreview = COMMON_LC116.find(
        (code) => code.value === values.codigoServico,
      );

      const selectedNbsForPreview = values.codigoNbs
        ? COMMON_NBS.find((code) => code.value === values.codigoNbs)
        : null;

      const previewInvoice = {
        id: draftInvoiceId || "preview",
        numeroNota: undefined,
        descricaoServico: values.descricao,
        valor: valorBruto,
        status: "draft" as const,
        dataEmissao: new Date().toISOString(),
        client: clientInfo,
        clientCity:
          values.clientMode === "registered"
            ? selectedClientForPreview?.cidade || null
            : values.manualClientCidade || null,
        clientUf:
          values.clientMode === "registered"
            ? selectedClientForPreview?.estado || null
            : values.manualClientEstado || null,
        clientIbgeCode: ibgeCode || null,
        competencia: values.dataCompetencia,
        naturezaOperacao: values.naturezaOperacao,
        serviceCode: formattedDps.infDPS.serv.cServ.cTribNac,
        nbsCode: selectedNbsForPreview
          ? selectedNbsForPreview.label
          : values.codigoNbs || null,
        valorLiquido,
        observacoes: values.observacoes || undefined,
        officialPdfUrl: undefined,
      };

      const url = await generateInvoicePDF(
        { invoice: previewInvoice, userId: user.id },
        { returnBlob: true },
      );

      if (typeof url === "string") {
        setPreviewUrl(url);
        setPreviewOpen(true);
        window.open(url, "_blank");
      }
    } catch (error: any) {
      console.error("Erro ao gerar preview", error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar PDF",
        description: error.message || "Não foi possível gerar a pré-visualização.",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const formatCnpj = (cnpj: string) => {
    const digits = cnpj.replace(/\D/g, "");
    if (digits.length === 14) {
      return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }
    return cnpj;
  };

  const selectedClientId = form.watch("clientId");
  const selectedClient = clients.find((client) => client.id === selectedClientId);
  const clientMissingCnpj = !!selectedClient && !selectedClient.cnpj;
  const clientMissingAddress =
    !!selectedClient && (!selectedClient.endereco || !selectedClient.cidade || !selectedClient.estado);

  const selectedNbsCodeValue = form.watch("codigoNbs");
  const selectedNbsCode = COMMON_NBS.find((code) => code.value === selectedNbsCodeValue);

  const watchedValor = form.watch("valor");
  const watchedDesconto = form.watch("descontoIncondicionado");
  const watchedIssRetido = form.watch("issRetido");
  const watchedIssValor = form.watch("issRetidoValor");
  const watchedPis = form.watch("pis");
  const watchedCofins = form.watch("cofins");
  const watchedInss = form.watch("inss");
  const watchedIr = form.watch("ir");
  const watchedCsll = form.watch("csll");

  const valorBruto = parseCurrency(watchedValor);
  const desconto = parseCurrency(watchedDesconto);
  const issValor = watchedIssRetido ? parseCurrency(watchedIssValor) : 0;
  const totalRetencoesFederais =
    parseCurrency(watchedPis) +
    parseCurrency(watchedCofins) +
    parseCurrency(watchedInss) +
    parseCurrency(watchedIr) +
    parseCurrency(watchedCsll);

  const valorLiquido = Math.max(valorBruto - desconto - issValor - totalRetencoesFederais, 0);

  const { errors } = form.formState;
  const clientMode = form.watch("clientMode");
  const manualClientRazaoSocial = form.watch("manualClientRazaoSocial");
  const manualClientCnpj = form.watch("manualClientCnpj");
  const localPrestacao = form.watch("localPrestacao");
  const codigoServicoValue = form.watch("codigoServico");
  const descricaoServico = form.watch("descricao");

  const selectedServiceCodeForHeader = COMMON_LC116.find(
    (code) => code.value === codigoServicoValue,
  );

  const tomadorSummary = (() => {
    if (clientMode === "registered" && selectedClient) {
      return `${selectedClient.razao_social} - ${formatCnpj(selectedClient.cnpj)}`;
    }

    if (clientMode === "manual" && manualClientRazaoSocial) {
      return `${manualClientRazaoSocial}${manualClientCnpj ? ` - ${manualClientCnpj}` : ""}`;
    }

    return "";
  })();

  const serviceSummary = (() => {
    if (selectedServiceCodeForHeader) {
      const [, ...rest] = selectedServiceCodeForHeader.label.split(" - ");
      const shortDesc = rest.join(" - ");
      const combined = `${selectedServiceCodeForHeader.value}${shortDesc ? ` - ${shortDesc}` : ""}`.trim();
      return combined.length > 80 ? `${combined.slice(0, 77)}...` : combined;
    }

    if (descricaoServico) {
      return descricaoServico.length > 80
        ? `${descricaoServico.slice(0, 77)}...`
        : descricaoServico;
    }

    return "";
  })();

  const valoresSummary = watchedValor ? `Total: ${formatCurrencyDisplay(valorBruto)}` : "";

  const isTomadorValid =
    !!tomadorSummary.trim() &&
    !errors.clientId &&
    !errors.manualClientCnpj &&
    !errors.manualClientRazaoSocial;

  const isServicoValid =
    (!!codigoServicoValue || !!descricaoServico) &&
    !errors.codigoServico &&
    !errors.descricao &&
    !(localPrestacao === "outro_municipio" && errors.ibgeMunicipio);

  const isValoresValid =
    !!watchedValor &&
    !errors.valor &&
    (!watchedIssRetido || !errors.issRetidoValor);

  useEffect(() => {
    setTaxSummary({
      issValor,
      totalRetencoes: totalRetencoesFederais,
      valorLiquido,
    });
  }, [issValor, totalRetencoesFederais, valorLiquido]);

  // Smart Tax Code Suggestions - Debounced Search
  const searchServiceCodeSuggestion = useCallback(async (description: string) => {
    if (!description || description.length < 10) {
      setSuggestedServiceCode(null);
      return;
    }

    try {
      // Search in description and keywords
      const searchTerms = description.toLowerCase().split(/\s+/).filter(term => term.length > 3);
      
      if (searchTerms.length === 0) return;

      const { data, error } = await supabase
        .from("tax_service_codes")
        .select("id, code_lc116, description, code_nbs, keywords")
        .or(
          searchTerms
            .map(term => `description.ilike.%${term}%,keywords.ilike.%${term}%`)
            .join(',')
        )
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const matchedCode: TaxServiceCode = {
          id: data.id,
          code_lc116: data.code_lc116,
          description: data.description,
          code_nbs: data.code_nbs,
          keywords: data.keywords,
        };
        setSuggestedServiceCode(matchedCode);
      } else {
        setSuggestedServiceCode(null);
      }
    } catch (error) {
      console.error("Erro ao buscar sugestão de código", error);
    }
  }, []);

  // Debounced effect for service description
  useEffect(() => {
    const currentCodigoServico = form.watch("codigoServico");
    const description = form.watch("descricao");

    // Don't suggest if user has already manually selected a code
    if (userSelectedCode || currentCodigoServico) {
      return;
    }

    const timeoutId = setTimeout(() => {
      searchServiceCodeSuggestion(description);
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [form.watch("descricao"), form.watch("codigoServico"), userSelectedCode, searchServiceCodeSuggestion]);

  // Show toast when suggestion is available
  useEffect(() => {
    if (!suggestedServiceCode) return;

    const currentCodigoServico = form.watch("codigoServico");
    
    // Only show if field is empty and user hasn't manually selected
    if (!currentCodigoServico && !userSelectedCode) {
      toast({
        title: (
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <span>Sugestão de Código</span>
          </div>
        ) as any,
        description: (
          <div className="space-y-2">
            <p className="text-sm">
              {suggestedServiceCode.code_lc116} - {suggestedServiceCode.description}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                form.setValue("codigoServico", suggestedServiceCode.code_lc116, {
                  shouldValidate: true,
                });
                setUserSelectedCode(true);
                setSuggestedServiceCode(null);
                toast({
                  title: "Código aplicado",
                  description: "O código foi selecionado automaticamente.",
                });
              }}
              className="w-full"
            >
              Aplicar Sugestão
            </Button>
          </div>
        ) as any,
        duration: 10000,
      });
    }
  }, [suggestedServiceCode, form, toast, userSelectedCode]);

  // Auto-fetch company data from BrasilAPI when CNPJ is valid
  const handleCnpjCpfChange = (value: string) => {
    form.setValue("manualClientCnpj", value);

    const digits = value.replace(/\D/g, "");

    // If field is empty, clear any previous error
    if (digits.length === 0) {
      setCnpjCpfError(null);
      return;
    }

    // If length is not 11 (CPF) or 14 (CNPJ), mark as invalid/incomplete
    if (digits.length !== 11 && digits.length !== 14) {
      setCnpjCpfError("CPF ou CNPJ inválido.");
      return;
    }

    // We have either 11 or 14 digits: run proper validation
    const isValid = validateCPForCNPJ(value);

    if (!isValid) {
      setCnpjCpfError("CPF ou CNPJ inválido.");
      return;
    }

    // Document is valid
    setCnpjCpfError(null);

    // Trigger auto-fetch only for valid CNPJ in manual mode
    if (
      digits.length === 14 &&
      form.getValues("clientMode") === "manual" &&
      !cnpjLoading &&
      lastFetchedCnpjRef.current !== digits
    ) {
      fetchCompanyDataByCnpj(digits);
    }
  };

  // Fetch company data from BrasilAPI using CNPJ
  const fetchCompanyDataByCnpj = useCallback(
    async (cleanCnpj: string) => {
      try {
        setCnpjLoading(true);

        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
        if (!response.ok) {
          console.error("Erro ao buscar dados do CNPJ na BrasilAPI", response.statusText);
          return;
        }

        const data: any = await response.json();

        // Mark this CNPJ as fetched to avoid duplicate requests
        lastFetchedCnpjRef.current = cleanCnpj;

        // Only auto-fill in manual mode
        if (form.getValues("clientMode") !== "manual") return;

        // Auto-fill razão social if empty
        const currentRazao = form.getValues("manualClientRazaoSocial");
        if (!currentRazao && data.razao_social) {
          form.setValue("manualClientRazaoSocial", data.razao_social);
        }

        // Auto-fill address fields only if they are empty
        const currentCep = form.getValues("manualClientCep");
        if (!currentCep && data.cep) {
          form.setValue("manualClientCep", data.cep);
        }

        const currentEndereco = form.getValues("manualClientEndereco");
        if (!currentEndereco && data.logradouro) {
          form.setValue("manualClientEndereco", data.logradouro);
        }

        const currentNumero = form.getValues("manualClientNumero");
        if (!currentNumero && data.numero) {
          form.setValue("manualClientNumero", String(data.numero));
        }

        const currentBairro = form.getValues("manualClientBairro");
        if (!currentBairro && data.bairro) {
          form.setValue("manualClientBairro", data.bairro);
        }

        const currentCidade = form.getValues("manualClientCidade");
        if (!currentCidade && (data.municipio || data.localidade)) {
          form.setValue("manualClientCidade", data.municipio || data.localidade);
        }

        const currentEstado = form.getValues("manualClientEstado");
        if (!currentEstado && data.uf) {
          form.setValue("manualClientEstado", data.uf);
        }

        // Warn if company status is not ATIVA
        const descricaoSituacao = data.descricao_situacao_cadastral || data.situacao_cadastral;
        if (descricaoSituacao && String(descricaoSituacao).toUpperCase() !== "ATIVA") {
          toast({
            variant: "destructive",
            title: "Atenção",
            description: `Esta empresa consta como ${descricaoSituacao} na Receita.
`,
          });
        }
      } catch (error) {
        console.error("Erro ao buscar dados do CNPJ na BrasilAPI", error);
        // Silent failure: user can continuar preenchendo manualmente
      } finally {
        setCnpjLoading(false);
      }
    },
    [form, toast],
  );

  // Auto-fill address via CEP
  const handleCepBlur = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, "");
    
    if (cleanCEP.length !== 8) return;
    
    setCepLoading(true);
    
    try {
      const addressData = await fetchAddressByCEP(cep);
      
      if (addressData) {
        // Auto-fill address fields
        form.setValue("manualClientEndereco", addressData.logradouro || "");
        form.setValue("manualClientBairro", addressData.bairro || "");
        form.setValue("manualClientCidade", addressData.localidade || "");
        form.setValue("manualClientEstado", addressData.uf || "");
        
        // Captura o código IBGE do município para uso na DPS
        form.setValue("ibgeMunicipio", addressData.ibge || "");
        
        toast({
          title: "Endereço preenchido",
          description: "Dados do CEP carregados com sucesso. Preencha o número.",
        });
        
        // Focus on the "Número" field
        setTimeout(() => {
          const numeroInput = document.querySelector('input[name="manualClientNumero"]') as HTMLInputElement;
          if (numeroInput) {
            numeroInput.focus();
          }
        }, 100);
      } else {
        toast({
          variant: "destructive",
          title: "CEP não encontrado",
          description: "CEP não encontrado, preencha manualmente.",
        });
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      toast({
        variant: "destructive",
        title: "Erro ao buscar CEP",
        description: "Não foi possível buscar o CEP. Preencha manualmente.",
      });
    } finally {
      setCepLoading(false);
    }
  };

  // Quando um cliente cadastrado é selecionado, garantimos que o código IBGE
  // do município esteja preenchido usando o mesmo fluxo de CEP da entrada manual
  // e também persistimos o documento (CNPJ) do tomador no estado do formulário.
  const handleRegisteredClientSelect = async (
    clientId: string,
    onChange: (value: string) => void,
  ) => {
    // Primeiro, preserva o comportamento atual de seleção
    onChange(clientId);

    const client = clients.find((c) => c.id === clientId);

    // Se encontrarmos o cliente, persistimos o documento dele em um campo oculto
    if (client?.cnpj) {
      form.setValue("registeredClientCnpj", client.cnpj, { shouldValidate: true });
    } else {
      // Garante que não ficamos com um CNPJ antigo caso o cliente não tenha documento
      form.setValue("registeredClientCnpj", "", { shouldValidate: true });
    }

    // Se o formulário já tem um código IBGE definido, não fazemos nada
    const currentIbge = form.getValues("ibgeMunicipio");
    if (currentIbge) return;

    if (!client?.cep) return;

    const cleanCEP = client.cep.replace(/\D/g, "");
    if (cleanCEP.length !== 8) return;

    try {
      setCepLoading(true);
      const addressData = await fetchAddressByCEP(client.cep);

      if (addressData?.ibge) {
        form.setValue("ibgeMunicipio", addressData.ibge);
      }
    } catch (error) {
      console.error("Erro ao buscar CEP do cliente cadastrado:", error);
    } finally {
      setCepLoading(false);
    }
  };
  // Check if form can be submitted (document validation)
  const isDocumentInvalid = form.watch("clientMode") === "manual" && !!cnpjCpfError;

  return (
    <DashboardLayout>
      <div className="p-3 md:p-6 overflow-x-hidden">
        <div className="max-w-[960px] mx-auto">
          <div className="bg-card rounded-2xl shadow-lg border border-border p-4 md:p-8 lg:p-10">
            <div className="flex items-center gap-3 mb-6 md:mb-8">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground leading-snug">
                  Nova NFS-e (Padrão Nacional)
                </h1>
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed mt-1">
                  Preencha os dados obrigatórios para emissão da NFS-e Nacional
                </p>
              </div>
            </div>

            {!loadingProfile && companyProfile && (
              <Alert className="mb-6 border-primary/30 bg-primary/5">
                <Info className="h-4 w-4 text-primary" />
                <AlertTitle className="text-sm font-semibold">Dados da Empresa</AlertTitle>
                <AlertDescription className="text-xs md:text-sm space-y-1 mt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    <span className="font-medium text-foreground">
                      CNPJ:{" "}
                      {companyProfile.cnpj
                        ? companyProfile.cnpj.replace(
                            /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
                            "$1.$2.$3/$4-$5"
                          )
                        : "Não cadastrado"}
                    </span>
                    <span className="font-medium text-foreground">
                      Regime:{" "}
                      {companyProfile.regime_tributario === "1"
                        ? "Simples Nacional"
                        : companyProfile.regime_tributario === "4"
                        ? "Simples Nacional - MEI"
                        : companyProfile.regime_tributario === "2"
                        ? "Lucro Presumido"
                        : companyProfile.regime_tributario === "3"
                        ? "Lucro Real"
                        : "Simples Nacional (padrão)"}
                    </span>
                  </div>
                  {!companyProfile.cnpj && (
                    <p className="text-destructive text-xs mt-2">
                      ⚠️ Configure o CNPJ em{" "}
                      <Link to="/dashboard/configuracoes" className="underline font-semibold">
                        Configurações
                      </Link>{" "}
                      para emitir notas.
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <TooltipProvider>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  {/* Form Sections grouped in Accordion */}
                  <Accordion
                    type="single"
                    collapsible
                    defaultValue="cabecalho"
                    className="space-y-2"
                  >
                    {/* Section 1: Cabeçalho & Data */}
                    <AccordionItem value="cabecalho">
                      <AccordionTrigger className="bg-card text-foreground font-semibold border border-border rounded-lg px-3 py-2.5 text-sm md:text-base leading-snug [&[data-state=open]]:border-b-transparent data-[state=open]:rounded-b-none">
                        Cabeçalho & Data
                      </AccordionTrigger>
                      <AccordionContent className="border border-t-0 border-border rounded-b-lg bg-background px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-5">
                        <section className="space-y-3 md:space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                              control={form.control}
                              name="dataCompetencia"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Data de Competência</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="naturezaOperacao"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center gap-2">
                                    <FormLabel>Natureza da Operação</FormLabel>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          className="inline-flex items-center justify-center rounded-full h-5 w-5 border border-border text-muted-foreground text-[10px]"
                                        >
                                          <Info className="h-3 w-3" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="max-w-xs text-xs">
                                          Defina como o serviço será tributado (ex.: dentro ou fora do município,
                                          isento, exportação, etc.). Obrigatório no padrão nacional.
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                  <FormControl>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione a natureza da operação" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-popover">
                                        <SelectItem value="Tributação no município">Tributação no município</SelectItem>
                                        <SelectItem value="Tributação fora do município">Tributação fora do município</SelectItem>
                                        <SelectItem value="Isenta">Isenta</SelectItem>
                                        <SelectItem value="Imune">Imune</SelectItem>
                                        <SelectItem value="Exigibilidade Suspensa por Decisão Judicial">
                                          Exigibilidade Suspensa por Decisão Judicial
                                        </SelectItem>
                                        <SelectItem value="Exportação de Serviço">Exportação de Serviço</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </section>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Section 2: Tomador do Serviço */}
                    <AccordionItem value="tomador">
                      <AccordionTrigger className="bg-card text-foreground font-semibold border border-border rounded-lg px-3 py-2.5 text-sm md:text-base leading-snug overflow-hidden [&[data-state=open]]:border-b-transparent data-[state=open]:rounded-b-none">
                        <div className="flex w-full items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-col text-left">
                            <span>Tomador do Serviço</span>
                            {tomadorSummary && (
                              <span className="block text-xs md:text-sm text-muted-foreground truncate max-w-[240px] md:max-w-full">
                                {tomadorSummary}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 pl-2">
                            {isTomadorValid && (
                              <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="border border-t-0 border-border rounded-b-lg bg-background px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-5">
                        <section className="space-y-3 md:space-y-4">
                          <FormField
                            control={form.control}
                            name="clientMode"
                            render={({ field }) => (
                              <FormItem>
                                <Tabs value={field.value} onValueChange={field.onChange} className="w-full">
                                  <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="registered">Buscar Cadastrado</TabsTrigger>
                                    <TabsTrigger value="manual">Novo / Manual</TabsTrigger>
                                  </TabsList>

                                  <TabsContent value="registered" className="space-y-4 mt-4">
                                    <FormField
                                      control={form.control}
                                      name="clientId"
                                      render={({ field: clientField }) => (
                                        <FormItem>
                                          <FormLabel>Selecione o Cliente</FormLabel>
                                          {loadingClients ? (
                                            <div className="flex items-center gap-2 h-10 px-3 border rounded-md">
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                              <span className="text-sm text-muted-foreground">Carregando clientes...</span>
                                            </div>
                                          ) : clients.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed rounded-lg">
                                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                                                <Users className="h-6 w-6 text-primary" />
                                              </div>
                                              <p className="text-sm text-muted-foreground text-center mb-3">
                                                Nenhum cliente cadastrado ainda.
                                              </p>
                                              <Button asChild variant="outline" size="sm">
                                                <Link to="/dashboard/clientes">
                                                  <Plus className="mr-2 h-4 w-4" />
                                                  Cadastrar Cliente
                                                </Link>
                                              </Button>
                                            </div>
                                          ) : (
                                            <Select
                                              onValueChange={(value) =>
                                                handleRegisteredClientSelect(value, clientField.onChange)
                                              }
                                              value={clientField.value}
                                            >
                                              <FormControl>
                                                <SelectTrigger>
                                                  <SelectValue placeholder="Selecione um cliente cadastrado" />
                                                </SelectTrigger>
                                              </FormControl>
                                              <SelectContent className="bg-popover">
                                                {clients.map((client) => (
                                                  <SelectItem key={client.id} value={client.id}>
                                                    <span className="font-medium">{client.razao_social}</span>
                                                    <span className="text-muted-foreground ml-2">
                                                      ({formatCnpj(client.cnpj)})
                                                    </span>
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          )}
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    {selectedClient && (clientMissingCnpj || clientMissingAddress) && (
                                      <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Dados incompletos do tomador</AlertTitle>
                                        <AlertDescription className="text-xs md:text-sm">
                                          Este cliente não possui CNPJ e/ou endereço completo cadastrados. Esses dados são
                                          obrigatórios para geração do XML da NFS-e Padrão Nacional.
                                        </AlertDescription>
                                      </Alert>
                                    )}
                                  </TabsContent>

                                  <TabsContent value="manual" className="space-y-4 mt-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                      <FormField
                                        control={form.control}
                                        name="manualClientCnpj"
                                        render={({ field: cnpjField }) => (
                                          <FormItem>
                                            <FormLabel>CPF/CNPJ *</FormLabel>
                                            <FormControl>
                                              <div className="relative">
                                                <CNPJCPFInput
                                                  placeholder="00.000.000/0000-00"
                                                  value={cnpjField.value}
                                                  maxLength={18}
                                                  onChange={(e) => handleCnpjCpfChange(e.target.value)}
                                                  onBlur={cnpjField.onBlur}
                                                  disabled={cnpjLoading}
                                                />
                                                {cnpjLoading && (
                                                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                                                )}
                                              </div>
                                            </FormControl>
                                            {cnpjCpfError && (
                                              <p className="text-sm font-medium text-destructive">{cnpjCpfError}</p>
                                            )}
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />

                                      <FormField
                                        control={form.control}
                                        name="manualClientRazaoSocial"
                                        render={({ field: rsField }) => (
                                          <FormItem>
                                            <FormLabel>Razão Social / Nome *</FormLabel>
                                            <FormControl>
                                              <div className="w-full overflow-hidden">
                                                <Input
                                                  placeholder="Nome completo ou Razão Social"
                                                  className="w-full min-w-0 truncate"
                                                  {...rsField}
                                                />
                                              </div>
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    </div>

                                    <FormField
                                      control={form.control}
                                      name="manualClientEmail"
                                      render={({ field: emailField }) => (
                                        <FormItem>
                                          <FormLabel>Email (opcional)</FormLabel>
                                          <FormControl>
                                            <Input
                                              type="email"
                                              placeholder="contato@empresa.com"
                                              className="w-full truncate"
                                              {...emailField}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <div className="grid gap-4 md:grid-cols-3">
                                      <FormField
                                        control={form.control}
                                        name="manualClientCep"
                                        render={({ field: cepField }) => (
                                          <FormItem>
                                            <FormLabel>CEP</FormLabel>
                                            <FormControl>
                                              <div className="relative">
                                                <CEPInput
                                                  placeholder="00000-000"
                                                  value={cepField.value}
                                                  onChange={cepField.onChange}
                                                  onBlur={(e) => {
                                                    cepField.onBlur();
                                                    handleCepBlur(e.target.value);
                                                  }}
                                                  disabled={cepLoading}
                                                />
                                                {cepLoading && (
                                                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                                                )}
                                              </div>
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />

                                      <FormField
                                        control={form.control}
                                        name="manualClientCidade"
                                        render={({ field: cidadeField }) => (
                                          <FormItem>
                                            <FormLabel>Cidade</FormLabel>
                                            <FormControl>
                                              <Input
                                                placeholder="São Paulo"
                                                {...cidadeField}
                                                onBlur={(e) => {
                                                  cidadeField.onBlur();
                                                  const ibgeCode = form.getValues("ibgeMunicipio");
                                                  const cepValue = form.getValues("manualClientCep");

                                                  if (!ibgeCode && e.target.value) {
                                                    toast({
                                                      variant: "default",
                                                      title: "Atenção",
                                                      description:
                                                        "Por favor, utilize a busca por CEP para garantir a validação fiscal.",
                                                    });
                                                  }
                                                }}
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />

                                      <FormField
                                        control={form.control}
                                        name="manualClientEstado"
                                        render={({ field: estadoField }) => (
                                          <FormItem>
                                            <FormLabel>UF</FormLabel>
                                            <FormControl>
                                              <Input placeholder="SP" maxLength={2} {...estadoField} />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-3">
                                      <FormField
                                        control={form.control}
                                        name="manualClientEndereco"
                                        render={({ field: endField }) => (
                                          <FormItem>
                                            <FormLabel>Logradouro</FormLabel>
                                            <FormControl>
                                              <Input placeholder="Rua, Av, etc." {...endField} />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />

                                      <FormField
                                        control={form.control}
                                        name="manualClientNumero"
                                        render={({ field: numField }) => (
                                          <FormItem>
                                            <FormLabel>Número</FormLabel>
                                            <FormControl>
                                              <Input placeholder="123" {...numField} />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />

                                      <FormField
                                        control={form.control}
                                        name="manualClientBairro"
                                        render={({ field: bairroField }) => (
                                          <FormItem>
                                            <FormLabel>Bairro</FormLabel>
                                            <FormControl>
                                              <Input placeholder="Centro" {...bairroField} />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    </div>

                                    <Alert>
                                      <Info className="h-4 w-4" />
                                      <AlertTitle>💡 Cadastro Inteligente</AlertTitle>
                                      <AlertDescription className="text-xs">
                                        Se o CNPJ já existir, atualizaremos os dados. Caso contrário, criaremos automaticamente
                                        um novo cliente na sua base ao emitir a nota.
                                      </AlertDescription>
                                    </Alert>
                                  </TabsContent>
                                </Tabs>
                              </FormItem>
                            )}
                          />
                        </section>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Section 3: Detalhes do Serviço */}
                    <AccordionItem value="detalhes">
                      <AccordionTrigger className="bg-card text-foreground font-semibold border border-border rounded-lg px-3 py-2.5 text-sm md:text-base leading-snug [&[data-state=open]]:border-b-transparent data-[state=open]:rounded-b-none">
                        <div className="flex w-full items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-col text-left">
                            <span>Detalhes do Serviço</span>
                            {serviceSummary && (
                              <span className="text-xs md:text-sm text-muted-foreground truncate">
                                {serviceSummary}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 pl-2">
                            {isServicoValid && (
                              <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="border border-t-0 border-border rounded-b-lg bg-background px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-5 w-full max-w-full overflow-hidden">
                        <section className="space-y-3 md:space-y-4 w-full max-w-full overflow-hidden">
                          <FormField
                            control={form.control}
                            name="localPrestacao"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Local da Prestação do Serviço</FormLabel>
                                <FormControl>
                                  <RadioGroup
                                    className="grid gap-2 md:grid-cols-2"
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <div className="flex items-center space-x-2 rounded-md border border-border p-2">
                                      <RadioGroupItem value="mesmo_municipio" id="mesmo_municipio" />
                                      <label
                                        htmlFor="mesmo_municipio"
                                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                      >
                                        Mesmo município do prestador
                                      </label>
                                    </div>
                                    <div className="flex items-center space-x-2 rounded-md border border-border p-2">
                                      <RadioGroupItem value="outro_municipio" id="outro_municipio" />
                                      <label
                                        htmlFor="outro_municipio"
                                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                      >
                                        Outro município
                                      </label>
                                    </div>
                                  </RadioGroup>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {form.watch("localPrestacao") === "outro_municipio" && (
                            <FormField
                              control={form.control}
                              name="ibgeMunicipio"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Cidade (código IBGE)</FormLabel>
                                  <FormControl>
                                    <CitySearchInput value={field.value || ""} onChange={field.onChange} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          <FormField
                            control={form.control}
                            name="codigoServico"
                            render={({ field }) => {
                              const selectedServiceCode = COMMON_LC116.find(
                                (code) => code.value === field.value,
                              );

                              return (
                                <FormItem className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <FormLabel>Código do Serviço (LC 116)</FormLabel>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          className="inline-flex items-center justify-center rounded-full h-5 w-5 border border-border text-muted-foreground text-[10px]"
                                        >
                                          <Info className="h-3 w-3" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="max-w-xs text-xs">
                                          Código de serviço conforme LC 116/2003. Utilize a busca por descrição,
                                          atividade ou palavra-chave para encontrar o código correto.
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>

                                  {useIsMobile() ? (
                                    <Drawer open={serviceCodeOpen} onOpenChange={setServiceCodeOpen}>
                                      <DrawerTrigger asChild>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          role="combobox"
                                          aria-expanded={serviceCodeOpen}
                                          className="flex w-full items-center justify-between overflow-hidden h-auto py-2"
                                        >
                                          <span className="block truncate max-w-[250px] md:max-w-full text-left">
                                            {selectedServiceCode
                                              ? selectedServiceCode.label
                                              : "Buscar código de serviço"}
                                          </span>
                                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                      </DrawerTrigger>
                                      <DrawerContent className="max-h-[80vh] px-4 pb-4 overflow-hidden">
                                        <DrawerHeader className="px-0 pb-2">
                                          <DrawerTitle>Selecionar Código de Serviço</DrawerTitle>
                                        </DrawerHeader>
                                        <Command className="border rounded-md">
                                          <CommandInput placeholder="Digite para buscar (ex: marketing, consultoria)" />
                                          <CommandList className="max-h-[60vh] overflow-y-auto">
                                            <CommandEmpty>Nenhum código encontrado.</CommandEmpty>
                                            <CommandGroup>
                                              {COMMON_LC116.map((code) => (
                                                <CommandItem
                                                  key={code.value}
                                                  value={code.label}
                                                  className="whitespace-normal break-words h-auto text-sm text-left"
                                                  onSelect={() => {
                                                    form.setValue("codigoServico", code.value, {
                                                      shouldValidate: true,
                                                    });
                                                    setUserSelectedCode(true);
                                                    setSuggestedServiceCode(null);
                                                    setServiceCodeOpen(false);
                                                  }}
                                                >
                                                  <CheckIcon
                                                    className={cn(
                                                      "mr-2 h-4 w-4",
                                                      code.value === field.value ? "opacity-100" : "opacity-0",
                                                    )}
                                                  />
                                                  <span className="whitespace-normal break-words text-left">
                                                    {code.label}
                                                  </span>
                                                </CommandItem>
                                              ))}
                                            </CommandGroup>
                                          </CommandList>
                                        </Command>
                                      </DrawerContent>
                                    </Drawer>
                                  ) : (
                                    <Popover open={serviceCodeOpen} onOpenChange={setServiceCodeOpen}>
                                      <PopoverTrigger asChild>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          role="combobox"
                                          aria-expanded={serviceCodeOpen}
                                          className="flex w-full items-center justify-between overflow-hidden h-auto py-2 max-w-full"
                                        >
                                          <span className="block truncate max-w-[250px] md:max-w-full text-left">
                                            {selectedServiceCode
                                              ? selectedServiceCode.label
                                              : "Buscar código de serviço"}
                                          </span>
                                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="z-[9999] p-0 w-[calc(100vw-2rem)] sm:w-[400px] max-w-[calc(100vw-2rem)] bg-popover" align="start" sideOffset={4}>
                                        <Command>
                                          <CommandInput placeholder="Digite para buscar (ex: marketing, consultoria)" />
                                          <CommandList className="max-h-80 max-w-[calc(100vw-2rem)]">
                                            <CommandEmpty>Nenhum código encontrado.</CommandEmpty>
                                            <CommandGroup>
                                              {COMMON_LC116.map((code) => (
                                                <CommandItem
                                                  key={code.value}
                                                  value={code.label}
                                                  className="whitespace-normal break-words h-auto text-sm"
                                                  onSelect={() => {
                                                    form.setValue("codigoServico", code.value, {
                                                      shouldValidate: true,
                                                    });
                                                    setUserSelectedCode(true);
                                                    setSuggestedServiceCode(null);
                                                    setServiceCodeOpen(false);
                                                  }}
                                                >
                                                  <CheckIcon
                                                    className={cn(
                                                      "mr-2 h-4 w-4",
                                                      code.value === field.value ? "opacity-100" : "opacity-0",
                                                    )}
                                                  />
                                                  <span className="whitespace-normal break-words text-left">
                                                    {code.label}
                                                  </span>
                                                </CommandItem>
                                              ))}
                                            </CommandGroup>
                                          </CommandList>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>
                                  )}

                                  <FormMessage />
                                </FormItem>
                              );
                            }}
                          />

                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Label>Código NBS (opcional)</Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center rounded-full h-5 w-5 border border-border text-muted-foreground text-[10px]"
                                  >
                                    <Info className="h-3 w-3" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs text-xs">
                                    Código NBS associado ao serviço. Digite palavras-chave como "Advogado" para localizar
                                    rapidamente o código correto.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <Popover open={nbsCodeOpen} onOpenChange={setNbsCodeOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={nbsCodeOpen}
                                  className="flex w-full items-center justify-between overflow-hidden h-auto py-2 max-w-full"
                                >
                                  <span className="block truncate max-w-[250px] md:max-w-full text-left">
                                    {selectedNbsCode
                                      ? selectedNbsCode.label
                                      : COMMON_NBS.length === 0
                                        ? "Nenhum código NBS disponível"
                                        : "Buscar código NBS"}
                                  </span>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="z-[9999] p-0 w-[320px] sm:w-[400px] max-w-[calc(100vw-2rem)] bg-popover" align="start" sideOffset={4}>
                                <Command>
                                  <CommandInput placeholder="Digite para buscar (ex: Advogado, estética)" />
                                  <CommandList className="max-h-80 max-w-[calc(100vw-2rem)]">
                                    <CommandEmpty>Nenhum código NBS encontrado.</CommandEmpty>
                                    <CommandGroup>
                                      {COMMON_NBS.map((code) => (
                                        <CommandItem
                                          key={code.value}
                                          value={code.label}
                                          className="whitespace-normal break-words"
                                          onSelect={() => {
                                            form.setValue("codigoNbs", code.value, { shouldValidate: false });
                                            setNbsCodeOpen(false);
                                          }}
                                        >
                                          <span className="whitespace-normal break-words text-left">
                                            {code.label}
                                          </span>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>

                          <FormField
                            control={form.control}
                            name="descricao"
                            render={({ field }) => (
                              <FormItem className="w-full max-w-full">
                                <FormLabel>Descrição do Serviço</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Descreva o serviço prestado (Ex: Consultoria em Marketing ref. Janeiro/2026)"
                                    className="w-full max-w-full min-h-[120px] resize-y break-words"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </section>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Section 4: Valores & Impostos */}
                    <AccordionItem value="valores">
                      <AccordionTrigger className="bg-card text-foreground font-semibold border border-border rounded-lg px-3 py-2.5 text-sm md:text-base leading-snug [&[data-state=open]]:border-b-transparent data-[state=open]:rounded-b-none">
                        <div className="flex w-full items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-col text-left">
                            <span>Valores &amp; Impostos</span>
                            {valoresSummary && (
                              <span className="text-xs md:text-sm text-muted-foreground truncate">
                                {valoresSummary}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 pl-2">
                            {isValoresValid && (
                              <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="border border-t-0 border-border rounded-b-lg bg-background px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-5">
                        <section className="space-y-3 md:space-y-4">
                          {/* Row 1 */}
                          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                            <FormField
                              control={form.control}
                              name="valor"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Valor do Serviço (R$)</FormLabel>
                                  <FormControl>
                                    <CurrencyInput
                                      placeholder="0,00"
                                      value={field.value}
                                      onChange={field.onChange}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="descontoIncondicionado"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Desconto Incondicionado (R$)</FormLabel>
                                  <FormControl>
                                    <CurrencyInput
                                      placeholder="0,00"
                                      value={field.value}
                                      onChange={field.onChange}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-foreground">Valor Líquido (R$)</span>
                              </div>
                              <div className="h-10 rounded-md border border-border bg-muted/50 flex items-center px-3 text-sm font-semibold text-foreground">
                                {formatCurrencyDisplay(taxSummary.valorLiquido)}
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                Valor líquido após descontos, ISS retido e retenções federais.
                              </p>
                            </div>
                          </div>

                          {/* Row 2: ISS Retido */}
                          <FormField
                            control={form.control}
                            name="issRetido"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                  <div className="flex items-center space-x-2">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">
                                      ISS Retido pelo Tomador?
                                    </FormLabel>
                                  </div>
                                  {field.value && (
                                    <FormField
                                      control={form.control}
                                      name="issRetidoValor"
                                      render={({ field: issField }) => (
                                        <FormItem className="md:w-64">
                                          <FormLabel className="text-xs md:text-sm">
                                            Valor do ISS Retido (R$)
                                          </FormLabel>
                                          <FormControl>
                                            <CurrencyInput
                                              placeholder="0,00"
                                              value={issField.value}
                                              onChange={issField.onChange}
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  )}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Row 3: Retenções Federais */}
                          <Accordion type="single" collapsible>
                            <AccordionItem value="federais">
                              <AccordionTrigger className="text-sm font-medium">
                                Retenções Federais (PIS/COFINS/CSLL/IR/INSS)
                              </AccordionTrigger>
                              <AccordionContent className="pt-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                  <FormField
                                    control={form.control}
                                    name="pis"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>PIS (R$)</FormLabel>
                                        <FormControl>
                                          <CurrencyInput
                                            placeholder="0,00"
                                            value={field.value}
                                            onChange={field.onChange}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={form.control}
                                    name="cofins"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>COFINS (R$)</FormLabel>
                                        <FormControl>
                                          <CurrencyInput
                                            placeholder="0,00"
                                            value={field.value}
                                            onChange={field.onChange}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={form.control}
                                    name="csll"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>CSLL (R$)</FormLabel>
                                        <FormControl>
                                          <CurrencyInput
                                            placeholder="0,00"
                                            value={field.value}
                                            onChange={field.onChange}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={form.control}
                                    name="ir"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>IR (R$)</FormLabel>
                                        <FormControl>
                                          <CurrencyInput
                                            placeholder="0,00"
                                            value={field.value}
                                            onChange={field.onChange}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={form.control}
                                    name="inss"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>INSS (R$)</FormLabel>
                                        <FormControl>
                                          <CurrencyInput
                                            placeholder="0,00"
                                            value={field.value}
                                            onChange={field.onChange}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <p className="mt-3 text-[11px] text-muted-foreground">
                                  Os valores informados serão subtraídos automaticamente do valor líquido da nota.
                                </p>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </section>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  {/* Section 5: Resumo de Tributos */}
                  <section className="mt-6">
                    <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2 mb-3">
                      Resumo de Tributos
                    </h2>
                    <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
                      <div className="flex-1 rounded-xl border border-border bg-muted/40 px-3 py-2.5 flex flex-col gap-0.5">
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                          Valor do ISS
                        </span>
                        <span className="text-base font-semibold text-foreground">
                          {formatCurrencyDisplay(taxSummary.issValor)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Considera o ISS informado como retido pelo tomador.
                        </span>
                      </div>

                      <div className="flex-1 rounded-xl border border-border bg-muted/40 px-3 py-2.5 flex flex-col gap-0.5">
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                          Total de Retenções
                        </span>
                        <span className="text-base font-semibold text-foreground">
                          {formatCurrencyDisplay(taxSummary.totalRetencoes)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Soma de PIS, COFINS, CSLL, IR e INSS.
                        </span>
                      </div>

                      <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.14),transparent_55%),hsl(var(--primary)/0.05)] px-3 py-3 flex-1 flex flex-col gap-1.5 min-h-[92px]">
                        <Wallet className="pointer-events-none absolute -right-3 -bottom-5 h-14 w-14 text-primary/15" />
                        <span className="text-[10px] font-semibold tracking-[0.18em] text-primary uppercase">
                          VALOR LÍQUIDO ESTIMADO
                        </span>
                        <span className="text-2xl md:text-3xl font-bold text-primary leading-tight">
                          {formatCurrencyDisplay(taxSummary.valorLiquido)}
                        </span>
                        <span className="text-[11px] text-muted-foreground max-w-xs">
                          Valor que o prestador deve receber após todos os descontos.
                        </span>
                      </div>
                    </div>
                  </section>

                  {/* Section 6: Observações Gerais */}
                  <section className="mt-6 space-y-3">
                    <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                      Observações
                    </h2>
                    <FormField
                      control={form.control}
                      name="observacoes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações para o tomador / contador</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Inclua textos importantes como condições de pagamento, referências de contrato ou mensagens ao cliente."
                              className="min-h-[100px] resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </section>

                  {/* Section 7: Action Bar */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="sm:w-56 h-12 text-base font-semibold"
                      disabled={previewLoading}
                      onClick={generatePreviewPDF}
                    >
                      {previewLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Gerando preview...
                        </>
                      ) : (
                        "Visualizar Rascunho"
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="sm:w-48 h-12 text-base font-semibold"
                      disabled={isSavingDraft || !user}
                      onClick={async () => {
                        if (!user) return;
                        setIsSavingDraft(true);
                        try {
                          const values = form.getValues();

                          const valorNumerico = parseCurrency(values.valor);
                          const desconto = parseCurrency(values.descontoIncondicionado);
                          const issValorDraft = values.issRetido ? parseCurrency(values.issRetidoValor) : 0;
                          const pisValorDraft = parseCurrency(values.pis);
                          const cofinsValorDraft = parseCurrency(values.cofins);
                          const inssValorDraft = parseCurrency(values.inss);
                          const irValorDraft = parseCurrency(values.ir);
                          const csllValorDraft = parseCurrency(values.csll);
                          const totalRetencoesFederaisDraft =
                            pisValorDraft + cofinsValorDraft + inssValorDraft + irValorDraft + csllValorDraft;
                          const valorLiquidoDraft = Math.max(
                            valorNumerico - desconto - issValorDraft - totalRetencoesFederaisDraft,
                            0,
                          );

                          const retentionCodesDraft = {
                            iss: { retained: values.issRetido, amount: issValorDraft },
                            pis: { retained: pisValorDraft > 0, amount: pisValorDraft },
                            cofins: { retained: cofinsValorDraft > 0, amount: cofinsValorDraft },
                            inss: { retained: inssValorDraft > 0, amount: inssValorDraft },
                            ir: { retained: irValorDraft > 0, amount: irValorDraft },
                            csll: { retained: csllValorDraft > 0, amount: csllValorDraft },
                          };

                          const payload = {
                            user_id: user.id,
                            client_id: values.clientId || null,
                            numero_nota: null,
                            descricao_servico: values.descricao,
                            valor: valorNumerico,
                            discount_unconditional: desconto,
                            status: "draft" as const,
                            data_emissao: new Date().toISOString(),
                            operation_nature: values.naturezaOperacao,
                            service_location_code:
                              values.localPrestacao === "outro_municipio" ? values.ibgeMunicipio || null : null,
                            retention_codes: retentionCodesDraft,
                            xml_content: null,
                          };

                          if (draftInvoiceId) {
                            const { error } = await supabase
                              .from("invoices")
                              .update(payload)
                              .eq("id", draftInvoiceId);

                            if (error) throw error;
                          } else {
                            const { data, error } = await supabase
                              .from("invoices")
                              .insert(payload)
                              .select("id")
                              .single();

                            if (error) throw error;
                            if (data?.id) {
                              setDraftInvoiceId(data.id);
                            }
                          }

                          toast({
                            title: "Rascunho salvo com sucesso",
                            description: "Você pode continuar editando antes de emitir a NFS-e.",
                          });
                        } catch (error: any) {
                          toast({
                            variant: "destructive",
                            title: "Erro ao salvar rascunho",
                            description: error.message || "Tente novamente.",
                          });
                        } finally {
                          setIsSavingDraft(false);
                        }
                      }}
                    >
                      {isSavingDraft ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Salvando rascunho...
                        </>
                      ) : (
                        "Salvar Rascunho"
                      )}
                    </Button>

                    <Button
                      type="submit"
                      className="flex-1 h-12 text-base font-semibold bg-cta hover:bg-cta/90 text-cta-foreground shadow-cta"
                      disabled={isSubmitting || isDocumentInvalid}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Emitindo NFS-e Nacional...
                        </>
                      ) : (
                        "Emitir NFS-e Nacional"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <EmissionStatusModal
        open={emissionModalOpen}
        onOpenChange={(open) => {
          if (!open && emissionStatus === "loading") return;
          setEmissionModalOpen(open);
        }}
        currentStep={emissionCurrentStep}
        status={emissionStatus}
        logs={emissionLogs}
        payloadJson={emissionPayload}
        responseJson={emissionResponse}
        onViewInvoice={() => {
          setEmissionModalOpen(false);
        }}
      />

      <SuccessModal
        open={successModalOpen}
        invoiceNumber={lastInvoiceNumber}
        onClose={handleCloseSuccessModal}
        onNewInvoice={handleNewInvoice}
        invoiceData={lastInvoiceData ?? undefined}
        userId={user?.id}
      />

      {previewUrl && (
        <div
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur",
            previewOpen ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={() => {
            setPreviewOpen(false);
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
          }}
        >
          <div
            className="relative w-full max-w-3xl h-[520px] bg-card border border-border rounded-xl shadow-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/60">
              <span className="text-sm font-medium text-foreground">Rascunho da NFS-e</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPreviewOpen(false);
                  URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }}
              >
                Fechar
              </Button>
            </div>
            <iframe src={previewUrl} className="w-full h-full" title="Pré-visualização da NFS-e" />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
