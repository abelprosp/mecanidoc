# Análise do MecaniDoc — 26/09/2026

## Escopo e resultado

Revisão da estrutura de rotas, componentes, autenticação, PostgreSQL, esquema Docker, checkout, Stripe, fornecedor, suporte, estilos e implantação. Segurança avaliada pelo código e configuração versionada, sem exploração da produção. Design avaliado nos componentes, sem inspeção visual em navegador. Não foram efetuados pagamentos ou alterações em banco.

O projeto já tem uma base ampla: categorias, busca por medidas, carrinho, oficinas, painéis por perfil, pagamentos, importações e suporte. Há controles úteis: bcrypt, cookies HttpOnly, assinatura Stripe e verificações de propriedade nas rotas de pagamento. Porém, autorização e integridade da compra têm falhas que devem ser resolvidas antes da expansão.

Validações realizadas:
- Reprodução isolada, com fetch simulado: insert(...).select().single() envia operação select, em vez de insert.
- ESLint em src: 168 arquivos, 277 erros e 108 avisos. Inclui 222 ocorrências de no-explicit-any, 40 de exhaustive-deps, 13 de set-state-in-effect, 7 de immutability e 2 de alt-text.
- A instalação npm ci não terminou e foi interrompida. TypeScript encontrou módulos Next ausentes durante essa instalação incompleta; esse resultado não comprova defeito do código. Build e execução visual permanecem não validados.

## P0 — corrigir antes de liberar a operação

1. **API genérica de banco com conexão privilegiada.** src/app/api/db/route.ts aceita tabela, operação, seleção e payload arbitrários; o caminho normal aceita usuário anônimo. src/lib/db/pool.ts usa o mesmo pool para usuário e administrador, sem SET ROLE. docker-compose.yml configura a aplicação com o usuário POSTGRES_USER, superusuário em uma instalação nova da imagem oficial. Nesse cenário, RLS não isola os dados. Separar conta de migração e execução, remover privilégios excessivos e substituir a API genérica por operações de domínio com autorização explícita. Conferir a configuração real em produção.

2. **Trechos SQL controlados pela requisição.** src/lib/db/query-builder.ts:57 aceita certas expressões de seleção sem quoting; relacionamentos interpolam childCols; a linha 408 interpola limitN. TypeScript não valida o JSON em execução. Usar seleção permitida de colunas/relacionamentos, limite inteiro com teto e parametrização. Não foi testada exploração contra banco real.

3. **Políticas permissivas mesmo com RLS ativo.** docker/postgres/init/02-schema.sql:85 permite leitura pública de perfis; a seguinte permite atualização do próprio perfil sem proteção de colunas como role. As políticas de promoções a partir da linha 460 permitem escrita TO public com condições true. Restringir dados públicos e impedir mudança de papéis, aprovações, saldos e descontos por usuários comuns. Rever também users, empresas, fornecedores e suporte.

4. **Preço da compra controlado pelo navegador.** src/app/checkout/page.tsx:194 grava total_amount e outros valores calculados no cliente. Stripe usa esse total armazenado, sem reconstruir um orçamento confiável. Criar checkout servidor: receber IDs/quantidades/opções, recarregar produtos/taxas/descontos/frete, calcular em centavos e gravar pedido + itens em uma transação. Proibir alterações indevidas após pagamento.

5. **Autorização de itens verifica um pedido e grava outro.** src/app/api/checkout/order-items/route.ts valida body.orderId, mas insere row.order_id. Não exige igualdade; preço e quantidade também vêm do cliente. A rota executa DDL e remove uma FK durante a compra. Derivar todos os itens do pedido autorizado, validar produto/quantidade, impedir alteração de pedidos pagos, restaurar integridade referencial e remover migrações de requests.

6. **Segredos previsíveis de fallback.** docker-compose.yml:37 permite iniciar com segredo JWT conhecido; há senha fixa de banco e segredo padrão de cron. Exigir configuração explícita e trocar valores se usados em ambientes reais. Conferir HTTPS: src/lib/auth/session.ts permite Secure=false se a URL configurada for HTTP.

Referências: https://www.postgresql.org/docs/18/ddl-rowsecurity.html e https://hub.docker.com/_/postgres. Superusuários ignoram RLS; o impacto de produção depende do papel efetivamente utilizado.

## P1 — funcionamento e confiabilidade

7. **Inserção vira consulta — reproduzido.** src/lib/db/client-browser.ts:44 e o cliente servidor mudam a operação para select ao chamar .select(). O checkout usa insert(...).select().single() na linha 211. Pode falhar com zero/múltiplos pedidos ou retornar um pedido anterior se houver apenas um. Separar operação e projeção RETURNING e testar também update/upsert.

8. **Empresa/oficina cadastradas como customer.** Formulários enviam metadata.role, mas registerUser em src/lib/db/client.ts grava sempre customer; não foi encontrado trigger equivalente no esquema Docker. O login redireciona pelo papel. Criar cadastros específicos, transacionais, com papéis permitidos e aprovação. Nunca aceitar livremente master do cliente.

9. **Pagamento e envio sem transição atômica.** src/lib/stripe-payments.ts faz leitura, atualização e envio separados; webhook registra evento depois do processamento. Há risco de concorrência. Falha de fulfillment é registrada em log após pedido pago e uma repetição já paga não dispara a mesma tentativa. Usar deduplicação atômica, transições condicionais, fila persistente, retries e reconciliação. Validar valor, moeda e associação em todos os eventos de sucesso.

10. **Estoque e condições comerciais incompletos.** Produto/carrinho não impõem disponibilidade no servidor; fornecedor verifica estoque durante envio após pagamento. O cálculo examinado não aplica company.discount_tier nem preço de instalação. Checkout lê configurações, mas usa valores fixos de frete. Centralizar orçamento, validar disponibilidade antes de cobrar, definir reserva e recuperação de falta de estoque e conectar desconto/frete/montagem.

11. **Autenticação incompleta.** Recuperação de senha aponta para # em src/app/auth/login/page.tsx:152. Cadastro servidor só verifica presença de e-mail/senha. Não foi localizado limitador de tentativas nas rotas examinadas; JWT de sete dias sem revogação observada. Implementar recuperação por token, confirmação de e-mail, validação, limites e gestão de sessões; recomendar MFA administrativo.

12. **Importação remota, HTML e debug.** import-products-url valida host inicial, segue redirects automaticamente e limita tamanho só depois de ler todo o arquivo. remote-image-fetch não valida resolução DNS privada. Há risco de SSRF para quem acessa as funções. src/app/page/[slug]/page.tsx:116 injeta HTML armazenado sem sanitização observada. /api/debug-env expõe detalhes do ambiente sem autenticação. Validar destinos e DNS por salto, limitar streaming, sanitizar HTML e restringir debug.

## Análise por página e fluxo

| Área | Problema/oportunidade | Ação |
|---|---|---|
| Home | Hero alto, mensagem longa; mais vendidos usa created_at, não vendas | Busca por medida como foco; ranking real ou renomear para novidades |
| Moto, caminhão e agrícola | Heros e formulários similares separados | Compartilhar estrutura, mantendo especificidades por categoria |
| Categorias | Taxonomia espalhada em menus estáticos, banco, slugs e normalizadores | Fonte única e validação de links; conteúdo e SEO próprios |
| Busca | Min/max de preço sem handlers; lista sem paginação | Filtros reais, ordenação, paginação, chips ativos e limpar filtros |
| Produto dinâmico | Avaliação fixa 4,8/5 e 2.138 avaliações, enquanto outra seção diz não haver avaliações | Avaliações verificadas ou omitir; preço unitário/total, estoque e prazo claros |
| /product | Demonstração pública com produto/preço/avaliações fixos | Remover da indexação/navegação ou redirecionar para produto real |
| Carrinho/checkout | Alertas nativos, login tardio, entrega rápida pré-selecionada, mensagens técnicas | Erros por campo, autenticação com retorno e preservação dos dados, opções transparentes |
| Sucesso da compra | Precisa de validação integrada com pagamentos e expedição | Estados pendente/aprovado/falhou, número do pedido e próximos passos |
| Login/cadastro | Senha esquecida inoperante e papéis inconsistentes | Completar autenticação e onboarding por perfil |
| Cliente | Perfil e pedidos existentes | Priorizar rastreio, detalhes, documentos, recompra e suporte contextual |
| Oficina | Sidebar hidden md:flex sem equivalente móvel observado; rendez-vous lista itens de pedido | Menu móvel, agenda real com horários/capacidade, reagendamento e ganhos |
| Empresa | Sidebar escondida no móvel; desconto mostrado não entra no cálculo examinado | Menu móvel e orçamento B2B efetivo |
| Fornecedor | Produtos, importação e chaves já existem | Erros por linha, status dos jobs, última sincronização e recuperação |
| Administração/vendas | Admin concentra 2.712 linhas | Rotas por módulo, tabelas paginadas, auditoria e ações claras |
| Suporte | Chat/e-mail presentes e polling frequente | Limites, protocolo, status, vínculo ao pedido e pausa quando invisível |
| Cookies | Página promete preferências, mas só apresenta texto | Controles correspondentes às tecnologias realmente usadas |
| Afiliados | Comissão/estatísticas anunciadas; links vão às homes de plataformas | Links reais do programa e condições verificadas ou cadastro de interesse |
| Parceiros | Depende de cadastro e aprovação corretos | Etapas, documentos, custos e acompanhamento |
| Institucionais/garantias/entrega | Fontes estáticas e banco; estado em redação e identificação genérica de empresa/host | Revisar conteúdo com responsáveis e alinhar às funções existentes |

## Design e usabilidade transversais

- Padronizar tokens de cores, tipografia, espaçamentos, bordas e botões; há azuis e estilos diferentes definidos por componente.
- Unificar fontes: layout carrega Geist, body usa Arial.
- Aumentar textos técnicos dos cartões (há 6–10 px), hierarquizar marca/modelo, medida, preço, disponibilidade e ação. Medir contraste no navegador.
- Tornar menu desktop acessível por teclado: Header.tsx:299 depende de group-hover. Rever labels, nomes de ícones, foco/Escape de modais e retorno de foco.
- Remover botão dentro de link nos cartões e padronizar estados de erro, vazio, carregamento e sucesso.
- Padronizar francês público: há mensagens em português/inglês e Clima nos filtros.
- Validar 360/390 px, tablet, desktop, zoom e teclado. overflow-x-hidden global pode esconder cortes; não comprova adaptação móvel.
- Melhorar ajuda de medidas, índice de carga/velocidade e escolha de oficina; exibir claramente custo e prazo de montagem.

## Desempenho, SEO e manutenção

- Header realiza quatro consultas sequenciais e seis por specs por busca. Consolidar em endpoint com índices e cancelamento de respostas antigas.
- Dimensões, marcas e resultados carregam conjuntos amplos para filtrar no cliente. Criar facetas e paginação no servidor.
- useProductPrice consulta taxas por cartão e mostra inicialmente preço base. Compartilhar cache e exibir preço final estável.
- attachNested pode fazer consultas por registro; usar lotes/joins controlados.
- Otimizar imagens, definir dimensões e carregamento abaixo da dobra; reduzir dependência de placeholders externos.
- Não foram encontrados sitemap/robots/metadados dinâmicos de produto/dados estruturados na árvore examinada. Implementar SEO de catálogo, canonical, Product/Breadcrumb com dados reais e renderização de conteúdo relevante no servidor.
- Criar estados de erro/404 recuperáveis. Evitar exibir erros de infraestrutura ao comprador.
- Unificar migrações versionadas; remover DDL de requests e validar bancos novos/existentes.
- Reduzir any, extrair serviços do admin, remover código morto da migração Supabase para PostgreSQL.
- package.json repete enrich:eprel e enrich:eprel:vps; as últimas definições sobrescrevem as anteriores. Corrigir nomes e documentação.
- Não foi encontrada suíte de testes da aplicação. Priorizar autorização, preços, pedido transacional, papéis, concorrência de webhooks e fluxo móvel.
- Documentar backups de banco/uploads e restauração, healthcheck, alertas e reconciliação com fornecedor. README permanece padrão e com encoding incorreto, embora haja documentação adicional.

## Ordem recomendada

1. Conter exposição: usuário PostgreSQL, API genérica, SQL dinâmico, políticas, segredos e debug. Testar anônimo e dois usuários diferentes.
2. Tornar compra confiável: QueryBuilder, orçamento servidor, pedido+itens transacionais, estoque, papéis e pagamento/envio recuperável.
3. Completar experiência: senha, filtros, menu móvel, dados reais, idioma e estados de erro.
4. Melhorar escala: cache, paginação, imagens, SEO, monitoramento e testes.
5. Expandir funções: agenda real de oficinas, pós-venda/documentos e B2B antes de favoritos, comparador ou expansão de afiliados.

Pendências: conferir configuração de produção, build/TypeScript com dependências completas, compra em Stripe de teste, fornecedor de teste, webhooks concorrentes e inspeção visual/acessibilidade com dados reais. Não foram atribuídas notas Lighthouse/WCAG nem afirmada conformidade jurídica.
