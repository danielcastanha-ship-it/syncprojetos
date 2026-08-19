"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Conexão direta e estável com o Supabase usando as chaves públicas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Credenciais inválidas. Verifique o e-mail e a senha recebidos.');
      setLoading(false);
    } else {
      // Login com sucesso, redireciona para a área de downloads do Cofre
      router.push('/cofre');
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 font-sans">
      
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-2xl">
        <div className="text-center mb-8">
          <a href="/" className="text-2xl font-black text-white tracking-wide">
            Sync <span className="text-[#fbbf24]">Projetos</span>
          </a>
          <h1 className="text-xl font-bold text-white mt-6">Acesso ao Cofre</h1>
          <p className="text-sm text-slate-400 mt-2">
            Insira as credenciais enviadas para o seu e-mail após a compra.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">E-mail Corporativo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#fbbf24] transition"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Senha de Acesso</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#fbbf24] transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm p-3 rounded text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#fbbf24] hover:bg-[#f59e0b] text-slate-950 font-bold text-lg py-3 rounded-lg transition duration-300 uppercase tracking-wide disabled:opacity-50"
          >
            {loading ? 'Autenticando...' : 'Entrar no Cofre'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500 border-t border-slate-800 pt-6">
          Esqueceu sua senha ou precisa de ajuda? <br/>
          <a href="#" className="text-[#fbbf24] hover:underline">Fale com o Suporte</a>
        </div>
      </div>
      
    </main>
  );
}