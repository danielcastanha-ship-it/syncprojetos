"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Conexão direta com o Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function CofrePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Trava de Segurança: Se não estiver logado, chuta para o login
        router.push('/login');
      } else {
        setUserEmail(session.user.email || 'Assinante');
        setLoading(false);
      }
    };
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-[#fbbf24] font-bold animate-pulse">Carregando o Cofre...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-300 font-sans pb-20">
      
      {/* HEADER DA ÁREA LOGADA */}
      <header className="border-b border-slate-800 bg-slate-900/50 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-xl font-black text-white tracking-wide">
            Sync <span className="text-[#fbbf24]">Projetos</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm text-slate-400 hidden sm:block">{userEmail}</span>
            <button 
              onClick={handleLogout}
              className="text-sm font-semibold text-slate-400 hover:text-white transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 mt-12">
        
        {/* SESSÃO 1: O AGENDAMENTO (EM DESTAQUE ABSOLUTO) */}
        <section className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-8 md:p-12 mb-16 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold text-white mb-4">
              Sua Mentoria Quinzenal
            </h1>
            <p className="text-lg text-slate-400">
              Não tome decisões críticas sozinho. Agende agora a sua sessão 1-on-1 com a nossa liderança sênior para destravar os gargalos técnicos e políticos dos seus projetos.
            </p>
          </div>
          <div className="shrink-0 w-full md:w-auto">
            <a 
              href="https://book.titan.email/syncprojetos/mentoria" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-center bg-[#fbbf24] hover:bg-[#f59e0b] text-slate-950 font-black text-lg py-4 px-8 rounded-xl transition duration-300 uppercase tracking-wide shadow-[0_0_20px_rgba(251,191,36,0.3)]"
            >
              🗓️ Agendar Sessão
            </a>
          </div>
        </section>

        {/* SESSÃO 2: OS ARTEFATOS (DOWNLOADS) */}
        <section>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Acervo de Governança</h2>
            <p className="text-slate-400 mt-1">Baixe, edite e aplique na sua operação hoje mesmo.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* CARD 1 */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-[#fbbf24] transition duration-300 group">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-lg font-bold text-white mb-2">Roadmap de Sistemas Críticos</h3>
              <p className="text-sm text-slate-400 mb-6 min-h-[60px]">
                Guia em fases para blindar o Go-Live e mapear processos sem falhas arquitetônicas.
              </p>
              <a href="#" className="text-[#fbbf24] font-semibold text-sm group-hover:underline">
                ↓ Baixar Arquivo (.zip)
              </a>
            </div>

            {/* CARD 2 */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-[#fbbf24] transition duration-300 group">
              <div className="text-3xl mb-4">🚨</div>
              <h3 className="text-lg font-bold text-white mb-2">Playbook de Triage (5 Dias)</h3>
              <p className="text-sm text-slate-400 mb-6 min-h-[60px]">
                O framework exato para auditar projetos em crise e identificar débitos técnicos.
              </p>
              <a href="#" className="text-[#fbbf24] font-semibold text-sm group-hover:underline">
                ↓ Baixar PPTX
              </a>
            </div>

            {/* CARD 3 */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-[#fbbf24] transition duration-300 group">
              <div className="text-3xl mb-4">📈</div>
              <h3 className="text-lg font-bold text-white mb-2">Dashboard Ágil Integrado</h3>
              <p className="text-sm text-slate-400 mb-6 min-h-[60px]">
                Métricas de lead time e throughput prontas para apresentação executiva.
              </p>
              <a href="#" className="text-[#fbbf24] font-semibold text-sm group-hover:underline">
                ↓ Baixar Excel / PBIX
              </a>
            </div>

            {/* CARD 4 */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-[#fbbf24] transition duration-300 group">
              <div className="text-3xl mb-4">📋</div>
              <h3 className="text-lg font-bold text-white mb-2">Matriz RACI e OKRs</h3>
              <p className="text-sm text-slate-400 mb-6 min-h-[60px]">
                Defina responsabilidades e metas claras para o Steering Committee.
              </p>
              <a href="#" className="text-[#fbbf24] font-semibold text-sm group-hover:underline">
                ↓ Baixar Word
              </a>
            </div>

          </div>
        </section>

        {/* SESSÃO 3: OFFBOARDING (CANCELAMENTO) */}
        <section className="mt-20 border-t border-slate-800 pt-8 flex justify-center">
          <p className="text-xs text-slate-600">
            Deseja gerenciar sua assinatura ou interromper a renovação mensal?{' '}
            {/* O link abaixo pode ser apontado para o Portal do Cliente do Asaas no futuro */}
            <a href="mailto:contato@syncprojetos.com?subject=Solicitação%20de%20Cancelamento" className="text-slate-500 hover:text-slate-300 underline">
              Solicitar cancelamento via Suporte
            </a>
          </p>
        </section>

      </div>
    </main>
  );
}