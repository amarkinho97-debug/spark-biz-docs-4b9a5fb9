/**
 * Validates CPF (Cadastro de Pessoas Físicas) using Módulo 11 checksum
 */
export function validateCPF(cpf: string): boolean {
  // Remove non-digit characters
  const digits = cpf.replace(/\D/g, "");

  // CPF must have exactly 11 digits
  if (digits.length !== 11) return false;

  // Reject known invalid patterns (all same digits)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  // Calculate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i)) * (10 - i);
  }
  let checkDigit = 11 - (sum % 11);
  if (checkDigit >= 10) checkDigit = 0;
  if (checkDigit !== parseInt(digits.charAt(9))) return false;

  // Calculate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i)) * (11 - i);
  }
  checkDigit = 11 - (sum % 11);
  if (checkDigit >= 10) checkDigit = 0;
  if (checkDigit !== parseInt(digits.charAt(10))) return false;

  return true;
}

/**
 * Validates CNPJ (Cadastro Nacional da Pessoa Jurídica) using Módulo 11 checksum
 */
export function validateCNPJ(cnpj: string): boolean {
  // Remove non-digit characters
  const digits = cnpj.replace(/\D/g, "");

  // CNPJ must have exactly 14 digits
  if (digits.length !== 14) return false;

  // Reject known invalid patterns (all same digits)
  if (/^(\d)\1{13}$/.test(digits)) return false;

  // Calculate first check digit
  let length = digits.length - 2;
  let numbers = digits.substring(0, length);
  const checkDigits = digits.substring(length);
  let sum = 0;
  let pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(checkDigits.charAt(0))) return false;

  // Calculate second check digit
  length = length + 1;
  numbers = digits.substring(0, length);
  sum = 0;
  pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(checkDigits.charAt(1))) return false;

  return true;
}

/**
 * Validates CPF or CNPJ based on the length after removing non-digits
 */
export function validateCPForCNPJ(document: string): boolean {
  const digits = document.replace(/\D/g, "");
  
  if (digits.length === 11) {
    return validateCPF(document);
  } else if (digits.length === 14) {
    return validateCNPJ(document);
  }
  
  return false;
}

/**
 * Fetches address data from ViaCEP API
 */
export interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge?: string;
  erro?: boolean;
}

export async function fetchAddressByCEP(cep: string): Promise<ViaCEPResponse | null> {
  const cleanCEP = cep.replace(/\D/g, "");
  
  if (cleanCEP.length !== 8) {
    return null;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    const data = await response.json();
    
    if (data.erro) {
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
    return null;
  }
}
