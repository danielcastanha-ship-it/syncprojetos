// app/recuperar-senha/page.tsx
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabaseClient';

export default function RecuperarSenhaScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    // O Supabase cuida do envio do e-mail com o link de recuperação seguro
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/atualizar-senha`,
    });

    if (error) {
      setError('Não foi possível processar a solicitação. Verifique o e-mail e tente novamente.');
    } else {
      setMessage('Instruções de segurança enviadas! Verifique a caixa de entrada do seu e-mail corporativo.');
    }
    
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 font-sans">
      
      {/* Container Principal */}
      <div className="w-full max-w-md bg-[#1e293b] rounded-2xl shadow-2xl p-10 border border-[#334155]">
        
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#fbbf24] rounded-lg flex items-center justify-center">
              {/* Ícone de Cadeado/Segurança */}
              <svg className="w-5 h-5 text-[#0f172a]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Recuperação de Acesso</h2>
          <p className="text-slate-400 text-sm mt-2">
            Insira seu e-mail corporativo para receber o link seguro de redefinição de senha do Cofre.
          </p>
        </div>

        {/* Formulário de Recuperação */}
        <form onSubmit={handleResetPassword} className="space-y-6">
          
          {/* Alertas de Feedback */}
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-emerald-900/50 border border-emerald-500 text-emerald-200 p-3 rounded-lg text-sm text-center">
              {message}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">E-mail Corporativo</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="diretor@cliente.com.br"
              className="w-full px-4 py-3 bg-[#0f172a] border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#fbbf24] focus:border-transparent transition"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f172a] font-bold py-3 px-4 rounded-lg transition duration-200 ease-in-out transform hover:-translate-y-1 shadow-lg disabled:opacity-50 disabled:hover:-translate-y-0"
          >
            {loading ? 'Processando...' : 'Enviar Link de Recuperação'}
          </button>
        </form>

        {/* Botão de Retorno */}
        <div className="mt-8 pt-6 border-t border-slate-700 text-center">
          <button 
            type="button"
            onClick={() => router.push('/')}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            ← Voltar para a tela de Login
          </button>
        </div>
      </div>

    </main>
  );
}