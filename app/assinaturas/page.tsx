// app/assinaturas/page.tsx
"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../utils/supabaseClient';

interface PhaseGate { 
  id: string; phase_number: number; document_title: string; description: string; 
  status: string; file_path?: string; current_version?: number; order_index: number;
  rejection_reason?: string; assigned_to?: string; type?: 'GATE';
}

interface ChangeRequest {
  id: string; cr_number: string; title: string; description?: string;
  financial_impact: number; status: string; rejection_reason?: string; type?: 'CR';
}

interface GateVersion {
  id: string; version_number: number; file_path: string; uploaded_at: string; signedUrl?: string;
}

interface ProjectData { id: string; name: string; status: string; budget_baseline: number; }

function AssinaturasManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  
  const [project, setProject] = useState<ProjectData | null>(null);
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [activeItem, setActiveItem] = useState<any | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [versionHistory, setVersionHistory] = useState<GateVersion[]>([]);
  
  const [userRole, setUserRole] = useState<string>('SPONSOR');
  const [userId, setUserId] = useState<string>('');
  
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectionText, setRejectionText] = useState('');

  useEffect(() => {
    if (!projectId) { router.push('/dashboard'); return; }

    async function fetchArtifactData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/'); return; }
      setUserId(user.id);

      const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      const role = profileData?.role || 'SPONSOR';
      setUserRole(role);

      const { data: projData } = await supabase.from('projects').select('id, name, status, budget_baseline').eq('id', projectId).single();
      if (projData) {
        setProject(projData);
        const faseAtualNum = parseInt(projData.status.replace(/\D/g, '')) || 1;

        let formattedCRs: any[] = [];
        let formattedGates: any[] = [];

        if (role === 'SPONSOR') {
          const { data: crData } = await supabase.from('change_requests')
            .select('*')
            .eq('project_id', projectId)
            .eq('status', 'Pendente')
            .order('created_at', { ascending: true });
          formattedCRs = (crData || []).map(cr => ({ ...cr, type: 'CR' }));
        }

        let gatesQuery = supabase.from('phase_gates')
          .select('*')
          .eq('project_id', projectId)
          .eq('phase_number', faseAtualNum)
          .in('status', ['Pendente', 'Rejeitado']);

        if (role === 'TECHNICAL') {
          gatesQuery = gatesQuery.eq('assigned_to', user.id);
        }

        const { data: gatesData } = await gatesQuery.order('order_index', { ascending: true });
        formattedGates = (gatesData || []).map(g => ({ ...g, type: 'GATE' }));

        const combined = [...formattedCRs, ...formattedGates];

        if (combined.length > 0) {
          setPendingItems(combined);
          setActiveItem(combined[0]);
        }
      }
      setLoading(false);
    }
    fetchArtifactData();
  }, [projectId, router]);

  useEffect(() => {
    async function loadArtifactDetails() {
      if (!activeItem || activeItem.type === 'CR') { 
        setPdfUrl(null); 
        setVersionHistory([]);
        return; 
      }

      if (activeItem.file_path) {
        const { data, error } = await supabase.storage.from('projetos-ged').createSignedUrl(activeItem.file_path, 3600);
        if (!error && data) setPdfUrl(data.signedUrl);
      } else {
        setPdfUrl(null);
      }

      const { data: versionsData } = await supabase.from('phase_gate_versions')
        .select('*')
        .eq('gate_id', activeItem.id)
        .order('version_number', { ascending: false });

      if (versionsData && versionsData.length > 0) {
        const versionsWithUrls = await Promise.all(versionsData.map(async (v) => {
          const { data } = await supabase.storage.from('projetos-ged').createSignedUrl(v.file_path, 3600);
          return { ...v, signedUrl: data?.signedUrl };
        }));
        setVersionHistory(versionsWithUrls);
      } else {
        setVersionHistory([]);
      }
    }

    loadArtifactDetails();
    setRejectMode(false);
    setRejectionText('');
  }, [activeItem]);

  const handleAction = async (action: 'APPROVE' | 'REJECT') => {
    if (!project || !activeItem) return;
    if (action === 'REJECT' && !rejectionText.trim()) { alert("Detalhe o motivo da rejeição."); return; }
    
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const newStatus = action === 'APPROVE' ? 'Aprovado' : 'Rejeitado';
      const reason = action === 'REJECT' ? rejectionText : '';

      if (activeItem.type === 'CR') {
        if (action === 'APPROVE') {
          const novaBaseline = (project.budget_baseline || 0) + (activeItem.financial_impact || 0);
          await supabase.from('projects').update({ budget_baseline: novaBaseline }).eq('id', project.id);
          setProject({ ...project, budget_baseline: novaBaseline });
        }

        const { error } = await supabase.from('change_requests')
          .update({ status: newStatus, rejection_reason: reason })
          .eq('id', activeItem.id);

        if (error) { alert("Erro ao atualizar CR: " + error.message); setIsProcessing(false); return; }

      } else {
        if (user) {
          await supabase.from('audit_logs').insert({ 
            project_id: project.id, user_id: user.id, 
            document_name: activeItem.document_title, 
            action: action === 'APPROVE' ? 'APPROVED_AND_FROZEN' : 'REJECTED' 
          });
        }

        const { data: updatedRows, error: updateError } = await supabase
          .from('phase_gates')
          .update({ status: newStatus, rejection_reason: reason })
          .eq('id', activeItem.id)
          .select();

        if (updateError || !updatedRows || updatedRows.length === 0) {
          alert("Erro no Banco de Dados: " + (updateError?.message || "Bloqueio de segurança."));
          setIsProcessing(false);
          return;
        }

        // GATILHO DE FATURAMENTO: Se aprovou, verifica se era o último artefato pendente da fase
        if (action === 'APPROVE') {
          const faseAtualNum = activeItem.phase_number;
          const { data: remainingPhaseGates } = await supabase.from('phase_gates')
            .select('id')
            .eq('project_id', project.id)
            .eq('phase_number', faseAtualNum)
            .neq('status', 'Aprovado');

          if (!remainingPhaseGates || remainingPhaseGates.length === 0) {
            // Fase 100% aprovada! Destrava o Gate de Faturamento
            await supabase.from('phase_billing')
              .upsert({
                project_id: project.id,
                phase_number: faseAtualNum,
                status: 'Liberado para Faturamento',
                updated_at: new Date().toISOString()
              }, { onConflict: 'project_id,phase_number' });
          }
        }
      }

      if (action === 'REJECT') {
        const updated = pendingItems.map(i => i.id === activeItem.id ? { ...i, status: 'Rejeitado', rejection_reason: rejectionText } : i);
        setPendingItems(updated);
        setActiveItem(updated.find(i => i.id === activeItem.id) || null);
        setRejectMode(false);
        alert('Item devolvido com sucesso!');
      } else {
        const remaining = pendingItems.filter(i => i.id !== activeItem.id);
        if (remaining.length > 0) {
          setPendingItems(remaining);
          setActiveItem(remaining[0]);
          alert('Aprovado com sucesso! Carregando próximo item.');
        } else {
          alert('Parabéns! Todas as pendências desta fase foram aprovadas e o Faturamento foi liberado automaticamente.');
          router.push('/dashboard');
        }
      }

    } catch (error: any) { 
      alert("Falha: " + error.message); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  if (loading) return (<main className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white"><div className="w-10 h-10 border-4 border-[#fbbf24] border-t-transparent rounded-full animate-spin"></div></main>);

  if (!activeItem) return (
    <main className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white p-4">
      <div className="bg-emerald-900/30 p-8 rounded-2xl border border-emerald-500/30 text-center max-w-md">
        <h2 className="text-xl font-bold text-emerald-400 mb-4">Alçada em Dia!</h2>
        <p className="text-sm text-emerald-200 mb-6">Não há nenhum aditivo ou documento pendente para o seu usuário.</p>
        <button onClick={() => router.push('/dashboard')} className="px-6 py-3 bg-slate-800 font-bold rounded-lg w-full hover:bg-slate-700 transition">Voltar ao Dashboard</button>
      </div>
    </main>
  );

  const isCR = activeItem.type === 'CR';

  return (
    <main className="min-h-screen bg-[#0f172a] text-white font-sans flex flex-col">
      <header className="px-8 py-4 border-b border-slate-700 flex justify-between items-center bg-[#1e293b]">
        <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-white transition flex items-center gap-2 text-sm font-medium">← Voltar ao Dashboard</button>
        <span className="text-xs text-slate-300 font-semibold uppercase tracking-wider">Cofre de Assinaturas ({userRole === 'TECHNICAL' ? 'Alçada Técnica' : 'Alçada Executiva'})</span>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <section className="flex-1 p-8 bg-[#0f172a] flex flex-col relative">
          <div className="mb-4 flex justify-between items-end">
             <div>
               <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${isCR ? 'bg-amber-900/30 text-[#fbbf24] border-amber-500/30' : 'bg-blue-900/30 text-blue-400 border-blue-500/30'}`}>
                 {isCR ? `Solicitação de Mudança — ${activeItem.cr_number}` : `Tollgate (Versão Atual: v${activeItem.current_version || 1})`}
               </span>
               <h2 className="text-2xl font-extrabold mt-3">{isCR ? activeItem.title : activeItem.document_title}</h2>
             </div>
          </div>
          
          <div className="flex-1 w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl relative flex flex-col p-8">
             {isCR ? (
               <div className="space-y-6 my-auto">
                 <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                   <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Justificativa da Mudança</h3>
                   <p className="text-sm text-slate-200 leading-relaxed">{activeItem.description || 'Nenhuma descrição detalhada.'}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="bg-[#1e293b] p-5 rounded-xl border border-[#fbbf24]/30">
                     <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Impacto Financeiro Solicitado</span>
                     <span className="text-2xl font-extrabold text-[#fbbf24] font-mono">
                       {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(activeItem.financial_impact || 0)}
                     </span>
                   </div>
                   <div className="bg-[#1e293b] p-5 rounded-xl border border-slate-700">
                     <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Baseline Atual</span>
                     <span className="text-2xl font-extrabold text-white font-mono">
                       {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(project?.budget_baseline || 0)}
                     </span>
                   </div>
                 </div>
               </div>
             ) : pdfUrl ? (
               <>
                 <div className="bg-[#1e293b] p-3 border-b border-slate-700 flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-medium">Exibindo Versão Atual (v{activeItem.current_version || 1})</span>
                    <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#fbbf24] hover:text-white transition flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg border border-slate-600">Abrir versão atual em nova aba ↗</a>
                 </div>
                 <iframe src={pdfUrl} className="w-full flex-1" title="Visualizador" />
               </>
             ) : (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                 <p className="font-semibold text-lg text-slate-300 mb-2">Sem documento anexado.</p>
               </div>
             )}
          </div>
        </section>

        <aside className="w-[420px] bg-[#1e293b] border-l border-slate-700 p-8 flex flex-col shadow-2xl overflow-y-auto">
          <div className="mb-6">
            <h4 className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-3">Fila de Aprovação da sua Alçada</h4>
            <div className="space-y-2">
              {pendingItems.map((item) => {
                const isActive = activeItem?.id === item.id;
                const isItemCR = item.type === 'CR';
                return (
                <button 
                  key={item.id} 
                  onClick={() => setActiveItem(item)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition flex justify-between items-center ${isActive ? 'bg-[#fbbf24] text-[#0f172a] shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'}`}
                >
                  <span className="truncate pr-2">{isItemCR ? `[CR] ${item.cr_number}: ${item.title}` : item.document_title}</span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${isActive ? 'bg-[#0f172a] text-[#fbbf24]' : 'bg-slate-900 text-slate-400'}`}>
                    {isItemCR ? 'Aditivo' : `v${item.current_version || 1}`}
                  </span>
                </button>
              )})}
            </div>
          </div>

          {!isCR && (
            <>
              <div className="mb-6">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">Critério de Aceite</p>
                <p className="text-sm text-slate-300 leading-relaxed p-4 bg-slate-900/50 rounded-lg border border-slate-700">{activeItem.description}</p>
              </div>

              <div className="mb-6 bg-slate-900/60 p-4 rounded-xl border border-slate-700">
                <h5 className="text-xs font-bold uppercase tracking-wider text-[#fbbf24] mb-2 flex items-center justify-between">
                  <span>Trilha de Auditoria (Versões Antigas)</span>
                  <span className="text-[10px] text-slate-400">{versionHistory.length} encontrada(s)</span>
                </h5>
                {versionHistory.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Nenhuma versão anterior arquivada.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {versionHistory.map(v => (
                      <div key={v.id} className="bg-[#1e293b] p-2.5 rounded-lg border border-slate-700 flex justify-between items-center text-xs">
                        <div>
                          <strong className="text-white">Versão {v.version_number}</strong>
                          <span className="text-[10px] text-slate-400 block">{new Date(v.uploaded_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                        {v.signedUrl ? (
                          <a href={v.signedUrl} target="_blank" rel="noreferrer" className="text-[#fbbf24] hover:text-white font-bold text-[11px] bg-slate-800 px-2.5 py-1 rounded border border-slate-600 transition">
                            Baixar v{v.version_number} ↗
                          </a>
                        ) : (
                          <span className="text-slate-500 text-[10px]">Indisponível</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="mt-auto space-y-4">
            {!rejectMode ? (
              <>
                <button onClick={() => handleAction('APPROVE')} disabled={isProcessing || (!isCR && !activeItem.file_path)} className="w-full bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f172a] font-extrabold py-4 rounded-xl transition shadow-[0_0_15px_rgba(251,191,36,0.15)] text-sm disabled:opacity-50">
                  {isProcessing ? 'Processando...' : isCR ? 'APROVAR ADITIVO & BASELINE' : 'APROVAR ARTEFATO & LIBERAR GATE'}
                </button>
                <button onClick={() => setRejectMode(true)} disabled={isProcessing} className="w-full bg-transparent hover:bg-red-950/30 text-red-400 border border-red-500/30 font-bold py-3 rounded-xl transition text-sm">
                  Rejeitar / Solicitar Revisão
                </button>
              </>
            ) : (
              <div className="bg-red-950/20 p-5 rounded-xl border border-red-500/30">
                <label className="block text-xs font-bold text-red-400 uppercase mb-2">Motivo da Rejeição</label>
                <textarea rows={4} value={rejectionText} onChange={e => setRejectionText(e.target.value)} placeholder="Justifique o veto..." className="w-full bg-slate-900 border border-red-500/50 rounded-lg p-3 text-sm text-white focus:outline-none mb-4 resize-none" />
                <button onClick={() => handleAction('REJECT')} disabled={isProcessing} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition mb-3">Confirmar Rejeição</button>
                <button onClick={() => setRejectMode(false)} disabled={isProcessing} className="w-full text-slate-400 hover:text-white font-semibold py-2 text-sm transition">Cancelar</button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function CentralAssinaturas() {
  return <Suspense fallback={<div className="bg-[#0f172a] min-h-screen"></div>}><AssinaturasManager /></Suspense>;
}