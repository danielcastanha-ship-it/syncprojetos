// app/sync-hq/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabaseClient';

interface Client { id: string; name: string; cnpj: string; contact_name: string; contact_email: string; }
interface PhaseGateMin { id: string; phase_number: number; document_title?: string; description?: string; file_path: string | null; status: string; }
interface MilestoneMin { id: string; progress: number; status: string; title: string; due_date?: string; order_index: number; }

interface ArtifactUI { id?: string; document_title: string; description: string; status: string; }
interface MilestoneUI { id?: string; title: string; description?: string; due_date?: string; status: string; progress: number; order_index: number; artifacts: ArtifactUI[]; }

interface ChangeRequest { id?: string; cr_number: string; title: string; description?: string; financial_impact: number; schedule_impact?: string; status: string; }
interface Risk { id?: string; title: string; description?: string; probability: string; impact: string; mitigation_plan?: string; status: string; order_index: number; }

interface Project { 
  id: string; client_id: string; name: string; status: string; 
  budget_baseline: number; budget_consumed: number; original_baseline: number;
  objective?: string; in_scope?: string; out_scope?: string;
  clients?: { name: string; contact_name: string };
  phase_gates?: PhaseGateMin[];
  project_milestones?: MilestoneMin[];
}

export default function SyncHQ() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'clientes' | 'projetos'>('projetos');
  const [loading, setLoading] = useState(true);

  const [clientes, setClientes] = useState<Client[]>([]);
  const [projetos, setProjetos] = useState<Project[]>([]);
  const [isClientModalOpen, setClientModalOpen] = useState(false);
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [modalTab, setModalTab] = useState<'geral' | 'roadmap' | 'crs' | 'riscos'>('geral');

  const [newClient, setNewClient] = useState({ name: '', cnpj: '', contact_name: '', contact_email: '', password: '' });
  
  const [newProject, setNewProject] = useState({ 
    client_id: '', name: '', budget_baseline: '', budget_consumed: '', 
    objective: '', in_scope: '', out_scope: '' 
  });
  
  const [milestones, setMilestones] = useState<MilestoneUI[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);

  const fetchData = async () => {
    setLoading(true);
    const { data: clientsData } = await supabase.from('clients').select('*').order('name', { ascending: true });
    if (clientsData) setClientes(clientsData);

    const { data: projectsData } = await supabase.from('projects')
      .select('*, clients(name, contact_name), phase_gates(id, phase_number, document_title, description, file_path, status), project_milestones(id, title, due_date, progress, status, order_index)')
      .order('name', { ascending: true });
      
    if (projectsData) setProjetos(projectsData);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openNewClientModal = () => { setEditingClient(null); setNewClient({ name: '', cnpj: '', contact_name: '', contact_email: '', password: '' }); setClientModalOpen(true); };
  const openEditClientModal = (client: Client) => { setEditingClient(client); setNewClient({ name: client.name, cnpj: client.cnpj || '', contact_name: client.contact_name || '', contact_email: client.contact_email || '', password: '' }); setClientModalOpen(true); };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      await supabase.from('clients').update({ name: newClient.name, cnpj: newClient.cnpj, contact_name: newClient.contact_name, contact_email: newClient.contact_email }).eq('id', editingClient.id);
      await supabase.from('profiles').update({ full_name: newClient.contact_name }).eq('client_id', editingClient.id);
      if (newClient.password) { await fetch('/api/create-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: newClient.contact_email, password: newClient.password, fullName: newClient.contact_name, clientId: editingClient.id }) }); }
    } else {
      if (!newClient.password) { alert('Defina uma senha provisória.'); return; }
      const { data: clientData } = await supabase.from('clients').insert([{ name: newClient.name, cnpj: newClient.cnpj, contact_name: newClient.contact_name, contact_email: newClient.contact_email }]).select().single();
      if (clientData) { await fetch('/api/create-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: newClient.contact_email, password: newClient.password, fullName: newClient.contact_name, clientId: clientData.id }) }); }
    }
    setClientModalOpen(false); fetchData();
  };

  const handleDeleteClient = async (id: string) => { if (confirm('Excluir cliente apagará os projetos. Continuar?')) { await supabase.from('clients').delete().eq('id', id); fetchData(); } };
  
  const openNewProjectModal = () => { 
    setEditingProject(null); 
    setNewProject({ client_id: '', name: '', budget_baseline: '', budget_consumed: '0', objective: '', in_scope: '', out_scope: '' }); 
    setMilestones([]);
    setChangeRequests([]);
    setRisks([]);
    setModalTab('geral');
    setProjectModalOpen(true); 
  };
  
  const openEditProjectModal = async (project: Project) => { 
    setEditingProject(project); 
    setNewProject({ 
      client_id: project.client_id, name: project.name, 
      budget_baseline: project.budget_baseline.toString(), budget_consumed: (project.budget_consumed || 0).toString(),
      objective: project.objective || '', in_scope: project.in_scope || '', out_scope: project.out_scope || ''
    }); 

    const { data: msData } = await supabase.from('project_milestones').select('*').eq('project_id', project.id).order('order_index');
    const { data: gatesData } = await supabase.from('phase_gates').select('*').eq('project_id', project.id);
    
    const mergedMilestones: MilestoneUI[] = (msData || []).map((m, idx) => {
      const phaseGates = (gatesData || []).filter(g => g.phase_number === idx + 1);
      return {
        ...m,
        artifacts: phaseGates.map(g => ({
          id: g.id, document_title: g.document_title || '', description: g.description || '', status: g.status
        }))
      };
    });
    setMilestones(mergedMilestones);

    const { data: crData } = await supabase.from('change_requests').select('*').eq('project_id', project.id).order('created_at', { ascending: true });
    setChangeRequests(crData || []);

    const { data: riskData } = await supabase.from('project_risks').select('*').eq('project_id', project.id).order('order_index', { ascending: true });
    setRisks(riskData || []);

    setModalTab('geral');
    setProjectModalOpen(true); 
  };

  const handleGenerateGeminiPrompt = (proj: Project) => {
    let phasesText = "";
    (proj.project_milestones || []).sort((a, b) => a.order_index - b.order_index).forEach((m, idx) => {
      const phaseNum = idx + 1;
      phasesText += `\n- **Fase ${phaseNum}: ${m.title}** (Previsão: ${m.due_date || 'N/A'} | Avanço Atual: ${m.progress}%)\n`;
      const gates = (proj.phase_gates || []).filter(g => g.phase_number === phaseNum);
      if (gates.length > 0) {
          gates.forEach(gate => {
            phasesText += `  * Artefato de Governança (Tollgate): ${gate.document_title || 'Não nomeado'}\n`;
            phasesText += `    Objetivo/Descrição: ${gate.description || 'Não especificado'}\n`;
          });
      } else {
          phasesText += `  * (Nenhum artefato restritivo configurado para esta fase)\n`;
      }
    });

    if (!phasesText) phasesText = "Nenhuma fase ou artefato cadastrado no sistema.";

    const promptText = `Atue como um Arquiteto Sênior de PMO e Diretor Executivo da Sync Projetos. Com base nos dados oficiais abaixo, crie um relatório profissional e detalhado explicando e detalhando o Framework de Governança estabelecido para este projeto corporativo:

- **Nome do Projeto:** ${proj.name}
- **Empresa Cliente:** ${proj.clients?.name || 'Não informado'}
- **Sponsor / Diretor Responsável:** ${proj.clients?.contact_name || 'Não informado'}
- **Fase Executiva Atual:** ${proj.status}
- **Baseline Financeira (Orçamento Total):** R$ ${proj.budget_baseline?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- **Valor Financeiro Consumido:** R$ ${proj.budget_consumed?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- **Objetivo Executivo:** ${proj.objective || 'Não especificado'}
- **Dentro do Escopo (In-Scope):** ${proj.in_scope || 'Não especificado'}
- **Fora do Escopo (Out-of-Scope):** ${proj.out_scope || 'Não especificado'}

**Roadmap de Entregas e Portões de Governança (Tollgates):**
${phasesText}

Por favor, estruture a resposta cobrindo:
1. **Resumo Executivo e Alinhamento Estratégico:** Apresentação do projeto e da parceria com a Sync Projetos.
2. **Framework de Governança Orientado a Marcos (Milestone-Driven):** Apresente e explique detalhadamente as fases/marcos criadas para o projeto (fornecidas acima), bem como os artefatos exigidos para cada uma. Explique o propósito de cada documento e como a amarração do cronograma com a aprovação documental garante o faturamento seguro.
3. **Controle de Escopo, Baseline e Change Requests:** Como o controle rigoroso de aditivos protege o orçamento contra scope creep.
4. **Alçadas de Aprovação, Compliance e Trilha de Auditoria:** Como a segurança jurídica e a separação de papéis garantem a conformidade do projeto.
`;
    navigator.clipboard.writeText(promptText);
    alert(`🤖 Prompt para o Gemini gerado e copiado com sucesso para a área de transferência!\n\nCole o prompt em uma nova conversa com o Gemini para gerar o relatório profissional do projeto "${proj.name}".`);
  };

  const handleAddMilestone = () => {
    setMilestones([...milestones, { title: '', description: '', due_date: '', status: 'Pendente', progress: 0, order_index: milestones.length, artifacts: [] }]);
  };
  const handleUpdateMilestone = (index: number, field: string, value: any) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'status' && value === 'Concluído') updated[index].progress = 100;
    setMilestones(updated);
  };
  const handleRemoveMilestone = (index: number) => setMilestones(milestones.filter((_, i) => i !== index));

  const handleAddArtifact = (milestoneIndex: number) => {
    const updated = [...milestones];
    updated[milestoneIndex].artifacts.push({ document_title: '', description: '', status: 'Pendente' });
    setMilestones(updated);
  };
  const handleUpdateArtifact = (mIndex: number, aIndex: number, field: string, value: string) => {
    const updated = [...milestones];
    updated[mIndex].artifacts[aIndex] = { ...updated[mIndex].artifacts[aIndex], [field]: value };
    setMilestones(updated);
  };
  const handleRemoveArtifact = (mIndex: number, aIndex: number) => {
    const updated = [...milestones];
    updated[mIndex].artifacts.splice(aIndex, 1);
    setMilestones(updated);
  };

  const handleAddCR = () => { setChangeRequests([...changeRequests, { cr_number: `CR-${String(changeRequests.length + 1).padStart(2, '0')}`, title: '', description: '', financial_impact: 0, schedule_impact: '', status: 'Pendente' }]); };
  const handleUpdateCR = (index: number, field: string, value: any) => { const updated = [...changeRequests]; updated[index] = { ...updated[index], [field]: value }; setChangeRequests(updated); };
  const handleRemoveCR = (index: number) => setChangeRequests(changeRequests.filter((_, i) => i !== index));

  const handleAddRisk = () => { setRisks([...risks, { title: '', description: '', probability: 'Média', impact: 'Médio', mitigation_plan: '', status: 'Aberto', order_index: risks.length }]); };
  const handleUpdateRisk = (index: number, field: string, value: any) => { const updated = [...risks]; updated[index] = { ...updated[index], [field]: value }; setRisks(updated); };
  const handleRemoveRisk = (index: number) => setRisks(risks.filter((_, i) => i !== index));

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const baselineNum = parseFloat(newProject.budget_baseline);
    
    const projectData: any = { 
      client_id: newProject.client_id, name: newProject.name, 
      budget_baseline: baselineNum, budget_consumed: parseFloat(newProject.budget_consumed || '0'),
      objective: newProject.objective, in_scope: newProject.in_scope, out_scope: newProject.out_scope
    };
    
    let targetProjectId = editingProject?.id;

    if (editingProject) { 
      await supabase.from('projects').update(projectData).eq('id', editingProject.id); 
    } else { 
      projectData.status = 'Fase 1';
      projectData.original_baseline = baselineNum;
      const { data: newProj, error } = await supabase.from('projects').insert([projectData]).select().single();
      if (error) { alert('Erro ao criar projeto: ' + error.message); return; }
      targetProjectId = newProj.id;
    }

    if (targetProjectId) {
      await supabase.from('project_milestones').delete().eq('project_id', targetProjectId);
      if (milestones.length > 0) {
        const msToInsert = milestones.map((m, idx) => ({
          project_id: targetProjectId, title: m.title, description: m.description,
          due_date: m.due_date, status: m.status, progress: parseInt(m.progress as any) || 0, order_index: idx
        }));
        await supabase.from('project_milestones').insert(msToInsert);
      }

      const gatesToUpsert: any[] = [];
      const gateIdsToKeep: string[] = [];
      
      milestones.forEach((m, idx) => {
        m.artifacts.forEach(a => {
          const gate: any = { project_id: targetProjectId, phase_number: idx + 1, document_title: a.document_title, description: a.description, status: a.status || 'Pendente' };
          if (a.id) { gate.id = a.id; gateIdsToKeep.push(a.id); }
          gatesToUpsert.push(gate);
        });
      });

      if (editingProject) {
        if (gateIdsToKeep.length > 0) {
          const { data: allGates } = await supabase.from('phase_gates').select('id').eq('project_id', targetProjectId);
          const idsToDelete = (allGates || []).map(g => g.id).filter(id => !gateIdsToKeep.includes(id));
          if (idsToDelete.length > 0) await supabase.from('phase_gates').delete().in('id', idsToDelete);
        } else {
          await supabase.from('phase_gates').delete().eq('project_id', targetProjectId);
        }
      }
      if (gatesToUpsert.length > 0) await supabase.from('phase_gates').upsert(gatesToUpsert);

      await supabase.from('change_requests').delete().eq('project_id', targetProjectId);
      if (changeRequests.length > 0) {
        const crToInsert = changeRequests.map(cr => ({
          project_id: targetProjectId, cr_number: cr.cr_number, title: cr.title, description: cr.description, financial_impact: parseFloat(cr.financial_impact as any) || 0, schedule_impact: cr.schedule_impact, status: cr.status
        }));
        await supabase.from('change_requests').insert(crToInsert);
      }

      await supabase.from('project_risks').delete().eq('project_id', targetProjectId);
      if (risks.length > 0) {
        const riskToInsert = risks.map((r, idx) => ({
          project_id: targetProjectId, title: r.title, description: r.description, probability: r.probability, impact: r.impact, mitigation_plan: r.mitigation_plan, status: r.status, order_index: idx
        }));
        await supabase.from('project_risks').insert(riskToInsert);
      }
    }

    setProjectModalOpen(false); 
    fetchData();
  };

  const handleDeleteProject = async (id: string) => { if (confirm('Excluir este projeto?')) { await supabase.from('projects').delete().eq('id', id); fetchData(); } };

  return (
    <main className="min-h-screen bg-[#0f172a] font-sans text-white flex flex-col">
      <header className="px-8 py-6 border-b border-slate-700 bg-[#1e293b] flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><svg className="w-6 h-6 text-[#fbbf24]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg> Sync <span className="text-[#fbbf24]">HQ</span></h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Painel Administrativo Central</p>
        </div>
        <button onClick={() => router.push('/dashboard')} className="text-sm font-bold text-slate-400 hover:text-white transition">Sair do HQ →</button>
      </header>

      <div className="px-8 pt-6 border-b border-slate-800 flex gap-6">
        <button onClick={() => setActiveTab('projetos')} className={`pb-4 text-sm font-bold uppercase transition-all border-b-2 ${activeTab === 'projetos' ? 'border-[#fbbf24] text-[#fbbf24]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Gestão de Projetos</button>
        <button onClick={() => setActiveTab('clientes')} className={`pb-4 text-sm font-bold uppercase transition-all border-b-2 ${activeTab === 'clientes' ? 'border-[#fbbf24] text-[#fbbf24]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Base de Clientes</button>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        {loading ? ( <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#fbbf24] border-t-transparent rounded-full animate-spin"></div></div> ) : (
          <div className="max-w-6xl mx-auto space-y-6">
            
            {activeTab === 'clientes' && (
              <>
                <div className="flex justify-between items-end mb-6"><div><h2 className="text-xl font-bold text-white">Clientes Cadastrados</h2><p className="text-sm text-slate-400">Gerencie as empresas e provisione acessos.</p></div><button onClick={openNewClientModal} className="bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f172a] font-bold py-2 px-4 rounded-lg text-sm shadow">+ Novo Cliente</button></div>
                <div className="bg-[#1e293b] border border-slate-700 rounded-xl overflow-hidden shadow-xl">
                  <table className="w-full text-left border-collapse">
                    <thead><tr className="bg-[#0f172a] border-b border-slate-700 text-xs uppercase text-slate-400"><th className="p-4 font-semibold">Empresa</th><th className="p-4 font-semibold">CNPJ</th><th className="p-4 font-semibold">Contato Diretor</th><th className="p-4 font-semibold text-right">Ações</th></tr></thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {clientes.map(cli => (<tr key={cli.id} className="hover:bg-slate-800/50 transition"><td className="p-4 font-bold text-slate-200">{cli.name}</td><td className="p-4 font-mono text-sm text-slate-400">{cli.cnpj || '-'}</td><td className="p-4 text-sm text-slate-300">{cli.contact_name} <br/> <span className="text-xs text-slate-500">{cli.contact_email}</span></td><td className="p-4 text-right space-x-4"><button onClick={() => openEditClientModal(cli)} className="text-blue-400 hover:text-blue-300 text-sm font-semibold transition">Editar</button><button onClick={() => handleDeleteClient(cli.id)} className="text-red-500 hover:text-red-400 text-sm font-semibold transition">Excluir</button></td></tr>))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeTab === 'projetos' && (
              <>
                <div className="flex justify-between items-end mb-6"><div><h2 className="text-xl font-bold text-white">Projetos Ativos</h2><p className="text-sm text-slate-400">Vincule novos projetos e monitore a governança.</p></div><button onClick={openNewProjectModal} className="bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f172a] font-bold py-2 px-4 rounded-lg text-sm shadow">+ Novo Projeto</button></div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {projetos.map(proj => {
                    const faseAtualNum = parseInt(proj.status.replace(/\D/g, '')) || 1;
                    const artifactsFaseAtual = proj.phase_gates?.filter(g => g.phase_number === faseAtualNum) || [];
                    const totalArtifacts = artifactsFaseAtual.length;
                    const totalPdfs = artifactsFaseAtual.filter(g => g.file_path).length;
                    const readyForApproval = totalArtifacts > 0 && totalArtifacts === totalPdfs;
                    const rejectedCount = artifactsFaseAtual.filter(g => g.status === 'Rejeitado').length;

                    const projMilestones = proj.project_milestones || [];
                    const progressoFisicoPMO = projMilestones.length > 0 ? Math.round(projMilestones.reduce((acc, m) => acc + (m.progress || 0), 0) / projMilestones.length) : 0;

                    return (
                    <div key={proj.id} className={`bg-[#1e293b] border ${rejectedCount > 0 ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-slate-700 shadow-lg'} rounded-xl p-6 relative group flex flex-col`}>
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditProjectModal(proj)} className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded transition" title="Editar Projeto">✎</button>
                        <button onClick={() => handleDeleteProject(proj.id)} className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded transition" title="Excluir">✕</button>
                      </div>
                      
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{proj.clients?.name || 'Cliente Removido'}</div>
                      <h3 className="text-xl font-extrabold text-white mb-1 pr-16">{proj.name}</h3>
                      <div className="text-xs text-slate-400 mb-5">Sponsor: <span className="text-slate-200 font-semibold">{proj.clients?.contact_name || 'Não informado'}</span></div>

                      {rejectedCount > 0 && (
                        <div className="mb-4 bg-red-950/40 border border-red-500/50 rounded-lg p-3 flex items-center gap-3 text-red-400">
                          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                          <span className="text-xs font-bold uppercase tracking-wider">{rejectedCount} Documento(s) Rejeitado(s)! Correção pendente.</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 mb-4 mt-auto">
                        <div className="bg-[#0f172a] p-3 rounded-lg border border-slate-700">
                          <span className="block text-[10px] text-slate-400 uppercase font-bold">Status</span>
                          <span className="font-bold text-emerald-400 text-sm">{proj.status}</span>
                        </div>
                        <div className="bg-[#0f172a] p-3 rounded-lg border border-slate-700">
                          <span className="block text-[10px] text-slate-400 uppercase font-bold">Consumido / Baseline</span>
                          <span className="font-mono text-slate-200 text-xs">
                            {(proj.budget_consumed || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })} 
                            <span className="text-slate-500"> / </span> 
                            {proj.budget_baseline.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>

                      <div className="mb-4 bg-[#0f172a] p-3 rounded-lg border border-slate-700">
                        <div className="flex justify-between items-center text-xs mb-1.5">
                          <span className="text-slate-400 uppercase font-bold text-[10px]">Progresso Físico Geral</span>
                          <span className="text-emerald-400 font-bold">{progressoFisicoPMO}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(progressoFisicoPMO, 100)}%` }}></div>
                        </div>
                      </div>

                      <div className="mb-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700 flex justify-between items-center">
                         <span className="text-[11px] text-slate-400 font-bold uppercase">Arquivos (Fase Atual)</span>
                         {totalArtifacts === 0 ? (
                            <span className="text-[11px] font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded">Sem artefatos</span>
                         ) : (
                            <span className={`text-[11px] font-bold px-2 py-1 rounded ${readyForApproval ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/30' : 'bg-amber-900/30 text-amber-400 border border-amber-500/30'}`}>
                              {totalPdfs} de {totalArtifacts} PDFs anexados
                            </span>
                         )}
                      </div>

                      <button 
                        onClick={() => handleGenerateGeminiPrompt(proj)} 
                        className="w-full mb-2 bg-[#fbbf24]/10 hover:bg-[#fbbf24]/20 text-[#fbbf24] border border-[#fbbf24]/40 font-bold py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-2 shadow"
                      >
                        🤖 Gerar Prompt para o Gemini (Relatório)
                      </button>

                      <button 
                        onClick={() => router.push('/sync-hq/relatorio?projectId=' + proj.id)} 
                        className="w-full mb-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-2 shadow"
                      >
                        📄 Gerar Status Report Executivo
                      </button>

                      <button onClick={() => router.push('/sync-hq/governanca?projectId=' + proj.id)} className={`w-full text-slate-200 font-bold py-2.5 rounded-lg text-sm transition border ${rejectedCount > 0 ? 'bg-red-900 hover:bg-red-800 border-red-500 text-white' : 'bg-slate-800 hover:bg-slate-700 border-slate-600'}`}>
                        {rejectedCount > 0 ? 'Abrir Governança e Corrigir' : 'Configurar Governança'}
                      </button>
                    </div>
                  )})}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* MODAL DE CLIENTE */}
      {isClientModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"><form onSubmit={handleSaveClient} className="bg-[#1e293b] border border-slate-700 p-8 rounded-2xl max-w-md w-full shadow-2xl"><h3 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-3">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h3><div className="space-y-4 mb-8"><div><label className="block text-xs font-bold text-slate-400 mb-1">Nome da Empresa</label><input required type="text" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} className="w-full bg-[#0f172a] border border-slate-600 rounded p-2 text-white text-sm" /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-400 mb-1">Contato Diretor</label><input required type="text" value={newClient.contact_name} onChange={e => setNewClient({...newClient, contact_name: e.target.value})} className="w-full bg-[#0f172a] border border-slate-600 rounded p-2 text-white text-sm" /></div><div><label className="block text-xs font-bold text-slate-400 mb-1">E-mail</label><input required type="email" value={newClient.contact_email} onChange={e => setNewClient({...newClient, contact_email: e.target.value})} className="w-full bg-[#0f172a] border border-slate-600 rounded p-2 text-white text-sm" /></div></div><div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg"><label className="block text-[11px] uppercase tracking-wider text-blue-300 font-bold mb-1">{editingClient ? 'Redefinir Senha (Opcional)' : 'Senha Provisória'}</label><input required={!editingClient} type="text" value={newClient.password} onChange={e => setNewClient({...newClient, password: e.target.value})} className="w-full bg-[#0f172a] border border-blue-500/50 rounded p-2 text-white text-sm" /></div></div><div className="flex gap-3"><button type="button" onClick={() => setClientModalOpen(false)} className="flex-1 py-2.5 bg-transparent border border-slate-600 text-slate-300 rounded font-bold hover:bg-slate-700 transition">Cancelar</button><button type="submit" className="flex-1 py-2.5 bg-[#fbbf24] text-[#0f172a] rounded font-extrabold hover:bg-[#f59e0b] transition">Salvar</button></div></form></div>
      )}

      {/* MODAL DE PROJETO */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveProject} className="bg-[#1e293b] border border-slate-700 p-8 rounded-2xl max-w-4xl w-full shadow-2xl max-h-[90vh] flex flex-col">
            
            <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-3">
              <h3 className="text-xl font-bold text-white">{editingProject ? 'Editar Projeto & Governança' : 'Novo Projeto & Governança'}</h3>
              <button type="button" onClick={() => setProjectModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="flex gap-2 border-b border-slate-700 pb-3 mb-6 overflow-x-auto">
              <button type="button" onClick={() => setModalTab('geral')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition ${modalTab === 'geral' ? 'bg-[#fbbf24] text-[#0f172a]' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                1. Geral & Escopo
              </button>
              <button type="button" onClick={() => setModalTab('roadmap')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition flex items-center gap-2 ${modalTab === 'roadmap' ? 'bg-[#fbbf24] text-[#0f172a]' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                2. Roadmap & Portões <span className="bg-slate-900 text-white px-1.5 py-0.5 rounded text-[10px]">{milestones.length}</span>
              </button>
              <button type="button" onClick={() => setModalTab('crs')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition flex items-center gap-2 ${modalTab === 'crs' ? 'bg-[#fbbf24] text-[#0f172a]' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                3. Aditivos (CRs) <span className="bg-slate-900 text-white px-1.5 py-0.5 rounded text-[10px]">{changeRequests.length}</span>
              </button>
              <button type="button" onClick={() => setModalTab('riscos')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition flex items-center gap-2 ${modalTab === 'riscos' ? 'bg-[#fbbf24] text-[#0f172a]' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                4. Matriz de Riscos <span className="bg-slate-900 text-white px-1.5 py-0.5 rounded text-[10px]">{risks.length}</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              
              {modalTab === 'geral' && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Cliente</label>
                      <select required value={newProject.client_id} onChange={e => setNewProject({...newProject, client_id: e.target.value})} className="w-full bg-[#0f172a] border border-slate-600 rounded p-2.5 text-white text-sm">
                        <option value="">-- Selecione --</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Nome do Projeto</label>
                      <input required type="text" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} className="w-full bg-[#0f172a] border border-slate-600 rounded p-2.5 text-white text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Baseline / Orçamento Total (R$)</label>
                      <input required type="number" step="0.01" value={newProject.budget_baseline} onChange={e => setNewProject({...newProject, budget_baseline: e.target.value})} className="w-full bg-[#0f172a] border border-slate-600 rounded p-2.5 text-white text-sm font-mono" placeholder="Ex: 1000000.00" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#fbbf24] mb-1">Valor Consumido Atual (R$)</label>
                      <input required type="number" step="0.01" value={newProject.budget_consumed} onChange={e => setNewProject({...newProject, budget_consumed: e.target.value})} className="w-full bg-[#0f172a] border border-[#fbbf24]/50 rounded p-2.5 text-white text-sm font-mono" placeholder="Ex: 350000.00" />
                    </div>
                  </div>

                  <div className="border-t border-slate-700 pt-4 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#fbbf24]">Escopo Contratual</h4>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Objetivo Executivo</label>
                      <textarea rows={2} value={newProject.objective} onChange={e => setNewProject({...newProject, objective: e.target.value})} className="w-full bg-[#0f172a] border border-slate-600 rounded p-2.5 text-white text-sm resize-none" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-emerald-400 mb-1">Dentro do Escopo (In-Scope)</label>
                        <textarea rows={3} value={newProject.in_scope} onChange={e => setNewProject({...newProject, in_scope: e.target.value})} className="w-full bg-[#0f172a] border border-emerald-500/40 rounded p-2.5 text-white text-sm resize-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-red-400 mb-1">Fora do Escopo (Out-of-Scope)</label>
                        <textarea rows={3} value={newProject.out_scope} onChange={e => setNewProject({...newProject, out_scope: e.target.value})} className="w-full bg-[#0f172a] border border-red-500/40 rounded p-2.5 text-white text-sm resize-none" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'roadmap' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#fbbf24]">Roadmap Orientado a Marcos (Milestones & Tollgates)</h4>
                      <p className="text-[11px] text-slate-400">Defina as Fases/Marcos e anexe os artefatos de governança exigidos para liberar cada uma.</p>
                    </div>
                    <button type="button" onClick={handleAddMilestone} className="text-xs bg-[#fbbf24]/20 text-[#fbbf24] hover:bg-[#fbbf24]/30 font-bold px-3 py-1.5 rounded transition border border-[#fbbf24]/40">+ Adicionar Fase/Marco</button>
                  </div>

                  {milestones.length === 0 ? (
                    <p className="text-xs text-slate-500 italic bg-slate-900/50 p-8 rounded-lg border border-slate-800 text-center">O Roadmap executivo ainda não foi planejado.</p>
                  ) : (
                    <div className="space-y-6">
                      {milestones.map((m, mIndex) => (
                        <div key={mIndex} className="bg-slate-900/80 p-5 rounded-xl border-2 border-slate-700 relative">
                          <button type="button" onClick={() => handleRemoveMilestone(mIndex)} className="absolute top-4 right-4 text-red-400 hover:text-red-300 text-xs font-bold bg-red-950/30 px-2 py-1 rounded">✕ Remover Fase</button>
                          
                          <div className="flex items-center gap-3 mb-4">
                            <span className="w-8 h-8 rounded-full bg-[#1e293b] border-2 border-[#fbbf24] text-[#fbbf24] font-black flex items-center justify-center text-sm shrink-0">{mIndex + 1}</span>
                            <h5 className="font-extrabold text-white uppercase tracking-wider">Configuração da Fase {mIndex + 1}</h5>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pr-16 mb-5">
                            <div className="md:col-span-2">
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Título da Fase / Marco</label>
                              <input type="text" required value={m.title} onChange={e => handleUpdateMilestone(mIndex, 'title', e.target.value)} placeholder="Ex: Iniciação e Planejamento" className="w-full bg-[#0f172a] border border-slate-600 rounded p-2 text-white text-xs" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Previsão</label>
                              <input type="text" value={m.due_date || ''} onChange={e => handleUpdateMilestone(mIndex, 'due_date', e.target.value)} placeholder="Ex: 30/08/2026" className="w-full bg-[#0f172a] border border-slate-600 rounded p-2 text-white text-xs" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-[#fbbf24] uppercase font-bold mb-1">% Avanço Físico</label>
                              <input type="number" min="0" max="100" value={m.progress ?? 0} onChange={e => handleUpdateMilestone(mIndex, 'progress', e.target.value)} className="w-full bg-[#0f172a] border border-[#fbbf24]/50 rounded p-2 text-white text-xs font-mono font-bold text-center" />
                            </div>
                          </div>

                          <div className="bg-[#1e293b] p-4 rounded-lg border border-slate-700">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Artefatos Obrigatórios (Portões desta Fase)</span>
                              <button type="button" onClick={() => handleAddArtifact(mIndex)} className="text-[10px] bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50 font-bold px-2 py-1 rounded border border-emerald-500/30">+ Adicionar Artefato</button>
                            </div>
                            
                            {m.artifacts.length === 0 ? (
                              <p className="text-[11px] text-slate-500 italic">Nenhum artefato configurado. Esta fase não terá bloqueio documental de faturamento.</p>
                            ) : (
                              <div className="space-y-2">
                                {m.artifacts.map((art, aIndex) => (
                                  <div key={aIndex} className="flex items-center gap-3 bg-[#0f172a] p-2 rounded border border-slate-600">
                                    <input type="text" required value={art.document_title} onChange={e => handleUpdateArtifact(mIndex, aIndex, 'document_title', e.target.value)} placeholder="Nome do Documento (Ex: Termo de Abertura)" className="flex-1 bg-transparent border-none text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-2" />
                                    <input type="text" value={art.description} onChange={e => handleUpdateArtifact(mIndex, aIndex, 'description', e.target.value)} placeholder="Breve objetivo..." className="flex-1 bg-transparent border-none text-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-2" />
                                    <button type="button" onClick={() => handleRemoveArtifact(mIndex, aIndex)} className="text-red-500 hover:text-red-400 font-bold px-2">✕</button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {modalTab === 'crs' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#fbbf24]">Solicitações de Mudança (Change Requests / Aditivos)</h4>
                      <p className="text-[11px] text-slate-400">Aditivos pendentes para aprovação do Diretor na Central de Assinaturas.</p>
                    </div>
                    <button type="button" onClick={handleAddCR} className="text-xs bg-[#fbbf24]/20 text-[#fbbf24] hover:bg-[#fbbf24]/30 font-bold px-3 py-1.5 rounded transition border border-[#fbbf24]/40">+ Protocolar CR</button>
                  </div>

                  {changeRequests.length === 0 ? (
                    <p className="text-xs text-slate-500 italic bg-slate-900/50 p-8 rounded-lg border border-slate-800 text-center">Nenhum aditivo protocolado para este projeto.</p>
                  ) : (
                    <div className="space-y-3">
                      {changeRequests.map((cr, index) => (
                        <div key={index} className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 space-y-3 relative">
                          <button type="button" onClick={() => handleRemoveCR(index)} className="absolute top-3 right-3 text-red-400 hover:text-red-300 text-xs font-bold">✕</button>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pr-10">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">ID</label>
                              <input type="text" readOnly value={cr.cr_number} className="w-full bg-[#0f172a] border border-slate-600 rounded p-2 text-[#fbbf24] text-xs font-bold" />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Título da Mudança</label>
                              <input type="text" required value={cr.title} onChange={e => handleUpdateCR(index, 'title', e.target.value)} placeholder="Ex: Aditivo de Escopo - Módulo BI" className="w-full bg-[#0f172a] border border-slate-600 rounded p-2 text-white text-xs" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-[#fbbf24] uppercase font-bold mb-1">Impacto (R$)</label>
                              <input type="number" step="0.01" value={cr.financial_impact} onChange={e => handleUpdateCR(index, 'financial_impact', e.target.value)} placeholder="Ex: 150000.00" className="w-full bg-[#0f172a] border border-[#fbbf24]/50 rounded p-2 text-white text-xs font-mono font-bold" />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input type="text" value={cr.description || ''} onChange={e => handleUpdateCR(index, 'description', e.target.value)} placeholder="Justificativa e escopo aditivado" className="w-full bg-[#0f172a] border border-slate-600 rounded p-2 text-white text-xs" />
                            <div className="flex items-center justify-between bg-[#0f172a] px-3 rounded border border-slate-600">
                              <span className="text-[10px] uppercase font-bold text-slate-400">Status do CR:</span>
                              <span className={`text-xs font-bold ${cr.status === 'Aprovado' ? 'text-emerald-400' : cr.status === 'Rejeitado' ? 'text-red-400' : 'text-amber-400'}`}>{cr.status}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {modalTab === 'riscos' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#fbbf24]">Matriz de Riscos e Impedimentos (Issue & Risk Log)</h4>
                      <p className="text-[11px] text-slate-400">Mapeie ameaças, probabilidade, impacto e plano de mitigação.</p>
                    </div>
                    <button type="button" onClick={handleAddRisk} className="text-xs bg-[#fbbf24]/20 text-[#fbbf24] hover:bg-[#fbbf24]/30 font-bold px-3 py-1.5 rounded transition border border-[#fbbf24]/40">+ Adicionar Risco</button>
                  </div>

                  {risks.length === 0 ? (
                    <p className="text-xs text-slate-500 italic bg-slate-900/50 p-8 rounded-lg border border-slate-800 text-center">Nenhum risco mapeado para este projeto.</p>
                  ) : (
                    <div className="space-y-3">
                      {risks.map((r, index) => (
                        <div key={index} className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 space-y-3 relative">
                          <button type="button" onClick={() => handleRemoveRisk(index)} className="absolute top-3 right-3 text-red-400 hover:text-red-300 text-xs font-bold">✕</button>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pr-10">
                            <div className="md:col-span-2">
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Título do Risco / Ameaça</label>
                              <input type="text" required value={r.title} onChange={e => handleUpdateRisk(index, 'title', e.target.value)} placeholder="Ex: Atraso na liberação de infraestrutura" className="w-full bg-[#0f172a] border border-slate-600 rounded p-2 text-white text-xs" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Status</label>
                              <select value={r.status} onChange={e => handleUpdateRisk(index, 'status', e.target.value)} className="w-full bg-[#0f172a] border border-slate-600 rounded p-2 text-white text-xs font-bold">
                                <option value="Aberto">Aberto</option>
                                <option value="Mitigado">Mitigado</option>
                                <option value="Ocorrido">Ocorrido</option>
                                <option value="Fechado">Fechado</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Probabilidade</label>
                              <select value={r.probability} onChange={e => handleUpdateRisk(index, 'probability', e.target.value)} className="w-full bg-[#0f172a] border border-slate-600 rounded p-2 text-white text-xs font-bold">
                                <option value="Baixa">Baixa</option>
                                <option value="Média">Média</option>
                                <option value="Alta">Alta</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Impacto</label>
                              <select value={r.impact} onChange={e => handleUpdateRisk(index, 'impact', e.target.value)} className="w-full bg-[#0f172a] border border-slate-600 rounded p-2 text-white text-xs font-bold">
                                <option value="Baixo">Baixo</option>
                                <option value="Médio">Médio</option>
                                <option value="Alto">Alto</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-[#fbbf24] uppercase font-bold mb-1">Plano de Mitigação / Ação Preventiva</label>
                            <textarea rows={2} value={r.mitigation_plan || ''} onChange={e => handleUpdateRisk(index, 'mitigation_plan', e.target.value)} placeholder="Descreva a estratégia..." className="w-full bg-[#0f172a] border border-slate-600 rounded p-2 text-white text-xs resize-none" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
            
            <div className="flex gap-3 pt-4 mt-4 border-t border-slate-700">
              <button type="button" onClick={() => setProjectModalOpen(false)} className="flex-1 py-2.5 bg-transparent border border-slate-600 text-slate-300 rounded font-bold hover:bg-slate-700 transition">Cancelar</button>
              <button type="submit" className="flex-1 py-2.5 bg-[#fbbf24] text-[#0f172a] rounded font-extrabold hover:bg-[#f59e0b] transition">Salvar Projeto & Governança</button>
            </div>

          </form>
        </div>
      )}
    </main>
  );
}