/** Extrai medidas de pneu a partir de texto livre (nome comercial, título UPC, etc.). */
export function parseTireSpecsFromText(text: string): Record<string, string> {
  const specs: Record<string, string> = {};
  const t = String(text || '');

  // 160/60 ZR17 69W, 205/55 R16 91V, 160/60R17
  const radial = t.match(
    /(\d{2,3})\s*\/\s*(\d{2})\s*(?:ZR|R)\s*(\d{2})(?:\s+(\d{2,3})\s*([A-Z]))?/i
  );
  if (radial) {
    specs.width = radial[1];
    specs.height = radial[2];
    specs.diameter = radial[3];
    if (radial[4]) specs.load_index = radial[4];
    if (radial[5]) specs.speed_index = radial[5].toUpperCase();
    return specs;
  }

  // Moto: 150/70-17 ou "Size 130/80-18"
  const moto = t.match(/(\d{2,3})\s*\/\s*(\d{2})\s*-\s*(\d{2})/);
  if (moto) {
    specs.width = moto[1];
    specs.height = moto[2];
    specs.diameter = moto[3];
  }

  return specs;
}
