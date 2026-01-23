// Explicações das categorias de pneus (Autres catégories)
export const categoryExplanations: Record<string, string> = {
  'XL': 'Extra Load (Charge renforcée) - Pneu conçu pour supporter des charges plus élevées que les pneus standard. Idéal pour les véhicules lourds ou chargés.',
  'M+S': 'Mud + Snow (Boue + Neige) - Pneu conçu pour offrir une meilleure adhérence sur la boue et la neige. Adapté aux conditions hivernales.',
  'MS': 'Mud + Snow (Boue + Neige) - Pneu conçu pour offrir une meilleure adhérence sur la boue et la neige.',
  'Runflat': 'Run Flat - Pneu conçu pour permettre de continuer à rouler même après une crevaison, généralement jusqu\'à 80 km à vitesse réduite.',
  'RF': 'Run Flat - Pneu conçu pour permettre de continuer à rouler même après une crevaison.',
  'ZP': 'Zero Pressure (Run Flat) - Technologie permettant de rouler sans pression d\'air après une crevaison.',
  'ROF': 'Run On Flat - Pneu permettant de rouler à plat après une crevaison.',
  'SSR': 'Self Supporting Runflat - Pneu auto-porteur permettant de rouler sans pression.',
  'FR': 'Flanc Renforcé - Pneu avec flanc renforcé pour une meilleure résistance aux chocs.',
  'REINFORCED': 'Reinforced - Pneu renforcé pour charges plus élevées.',
  'C': 'Commercial - Pneu conçu pour véhicules commerciaux et charges lourdes.',
  'LT': 'Light Truck - Pneu pour camionnettes et véhicules utilitaires légers.',
  'ST': 'Special Trailer - Pneu spécialement conçu pour remorques.',
  'HP': 'High Performance - Pneu haute performance pour conduite sportive.',
  'UHP': 'Ultra High Performance - Pneu ultra haute performance.',
  'SUV': 'Sport Utility Vehicle - Pneu conçu pour les SUV.',
  '4S': '4 Saisons - Pneu toutes saisons, adapté à l\'été et à l\'hiver.',
  'AS': 'All Season - Pneu toutes saisons.',
};

// Função para obter a explicação de uma categoria (case-insensitive)
export function getCategoryExplanation(category: string): string {
  const normalized = category.trim().toUpperCase();
  return categoryExplanations[normalized] || categoryExplanations[category] || `Catégorie: ${category}`;
}
