// app/ricefw/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabaseClient';

interface RicefwItem {
  id: string;
  item_code: string;
  category: string;
  description: string;
  developer_assigned: string | null;
  status: string;
  complexity: string;
  estimated_hours: number;
}

export default function RicefwMatrix() {
  const router = useRouter();
  const [items, setItems] = useState<RicefwItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRicefwData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }

      // Busca o projeto vinculado ao usuário logado
      const { data: profile } = await supabase
        .from('profiles')
        .select('project_id, role')
        .eq('id', user.id)
        .single();

      if (profile?.project_id) {
        // Busca os itens do backlog filtrados automaticamente pela RLS do Supabase
        const { data: ricefwData, error } = await supabase
          .from('ricefw_items')
          .select('*')
          .eq('project_id', profile.project_id)
          .order('item_code', { ascending: true });

        if (!error && ricefwData) {
          setItems(ricefwData);
        }
      }
      setLoading(false);
    }

    fetchRicefwData();
  }, [router]);

  // Função auxiliar para cores de status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Concluído': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Homologação': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Em Desenvolvimento': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20'; // Backlog
    }
  };

  // Função auxiliar para cores de complexidade
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Alta': return 'text-red-400';
      case 'Média': return 'text-amber-400';
      default: return 'text-emerald-400'; // Baixa
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-[#fbbf24] border-t-transparent rounded-full animate-spin"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f172a] font-sans text-white p-8">
      
      {/* Cabeçalho */}
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-8 border-b border-slate-700 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            Matriz <span className="text-[#fbbf24]">RICEFW</span>
          </h1>
          <p className="text-slate-400 mt-1">Gestão de Gaps e Backlog Técnico (Modo Leitura)</p>
        </div>
        <button 
          onClick={() => router.push('/dashboard')} 
          className="px-4 py-2 bg-[#1e293b] hover:bg-slate-700 rounded-lg text-sm transition-colors border border-slate-600 flex items-center gap-2"
        >
          ← Voltar ao Dashboard
        </button>
      </header>

      {/* Tabela de Dados */}
      <div className="max-w-7xl mx-auto bg-[#1e293b] rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0f172a] border-b border-slate-700 text-xs uppercase tracking-wider text-slate-400">
                <th className="p-5 font-semibold">Código</th>
                <th className="p-5 font-semibold">Categoria</th>
                <th className="p-5 font-semibold">Descrição do Escopo</th>
                <th className="p-5 font-semibold">Desenvolvedor Alocado</th>
                <th className="p-5 font-semibold">Complexidade</th>
                <th className="p-5 font-semibold">Esforço (h)</th>
                <th className="p-5 font-semibold">Status Atual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Nenhum item mapeado no backlog deste projeto.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/50 transition-colors group">
                    <td className="p-5 font-mono text-sm font-semibold text-slate-300">
                      {item.item_code}
                    </td>
                    <td className="p-5 text-sm">
                      <span className="bg-slate-800 border border-slate-600 px-2 py-1 rounded text-xs text-slate-300">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-5 text-sm text-slate-300 max-w-xs truncate" title={item.description}>
                      {item.description}
                    </td>
                    <td className="p-5 text-sm text-slate-400">
                      {item.developer_assigned || <span className="italic text-slate-600">A definir</span>}
                    </td>
                    <td className={`p-5 text-sm font-medium ${getComplexityColor(item.complexity)}`}>
                      {item.complexity}
                    </td>
                    <td className="p-5 text-sm text-slate-300 font-mono">
                      {item.estimated_hours}h
                    </td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}