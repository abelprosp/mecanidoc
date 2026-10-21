const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export class DbValidationError extends Error {
  code = 'DB_VALIDATION';
}

/** Garante que `name` é um identificador SQL simples (coluna/tabela). */
export function assertIdent(name: string, what = 'identificador'): string {
  if (typeof name !== 'string' || !IDENT_RE.test(name)) {
    throw new DbValidationError(`${what} inválido: ${JSON.stringify(name)}`);
  }
  return name;
}

export function quoteIdent(name: string) {
  return `"${assertIdent(name).replace(/"/g, '""')}"`;
}
