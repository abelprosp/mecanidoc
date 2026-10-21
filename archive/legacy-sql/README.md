# SQL legado (Supabase / migrações avulsas)

A fonte de verdade do esquema em execução é `docker/postgres/init/`.

Os ficheiros nesta pasta são o histórico das migrações avulsas da raiz do repositório
(`run_all_migrations.sql`, `create_*.sql`, `add_*.sql`, etc.). Não os execute
directamente contra um ambiente novo.

Para regenerar `docker/postgres/init/02-schema.sql` a partir deste arquivo:

```
npm run db:schema
```

Em bases já existentes, aplicar apenas `docker/postgres/init/06-security.sql`
e `99-grants.sql` via `bash scripts/db-harden.sh`.
