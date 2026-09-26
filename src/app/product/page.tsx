import { redirect } from 'next/navigation';

/**
 * `/product` sem identificador era uma página de demonstração com dados fictícios.
 * Redireciona para a pesquisa; as fichas reais vivem em `/product/[id]`.
 */
export default function ProductIndexPage() {
  redirect('/search');
}
