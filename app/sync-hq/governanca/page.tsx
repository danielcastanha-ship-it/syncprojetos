// app/sync-hq/governanca/page.tsx
"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../utils/supabaseClient';

interface ArtifactInput {
  id?: string;
  ui_key: string;
  document_title: string;
  description: string;
  status?: string;
  file_path?: string;
  current_version?: number;
  rejection_reason?: string;
  newFile?: File | null;
}

interface PhaseGroup { phase_number: number; artifacts: ArtifactInput[]; }

const generateUniqueKey = () => Math.random().toString(36).substring(2, 9);

function GovernancaManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projectName, setProjectName] = useState('');

  const [phases, setPhases] = useState<PhaseGroup[]>([]);
  const [deletedGateIds, setDeletedGateIds] = useState<string[]>([]);

  useEffect(() => {
    if (!projectId) { router.push('/sync-hq'); return; }

    async function loadData() {
      const { data: projData } = await supabase.from('projects').select('name').eq('id', projectId).single();
      if (projData) setProjectName(projData.name);

      // CORREÇÃO: Força o contorno do cache do Next.js
      const cacheBuster = new Date().getTime();
      const { data: existingGates } = await supabase
        .from('phase_gates')
        .select(`*, _ts:id`) // Hack leve para forçar atualização no client
        .eq('project_id', projectId)
        .order('phase_number', { ascending: true })
        .order('order_index', { ascending: true });

      if (existingGates && existingGates.length > 0) {
        const grouped: PhaseGroup[] = [];
        existingGates.forEach(gate => {
          let phase = grouped.find(p => p.phase_number === gate.phase_number);
          if (!phase) { phase = { phase_number: gate.phase_number, artifacts: [] }; grouped.push(phase); }
          phase.artifacts.push({ ...gate, ui_key: gate.id, newFile: null });
        });
        grouped.sort((a, b) => a.phase_number - b.phase_number);
        setPhases(grouped);
      } else {
        setPhases([{ phase_number: 1, artifacts: [{ ui_key: generateUniqueKey(), document_title: 'Termo de Abertura', description: 'Escopo inicial e orçamento.', current_version: 1 }] }]);
      }
      setLoading(false);
    }
    loadData();
  }, [projectId, router]);

  const handleAddPhase = () => setPhases([...phases, { phase_number: phases.length + 1, artifacts: [] }]);

  const handleRemovePhase = (phaseIndex: number) => {
    const idsToDelete = phases[phaseIndex].artifacts.filter(a => a.id).map(a => a.id as string);
    if (idsToDelete.length > 0) setDeletedGateIds([...deletedGateIds, ...idsToDelete]);
    setPhases(phases.filter((_, i) => i !== phaseIndex).map((p, i) => ({ ...p, phase_number: i + 1 })));
  };

  const handleAddArtifact = (phaseIndex: number) => {
    const newPhases = [...phases];
    newPhases[phaseIndex].artifacts.push({ ui_key: generateUniqueKey(), document_title: '', description: '', current_version: 1 });
    setPhases(newPhases);
  };

  const handleRemoveArtifact = (phaseIndex: number, artifactIndex: number) => {
    const artifactToRemove = phases[phaseIndex].artifacts[artifactIndex];
    if (artifactToRemove.id) setDeletedGateIds([...deletedGateIds, artifactToRemove.id]);
    const newPhases = [...phases];
    newPhases[phaseIndex].artifacts = newPhases[phaseIndex].artifacts.filter((_, i) => i !== artifactIndex);
    setPhases(newPhases);
  };

  const handleArtifactChange = (phaseIndex: number, artifactIndex: number, field: keyof ArtifactInput, value: any) => {
    const newPhases = [...phases];
    newPhases[phaseIndex].artifacts[artifactIndex] = { ...newPhases[phaseIndex].artifacts[artifactIndex], [field]: value };
    setPhases(newPhases);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (deletedGateIds.length > 0) await supabase.from('phase_gates').delete().in('id', deletedGateIds);

      for (const phase of phases) {
        // Usa o aIndex para salvar a ordem
        for (const [aIndex, art] of phase.artifacts.entries()) {
          let finalFilePath = art.file_path;
          let newVersion = art.current_version || 1;
          let finalStatus = art.status || 'Pendente';
          let finalRejection = art.rejection_reason;

          if (art.newFile) {
            const fileExt = art.newFile.name.split('.').pop();
            const fileName = `${projectId}/${art.ui_key}_v${newVersion + (art.id ? 1 : 0)}_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage.from('projetos-ged').upload(fileName, art.newFile, { upsert: true });
            if (uploadError) throw new Error(`Erro ao subir PDF "${art.document_title}": ${uploadError.message}`);

            finalFilePath = fileName;
            
            if (art.id) {
              newVersion += 1;
              if (finalStatus === 'Rejeitado') { finalStatus = 'Pendente'; finalRejection = ''; }
            }
          }

          const payload = {
            project_id: projectId, phase_number: phase.phase_number, document_title: art.document_title,
            description: art.description, status: finalStatus, file_path: finalFilePath,
            current_version: newVersion, rejection_reason: finalRejection, action_route: '/assinaturas',
            order_index: aIndex // Grava a ordem exata
          };

          if (art.id) await supabase.from('phase_gates').update(payload).eq('id', art.id);
          else await supabase.from('phase_gates').insert([payload]);
        }
      }
      alert('Governança aplicada! Os PDFs foram processados.');
      router.push('/sync-hq');
    } catch (error: any) { alert(error.message); } finally { setSaving(false); }
  };

  if (loading) return (<div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white"><div className="w-10 h-10 border-4 border-[#fbbf24] border-t-transparent rounded-full animate-spin"></div></div>);

  return (
    <div className="min-h-screen bg-[#0f172a] font-sans text-white p-8">
      <header className="max-w-5xl mx-auto flex justify-between items-center mb-10 border-b border-slate-700 pb-6">
        <div><h1 className="text-3xl font-extrabold tracking-tight">Motor de <span className="text-[#fbbf24]">Governança</span></h1><p className="text-slate-400 mt-1">Configuração de Fases e Artefatos: <span className="text-white font-bold">{projectName}</span></p></div>
        <button onClick={() => router.push('/sync-hq')} className="px-4 py-2 bg-[#1e293b] hover:bg-slate-700 rounded-lg text-sm transition border border-slate-600">← Voltar ao HQ</button>
      </header>

      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex justify-between items-end bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg">
          <div><h2 className="text-xl font-bold text-[#fbbf24] mb-1">Mapa do Projeto</h2><p className="text-xs text-slate-400">Adicione fases e defina múltiplos artefatos (com envio de PDFs) para cada uma delas.</p></div>
          <button onClick={handleAddPhase} className="bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f172a] font-bold py-2.5 px-5 rounded-lg text-sm transition flex items-center gap-2">Nova Fase</button>
        </div>

        <div className="space-y-6">
          {phases.map((phase, pIndex) => (
            <div key={pIndex} className="bg-[#1e293b] rounded-2xl border border-slate-600 shadow-xl overflow-hidden">
              <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-700 flex justify-between items-center">
                <h3 className="text-lg font-extrabold text-white flex items-center gap-3"><span className="bg-[#fbbf24] text-[#0f172a] px-3 py-1 rounded-md text-sm">Fase {phase.phase_number}</span></h3>
                <button onClick={() => handleRemovePhase(pIndex)} className="text-slate-400 hover:text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded transition text-sm font-semibold">Excluir Fase Inteira</button>
              </div>

              <div className="p-6 space-y-4 bg-[#0f172a]/30">
                {phase.artifacts.map((art, aIndex) => {
                  const isRejected = art.status === 'Rejeitado';
                  const isApproved = art.status === 'Aprovado';
                  
                  return (
                  <div key={art.ui_key} className={`flex flex-col p-5 rounded-xl border relative transition-all ${isRejected ? 'border-red-500 bg-red-950/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : isApproved ? 'border-emerald-500/50 bg-emerald-950/10' : 'border-slate-700 bg-[#0f172a]'}`}>
                    
                    {/* ALERTA VISUAL PESADO DE REJEIÇÃO */}
                    {isRejected && (
                      <div className="mb-5 bg-red-900/60 border-l-4 border-red-500 p-4 rounded-r-lg">
                        <div className="flex items-center gap-2 text-red-100 font-extrabold text-sm uppercase tracking-wider mb-2">
                          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                          O Cliente Rejeitou este Documento!
                        </div>
                        <p className="text-sm text-white font-medium bg-red-950/50 p-3 rounded border border-red-500/30">Motivo: "{art.rejection_reason}"</p>
                      </div>
                    )}

                    <div className="flex gap-4">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5 flex justify-between"><span>Título do Documento</span>{isApproved && <span className="text-emerald-400">✓ Aprovado</span>}</label>
                          <input type="text" required value={art.document_title} onChange={(e) => handleArtifactChange(pIndex, aIndex, 'document_title', e.target.value)} placeholder="Ex: Blueprint Técnico" className="w-full bg-[#1e293b] border border-slate-600 rounded p-2.5 text-white text-sm focus:ring-1 focus:ring-[#fbbf24]" />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">Critério de Aceitação / Resumo</label>
                          <input type="text" required value={art.description} onChange={(e) => handleArtifactChange(pIndex, aIndex, 'description', e.target.value)} placeholder="Ex: Assinatura do Sponsor confirmando arquitetura." className="w-full bg-[#1e293b] border border-slate-600 rounded p-2.5 text-white text-sm focus:ring-1 focus:ring-[#fbbf24]" />
                        </div>
                      </div>
                      <button onClick={() => handleRemoveArtifact(pIndex, aIndex)} className="text-slate-500 hover:text-red-500 transition self-center p-2 rounded hover:bg-red-500/10">✕</button>
                    </div>

                    <div className={`mt-5 p-4 rounded-lg border border-dashed ${isRejected ? 'bg-red-950 border-red-500' : 'bg-[#1e293b]/50 border-slate-600'}`}>
                      <label className={`block text-[11px] uppercase tracking-wider font-bold mb-3 flex items-center gap-2 ${isRejected ? 'text-red-400' : 'text-slate-300'}`}>
                        {isRejected ? 'Faça o Upload do Novo PDF Corrigido Aqui:' : 'Arquivo Oficial do Documento (PDF)'}
                        {art.current_version && <span className="bg-slate-700 text-white px-2 py-0.5 rounded text-[9px]">VERSÃO ATUAL: V{art.current_version}</span>}
                      </label>
                      
                      {art.file_path && !art.newFile && !isRejected && (<div className="flex items-center gap-2 mb-3 bg-slate-800 p-2.5 rounded border border-slate-700 text-sm text-emerald-400 font-semibold">✓ PDF armazenado no Cofre</div>)}
                      
                      <input type="file" accept="application/pdf" onChange={(e) => handleArtifactChange(pIndex, aIndex, 'newFile', e.target.files?.[0] || null)} className={`w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold cursor-pointer ${isRejected ? 'file:bg-red-600 file:text-white hover:file:bg-red-500' : 'file:bg-[#fbbf24] file:text-[#0f172a] hover:file:bg-[#f59e0b]'}`} />
                    </div>
                  </div>
                )})}
                <button onClick={() => handleAddArtifact(pIndex)} className="w-full py-3 border-2 border-dashed border-slate-600 text-slate-400 rounded-xl hover:border-slate-400 hover:text-slate-300 transition text-sm font-bold flex items-center justify-center gap-2">+ Adicionar Novo Artefato</button>
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-[#0f172a] pt-4 pb-8 flex justify-end gap-4 border-t border-slate-800">
          <button onClick={() => router.push('/sync-hq')} className="px-6 py-3 bg-transparent border border-slate-600 hover:bg-slate-800 rounded-xl font-bold text-slate-300 transition">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="px-8 py-3 bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f172a] font-extrabold rounded-xl transition shadow-lg disabled:opacity-50 flex items-center gap-2">
            {saving ? <span>Realizando Upload...</span> : <span>Confirmar Mapa e Subir PDFs</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GovernancaPage() {
  return <Suspense fallback={<div className="bg-[#0f172a] min-h-screen"></div>}><GovernancaManager /></Suspense>;
}