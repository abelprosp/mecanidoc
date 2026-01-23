/**
 * Calcula o preço final de um produto aplicando todas as taxas ativas
 * @param basePrice - Preço base do produto
 * @param category - Categoria do produto ('Auto', 'Moto', 'Camion', 'Tracteur')
 * @param taxes - Array de taxas do banco de dados
 * @returns Preço final com todas as taxas aplicadas
 */
export function calculateFinalPrice(
  basePrice: number,
  category: string = 'Auto',
  taxes: Array<{
    rate: number;
    is_percentage: boolean;
    applies_to: string;
    is_active: boolean;
  }> = []
): number {
  let finalPrice = basePrice;

  // Filtrar taxas ativas que se aplicam a esta categoria
  const applicableTaxes = taxes.filter(
    tax => tax.is_active && (tax.applies_to === 'all' || tax.applies_to.toLowerCase() === category.toLowerCase())
  );

  // Aplicar cada taxa na ordem
  for (const tax of applicableTaxes) {
    if (tax.is_percentage) {
      // Taxa percentual: adiciona X% ao preço
      finalPrice = finalPrice * (1 + tax.rate / 100);
    } else {
      // Taxa fixa: adiciona valor fixo
      finalPrice = finalPrice + tax.rate;
    }
  }

  return Math.round(finalPrice * 100) / 100; // Arredondar para 2 casas decimais
}

/**
 * Calcula o valor total das taxas aplicadas (para exibição)
 */
export function calculateTaxAmount(
  basePrice: number,
  category: string = 'Auto',
  taxes: Array<{
    rate: number;
    is_percentage: boolean;
    applies_to: string;
    is_active: boolean;
    name?: string;
  }> = []
): { total: number; breakdown: Array<{ name: string; amount: number }> } {
  let currentPrice = basePrice;
  let totalTax = 0;
  const breakdown: Array<{ name: string; amount: number }> = [];

  const applicableTaxes = taxes.filter(
    tax => tax.is_active && (tax.applies_to === 'all' || tax.applies_to.toLowerCase() === category.toLowerCase())
  );

  for (const tax of applicableTaxes) {
    let taxAmount = 0;
    if (tax.is_percentage) {
      taxAmount = currentPrice * (tax.rate / 100);
      currentPrice = currentPrice + taxAmount;
    } else {
      taxAmount = tax.rate;
      currentPrice = currentPrice + taxAmount;
    }
    totalTax += taxAmount;
    breakdown.push({
      name: tax.name || 'Taxe',
      amount: Math.round(taxAmount * 100) / 100
    });
  }

  return {
    total: Math.round(totalTax * 100) / 100,
    breakdown
  };
}
