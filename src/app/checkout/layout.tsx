// Evita prerender estático: esta rota usa Supabase createBrowserClient e contexto do carrinho
// que dependem do browser (localStorage, window). Forçar dynamic para não falhar no build.
export const dynamic = 'force-dynamic';

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
