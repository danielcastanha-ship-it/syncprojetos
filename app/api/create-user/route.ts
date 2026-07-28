// app/api/create-user/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

export async function POST(request: Request) {
  try {
    const { email, password, fullName, clientId } = await request.json();

    if (!email || !fullName || !clientId) {
      return NextResponse.json({ error: 'Dados incompletos para o provisionamento.' }, { status: 400 });
    }

    const safeEmail = email.toLowerCase().trim();

    // 1. Verifica se já existe um perfil amarrado a este client_id no banco
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('client_id', clientId)
      .single();

    let userId = existingProfile?.id;

    if (userId) {
      // 2A. SE JÁ EXISTE: Atualiza o nome no Profile e (se fornecida senha nova) atualiza no Auth
      const updateData: any = { full_name: fullName };
      
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (profileError) {
        return NextResponse.json({ error: 'Erro ao atualizar o perfil: ' + profileError.message }, { status: 400 });
      }

      // Se houver uma nova senha ou e-mail enviados na edição, atualiza no Admin Auth também
      const authUpdates: any = { email: safeEmail };
      if (password && password.trim() !== '') {
        authUpdates.password = password;
      }

      await supabaseAdmin.auth.admin.updateUserById(userId, authUpdates);

      return NextResponse.json({ success: true, userId, message: 'Perfil atualizado com sucesso.' });

    } else {
      // 2B. SE NÃO EXISTE: Cria o usuário do zero (Fluxo original)
      if (!password) {
        return NextResponse.json({ error: 'Senha provisória é obrigatória para novos usuários.' }, { status: 400 });
      }

      const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: safeEmail,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      });

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 400 });
      }

      userId = userData.user.id;

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          role: 'SPONSOR',
          full_name: fullName,
          client_id: clientId,
          must_change_password: true
        });

      if (profileError) {
        return NextResponse.json({ error: 'Usuário criado, mas erro ao associar o perfil: ' + profileError.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, userId, message: 'Novo usuário criado com sucesso.' });
    }

  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno no servidor: ' + err.message }, { status: 500 });
  }
}