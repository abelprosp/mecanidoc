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
   - **`checkout.session.completed`** (obrigatório para Stripe Checkout)
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

### API Routes

1. **`/api/stripe/create-checkout-session`** — cria (ou reutiliza) Checkout Session embedded
2. **`/api/stripe/create-payment-intent`** — cria PaymentIntent (montant sempre lido do pedido na DB)
3. **`/api/stripe/verify-session`** — confirma o pagamento na página de sucesso (fallback se o webhook atrasar)
4. **`/api/stripe/webhook`** — processa eventos Stripe (assinatura + idempotência)
5. **`/api/sales`** — consulta vendas (apenas master)

### Páginas

1. **`/checkout`** — formulário + Stripe Embedded Checkout
2. **`/checkout/success`** — confirmação só após verificação Stripe
3. **`/dashboard/admin/sales`** — consulta de vendas

## Fluxo de Pagamento

1. Cliente preenche o formulário de checkout
2. Sistema cria um pedido (`orders`) com status `pending`
3. Sistema cria uma Checkout Session (montant do servidor) e grava `stripe_checkout_session_id`
4. Cliente paga no Embedded Checkout
5. Webhook `checkout.session.completed` (ou `verify-session`) marca o pedido como `paid` e dispara o fulfillment se aplicável
6. Página de sucesso só limpa o carrinho após confirmação

## Eventos de webhook recomendados

- `checkout.session.completed` (obrigatório)
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

## Melhorias recentes

- Montante nunca confiado ao cliente (sempre `orders.total_amount`)
- Idempotência de webhooks (`stripe_webhook_events`) e de criação de sessão/PI
- Verificação de `payment_status` / montante no webhook
- Página de sucesso com verificação real (não só URL)
- Reutilização de sessão/PI abertos; metadados no PaymentIntent
- Estados `canceled` / `partially_refunded`

## Próximos Passos (Opcional)

1. **Customer Portal** — gestão de meios de pagamento / faturas (se houver subscrições)
2. **Notificações por email** — confirmação após pagamento
3. **UI de reembolsos** no painel admin

## Testar localmente

1. **No `.env`**, use chaves de **teste** (`sk_test_...` e `pk_test_...`) e defina:
   ```env
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

2. **Terminal 1** – subir o app:
   ```bash
   npm run dev
   ```

3. **Terminal 2** – encaminhar webhooks do Stripe para o seu localhost (obrigatório para o pedido ser marcado como pago):
   - Instale o [Stripe CLI](https://stripe.com/docs/stripe-cli) e faça `stripe login` uma vez.
   - Depois execute:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   - O CLI vai mostrar um **Signing secret** (ex.: `whsec_...`). Copie e coloque no `.env` como `STRIPE_WEBHOOK_SECRET=` e reinicie o `npm run dev`.

4. Acesse **http://localhost:3000**, adicione um produto ao carrinho, faça o checkout (com login) e pague com um cartão de teste. Ao concluir, você deve ser redirecionado para `/checkout/success` e o webhook deve atualizar o pedido para "pago".

---

## Teste (cartões)

Use os cartões de teste do Stripe:
- **Sucesso**: `4242 4242 4242 4242`
- **Falha**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Qualquer data futura para expiração e qualquer CVC de 3 dígitos.
