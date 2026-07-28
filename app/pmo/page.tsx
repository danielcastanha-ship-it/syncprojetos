// app/pmo/page.tsx
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabaseClient';

interface GateInput {
  phase_number: number;
  document_title: string;
  description: string;
}

export default function PainelPMO() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Campos do Projeto
  const [projectName, setProjectName] = useState('');
  const [budgetBaseline, setBudgetBaseline] = useState('');
  
  // Campos dos 5 Portões de Governança (Tollgates) pré-preenchidos com padrão de mercado
  const [gates, setGates] = useState<GateInput[]>([
    { phase_number: 1, document_title: 'Termo de Abertura (Project Charter)', description: 'Formalização do escopo macro, objetivos e orçamento inicial.' },
    { phase_number: 2, document_title: 'Business Blueprint (BBP)', description: 'Mapeamento de processos As-Is / To-Be e congelamento de escopo.' },
    { phase_number: 3, document_title: 'Matriz de Homologação (UAT)', description: 'Testes funcionais e aceitação técnica do desenvolvimento.' },
    { phase_number: 4, document_title: 'Plano de Cutover e Go-Live', description: 'Estratégia de virada de chave e migração de dados.' },
    { phase_number: 5, document_title: 'Termo de Encerramento (Handover)', description: 'Entrega definitiva e transição para o suporte.' },
  ]);

  const handleGateChange = (index: number, field: 'document_title' | 'description', value: string) => {
    const newGates = [...gates];
    newGates[index][field] = value;
    setGates(newGates);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName || !budgetBaseline) {
      alert('Preencha o nome do projeto e o orçamento baseline.');
      return;
    }

    setLoading(true);

    try {
      // 1. Insere o novo projeto na tabela projects
      const { data: projData, error: projError } = await supabase
        .from('projects')
        .insert({
          name: projectName,
          status: 'Fase 1',
          budget_baseline: parseFloat(budgetBaseline),
          budget_consumed: 0.00
        })
        .select('id')
        .single();

      if (projError) throw new Error(`Erro na tabela projects: ${projError.message}`);
      if (!projData) throw new Error('Nenhum dado retornado ao criar o projeto.');

      const newProjectId = projData.id;

      // 2. Insere os 5 portões de governança vinculados ao novo projeto
      const gatesToInsert = gates.map(g => ({
        project_id: newProjectId,
        phase_number: g.phase_number,
        document_title: g.document_title,
        description: g.description,
        status: 'Pendente',
        action_route: g.phase_number === 3 ? '/ricefw' : '/assinaturas'
      }));

      const { error: gatesError } = await supabase
        .from('phase_gates')
        .insert(gatesToInsert);

      if (gatesError) throw new Error(`Erro na tabela phase_gates: ${gatesError.message}`);

      alert(`Sucesso! Projeto "${projectName}" e seus portões de governança foram criados com sucesso.`);
      router.push('/dashboard');

    } catch (error: any) {
      console.error('Erro detalhado no cadastro PMO:', error);
      alert(`Erro ao registrar o projeto no Cofre: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0f172a] font-sans text-white p-8">
      
      {/* Cabeçalho */}
      <header className="max-w-4xl mx-auto flex justify-between items-center mb-10 border-b border-slate-700 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Painel do <span className="text-[#fbbf24]">PMO</span>
          </h1>
          <p className="text-slate-400 mt-1">Central de Provisionamento de Projetos e Governança</p>
        </div>
        <button 
          onClick={() => router.push('/dashboard')} 
          className="px-4 py-2 bg-[#1e293b] hover:bg-slate-700 rounded-lg text-sm transition-colors border border-slate-600"
        >
          ← Voltar ao Dashboard
        </button>
      </header>

      {/* Formulário Principal */}
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
        
        {/* Bloco 1: Informações Gerais do Projeto */}
        <section className="bg-[#1e293b] rounded-2xl p-8 border border-slate-700 shadow-xl space-y-6">
          <h2 className="text-xl font-bold text-[#fbbf24] border-b border-slate-700 pb-3">
            1. Dados Gerais do Cliente / Contrato
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">
                Nome do Projeto / Cliente
              </label>
              <input 
                type="text"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Ex: Banco Alpha - Core Bancário"
                className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-[#fbbf24]/50 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">
                Orçamento Baseline (R$)
              </label>
              <input 
                type="number"
                step="0.01"
                required
                value={budgetBaseline}
                onChange={(e) => setBudgetBaseline(e.target.value)}
                placeholder="Ex: 1500000.00"
                className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-[#fbbf24]/50 text-sm font-mono"
              />
            </div>
          </div>
        </section>

        {/* Bloco 2: Personalização dos Portões (Tollgates) */}
        <section className="bg-[#1e293b] rounded-2xl p-8 border border-slate-700 shadow-xl space-y-6">
          <div>
            <h2 className="text-xl font-bold text-[#fbbf24] mb-1">
              2. Definição dos Artefatos por Fase (Tollgates)
            </h2>
            <p className="text-xs text-slate-400">
              Personalize os títulos e descrições dos documentos que o cliente precisará auditar e assinar em cada marco.
            </p>
          </div>

          <div className="space-y-6">
            {gates.map((gate, index) => (
              <div key={gate.phase_number} className="bg-[#0f172a] p-5 rounded-xl border border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs bg-[#fbbf24] text-[#0f172a] font-extrabold px-3 py-1 rounded">
                    Fase {gate.phase_number}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">ID do Marco: Fase-{gate.phase_number}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                      Título do Artefato
                    </label>
                    <input 
                      type="text"
                      required
                      value={gate.document_title}
                      onChange={(e) => handleGateChange(index, 'document_title', e.target.value)}
                      className="w-full bg-[#1e293b] border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#fbbf24]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                      Descrição / Diretriz Executiva
                    </label>
                    <input 
                      type="text"
                      required
                      value={gate.description}
                      onChange={(e) => handleGateChange(index, 'description', e.target.value)}
                      className="w-full bg-[#1e293b] border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#fbbf24]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Botão de Ação Final */}
        <div className="flex justify-end gap-4 pb-12">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-transparent border border-slate-600 hover:bg-slate-800 rounded-xl font-bold text-slate-300 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f172a] font-extrabold rounded-xl transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {loading ? 'Provisionando Cofre...' : 'Criar Projeto e Esteira de Governança'}
          </button>
        </div>

      </form>
    </main>
  );
}