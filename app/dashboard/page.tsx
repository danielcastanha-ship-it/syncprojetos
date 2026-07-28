// app/dashboard/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabaseClient';

interface ProjectData { 
  id: string; name: string; status: string; budget_baseline: number; budget_consumed: number; 
  objective?: string; in_scope?: string; out_scope?: string; original_baseline?: number;
}
interface PhaseGate { id: string; phase_number: number; document_title: string; description: string; status: string; }
interface Milestone { id: string; title: string; description?: string; due_date?: string; status: string; progress: number; }
interface Risk { id: string; title: string; description?: string; probability: string; impact: string; mitigation_plan?: string; status: string; }

export default function DashboardSponsor() {
  const router = useRouter();
  
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [sponsorName, setSponsorName] = useState('');

  const [projetos, setProjetos] = useState<ProjectData[]>([]);
  const [projetoAtual, setProjetoAtual] = useState<ProjectData | null>(null);
  const [gates, setGates] = useState<PhaseGate[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [modalGate, setModalGate] = useState<PhaseGate | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/'); return; }

      const { data: profileData } = await supabase.from('profiles').select('client_id, full_name, role, must_change_password').eq('id', user.id).single();

      if (profileData) {
        setSponsorName(profileData.full_name || 'Diretor');
        
        if (profileData.must_change_password) {
          setMustChangePassword(true);
          setLoading(false);
          return;
        }
        
        carregarProjetosAutorizados(profileData);
      }
    }
    fetchDashboardData();
  }, [router]);

  const carregarProjetosAutorizados = async (profileData: any) => {
    let query = supabase.from('projects').select('*').order('name');
    if (profileData.role === 'SPONSOR') {
      query = query.eq('client_id', profileData.client_id);
    }
    const { data: projectsData } = await query;

    if (projectsData && projectsData.length > 0) {
      setProjetos(projectsData);
      await carregarDadosDoProjeto(projectsData[0]);
    }
    setLoading(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { alert("As senhas digitadas não conferem."); return; }
    if (newPassword.length < 6) { alert("A nova senha deve ter no mínimo 6 caracteres."); return; }
    
    setIsChangingPassword(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    
    if (updateError) {
      alert("Erro ao alterar senha: " + updateError.message);
      setIsChangingPassword(false);
      return;
    }

    await supabase.rpc('confirm_password_changed');
    alert("Senha definida com sucesso! Acessando o Cofre...");
    setMustChangePassword(false);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      carregarProjetosAutorizados(prof);
    }
  };

  const carregarDadosDoProjeto = async (proj: ProjectData) => {
    setProjetoAtual(proj);
    
    const { data: gatesData } = await supabase.from('phase_gates').select('*').eq('project_id', proj.id).order('phase_number', { ascending: true });
    setGates(gatesData || []);

    const { data: msData } = await supabase.from('project_milestones').select('*').eq('project_id', proj.id).order('order_index', { ascending: true });
    setMilestones(msData || []);

    const { data: riskData } = await supabase.from('project_risks').select('*').eq('project_id', proj.id).order('order_index', { ascending: true });
    setRisks(riskData || []);
  };

  const handleMudarProjeto = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selecionado = projetos.find(p => p.id === e.target.value);
    if (selecionado) carregarDadosDoProjeto(selecionado);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-[#fbbf24] border-t-transparent rounded-full animate-spin"></div>
      </main>
    );
  }

  if (mustChangePassword) {
    return (
      <main className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <div className="bg-[#1e293b] p-10 rounded-2xl border border-[#fbbf24]/50 shadow-2xl max-w-md w-full relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-[#fbbf24]/10 rounded-bl-full"></div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-white mb-2">Bem-vindo, {sponsorName.split(' ')[0]}</h2>
            <p className="text-sm text-slate-400">Este é o seu primeiro acesso. Por medidas de <strong>Compliance e Segurança</strong>, defina sua senha definitiva.</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nova Senha</label>
              <input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#fbbf24]" placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Confirmar Nova Senha</label>
              <input required type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#fbbf24]" placeholder="Repita a senha" />
            </div>
            <button type="submit" disabled={isChangingPassword} className="w-full bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f172a] font-extrabold py-3.5 rounded-lg transition shadow-lg mt-4">
              {isChangingPassword ? 'Atualizando Criptografia...' : 'Salvar Senha e Acessar Cofre'}
            </button>
            <button type="button" onClick={handleLogout} className="w-full bg-transparent text-slate-500 hover:text-white py-2 text-sm font-semibold transition mt-2">
              Cancelar e Sair
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (!projetoAtual) {
    return (
      <main className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white">
        <p className="mb-4">A sua empresa ainda não possui projetos ativos alocados.</p>
        <button onClick={handleLogout} className="px-4 py-2 border border-slate-600 rounded-lg">Sair</button>
      </main>
    );
  }

  const percentualConsumido = (projetoAtual.budget_baseline > 0) ? (projetoAtual.budget_consumed / projetoAtual.budget_baseline) * 100 : 0;
  const progressoFisicoTotal = milestones.length > 0
    ? Math.round(milestones.reduce((acc, m) => acc + (m.progress || 0), 0) / milestones.length)
    : 0;

  const faseAtual = parseInt(projetoAtual.status.replace(/\D/g, '')) || 1;
  const maxPhase = gates.length > 0 ? Math.max(...gates.map(g => g.phase_number)) : 1;
  const arrayFases = Array.from({ length: maxPhase }, (_, i) => i + 1);
  const artefatosFaseAtual = gates.filter(g => g.phase_number === faseAtual);
  
  const artefatosPendentes = artefatosFaseAtual.filter(g => g.status === 'Pendente' || g.status === 'Rejeitado');
  const temRejeicao = gates.some(g => g.status === 'Rejeitado');
  const riscosAbertos = risks.filter(r => r.status === 'Aberto').length;

  let ragStatus: 'VERDE' | 'AMARELO' | 'VERMELHO' = 'VERDE';
  let ragMessage = 'Escopo, Prazo e Orçamento estabilizados.';

  if (percentualConsumido >= 95) {
    ragStatus = 'VERMELHO';
    ragMessage = 'Crítico: Consumo de orçamento superior a 95%. Risco de estouro financeiro.';
  } else if (percentualConsumido >= 80) {
    ragStatus = 'AMARELO';
    ragMessage = 'Atenção: Consumo de orçamento superior a 80%. Margem de segurança reduzida.';
  } else if (temRejeicao) {
    ragStatus = 'AMARELO';
    ragMessage = 'Atenção: Existem artefatos rejeitados bloqueando a governança do projeto.';
  } else if (riscosAbertos >= 3) {
    ragStatus = 'AMARELO';
    ragMessage = 'Atenção: Múltiplos riscos abertos exigem atenção do comitê diretivo.';
  }

  const ragStyles = {
    VERDE: { color: 'text-emerald-400', bg: 'bg-emerald-900/30', border: 'border-emerald-500/50', dot: 'bg-emerald-500' },
    AMARELO: { color: 'text-amber-400', bg: 'bg-amber-900/30', border: 'border-amber-500/50', dot: 'bg-amber-500' },
    VERMELHO: { color: 'text-red-400', bg: 'bg-red-900/30', border: 'border-red-500/50', dot: 'bg-red-500' }
  };
  const uiStatus = ragStyles[ragStatus];

  return (
    <main className="min-h-screen bg-[#0f172a] font-sans text-white p-8 relative">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-12 border-b border-slate-700 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Sync <span className="text-[#fbbf24]">Projetos</span></h1>
          <p className="text-slate-400 mt-1">Cofre de Governança | Visão Executiva</p>
        </div>
        <div className="flex items-center gap-6">
          {projetos.length > 1 && (
            <div className="bg-[#1e293b] border border-slate-600 rounded-lg p-1">
              <select value={projetoAtual.id} onChange={handleMudarProjeto} className="bg-transparent text-sm font-bold text-[#fbbf24] focus:outline-none px-2 cursor-pointer">
                {projetos.map(p => <option key={p.id} value={p.id} className="bg-[#1e293b] text-white">{p.name}</option>)}
              </select>
            </div>
          )}
          <div className="text-right ml-4">
            <p className="font-semibold text-sm">Painel do Diretor</p>
            <p className="text-xs text-slate-400">{sponsorName}</p>
          </div>
          <button onClick={handleLogout} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors border border-slate-600">
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          <section className="bg-[#1e293b] rounded-2xl p-6 border border-slate-700 shadow-xl flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-300 mb-1">Status Geral ({projetoAtual.name})</h2>
              <p className="text-sm text-slate-400 max-w-md">{ragMessage}</p>
            </div>
            <div className={`flex items-center gap-3 ${uiStatus.bg} px-6 py-3 rounded-xl border ${uiStatus.border}`}>
              <div className={`w-4 h-4 ${uiStatus.dot} rounded-full animate-pulse`}></div>
              <span className={`font-bold ${uiStatus.color} text-lg`}>{ragStatus}</span>
            </div>
          </section>

          {/* ESCOPO CONTRATUAL */}
          <section className="bg-[#1e293b] rounded-2xl p-6 border border-slate-700 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h2 className="text-lg font-semibold text-slate-300 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#fbbf24]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                Escopo Contratual & Baseline
              </h2>
              {projetoAtual.original_baseline && (
                <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-lg border border-slate-600">
                  Baseline Inicial: <strong className="font-mono text-[#fbbf24]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(projetoAtual.original_baseline)}</strong>
                </span>
              )}
            </div>

            {projetoAtual.objective && (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Objetivo</span>
                <p className="text-sm text-slate-200 mt-1">{projetoAtual.objective}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-500/30">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block mb-2">✓ Dentro do Escopo (In-Scope)</span>
                <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{projetoAtual.in_scope || 'Escopo não detalhado pelo PMO.'}</p>
              </div>
              <div className="bg-red-950/20 p-4 rounded-xl border border-red-500/30">
                <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider block mb-2">✕ Fora do Escopo (Out-of-Scope)</span>
                <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{projetoAtual.out_scope || 'Nenhum limite restrito especificado.'}</p>
              </div>
            </div>
          </section>

          {/* MATRIZ DE RISCOS E IMPEDIMENTOS */}
          <section className="bg-[#1e293b] rounded-2xl p-6 border border-slate-700 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h2 className="text-lg font-semibold text-slate-300 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#fbbf24]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                Matriz de Riscos e Impedimentos (Issue & Risk Log)
              </h2>
              <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-lg border border-slate-600 font-bold">
                Riscos Abertos: <span className="text-amber-400">{riscosAbertos}</span>
              </span>
            </div>

            {risks.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">Nenhum risco mapeado ou impedimento reportado para este projeto.</p>
            ) : (
              <div className="space-y-4">
                {risks.map((r) => {
                  const probColor = r.probability === 'Alta' ? 'text-red-400 bg-red-950/40 border-red-500/30' : r.probability === 'Média' ? 'text-amber-400 bg-amber-950/40 border-amber-500/30' : 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30';
                  const impactColor = r.impact === 'Alto' ? 'text-red-400 bg-red-950/40 border-red-500/30' : r.impact === 'Médio' ? 'text-amber-400 bg-amber-950/40 border-amber-500/30' : 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30';
                  const statusColor = r.status === 'Aberto' ? 'bg-amber-900/40 text-amber-400 border-amber-500/30' : r.status === 'Mitigado' ? 'bg-emerald-900/40 text-emerald-400 border-emerald-500/30' : r.status === 'Ocorrido' ? 'bg-red-900/40 text-red-400 border-red-500/30' : 'bg-slate-800 text-slate-400 border-slate-700';

                  return (
                    <div key={r.id} className="bg-slate-900/70 p-4 rounded-xl border border-slate-700 space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h3 className="font-bold text-white text-sm">{r.title}</h3>
                          {r.description && <p className="text-xs text-slate-400 mt-1">{r.description}</p>}
                        </div>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded border ${statusColor}`}>
                          {r.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-3 text-xs pt-1">
                        <span className={`px-2 py-0.5 rounded border font-semibold ${probColor}`}>Probabilidade: {r.probability}</span>
                        <span className={`px-2 py-0.5 rounded border font-semibold ${impactColor}`}>Impacto: {r.impact}</span>
                      </div>

                      {r.mitigation_plan && (
                        <div className="bg-[#1e293b] p-3 rounded-lg border border-slate-700 text-xs mt-2">
                          <span className="text-[10px] uppercase font-bold text-[#fbbf24] block mb-1">Plano de Mitigação</span>
                          <p className="text-slate-300 leading-relaxed">{r.mitigation_plan}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* CRONOGRAMA MACRO DE MARCOS */}
          <section className="bg-[#1e293b] rounded-2xl p-6 border border-slate-700 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-slate-300 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#fbbf24]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              Cronograma Macro de Entregas (Milestones)
            </h2>

            {milestones.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">Nenhum marco cadastrado.</p>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-700">
                {milestones.map((m) => {
                  const isConcluido = m.status === 'Concluído';
                  const isAndamento = m.status === 'Em andamento';
                  const isAtrasado = m.status === 'Atrasado';

                  const badgeColor = isConcluido ? 'bg-emerald-900/40 text-emerald-400 border-emerald-500/30' :
                                     isAndamento ? 'bg-amber-900/40 text-amber-400 border-amber-500/30' :
                                     isAtrasado ? 'bg-red-900/40 text-red-400 border-red-500/30' :
                                     'bg-slate-800 text-slate-400 border-slate-700';

                  return (
                    <div key={m.id} className="relative bg-slate-900/60 p-4 rounded-xl border border-slate-700">
                      <div className={`absolute -left-[29px] top-5 w-3.5 h-3.5 rounded-full border-2 border-[#0f172a] ${isConcluido ? 'bg-emerald-500' : isAndamento ? 'bg-amber-500 animate-pulse' : isAtrasado ? 'bg-red-500' : 'bg-slate-600'}`}></div>

                      <div className="flex justify-between items-start gap-4 mb-2">
                        <div>
                          <h3 className="font-bold text-white text-sm">{m.title}</h3>
                          {m.due_date && <span className="text-xs text-[#fbbf24] font-mono mt-0.5 block">Previsão: {m.due_date}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded border border-emerald-500/30">
                            {m.progress ?? 0}% Concluído
                          </span>
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded border ${badgeColor}`}>
                            {m.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                        <div className="bg-[#fbbf24] h-1.5 rounded-full transition-all" style={{ width: `${Math.min(m.progress || 0, 100)}%` }}></div>
                      </div>

                      {m.description && <p className="text-xs text-slate-400 mt-3">{m.description}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="bg-[#1e293b] rounded-2xl p-6 border border-slate-700 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-300 mb-6">Roadmap de Implementação (Fases)</h2>
            {arrayFases.length > 0 ? (
              <div className="flex justify-between items-center relative px-2 overflow-x-auto custom-scrollbar pb-4">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-700 -z-10 -translate-y-1/2"></div>
                {arrayFases.map((fase) => (
                  <div key={fase} className="flex flex-col items-center gap-2 bg-[#1e293b] px-4 min-w-[80px]">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 shrink-0 ${fase < faseAtual ? 'bg-[#fbbf24] border-[#fbbf24] text-[#0f172a]' : fase === faseAtual ? 'bg-[#0f172a] border-[#fbbf24] text-[#fbbf24] animate-pulse' : 'bg-slate-800 border-slate-600 text-slate-500'}`}>{fase}</div>
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${fase <= faseAtual ? 'text-white' : 'text-slate-500'}`}>Fase {fase}</span>
                  </div>
                ))}
              </div>
            ) : ( <p className="text-slate-500 text-sm italic text-center py-4">Governança ainda não configurada no HQ.</p> )}
            
            <div className="mt-6 text-center text-sm text-[#fbbf24] font-bold uppercase tracking-widest">
              Fase Atual do Projeto: {projetoAtual.status}
            </div>
          </section>

          <section className="bg-[#1e293b] rounded-2xl p-6 border border-slate-700 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-slate-300">Inventário de Artefatos (Tollgates)</h2>
            </div>
            <div className="space-y-8">
              {arrayFases.map(faseNum => {
                const artefatos = gates.filter(g => g.phase_number === faseNum);
                const isAtiva = faseNum === faseAtual;
                if (artefatos.length === 0 && !isAtiva) return null;

                return (
                  <div key={faseNum} className={`border-l-2 pl-4 ${isAtiva ? 'border-[#fbbf24]' : 'border-slate-700'}`}>
                    <h3 className={`text-sm font-bold uppercase mb-3 ${isAtiva ? 'text-[#fbbf24]' : 'text-slate-500'}`}>Fase {faseNum}</h3>
                    <div className="space-y-3">
                      {artefatos.length === 0 && <p className="text-xs text-slate-500 italic">Nenhum artefato mapeado.</p>}
                      {artefatos.map(gate => {
                        const isAprovado = gate.status === 'Aprovado';
                        const isRejeitado = gate.status === 'Rejeitado';
                        
                        return (
                          <div key={gate.id} onClick={() => { if (isAprovado) setModalGate(gate); }} className={`p-4 rounded-xl border transition-all flex justify-between items-center ${
                            isRejeitado ? 'bg-red-950/20 border-red-500/50' : 
                            isAprovado ? 'bg-emerald-900/10 border-emerald-500/30 hover:border-emerald-500/60 cursor-pointer group' : 
                            isAtiva ? 'bg-amber-950/20 border-amber-500/50' : 
                            'bg-slate-900/30 border-slate-800/60 opacity-60'
                          }`}>
                            <div>
                              <h4 className={`font-bold text-sm ${isAprovado ? 'text-emerald-100 group-hover:text-emerald-400' : isRejeitado ? 'text-red-300' : 'text-white'}`}>{gate.document_title}</h4>
                              <p className="text-xs text-slate-400 mt-1">{gate.description}</p>
                            </div>
                            
                            <div className="flex flex-col items-end gap-2 ml-4">
                              {isRejeitado ? (
                                <span className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded border bg-red-900/40 text-red-400 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                                  Rejeitado
                               </span>
                              ) : isAprovado ? (
                                <span className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded border bg-emerald-900/40 text-emerald-400 border-emerald-500/50">
                                  ✓ Aprovado
                                </span>
                              ) : (
                                <span className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded border bg-slate-800 text-slate-400 border-slate-700">
                                  Pendente
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-[#1e293b] rounded-2xl p-6 border border-slate-700 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-300 mb-4">Saúde Financeira</h2>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Consumido</span>
              <span className="text-white font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(projetoAtual.budget_consumed)}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-4 mb-2 overflow-hidden">
              <div className="bg-[#fbbf24] h-4 rounded-full transition-all" style={{ width: `${Math.min(percentualConsumido, 100)}%` }}></div>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#fbbf24] font-bold">{Math.round(percentualConsumido)}%</span>
              <span className="text-slate-400">Baseline: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(projetoAtual.budget_baseline)}</span>
            </div>
          </section>

          <section className="bg-[#1e293b] rounded-2xl p-6 border border-slate-700 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-300 mb-2">Progresso Físico Global</h2>
            <p className="text-xs text-slate-400 mb-4">Evolução consolidada dos marcos.</p>
            
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Execução Geral</span>
              <span className="text-emerald-400 font-bold">{progressoFisicoTotal}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-4 mb-3 overflow-hidden">
              <div className="bg-emerald-500 h-4 rounded-full transition-all" style={{ width: `${Math.min(progressoFisicoTotal, 100)}%` }}></div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">
              {milestones.length} marco(s) catalogados.
            </div>
          </section>

          <section className="bg-amber-900/20 rounded-2xl p-6 border border-[#fbbf24]/50 shadow-xl">
            <h2 className="text-lg font-bold text-[#fbbf24] mb-2">Ação Requerida</h2>
            {artefatosPendentes.length > 0 ? (
              <>
                <p className="text-sm text-amber-200/80 mb-4">A Fase {faseAtual} possui <strong>{artefatosPendentes.length} artefato(s)</strong> aguardando sua análise/assinatura.</p>
                <button 
                  onClick={() => router.push(`/assinaturas?projectId=${projetoAtual.id}`)}
                  className="w-full bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f172a] font-bold py-3 rounded-lg transition"
                >Abrir Central de Assinaturas</button>
              </>
            ) : (
              <>
                <p className="text-sm text-emerald-400/80 mb-4 font-semibold">✓ Todos os artefatos da Fase {faseAtual} estão aprovados.</p>
                <button disabled className="w-full bg-slate-800 text-slate-500 font-bold py-3 rounded-lg cursor-not-allowed">Nenhuma Pendência</button>
              </>
            )}
          </section>
        </div>
      </div>

      {modalGate && (
        <div className="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e293b] p-8 rounded-2xl border border-slate-600 max-w-lg w-full">
            <div className="flex justify-between items-start mb-4 border-b border-slate-700 pb-4">
              <div><span className="text-xs text-emerald-400 font-bold uppercase">Fase {modalGate.phase_number} — Aprovado</span><h3 className="text-xl font-bold mt-1">{modalGate.document_title}</h3></div>
              <button onClick={() => setModalGate(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <p className="text-sm text-slate-300 mb-6">{modalGate.description}</p>
            <button onClick={() => setModalGate(null)} className="w-full bg-[#fbbf24] text-[#0f172a] font-bold py-3 rounded-lg">Fechar</button>
          </div>
        </div>
      )}
    </main>
  );
}