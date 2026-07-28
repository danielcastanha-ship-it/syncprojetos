// app/sync-hq/relatorio/page.tsx
"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../utils/supabaseClient';

interface Project {
  id: string; name: string; status: string; budget_baseline: number; budget_consumed: number;
  original_baseline: number; objective?: string; in_scope?: string; out_scope?: string;
  clients?: { name: string; contact_name: string; contact_email: string };
}
interface Milestone { id: string; title: string; due_date?: string; status: string; progress: number; }
interface Risk { id: string; title: string; probability: string; impact: string; mitigation_plan?: string; status: string; }
interface ChangeRequest { id: string; cr_number: string; title: string; financial_impact: number; status: string; }

function RelatorioExecutivoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);

  useEffect(() => {
    if (!projectId) { router.push('/sync-hq'); return; }

    async function fetchReportData() {
      const { data: projData } = await supabase.from('projects')
        .select('*, clients(name, contact_name, contact_email)')
        .eq('id', projectId)
        .single();
      if (projData) setProject(projData);

      const { data: msData } = await supabase.from('project_milestones').select('*').eq('project_id', projectId).order('order_index');
      if (msData) setMilestones(msData);

      const { data: riskData } = await supabase.from('project_risks').select('*').eq('project_id', projectId).order('order_index');
      if (riskData) setRisks(riskData);

      const { data: crData } = await supabase.from('change_requests').select('*').eq('project_id', projectId).order('created_at');
      if (crData) setChangeRequests(crData);

      setLoading(false);
    }
    fetchReportData();
  }, [projectId, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-[#fbbf24] border-t-transparent rounded-full animate-spin"></div>
      </main>
    );
  }

  if (!project) return null;

  const percentualConsumido = project.budget_baseline > 0 ? (project.budget_consumed / project.budget_baseline) * 100 : 0;
  const progressoFisico = milestones.length > 0 ? Math.round(milestones.reduce((acc, m) => acc + (m.progress || 0), 0) / milestones.length) : 0;
  const riscosAbertos = risks.filter(r => r.status === 'Aberto').length;

  let ragStatus = 'VERDE';
  if (percentualConsumido >= 95 || riscosAbertos >= 4) ragStatus = 'VERMELHO';
  else if (percentualConsumido >= 80 || riscosAbertos >= 2) ragStatus = 'AMARELO';

  const ragColors: any = {
    VERDE: 'bg-emerald-500 text-slate-950',
    AMARELO: 'bg-amber-500 text-slate-950',
    VERMELHO: 'bg-red-500 text-white'
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans p-8 print:p-0 print:bg-white print:text-black">
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <button onClick={() => router.push('/sync-hq')} className="text-sm font-bold text-slate-400 hover:text-white transition">
          ← Voltar ao Sync HQ
        </button>
        <button 
          onClick={() => window.print()} 
          className="bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f172a] font-extrabold px-6 py-3 rounded-xl shadow-lg transition flex items-center gap-2"
        >
          🖨️ Imprimir / Salvar Relatório em PDF
        </button>
      </div>

      <div className="max-w-4xl mx-auto bg-[#1e293b] print:bg-white border border-slate-700 print:border-none rounded-2xl print:rounded-none p-10 shadow-2xl space-y-8">
        
        <div className="border-b border-slate-700 print:border-slate-300 pb-6 flex justify-between items-start">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-[#fbbf24] print:text-slate-600 mb-1">Sync Projetos | Relatório Executivo de Status (Status Report)</div>
            <h1 className="text-3xl font-black text-white print:text-slate-900">{project.name}</h1>
            <p className="text-sm text-slate-400 print:text-slate-600 mt-1">Cliente: <strong className="text-slate-200 print:text-slate-800">{project.clients?.name}</strong> | Sponsor: {project.clients?.contact_name}</p>
          </div>
          <div className="text-right">
            <span className={`px-4 py-2 rounded-xl font-black text-sm tracking-wider uppercase inline-block shadow-md ${ragColors[ragStatus]}`}>
              Status RAG: {ragStatus}
            </span>
            <p className="text-[11px] text-slate-400 print:text-slate-500 mt-2">Data de Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="bg-[#0f172a] print:bg-slate-100 p-5 rounded-xl border border-slate-700 print:border-slate-300">
            <span className="block text-[10px] text-slate-400 print:text-slate-600 uppercase font-bold mb-1">Fase Executada</span>
            <span className="text-xl font-extrabold text-white print:text-slate-900">{project.status}</span>
          </div>
          <div className="bg-[#0f172a] print:bg-slate-100 p-5 rounded-xl border border-slate-700 print:border-slate-300">
            <span className="block text-[10px] text-slate-400 print:text-slate-600 uppercase font-bold mb-1">Orçamento Consumido</span>
            <span className="text-xl font-extrabold text-[#fbbf24] print:text-slate-900 font-mono">{Math.round(percentualConsumido)}%</span>
            <span className="text-[11px] text-slate-400 print:text-slate-500 block">({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(project.budget_consumed)})</span>
          </div>
          <div className="bg-[#0f172a] print:bg-slate-100 p-5 rounded-xl border border-slate-700 print:border-slate-300">
            <span className="block text-[10px] text-slate-400 print:text-slate-600 uppercase font-bold mb-1">Progresso Físico Global</span>
            <span className="text-xl font-extrabold text-emerald-400 print:text-slate-900 font-mono">{progressoFisico}%</span>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#fbbf24] print:text-slate-800 border-b border-slate-700 print:border-slate-200 pb-1">1. Alinhamento de Escopo & Baseline</h2>
          {project.objective && <p className="text-sm text-slate-300 print:text-slate-700 leading-relaxed"><strong>Objetivo:</strong> {project.objective}</p>}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-emerald-950/20 print:bg-emerald-50 p-4 rounded-xl border border-emerald-500/30">
              <span className="text-[10px] uppercase font-bold text-emerald-400 print:text-emerald-800 block mb-1">✓ Dentro do Escopo</span>
              <p className="text-xs text-slate-300 print:text-slate-700 whitespace-pre-line leading-relaxed">{project.in_scope || 'Não informado.'}</p>
            </div>
            <div className="bg-red-950/20 print:bg-red-50 p-4 rounded-xl border border-red-500/30">
              <span className="text-[10px] uppercase font-bold text-red-400 print:text-red-800 block mb-1">✕ Fora do Escopo</span>
              <p className="text-xs text-slate-300 print:text-slate-700 whitespace-pre-line leading-relaxed">{project.out_scope || 'Nenhum limite restrito.'}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#fbbf24] print:text-slate-800 border-b border-slate-700 print:border-slate-200 pb-1">2. Cronograma Macro de Entregas (Milestones)</h2>
          {milestones.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Nenhum marco cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {milestones.map(m => (
                <div key={m.id} className="bg-[#0f172a] print:bg-slate-50 p-3 rounded-xl border border-slate-700 print:border-slate-200 flex justify-between items-center text-xs">
                  <div>
                    <strong className="text-white print:text-slate-900">{m.title}</strong>
                    {m.due_date && <span className="text-slate-400 print:text-slate-600 ml-2 font-mono">(Previsão: {m.due_date})</span>}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-emerald-400 print:text-slate-800">{m.progress}%</span>
                    <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-slate-800 print:bg-slate-200 text-slate-300 print:text-slate-800">{m.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#fbbf24] print:text-slate-800 border-b border-slate-700 print:border-slate-200 pb-1">3. Principais Riscos & Impedimentos</h2>
          {risks.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Nenhum risco aberto no momento.</p>
          ) : (
            <div className="space-y-2">
              {risks.map(r => (
                <div key={r.id} className="bg-[#0f172a] print:bg-slate-50 p-3 rounded-xl border border-slate-700 print:border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-white print:text-slate-900">
                    <span>{r.title}</span>
                    <span className="text-amber-400 print:text-slate-700 uppercase">{r.status} (Prob: {r.probability} | Imp: {r.impact})</span>
                  </div>
                  {r.mitigation_plan && <p className="text-slate-400 print:text-slate-600"><strong>Mitigação:</strong> {r.mitigation_plan}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {changeRequests.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#fbbf24] print:text-slate-800 border-b border-slate-700 print:border-slate-200 pb-1">4. Aditivos de Escopo (Change Requests)</h2>
            <div className="space-y-2">
              {changeRequests.map(cr => (
                <div key={cr.id} className="bg-[#0f172a] print:bg-slate-50 p-3 rounded-xl border border-slate-700 print:border-slate-200 flex justify-between items-center text-xs">
                  <div>
                    <strong className="text-[#fbbf24] print:text-slate-900">{cr.cr_number}:</strong> <span className="text-white print:text-slate-800">{cr.title}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-emerald-400 print:text-slate-800 font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cr.financial_impact)}</span>
                    <span className="px-2 py-0.5 rounded uppercase text-[10px] bg-slate-800 print:bg-slate-200 text-slate-300 print:text-slate-800 font-bold">{cr.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-slate-700 print:border-slate-300 pt-6 text-center text-xs text-slate-500 print:text-slate-500">
          Sync Projetos — Sistema de Governança Corporativa e PMO de Alta Performance.
        </div>

      </div>
    </main>
  );
}

export default function RelatorioExecutivo() {
  return <Suspense fallback={<div className="bg-[#0f172a] min-h-screen"></div>}><RelatorioExecutivoContent /></Suspense>;
}