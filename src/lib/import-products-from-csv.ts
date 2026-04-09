import Papa from 'papaparse';
import type { SupabaseClient } from '@supabase/supabase-js';

type CsvRow = Record<string, string | undefined>;

function parseNumber(value: string | undefined, defaultValue = 0): number {
  if (!value) return defaultValue;
  const normalized = value.replace(',', '.').trim();
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : defaultValue;
}

function parseList(value: string | undefined): string[] {
  if (!value || !value.trim()) return [];
  return value
    .split(/[,;|]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function parentCategoryFrom(productCategory: string | null): string {
  const catLower = (productCategory || '').toLowerCase();
  if (catLower.includes('moto')) return 'Moto';
  if (catLower.includes('camion') || catLower.includes('poids lourd')) return 'Camion';
  if (catLower.includes('tracteur') || catLower.includes('agricol')) return 'Tracteur';
  return 'Auto';
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

export type ImportProductsResult = {
  total: number;
  success: number;
  errors: number;
  subcategoriesCreated: number;
};

/**
 * Importa produtos a partir do texto CSV (mesmo mapeamento que /dashboard/products e SFTP).
 */
export async function importProductsFromCsvText(
  csvText: string,
  admin: SupabaseClient,
  userId: string,
  logs: string[]
): Promise<ImportProductsResult> {
  const parsed = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    delimiter: '',
  });

  if (parsed.errors?.length) {
    logs.push(`Aviso: ${parsed.errors.length} problema(s) de parsing detectado(s).`);
  }

  const rows = parsed.data || [];
  logs.push(`${rows.length} linhas encontradas.`);

  let success = 0;
  let errors = 0;
  const subcategoriesMap = new Map<string, Set<string>>();

  const { data: supplier } = await admin.from('suppliers').select('id').eq('profile_id', userId).single();

  for (const row of rows) {
    try {
      const brandName = (row['pa_marca'] || row['Brand'] || row['Marque'] || '').trim();
      let brandId: string | null = null;

      if (brandName) {
        const { data: existingBrand } = await admin.from('brands').select('id').eq('name', brandName).single();

        if (existingBrand?.id) {
          brandId = existingBrand.id;
        } else {
          const { data: newBrand, error: brandError } = await admin
            .from('brands')
            .insert([{ name: brandName, is_active: true }])
            .select('id')
            .single();

          if (brandError) {
            logs.push(`Aviso: nao foi possivel criar marca ${brandName}: ${brandError.message}`);
          } else {
            brandId = newBrand.id;
          }
        }
      }

      const otherCategories =
        row['autres catégories'] || row['autres categories'] || row['autres_categories'] || '';
      const category = (row['pa_categoria'] || row['pa_tipo'] || '').trim() || null;
      const paTipo = (row['pa_tipo'] || '').trim() || null;

      const productData = {
        name: (row['name'] || row['Nom'] || row['Titre'] || '').trim(),
        base_price: parseNumber(row['regular_price'] || row['Prix régulier'] || row['Prix regulier'], 0),
        sale_price: row['sale_price'] ? parseNumber(row['sale_price'], 0) : null,
        description: row['description'] || row['Description'] || null,
        images: [row['image de couverture'], row['images'], row['imagem_secundaria']].filter(
          (url): url is string => !!url && !!url.trim()
        ),
        brand: brandName || null,
        brand_id: brandId,
        ean: row['EAN'] || null,
        shipping_cost: parseNumber(row["prix d'expédition"] || row["prix d'expedition"], 0),
        category,
        pa_tipo: paTipo,
        specs: {
          width: row['pa_largeur'] || null,
          height: row['pa_hauteur'] || null,
          diameter: row['pa_diametre'] || null,
          load_index: row['pa_charge'] || null,
          speed_index: row['pa_vitesse'] || null,
          season: row['pa_clima'] || null,
          runflat: otherCategories.includes('Runflat'),
          extra_load: otherCategories.includes('XL'),
          autres_categories: parseList(otherCategories),
        },
        labels: {
          fuel: row['consommation de carburant'] || null,
          wet: row['adhérence au sol'] || row['adherence au sol'] || null,
          noise: row['niveau sonore extreme'] || null,
          noise_class: row['Class'] || null,
          label_url: row['étiquette'] || row['etiquette'] || null,
        },
        supplier_user_id: userId,
        supplier_id: supplier?.id || null,
        is_active: true,
      };

      if (!productData.name || !productData.base_price) {
        throw new Error(`Nome ou preco invalido (${productData.name || 'sem nome'})`);
      }

      const { error: insertError } = await admin.from('products').insert(productData);
      if (insertError) throw insertError;

      success++;

      if (paTipo && category) {
        const parentCategory = parentCategoryFrom(category);
        if (!subcategoriesMap.has(parentCategory)) {
          subcategoriesMap.set(parentCategory, new Set());
        }
        subcategoriesMap.get(parentCategory)?.add(paTipo);
      }
    } catch (err: unknown) {
      errors++;
      const msg = err instanceof Error ? err.message : 'erro';
      logs.push(`Erro em linha (${row['name'] || row['Nom'] || 'sem nome'}): ${msg}`);
    }
  }

  let subcategoriesCreated = 0;
  for (const [parentCategory, paTipos] of subcategoriesMap.entries()) {
    for (const paTipo of paTipos) {
      if (!paTipo.trim()) continue;
      const slug = slugify(paTipo);

      const { data: existing } = await admin
        .from('menu_subcategories')
        .select('id')
        .eq('parent_category', parentCategory)
        .eq('slug', slug)
        .single();

      if (!existing) {
        const { error: subError } = await admin.from('menu_subcategories').insert([
          {
            parent_category: parentCategory,
            name: paTipo,
            slug,
            is_active: true,
            sort_order: 0,
          },
        ]);

        if (!subError) subcategoriesCreated++;
      }
    }
  }

  logs.push(`Importacao finalizada. ${success} sucesso(s), ${errors} erro(s).`);
  if (subcategoriesCreated > 0) {
    logs.push(`${subcategoriesCreated} subcategoria(s) criadas automaticamente.`);
  }

  return {
    total: rows.length,
    success,
    errors,
    subcategoriesCreated,
  };
}
