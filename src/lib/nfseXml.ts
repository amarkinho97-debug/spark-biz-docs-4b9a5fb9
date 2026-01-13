export interface NfseXmlData {
  numeroNota: string;
  dataEmissao: string;
  dataCompetencia: string;
  descricaoServico: string;
  valorServicos: number;
  valorLiquido: number;
  naturezaOperacao: string;
  localPrestacao: "mesmo_municipio" | "outro_municipio";
  serviceLocationCode?: string | null;
  issRetido: boolean;
  tributos: {
    issRetidoValor: number;
    pis: number;
    cofins: number;
    inss: number;
    ir: number;
    csll: number;
  };
}

// Gera um XML simplificado no layout ABRASF/Nacional a partir dos dados da nota
export function generateNfseXml(data: NfseXmlData): string {
  const {
    numeroNota,
    dataEmissao,
    dataCompetencia,
    descricaoServico,
    valorServicos,
    valorLiquido,
    naturezaOperacao,
    localPrestacao,
    serviceLocationCode,
    issRetido,
    tributos,
  } = data;

  const formatMoney = (value: number) => value.toFixed(2);

  return `<?xml version="1.0" encoding="UTF-8"?>
<CompNfse>
  <Nfse>
    <InfNfse Id="NFS${numeroNota.replace(/[^0-9]/g, "")}">
      <Numero>${numeroNota}</Numero>
      <DataEmissao>${dataEmissao}</DataEmissao>
      <Competencia>${dataCompetencia}</Competencia>
      <NaturezaOperacao>${naturezaOperacao}</NaturezaOperacao>
      <LocalPrestacao>
        <Tipo>${localPrestacao === "mesmo_municipio" ? "1" : "2"}</Tipo>
        ${serviceLocationCode ? `<CodigoMunicipio>${serviceLocationCode}</CodigoMunicipio>` : ""}
      </LocalPrestacao>
      <Servico>
        <Valores>
          <ValorServicos>${formatMoney(valorServicos)}</ValorServicos>
          <ValorIssRetido>${formatMoney(tributos.issRetidoValor)}</ValorIssRetido>
          <ValorPis>${formatMoney(tributos.pis)}</ValorPis>
          <ValorCofins>${formatMoney(tributos.cofins)}</ValorCofins>
          <ValorInss>${formatMoney(tributos.inss)}</ValorInss>
          <ValorIr>${formatMoney(tributos.ir)}</ValorIr>
          <ValorCsll>${formatMoney(tributos.csll)}</ValorCsll>
          <ValorLiquidoNfse>${formatMoney(valorLiquido)}</ValorLiquidoNfse>
        </Valores>
        <Discriminacao>${descricaoServico}</Discriminacao>
      </Servico>
      <IssRetido>${issRetido ? "1" : "2"}</IssRetido>
    </InfNfse>
  </Nfse>
</CompNfse>`;
}
