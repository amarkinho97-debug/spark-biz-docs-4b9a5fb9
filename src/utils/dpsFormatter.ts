export const extractCode = (value: string | null | undefined): string => {
  if (!value) return "";
  const [code] = value.split(" - ");
  return code.trim();
};

const parseCurrencyToNumber = (rawValue: string | null | undefined): number => {
  if (!rawValue) return 0;

  // Remove currency symbol, spaces and non-number separators
  const cleaned = rawValue
    .replace(/R\$/g, "")
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");

  const value = parseFloat(cleaned || "0");
  return Number.isFinite(value) ? value : 0;
};

const mapNaturezaOperacaoToNatOp = (naturezaOperacao?: string): string => {
  switch (naturezaOperacao) {
    case "Tributação no município":
      return "1";
    case "Tributação fora do município":
      return "2";
    case "Isento":
    case "Isenta":
      return "3";
    default:
      // Padrão recomendado: tributação no município
      return "1";
  }
};

const CITY_FALLBACKS: Record<string, string> = {
  londrina: "4113700",
  parnamirim: "2403251",
};

const normalizeLC116Code = (rawCode: string): string => {
  const value = (rawCode || "").trim();
  if (!value) return "";

  // Remove qualquer texto extra e mantém apenas dígitos e pontos
  const cleaned = value.replace(/[^\d.]/g, "");
  if (!cleaned) return "";

  // Se já estiver no formato 00.00.00, apenas retorna
  if (/^\d{2}\.\d{2}\.\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // Se estiver no formato 00.00, completa com .00 -> 00.00.00
  if (/^\d{2}\.\d{2}$/.test(cleaned)) {
    return `${cleaned}.00`;
  }

  // Se vier apenas com dígitos, formata para 00.00.00 ou 00.00.00 a partir de 4/6 dígitos
  const digits = cleaned.replace(/\D/g, "");

  if (digits.length === 4) {
    // 0102 -> 01.02.00
    return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.00`;
  }

  if (digits.length === 6) {
    // 010203 -> 01.02.03
    return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 6)}`;
  }

  throw new Error("Código de serviço (LC116) inválido. Use o formato 00.00.00.");
};

export const formatFormToDPS = (
  formData: any,
  profileData?: { cnpj?: string; regime_tributario?: string; inscricao_municipal?: string },
) => {
  const lc116Raw = formData?.codigoServico ?? "";
  const nbsRaw = formData?.codigoNbs ?? "";

  const cTribNac = normalizeLC116Code(extractCode(lc116Raw));
  const rawNbsCode = extractCode(nbsRaw);
  const cNBS = rawNbsCode.replace(/\D/g, "");
  const clientMode = formData?.clientMode ?? "registered";

  const tomaCnpjRaw = clientMode === "manual"
    ? formData?.manualClientCnpj ?? ""
    : formData?.registeredClientCnpj ?? "";

  const tomaNome = clientMode === "manual"
    ? formData?.manualClientRazaoSocial ?? ""
    : "";

  const tomaCnpj = tomaCnpjRaw.replace(/\D/g, "");

  // Competência (AAAA-MM-DD vinda do formulário)
  const competenciaRaw: string | undefined = formData?.dataCompetencia;
  const dComp = competenciaRaw
    ? new Date(`${competenciaRaw}T00:00:00`).toISOString()
    : new Date().toISOString();

  // Código do município do tomador (IBGE)
  let cityCode: string | undefined = formData?.ibgeMunicipio?.toString().trim();

  if (!cityCode) {
    // Fallback simples baseado no nome da cidade (para ambiente de testes)
    const normalize = (value: string) =>
      value
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .trim();

    const manualCityRaw: string = formData?.manualClientCidade || "";
    const cityName = manualCityRaw ? normalize(manualCityRaw) : "";

    if (cityName && CITY_FALLBACKS[cityName]) {
      cityCode = CITY_FALLBACKS[cityName];
    }
  }

  if (!cityCode) {
    throw new Error(
      "Ocorreu um erro ao buscar o código da cidade. Por favor, digite o CEP novamente.",
    );
  }

  // Valores principais
  const vServ = parseCurrencyToNumber(formData?.valor);
  
  // Tributos federais
  const vPis = parseCurrencyToNumber(formData?.pis);
  const vCofins = parseCurrencyToNumber(formData?.cofins);
  const vIr = parseCurrencyToNumber(formData?.ir);
  const vCsll = parseCurrencyToNumber(formData?.csll);
  const vInss = parseCurrencyToNumber(formData?.inss);
  
  // ISS (municipal)
  const issRetido = !!formData?.issRetido;
  const vISSQN = parseCurrencyToNumber(formData?.issRetidoValor);
  const vISSQNConsiderado = issRetido ? vISSQN : 0;
  
  // Regime tributário do prestador (do perfil da empresa)
  const regimeTrib = profileData?.regime_tributario || "1";
  
  // CNPJ do prestador (do perfil da empresa)
  const prestadorCnpjRaw = profileData?.cnpj || "";
  const prestadorCnpj = prestadorCnpjRaw.replace(/\D/g, "");
  
  // Inscrição municipal do prestador
  const prestadorIm = profileData?.inscricao_municipal || "";
  
  // Validação do CNPJ do prestador
  if (!prestadorCnpj || prestadorCnpj.length !== 14) {
    throw new Error(
      "CNPJ do prestador inválido ou não cadastrado. Por favor, verifique os dados da empresa em Configurações.",
    );
  }

  // Validação da inscrição municipal do prestador
  if (!prestadorIm) {
    throw new Error(
      "Inscrição Municipal do prestador não encontrada. Por favor, cadastre-a em Configurações.",
    );
  }
  
  const natOp = mapNaturezaOperacaoToNatOp(formData?.naturezaOperacao);
  
  // Validações mínimas antes de montar o payload
  if (vServ <= 0) {
    throw new Error("O valor do serviço deve ser maior que zero.");
  }
  
  if (!natOp) {
    throw new Error("Selecione a natureza da operação.");
  }
  
  if (!tomaCnpj) {
    throw new Error("Informe o documento do tomador.");
  }
  
  if (!prestadorCnpj) {
    throw new Error("CNPJ do prestador é obrigatório para gerar a DPS.");
  }
  
  // Valor líquido do serviço
  const vLiq = vServ - (vPis + vCofins + vIr + vCsll + vInss + vISSQNConsiderado);
  
  const infDPS = {
    dhEmi: new Date().toISOString(),
    dComp,
    natOp,
    serv: {
      cServ: {
        cTribNac,
        cNBS: cNBS || undefined,
      },
    },
    valores: {
      vServ,
      vLiq,
      trib: {
        tribFed: {
          piscofins: {
            vPis,
            vCofins,
          },
          vIr,
          vCsll,
          vInss,
        },
        tribMun: {
          tribISSQN: {
            vISSQN,
            tpRetISSQN: issRetido ? 1 : 2,
          },
        },
      },
    },
    prest: {
      CNPJ: prestadorCnpj,
      regimeTrib,
      im: prestadorIm,
    },
    toma: {
      CNPJ: tomaCnpj || undefined,
      xNome: tomaNome || undefined,
      end: {
        endNac: {
          cMun: cityCode,
        },
      },
    },
  } as const;

  console.log("Final IBGE Code sent:", infDPS.toma.end.endNac.cMun);
  console.log("Final LC116 Code sent:", infDPS.serv.cServ.cTribNac);
  console.log("🚀 PAYLOAD REAL:", JSON.stringify(infDPS, null, 2));

  return {
    infDPS,
  };
};
