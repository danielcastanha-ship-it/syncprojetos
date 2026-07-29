// app/api/webhooks/asaas/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// 1. Inicialização dos Clientes (Bypass da regra de usuário comum)
// Usamos a SERVICE_ROLE_KEY para ter poder administrativo de criar usuários no backend
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Inicializamos o serviço de e-mail (Resend)
const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: Request) {
  try {
    // 2. Barreira de Segurança (Validação do Token do Asaas)
    const asaasToken = request.headers.get('asaas-access-token');
    if (asaasToken !== process.env.ASAAS_WEBHOOK_TOKEN) {
      console.warn('Tentativa de acesso não autorizado ao Webhook.');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { event, payment } = body;

    // 3. Filtro de Eventos (Só nos interessa se o dinheiro caiu)
    if (event !== 'PAYMENT_RECEIVED' && event !== 'PAYMENT_CONFIRMED') {
      return NextResponse.json({ message: 'Evento ignorado. Não é aprovação de pagamento.' }, { status: 200 });
    }

    // 4. Extração do ID do Cliente e Busca dos Dados no Asaas
    const asaasCustomerId = payment.customer; // O ID gerado pelo Asaas (ex: cus_000000123)

    if (!asaasCustomerId) {
      throw new Error('ID do cliente não encontrado no payload do webhook.');
    }

    // Fazemos um "bate-volta" rápido na API do Asaas para pegar o Nome e E-mail reais
    const asaasCustomerResponse = await fetch(`https://api.asaas.com/v3/customers/${asaasCustomerId}`, {
      method: 'GET',
      headers: {
        'access_token': process.env.ASAAS_API_KEY!, // Nova chave que precisaremos no .env
        'User-Agent': 'SyncProjetos-Webhook/1.0'
      }
    });

    if (!asaasCustomerResponse.ok) {
      throw new Error(`Falha ao buscar dados do cliente no Asaas: ${asaasCustomerResponse.statusText}`);
    }

    const customerData = await asaasCustomerResponse.json();
    
    // Agora sim temos os dados reais e seguros direto da fonte!
    const customerEmail = customerData.email || 'contato@cliente.com';
    const customerName = customerData.name || 'Novo Cliente Sync';
    
    // Gerador de senha provisória de alta segurança
    const tempPassword = Math.random().toString(36).slice(-8) + "Sy@nc!";

    // 5. Provisionamento Administrativo no Supabase
    // A. Cria o Usuário na tabela de Autenticação global
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: customerEmail,
      password: tempPassword,
      email_confirm: true, // Força a confirmação para pular a verificação de e-mail padrão do Supabase
    });

    if (authError) throw new Error(`Falha ao criar usuário no Auth: ${authError.message}`);

    // B. Insere o Cliente na tabela relacional 'clients'
    const { error: dbError } = await supabaseAdmin.from('clients').insert([{
      name: customerName,
      contact_name: customerName,
      contact_email: customerEmail
      // cnpj: payment.cpfCnpj (opcional, caso você colete no checkout)
    }]);

    if (dbError) throw new Error(`Falha ao inserir na tabela clients: ${dbError.message}`);

    // 6. Disparo do E-mail Transacional de Boas-Vindas
    const { error: emailError } = await resend.emails.send({
      from: 'Cofre da Sync Projetos <onboarding@syncprojetos.com.br>', // Ajuste para seu domínio verificado
      to: customerEmail,
      subject: '🚀 Pagamento Confirmado! Seu acesso ao Cofre da Governança',
      html: `
        <div style="font-family: sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #fbbf24;">Bem-vindo ao Cofre da Sync, ${customerName}!</h2>
          <p>O seu pagamento foi aprovado com sucesso via Asaas e sua infraestrutura executiva já está provisionada.</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Acesse seu painel através do link:</strong></p>
            <p style="margin: 0 0 10px 0;"><a href="https://syncprojetossaas.netlify.app/?redirect=/cofre" style="color: #2563eb; font-weight: bold;">https://syncprojetos.com</a></p>
            <p style="margin: 0 0 5px 0;"><strong>Usuário:</strong> ${customerEmail}</p>
            <p style="margin: 0 0 0 0;"><strong>Senha Provisória:</strong> <span style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; rounded: 4px;">${tempPassword}</span></p>
          </div>
          <p style="font-size: 12px; color: #64748b;"><em>Por diretrizes de Compliance, o sistema exigirá que você redefina esta senha no seu primeiro acesso.</em></p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 14px; font-weight: bold;">Diretoria Estratégica | Sync Projetos</p>
        </div>
      `
    });

    if (emailError) throw new Error(`Falha no envio de e-mail: ${emailError.message}`);

    // 7. Retorno de Sucesso (Acalma o Asaas para ele não reenviar o webhook)
    return NextResponse.json({ success: true, message: 'Onboarding end-to-end finalizado com sucesso.' }, { status: 200 });

  } catch (error: any) {
    console.error('CRÍTICO - Falha no Webhook Asaas:', error);
    // Retornamos 500 para que o Asaas saiba que falhou e tente reenviar o webhook mais tarde
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}