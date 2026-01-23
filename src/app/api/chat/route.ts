import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { message, userId } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Verificar autenticação e buscar dados do usuário se logado
    let userContext = '';
    let userData = null;

    if (userId) {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && user.id === userId) {
        // Buscar perfil
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        // Buscar pedidos
        const { data: orders } = await supabase
          .from('orders')
          .select('*, order_items(quantity, price, products(name))')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        userData = {
          name: profile?.full_name || user.email,
          email: user.email,
          role: profile?.role || 'customer',
          ordersCount: orders?.length || 0,
          recentOrders: orders?.map((o: any) => ({
            id: o.id,
            total: o.total_amount,
            status: o.status,
            date: o.created_at,
            items: o.order_items?.length || 0
          })) || []
        };

        userContext = `O usuário está logado como ${userData.name} (${userData.email}), com role ${userData.role}. 
        Total de pedidos: ${userData.ordersCount}. 
        Pedidos recentes: ${JSON.stringify(userData.recentOrders)}.
        Você pode fornecer informações sobre a conta, pedidos, histórico de compras, etc.`;
      }
    } else {
      userContext = `O usuário NÃO está logado. Você deve fornecer informações sobre produtos, categorias, preços, especificações de pneus, etc. 
      Não mencione informações pessoais ou de conta.`;
    }

    // Buscar produtos para contexto (se não logado)
    let productsContext = '';
    if (!userId) {
      const supabase = await createServerSupabaseClient();
      const { data: products } = await supabase
        .from('products')
        .select('name, category, base_price, specs')
        .eq('is_active', true)
        .limit(10);

      if (products && products.length > 0) {
        productsContext = `Produtos disponíveis: ${products.map((p: any) => 
          `${p.name} (${p.category}) - €${p.base_price}`
        ).join(', ')}`;
      }
    }

    // Preparar mensagem para ChatGPT
    const systemPrompt = `Você é um assistente virtual da MecaniDoc, uma loja online especializada em pneus.
    
${userContext}

${productsContext}

Você deve:
- Ser amigável e profissional
- Responder em francês
- Se o usuário estiver logado, fornecer informações sobre sua conta e pedidos
- Se não estiver logado, ajudar com informações sobre produtos, categorias, preços
- Não inventar informações que não foram fornecidas
- Se não souber algo, sugerir que o usuário entre em contato com o suporte`;

    // Chamar API do OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured',
        message: 'Desculpe, o serviço de chat está temporariamente indisponível. Por favor, entre em contato conosco através do email de suporte.'
      }, { status: 500 });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      return NextResponse.json({ 
        error: 'Failed to get response from AI',
        message: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.'
      }, { status: 500 });
    }

    const data = await response.json();
    const aiMessage = data.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.';

    return NextResponse.json({ 
      message: aiMessage,
      userData: userData || null
    });

  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: 'Desculpe, ocorreu um erro. Por favor, tente novamente mais tarde.'
    }, { status: 500 });
  }
}
