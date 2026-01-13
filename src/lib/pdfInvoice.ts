import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

export type InvoiceStatus = "draft" | "issued" | "processing" | "cancelled";

export interface PdfClientInfo {
  razaoSocial: string | null;
  cnpj: string | null;
  email?: string | null;
  enderecoCompleto?: string | null;
}

export interface PdfInvoiceData {
  id: string;
  numeroNota?: string | null;
  descricaoServico: string;
  valor: number;
  status: InvoiceStatus;
  dataEmissao: string; // ISO string
  client: PdfClientInfo | null;
  /** Cidade do tomador, quando disponível de forma estruturada */
  clientCity?: string | null;
  /** UF do tomador, quando disponível de forma estruturada */
  clientUf?: string | null;
  /** Código IBGE (cMun) da localização do tomador/serviço */
  clientIbgeCode?: string | null;
  competencia?: string | null;
  naturezaOperacao?: string | null;
  serviceCode?: string | null;
  nbsCode?: string | null;
  /** Desconto incondicionado aplicado ao serviço */
  desconto?: number | null;
  /** Valor de ISS retido */
  issValor?: number | null;
  /** Retenções federais individuais */
  pisValor?: number | null;
  cofinsValor?: number | null;
  inssValor?: number | null;
  irValor?: number | null;
  csllValor?: number | null;
  /** Soma das retenções federais (PIS+COFINS+INSS+IR+CSLL) */
  totalRetencoes?: number | null;
  /** Valor líquido a receber */
  valorLiquido?: number | null;
  observacoes?: string | null;
  officialPdfUrl?: string | null;
}

interface ProviderProfile {
  razao_social: string | null;
  nome_fantasia?: string | null;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  endereco_fiscal?: string | null;
  logo_url?: string | null;
}

const formatCurrencyBRL = (value: number | null | undefined) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
};

const formatDateBR = (isoOrDate: string | null | undefined) => {
  if (!isoOrDate) return "-";
  try {
    const d = new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return isoOrDate;
    return d.toLocaleDateString("pt-BR");
  } catch {
    return isoOrDate;
  }
};

const normalizeCity = (str?: string | null) =>
  str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() || "";

const IBGE_CITY_MAP: Record<string, string> = {
  londrina: "4113700",
  parnamirim: "2403251",
  "sao paulo": "3550308",
  "rio de janeiro": "3304557",
};

const getDisplayIBGE = (
  city?: string | null,
  fallbackCode?: string | null,
  address?: string | null,
) => {
  try {
    if (!city && !fallbackCode && !address) return null;

    const cityKey = normalizeCity(city);
    let ibgeCodeFromMap = cityKey ? IBGE_CITY_MAP[cityKey] : undefined;

    if (!ibgeCodeFromMap && address) {
      const addressNorm = normalizeCity(address);
      if (addressNorm.includes("parnamirim")) ibgeCodeFromMap = "2403251";
      else if (addressNorm.includes("londrina")) ibgeCodeFromMap = "4113700";
      else if (addressNorm.includes("sao paulo")) ibgeCodeFromMap = "3550308";
      else if (addressNorm.includes("rio de janeiro")) ibgeCodeFromMap = "3304557";
    }

    return ibgeCodeFromMap || fallbackCode || null;
  } catch (error) {
    console.error("Erro ao calcular código IBGE para PDF", { city, fallbackCode, address, error });
    return fallbackCode || null;
  }
};

const formatLC116 = (code?: string | null) => {
  try {
    if (!code) return "-";

    const parts = code
      .split(".")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => part.padStart(2, "0"));

    if (parts.length === 0) {
      return "-";
    }

    if (parts.length === 1) {
      return `${parts[0]}.00.00`;
    }

    if (parts.length === 2) {
      return `${parts[0]}.${parts[1]}.00`;
    }

    const [p1, p2, p3] = parts;
    return `${p1}.${p2}.${p3 || "00"}`;
  } catch (error) {
    console.error("Erro ao formatar código LC 116 para PDF", { code, error });
    return code || "-";
  }
};

const buildProviderAddress = (profile: ProviderProfile | null): string => {
  if (!profile) return "-";
  const parts: string[] = [];
  const baseEndereco = profile.endereco_fiscal || profile.endereco;
  if (baseEndereco) parts.push(baseEndereco);
  if (profile.cidade) parts.push(profile.cidade);
  if (profile.estado) parts.push(profile.estado);
  if (profile.cep) parts.push(profile.cep);
  return parts.join(" - ") || "-";
};

let cachedProvider: ProviderProfile | null = null;
let cachedProviderUserId: string | null = null;

const fetchProviderProfile = async (userId: string): Promise<ProviderProfile | null> => {
  if (cachedProvider && cachedProviderUserId === userId) return cachedProvider;

  const { data } = await supabase
    .from("profiles")
    .select("razao_social, nome_fantasia, cnpj, email, telefone, endereco, cidade, estado, cep, endereco_fiscal, logo_url")
    .eq("id", userId)
    .maybeSingle();

  cachedProvider = (data as ProviderProfile) || null;
  cachedProviderUserId = userId;
  return cachedProvider;
};

const addWatermark = (doc: jsPDF, text: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.saveGraphicsState();
  // light grey, semi-transparent
  doc.setTextColor(180, 180, 180);
  (doc as any).setGState?.((doc as any).GState({ opacity: 0.15 }));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(50);
  doc.text(text, pageWidth / 2, pageHeight / 2, {
    angle: 45,
    align: "center",
  } as any);
  doc.restoreGraphicsState();
};

const loadImageAsDataUrl = async (url: string): Promise<string | null> => {
  try {
    // Se já for um Data URL (Base64), retorna diretamente sem novo fetch
    if (url.startsWith("data:")) {
      return url;
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error("Falha ao carregar imagem do logotipo");

    const blob = await response.blob();

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Erro ao converter logotipo para DataURL", error);
    return null;
  }
};

const createBaseInvoicePdf = (
  doc: jsPDF,
  invoice: PdfInvoiceData,
  provider: ProviderProfile | null,
  logoDataUrl?: string | null,
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 20;
  let currentY = 20;

  // Header: logo (quando configurado) + provider info em layout que evita sobreposição
  const headerTopY = currentY;
  const logoSize = 22;
  const headerGap = 6;
  const rightColumnWidth = 80; // reserved space for the title on the right

  // Left: logo da empresa ou placeholder
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", marginX, headerTopY, logoSize, logoSize, undefined, "FAST");
    } catch (error) {
      console.error("Erro ao desenhar logotipo no PDF", error);
      doc.setDrawColor(210, 210, 210);
      doc.rect(marginX, headerTopY, logoSize, logoSize);
    }
  } else {
    doc.setDrawColor(210, 210, 210);
    doc.rect(marginX, headerTopY, logoSize, logoSize);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("LOGO", marginX + logoSize / 2, headerTopY + logoSize / 2, { align: "center" as any });
  }

  const providerName = provider?.nome_fantasia || provider?.razao_social || "Prestador não configurado";
  const providerCnpj = provider?.cnpj || "CNPJ não informado";

  // Middle: provider info with constrained width so it never collides with the title
  const middleStartX = marginX + logoSize + headerGap;
  const middleMaxWidth = pageWidth - marginX - rightColumnWidth - middleStartX;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const providerNameLines = doc.splitTextToSize(providerName, middleMaxWidth);
  doc.text(providerNameLines, middleStartX, headerTopY + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const cnpjLineY = headerTopY + 8 + providerNameLines.length * 4;
  doc.text(`CNPJ: ${providerCnpj}`, middleStartX, cnpjLineY);

  // Right: fixed-width area for the receipt title so it never shrinks or overlaps
  const titleBlockX = pageWidth - marginX;
  const titleFirstLineY = headerTopY + 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text("RECIBO PROVISÓRIO DE SERVIÇOS", titleBlockX, titleFirstLineY, {
    align: "right" as any,
  });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "Documento auxiliar - não substitui a NFSe oficial",
    titleBlockX,
    titleFirstLineY + 7,
    {
      align: "right" as any,
    },
  );

  // Reset core text color
  doc.setTextColor(0, 0, 0);

  const headerContentBottomY = Math.max(headerTopY + logoSize, cnpjLineY + 4);
  currentY = headerContentBottomY + 8;
  // Watermark for non-emitidas
  if (invoice.status === "draft") {
    addWatermark(doc, "RASCUNHO");
  } else if (invoice.status === "processing") {
    addWatermark(doc, "EM PROCESSAMENTO");
  } else if (invoice.status === "cancelled") {
    addWatermark(doc, "CANCELADA");
  }

  // Sub-header: provider address and contact
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const address = buildProviderAddress(provider);
  const contactParts: string[] = [];
  if (provider?.email) contactParts.push(provider.email);
  if (provider?.telefone) contactParts.push(provider.telefone);

  const contactLine = contactParts.join(" | ");

  const subLines = doc.splitTextToSize(`${address}${contactLine ? "\n" + contactLine : ""}`, pageWidth - marginX * 2);
  doc.text(subLines, marginX, currentY);
  currentY += subLines.length * 5 + 4;

  // Identification section
  const addSectionTitle = (title: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, marginX, currentY);
    currentY += 4;
    doc.setDrawColor(220, 220, 220);
    doc.line(marginX, currentY, pageWidth - marginX, currentY);
    currentY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
  };

  const addField = (label: string, value: string) => {
    const isIbgeWarning = label === "Endereço" && value?.includes("IBGE Pendente");

    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, marginX, currentY);
    doc.setFont("helvetica", "normal");
    const textX = marginX + 40;
    const lines = doc.splitTextToSize(value || "-", pageWidth - textX - marginX);

    if (isIbgeWarning) {
      doc.setTextColor(200, 0, 0);
    }

    doc.text(lines, textX, currentY);

    if (isIbgeWarning) {
      doc.setTextColor(0, 0, 0);
    }

    currentY += lines.length * 5 + 2;
  };

  addSectionTitle("Identificação");
  addField("Número", invoice.numeroNota || invoice.id);
  addField("Status", invoice.status.toUpperCase());
  addField("Data Emissão", formatDateBR(invoice.dataEmissao));

  addSectionTitle("Prestador");
  addField("Nome", providerName);
  addField("CNPJ", providerCnpj);
  addField("Endereço", address);
  if (contactLine) {
    addField("Contato", contactLine);
  }

  addSectionTitle("Tomador");
  addField("Razão Social", invoice.client?.razaoSocial || "-");
  addField("CNPJ/CPF", invoice.client?.cnpj || "-");
  if (invoice.client?.email) addField("Email", invoice.client.email);

  const ibgeForClient = getDisplayIBGE(
    invoice.clientCity,
    invoice.clientIbgeCode,
    invoice.client?.enderecoCompleto || null,
  );

  const addressParts: string[] = [];

  if (invoice.client?.enderecoCompleto) {
    addressParts.push(invoice.client.enderecoCompleto);
  }

  const cityUf = [invoice.clientCity, invoice.clientUf].filter(Boolean).join(" - ");
  if (cityUf) {
    addressParts.push(cityUf);
  }

  if (ibgeForClient) {
    addressParts.push(`Cód. IBGE: ${ibgeForClient}`);
  } else if (cityUf || invoice.client?.enderecoCompleto) {
    addressParts.push(
      "IBGE Pendente - configure o código do município do tomador para cálculo correto do ISS.",
    );
  }

  const tomadorEndereco = addressParts.length > 0 ? addressParts.join(" | ") : "-";

  addField("Endereço", tomadorEndereco);

  addSectionTitle("Serviço");
  addField("Descrição", invoice.descricaoServico || "-");
  if (invoice.serviceCode) addField("Cód. Serviço (LC 116)", formatLC116(invoice.serviceCode));
  if (invoice.nbsCode) addField("Código NBS", invoice.nbsCode);
  if (invoice.competencia) addField("Data Competência", formatDateBR(invoice.competencia));
  if (invoice.naturezaOperacao) addField("Natureza Operação", invoice.naturezaOperacao);

  addSectionTitle("Valores");
  addField("Valor Bruto", formatCurrencyBRL(invoice.valor));
  if (invoice.desconto !== undefined && invoice.desconto !== null) {
    addField("Desconto Incond.", formatCurrencyBRL(invoice.desconto));
  }
  if (invoice.valorLiquido !== undefined && invoice.valorLiquido !== null) {
    addField("Valor Líquido", formatCurrencyBRL(invoice.valorLiquido));
  }

  // Resumo detalhado de tributos e valor líquido
  const desconto = invoice.desconto ?? 0;
  const issValor = invoice.issValor ?? 0;
  const pisValor = invoice.pisValor ?? 0;
  const cofinsValor = invoice.cofinsValor ?? 0;
  const inssValor = invoice.inssValor ?? 0;
  const irValor = invoice.irValor ?? 0;
  const csllValor = invoice.csllValor ?? 0;

  const totalRetencoesFederais =
    invoice.totalRetencoes ?? pisValor + cofinsValor + inssValor + irValor + csllValor;

  const valorLiquidoCalculado =
    invoice.valorLiquido ?? Math.max(invoice.valor - desconto - issValor - totalRetencoesFederais, 0);

  // Resumo detalhado de tributos e valor líquido em box destacado
  const resumoBoxX = marginX;
  const resumoBoxWidth = pageWidth - marginX * 2;
  const resumoBoxTop = currentY;

  // Título da seção dentro do box
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Resumo de Valores e Tributos", resumoBoxX, currentY + 2);
  currentY += 6;
  doc.setDrawColor(220, 220, 220);
  doc.line(resumoBoxX, currentY, resumoBoxX + resumoBoxWidth, currentY);
  currentY += 4;

  // Conteúdo do box
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  addField("Valor do Serviço", formatCurrencyBRL(invoice.valor));
  if (desconto !== 0) {
    addField("Desconto Incond.", formatCurrencyBRL(desconto));
  }
  if (issValor !== 0) {
    addField("ISS Retido", formatCurrencyBRL(issValor));
  }
  if (pisValor !== 0) addField("PIS", formatCurrencyBRL(pisValor));
  if (cofinsValor !== 0) addField("COFINS", formatCurrencyBRL(cofinsValor));
  if (csllValor !== 0) addField("CSLL", formatCurrencyBRL(csllValor));
  if (irValor !== 0) addField("IR", formatCurrencyBRL(irValor));
  if (inssValor !== 0) addField("INSS", formatCurrencyBRL(inssValor));

  if (totalRetencoesFederais !== 0) {
    addField("Total Retenções Federais", formatCurrencyBRL(totalRetencoesFederais));
  }

  // Destaque visual para o valor líquido a receber, alinhando rótulo e valor
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const valorLiquidoLabel = "VALOR LÍQUIDO A RECEBER";
  const valorTexto = formatCurrencyBRL(valorLiquidoCalculado);
  const labelText = valorLiquidoLabel + ":";
  const labelX = marginX;
  const baselineY = currentY + 2;

  doc.text(labelText, labelX, baselineY);
  doc.text(valorTexto, pageWidth - marginX, baselineY, { align: "right" as any });

  currentY += 8;

  // Desenha o contorno suave do box após saber a altura total
  const resumoBoxBottom = currentY;
  doc.setDrawColor(210, 210, 210);
  doc.rect(resumoBoxX, resumoBoxTop - 4, resumoBoxWidth, resumoBoxBottom - resumoBoxTop + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  if (invoice.observacoes && invoice.observacoes.trim()) {
    addSectionTitle("Observações");
    const boxTop = currentY + 2;
    const obsLines = doc.splitTextToSize(invoice.observacoes, pageWidth - marginX * 2 - 4);
    const boxHeight = obsLines.length * 5 + 8;
    doc.setDrawColor(200, 200, 200);
    doc.rect(marginX, boxTop - 6, pageWidth - marginX * 2, boxHeight + 4);
    doc.text(obsLines, marginX + 2, boxTop);
    currentY = boxTop + boxHeight + 6;
  }

  // Footer
  currentY = Math.max(currentY + 8, doc.internal.pageSize.getHeight() - 30);
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120, 120, 120);
  doc.text(
    "Documento gerado pelo sistema para conferência. A nota fiscal oficial será fornecida pelo provedor fiscal.",
    pageWidth / 2,
    currentY,
    { align: "center" as any },
  );
};

export interface GenerateInvoicePdfOptions {
  /**
   * When true, returns a Blob URL instead of triggering a download.
   * Useful for preview/draft flows.
   */
  returnBlob?: boolean;
}

/**
 * Low-level generator that always uses the internal professional layout.
 * - If options.returnBlob === true, returns a blob URL string for preview
 * - Otherwise, triggers a download via doc.save()
 */
export const generateInvoicePDF = async (
  params: { invoice: PdfInvoiceData; userId: string },
  options: GenerateInvoicePdfOptions = {},
): Promise<void | string> => {
  const { invoice, userId } = params;
  const provider = await fetchProviderProfile(userId);
  const doc = new jsPDF();

  let logoDataUrl: string | null = null;
  if (provider?.logo_url) {
    logoDataUrl = await loadImageAsDataUrl(provider.logo_url);
  }

  // Watermark conforme status
  if (invoice.status === "draft") {
    addWatermark(doc, "RASCUNHO");
  } else if (invoice.status === "issued") {
    addWatermark(doc, "RECIBO PROVISÓRIO");
  }

  createBaseInvoicePdf(doc, invoice, provider, logoDataUrl);

  if (options.returnBlob) {
    // Usado para pré-visualização em nova aba
    return doc.output("bloburl") as unknown as string;
  }

  const safeNumber = (invoice.numeroNota || invoice.id).replace(/[\\/]/g, "-");
  doc.save(`NFS-e_${safeNumber}.pdf`);
};

/**
 * High-level handler used em listas e fluxos finais.
 * 1) Tenta abrir o PDF oficial, se existir
 * 2) Caso não exista ou falhe, gera o PDF interno com o mesmo layout
 */
export const handleDownloadPdf = async (params: {
  invoice: PdfInvoiceData;
  userId: string;
}): Promise<void> => {
  const { invoice, userId } = params;

  // 1) Tentar abrir PDF oficial, se existir
  if (invoice.officialPdfUrl) {
    try {
      window.open(invoice.officialPdfUrl, "_blank", "noopener,noreferrer");
      return;
    } catch {
      // Se der erro, cai para o fallback local abaixo
    }
  }

  // 2) Fallback: gerar PDF local com layout profissional
  await generateInvoicePDF({ invoice, userId }, { returnBlob: false });
};
