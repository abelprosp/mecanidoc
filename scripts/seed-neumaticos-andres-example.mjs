#!/usr/bin/env node
/**
 * Consulta a API Neumáticos Andrés (pré-prod) e insere um produto de exemplo no PostgreSQL.
 *
 * Uso:
 *   NEUMATICOS_ANDRES_LOGIN=... NEUMATICOS_ANDRES_PASSWORD=... DATABASE_URL=... node scripts/seed-neumaticos-andres-example.mjs
 *
 * Artigos testados na doc: 3286341675412 (não existe nesta conta), 16064 (OK).
 */
import pg from 'pg';

const { Client } = pg;

const login = process.env.NEUMATICOS_ANDRES_LOGIN || 'godinho_joao';
const password = process.env.NEUMATICOS_ANDRES_PASSWORD || '9kDhipiV4maH';
const baseUrl = (process.env.NEUMATICOS_ANDRES_BASE_URL || 'https://backend-pre2.genasa.es').replace(/\/$/, '');
const dbUrl =
  process.env.DATABASE_URL ||
  'postgresql://mecanidoc:mecanidoc@localhost:5432/mecanidoc';

const CANDIDATE_ARTICLES = ['16064', '3286341675412', '3838947844558'];

async function fetchStock(articleNumber, postCode = '75001') {
  const url = `${baseUrl}/api/na/getstock/${encodeURIComponent(articleNumber)}?post-code=${encodeURIComponent(postCode)}`;
  const res = await fetch(url, {
    headers: { login, password, Accept: 'application/json' },
  });
  const json = await res.json();
  const article = json.articles?.[0];
  if (!article || article.success !== 1) {
    return null;
  }
  return article;
}

async function findWorkingArticle() {
  for (const article of CANDIDATE_ARTICLES) {
    const data = await fetchStock(article);
    if (data) return data;
  }
  throw new Error('Nenhum artigo de exemplo encontrado na API para esta conta.');
}

async function main() {
  console.log('A consultar API Neumáticos Andrés...');
  const article = await findWorkingArticle();
  const productId = article['product-id'];
  const ean = article.ean || productId;
  const price = Number(article.price || 0);
  const stock = Number(article.amount || 0);
  const schedule = article['schedule-details'] || [];

  console.log(`Artigo encontrado: product-id=${productId}, EAN=${ean}, preço=${price}, stock=${stock}`);

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    const name = `Pneu exemplo Neumáticos Andrés — Ref. ${productId}`;
    const description =
      'Produto de demonstração importado da API Neumáticos Andrés (pré-produção). Stock e preço sincronizados via getstock.';
    const metadata = {
      supplier_price: price,
      schedule_details: schedule,
      estimated_delivery_date: schedule[0]?.['delivery-date'] ?? null,
      source: 'seed-neumaticos-andres-example',
    };

    const { rows } = await client.query(
      `INSERT INTO public.products (
         name, description, base_price, stock_quantity, category,
         ean, external_supplier, external_product_id, external_metadata,
         last_stock_sync_at, is_active, specs, brand
       ) VALUES (
         $1, $2, $3, $4, 'Moto',
         $5, 'neumaticos_andres', $6, $7::jsonb,
         now(), true, $8::jsonb, 'Mitas'
       )
       ON CONFLICT DO NOTHING
       RETURNING id, name, base_price, stock_quantity, ean`,
      [
        name,
        description,
        price,
        stock,
        ean,
        String(productId),
        JSON.stringify(metadata),
        JSON.stringify({ source: 'neumaticos_andres', demo: true }),
      ]
    );

    if (rows[0]) {
      console.log('Produto inserido:', rows[0]);
    } else {
      const existing = await client.query(
        `UPDATE public.products SET
           base_price = $1,
           stock_quantity = $2,
           external_metadata = $3::jsonb,
           last_stock_sync_at = now(),
           is_active = true,
           category = 'Moto'
         WHERE external_supplier = 'neumaticos_andres'
           AND (ean = $4 OR external_product_id = $5)
         RETURNING id, name, base_price, stock_quantity, ean`,
        [price, stock, JSON.stringify(metadata), ean, String(productId)]
      );
      console.log('Produto atualizado:', existing.rows[0]);
    }

    const { rows: all } = await client.query(
      `SELECT id FROM public.products WHERE external_supplier = 'neumaticos_andres' AND ean = $1`,
      [ean]
    );
    if (all.length > 1) {
      const keep = all[0].id;
      await client.query(
        `DELETE FROM public.products WHERE external_supplier = 'neumaticos_andres' AND ean = $1 AND id <> $2`,
        [ean, keep]
      );
      console.log(`Removido(s) ${all.length - 1} duplicado(s).`);
    }

    await client.query(
      `UPDATE public.global_settings SET
         na_integration_enabled = true,
         na_auto_sync_stock = true,
         na_auto_fulfill = true
       WHERE id IS NOT NULL`
    );

    console.log('Integração NA ativada em global_settings.');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
    const pid = rows[0]?.id || (await client.query(
      `SELECT id FROM products WHERE ean = $1 LIMIT 1`, [ean]
    )).rows[0]?.id;
    if (pid) {
      console.log(`Ver no site (secção Moto): ${appUrl}/moto`);
      console.log(`Página do produto: ${appUrl}/product/${pid}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
