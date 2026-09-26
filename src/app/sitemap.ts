import type { MetadataRoute } from 'next';
import { withUserContext } from '@/lib/db/pool';

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.mecanidoc.com').replace(/\/$/, '');
const MAX_PRODUCTS = 5000;

export const revalidate = 3600;

const STATIC_PATHS = [
  '/',
  '/moto',
  '/camion',
  '/tracteurs',
  '/search',
  '/guide-des-pneus',
  '/assurance-crevaison',
  '/qui-sommes-nous',
  '/besoin-aide',
  '/methodes-de-paiement',
  '/devenir-partenaire',
  '/devenez-affilie',
  '/conditions-generales-vente',
  '/mentions-legales',
  '/politique-donnees-personnelles',
  '/parametrez-les-cookies',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : 0.6,
  }));

  try {
    const rows = await withUserContext(null, async (client) => {
      const [products, categories, pages] = await Promise.all([
        client.query<{ id: string; updated_at: Date | null }>(
          `select id, created_at as updated_at from public.products where is_active = true order by created_at desc nulls last limit $1`,
          [MAX_PRODUCTS]
        ),
        client.query<{ slug: string; updated_at: Date | null }>(
          `select slug, updated_at from public.category_pages where slug is not null`
        ),
        client.query<{ slug: string }>(
          `select slug from public.footer_links where is_active = true and slug is not null and coalesce(content, '') <> ''`
        ),
      ]);
      return { products: products.rows, categories: categories.rows, pages: pages.rows };
    });

    for (const c of rows.categories) {
      entries.push({ url: `${SITE_URL}/categorie/${encodeURIComponent(c.slug)}`, lastModified: c.updated_at || now, changeFrequency: 'weekly', priority: 0.7 });
    }
    for (const p of rows.pages) {
      entries.push({ url: `${SITE_URL}/page/${encodeURIComponent(p.slug)}`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 });
    }
    for (const p of rows.products) {
      entries.push({ url: `${SITE_URL}/product/${p.id}`, lastModified: p.updated_at || now, changeFrequency: 'weekly', priority: 0.5 });
    }
  } catch (e) {
    console.error('sitemap: falha a carregar dados dinâmicos', e);
  }

  return entries;
}
