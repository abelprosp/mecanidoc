import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductClient from './ProductClient';
import { getProductById, productImage } from '@/lib/catalog/product';

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.mecanidoc.com').replace(/\/$/, '');

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return { title: 'Produit introuvable', robots: { index: false, follow: false } };
  const title = [product.brand, product.name].filter(Boolean).join(' ');
  const description = product.description?.slice(0, 160) || `Pneu ${title} chez MecaniDoc. Prix TTC, montage possible en garage partenaire.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/product/${product.id}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/product/${product.id}`,
      images: [{ url: productImage(product) }],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: [product.brand, product.name].filter(Boolean).join(' '),
    image: productImage(product),
    sku: product.id,
    gtin13: product.ean || undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/product/${product.id}`,
      priceCurrency: 'EUR',
      price: product.final_price.toFixed(2),
      availability:
        product.stock_quantity && product.stock_quantity > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/PreOrder',
    },
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: product.category || 'Pneus', item: `${SITE_URL}/search?category=${encodeURIComponent(product.category || 'Auto')}` },
      { '@type': 'ListItem', position: 3, name: product.name, item: `${SITE_URL}/product/${product.id}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <ProductClient initialProduct={product} />
    </>
  );
}
