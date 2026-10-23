/**
 * Ordenação comum para o catálogo: primeiro produtos com dados enriquecidos,
 * depois nomes descritivos e, por último, nomes que ainda são só referência.
 */
export function productQualityOrderSql(alias = 'p'): string {
  const name = `${alias}.name`;
  const specs = `${alias}.specs`;
  const metadata = `${alias}.external_metadata`;

  const genericName = `(
    ${name} is null or btrim(${name}) = ''
    or ${name} ~* '^pneu[[:space:]]+na[[:space:]]+ref'
    or ${name} ~* '·[[:space:]]*ref[.][[:space:]]*[0-9]'
    or ${name} ~* '(^|[[:space:]])ref[.]?[[:space:]]*#?[[:space:]]*[0-9]{3,}'
    or ${name} ~* '^([[:alnum:] .+-]{2,30})[[:space:]]+\\1[[:space:]]+pneu'
    or ${name} ~* '^(continental|michelin|pirelli|bridgestone|goodyear|dunlop|hankook|kumho|kleber|barum|nexen|metzeler|falken|sava|mitas|triangle|mrf)[[:space:]]+pneu([[:space:]]|$)'
  )`;

  const hasEnrichment = `(
    nullif(${metadata}->'catalog_enrich'->>'enrichedAt', '') is not null
    or nullif(${metadata}->'eprel_enrich'->>'enrichedAt', '') is not null
    or (
      nullif(${specs}->>'width', '') is not null
      and nullif(${specs}->>'height', '') is not null
      and nullif(${specs}->>'diameter', '') is not null
    )
  )`;

  return `case when not ${genericName} and ${hasEnrichment} then 0 when ${genericName} then 2 else 1 end`;
}
