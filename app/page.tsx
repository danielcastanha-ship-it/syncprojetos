"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../utils/supabaseClient';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Chamada oficial para o banco de dados do Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("ERRO REAL DO SUPABASE:", error.message);
      setError(`Erro técnico: ${error.message}`);
    } else if (data.user) {
      
      // Inteligência de Roteamento (Smart Redirect)
      const params = new URLSearchParams(window.location.search);
      const redirectRoute = params.get('redirect');

      if (redirectRoute) {
        // O usuário veio do e-mail de compra do Asaas
        router.push(redirectRoute);
      } else {
        // Login orgânico, vai para o painel principal
        router.push('/dashboard');
      }
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 font-sans">
      
      {/* Container Principal */}
      <div className="w-full max-w-md bg-[#1e293b] rounded-2xl shadow-2xl p-10 border border-[#334155]">
        
        {/* Logotipo Tipográfico */}
        <div className="flex justify-center items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-[#fbbf24] rounded-lg flex items-center justify-center">
            {/* Ícone de Cofre Simplificado */}
            <div className="w-4 h-4 bg-[#0f172a] rounded-full border-4 border-[#0f172a]"></div>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            Sync <span className="text-[#fbbf24] font-medium text-3xl">Projetos</span>
          </h1>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-white">Portal de Governança</h2>
          <p className="text-slate-400 text-sm mt-2">Acesso restrito para Sponsors e C-Level</p>
        </div>

        {/* Formulário de Login */}
        <form onSubmit={handleLogin} className="space-y-6">
          
          {/* Alerta de Erro */}
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-lg text-sm text-center">
              {error}
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

          <div className="relative">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-slate-300">Senha de Auditoria</label>
              <button 
                type="button" 
                onClick={() => router.push('/recuperar-senha')}
                className="text-xs text-[#fbbf24] hover:text-[#f59e0b] font-medium transition-colors"
              >
                Esqueceu a senha?
              </button>
            </div>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-[#0f172a] border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#fbbf24] focus:border-transparent transition"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f172a] font-bold py-3 px-4 rounded-lg transition duration-200 ease-in-out transform hover:-translate-y-1 shadow-lg disabled:opacity-50 disabled:hover:-translate-y-0"
          >
            {loading ? 'Autenticando...' : 'Acessar Cofre Digital'}
          </button>
        </form>

        {/* Separador e SSO (Mock) */}
        <div className="mt-8 pt-6 border-t border-slate-700">
          <button 
            type="button"
            className="w-full bg-transparent border border-slate-500 hover:bg-slate-800 text-white font-medium py-3 px-4 rounded-lg transition duration-200"
          >
            Entrar com Microsoft 365
          </button>
        </div>
      </div>

      {/* Rodapé de Blindagem */}
      <div className="mt-12 text-center">
        <p className="text-xs text-slate-500">
          Sync Projetos - Cofre de Governança Digital<br/>
          Ambiente Criptografado e Auditável.
        </p>
      </div>

    </main>
  );
}