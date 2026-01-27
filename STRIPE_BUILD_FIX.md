# Como fazer o build funcionar sem o Stripe instalado

O Next.js/Turbopack tenta resolver módulos durante o build, mesmo com importação dinâmica. Para fazer o build funcionar sem o Stripe instalado, você tem duas opções:

## Opção 1: Instalar o Stripe (Recomendado)

```bash
npm install stripe
```

Mesmo sem as chaves configuradas, o código funcionará e retornará erros apropriados quando o Stripe não estiver configurado.

## Opção 2: Comentar temporariamente as rotas de API

Se você não quiser instalar o Stripe agora, pode comentar temporariamente as rotas de API:

1. Renomeie a pasta `src/app/api/stripe` para `src/app/api/stripe.disabled`
2. Faça o build
3. Renomeie de volta quando quiser usar o Stripe

## Opção 3: Usar next.config.ts para ignorar

O arquivo `next.config.ts` já está configurado para tentar ignorar o Stripe durante o build, mas o Turbopack pode não respeitar isso completamente.

## Nota

O código está preparado para funcionar sem o Stripe configurado (retorna erros 503 apropriados), mas o pacote precisa estar instalado para o build não falhar.
