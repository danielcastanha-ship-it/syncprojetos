import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    // 1. Barreira de Segurança (Validação do Token do Asaas)
    const asaasToken = request.headers.get('asaas-access-token');
    if (asaasToken !== process.env.ASAAS_WEBHOOK_TOKEN) {
      console.warn('Tentativa de acesso não autorizado ao Webhook.');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { event, payment } = body;

    // 2. Filtro de Eventos
    if (event !== 'PAYMENT_RECEIVED' && event !== 'PAYMENT_CONFIRMED') {
      return NextResponse.json({ message: 'Evento ignorado. Não é aprovação de pagamento.' }, { status: 200 });
    }

    // 3. Extração do ID do Cliente e Busca dos Dados no Asaas (Apontando para o Sandbox)
    const asaasCustomerId = payment.customer;

    if (!asaasCustomerId) {
      throw new Error('ID do cliente não encontrado no payload do webhook.');
    }

    // ATENÇÃO: Forçando URL do Sandbox para homologação no Netlify. 
    // Lembre-se de mudar para 'https://api.asaas.com/v3' quando for lançar o sistema oficialmente.
    const asaasApiUrl = 'https://api.asaas.com/v3';

    const asaasCustomerResponse = await fetch(`${asaasApiUrl}/customers/${asaasCustomerId}`, {
      method: 'GET',
      headers: {
        'access_token': process.env.ASAAS_API_KEY!,
        'User-Agent': 'SyncProjetos-Webhook/1.0'
      }
    });

    if (!asaasCustomerResponse.ok) {
      throw new Error(`Falha ao buscar dados do cliente no Asaas: ${asaasCustomerResponse.statusText}`);
    }

    const customerData = await asaasCustomerResponse.json();
    const customerEmail = customerData.email || 'contato@cliente.com';
    const customerName = customerData.name || 'Novo Cliente Sync';
    const tempPassword = Math.random().toString(36).slice(-8) + "Sy@nc!";

    // 4. Inicialização sob demanda dos Clientes (Bypass)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const resend = new Resend(process.env.RESEND_API_KEY!);

    // 5. Provisionamento Administrativo no Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: customerEmail,
      password: tempPassword,
      email_confirm: true,
    });

    if (authError) throw new Error(`Falha ao criar usuário no Auth: ${authError.message}`);

    const { error: dbError } = await supabaseAdmin.from('clients').insert([{
      name: customerName,
      contact_name: customerName,
      contact_email: customerEmail
    }]);

    if (dbError) throw new Error(`Falha ao inserir na tabela clients: ${dbError.message}`);

    // 6. Disparo do E-mail Transacional
    const { error: emailError } = await resend.emails.send({
      from: 'Cofre da Sync Projetos <contato@syncprojetos.com>',
      to: customerEmail,
      subject: '🚀 [Sync Projetos] Seu acesso ao Cofre + Mentoria já foi liberado!]',
      html: `
        <div style="font-family: sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #fbbf24;">Olá, ${customerName}!</h2>
          <p>O seu pagamento foi confirmado e o seu acesso ao <b>Cofre da Sync + Mentoria</b> está oficialmente liberado. A partir de agora, você não precisa mais começar matrizes complexas do zero.</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Aqui estão suas credenciais de acesso único:</strong></p>
            <p style="margin: 0 0 10px 0;"><strong> Página de Login:</strong> <a href="https://syncprojetossaas.netlify.app/?redirect=/login" style="color: #2563eb; font-weight: bold;">https://syncprojetos.com</a></p>
            <p style="margin: 0 0 5px 0;"><strong>Usuário:</strong> ${customerEmail}</p>
            <p style="margin: 0 0 0 0;"><strong>Senha Provisória:</strong> <span style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${tempPassword}</span></p>
          </div>
          <p style="font-size: 12px; color: #64748b;"><em>Recomendamos que você acesse a plataforma e baixe os artefatos iniciais antes da nossa primeira mentoria quinzenal.</em></p>
          <p style="font-size: 12px; color: #64748b;"><em>Nos vemos nas trincheiras,.</em></p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 14px; font-weight: bold;">Equipe Sync Projetos</p>
        </div>
      `
    });

    if (emailError) throw new Error(`Falha no envio de e-mail: ${emailError.message}`);

    return NextResponse.json({ success: true, message: 'Onboarding finalizado com sucesso.' }, { status: 200 });

  } catch (error: any) {
    console.error('CRÍTICO - Falha no Webhook Asaas:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}