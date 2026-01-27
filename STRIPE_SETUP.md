# Configuração do Stripe - MecaniDoc

## Instalação

1. Instale as dependências do Stripe:
```bash
npm install stripe @stripe/stripe-js
```

## Configuração das Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Supabase Service Role (necessário para webhooks)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Obter as Chaves do Stripe

1. Acesse o [Dashboard do Stripe](https://dashboard.stripe.com/)
2. Vá em **Developers** > **API keys**
3. Copie a **Secret key** (começa com `sk_test_` para teste ou `sk_live_` para produção)
4. Copie a **Publishable key** (começa com `pk_test_` para teste ou `pk_live_` para produção)

## Configurar Webhook

1. No Dashboard do Stripe, vá em **Developers** > **Webhooks**
2. Clique em **Add endpoint**
3. URL do endpoint: `https://seu-dominio.com/api/stripe/webhook`
4. Selecione os eventos:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copie o **Signing secret** (começa com `whsec_`) e adicione ao `.env` como `STRIPE_WEBHOOK_SECRET`

## Executar Script SQL

Execute o script `add_stripe_fields.sql` no Supabase para adicionar os campos necessários na tabela `orders`:

```sql
-- Execute o arquivo add_stripe_fields.sql no Supabase SQL Editor
```

## Estrutura da Integração

### API Routes Criadas

1. **`/api/stripe/create-payment-intent`** - Cria um PaymentIntent do Stripe
2. **`/api/stripe/webhook`** - Processa eventos do Stripe (webhooks)
3. **`/api/sales`** - Consulta vendas (apenas para usuários master)

### Páginas Criadas

1. **`/dashboard/admin/sales`** - Página de consulta de vendas

### Componentes Atualizados

1. **`src/app/checkout/page.tsx`** - Integrado com Stripe PaymentIntent

## Fluxo de Pagamento

1. Cliente preenche o formulário de checkout
2. Sistema cria um pedido (`orders`) com status `pending`
3. Sistema cria um PaymentIntent no Stripe
4. Cliente é redirecionado para pagamento (ou usa Stripe Elements inline)
5. Após pagamento bem-sucedido, webhook atualiza o pedido para `paid`
6. Cliente recebe confirmação

## Próximos Passos (Opcional)

Para uma experiência completa, considere implementar:

1. **Stripe Elements** - Formulário de pagamento inline no checkout
2. **Stripe Checkout** - Página de pagamento hospedada pelo Stripe
3. **Notificações por email** - Enviar confirmação após pagamento
4. **Reembolsos** - Interface para processar reembolsos

## Teste

Use os cartões de teste do Stripe:
- **Sucesso**: `4242 4242 4242 4242`
- **Falha**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Qualquer data futura para expiração e qualquer CVC de 3 dígitos.
