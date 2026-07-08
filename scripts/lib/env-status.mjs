/** Mostra estado das variáveis de enriquecimento (sem expor segredos). */
export function maskSecret(val) {
  if (!val?.trim()) return null;
  const s = val.trim();
  if (s.length <= 8) return `*** (${s.length} chars)`;
  return `${s.slice(0, 4)}…${s.slice(-4)} (${s.length} chars)`;
}

export function gtinHubKeyStatus() {
  const raw = process.env.GTINHUB_API_KEY;
  const trimmed = raw?.trim() || '';
  return {
    configured: Boolean(trimmed),
    length: trimmed.length,
    masked: maskSecret(trimmed),
    hadWhitespaceOnly: Boolean(raw && !trimmed),
  };
}

export function printEnrichEnvStatus() {
  const gtin = gtinHubKeyStatus();
  const eprel = process.env.EPREL_API_KEY?.trim();

  console.log('Variáveis de ambiente (enriquecimento):');
  console.log(`  EPREL_API_KEY: ${eprel ? maskSecret(eprel) : 'NÃO definida'}`);
  if (gtin.hadWhitespaceOnly) {
    console.log('  GTINHUB_API_KEY: ERRO — linha existe mas valor vazio');
  } else if (gtin.configured) {
    console.log(`  GTINHUB_API_KEY: ${gtin.masked}`);
  } else {
    console.log('  GTINHUB_API_KEY: NÃO definida (quota grátis ~10/dia por IP)');
    console.log('  → Adicione em .env ou .env.local na pasta do projeto (~/mecanidoc/)');
  }
  console.log('');
}
