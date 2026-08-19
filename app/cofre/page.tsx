"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Conexão direta com o Supabase para validação de segurança
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function CofrePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Trava de Segurança: Verifica se o usuário tem permissão para estar aqui
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
      } else {
        setUserEmail(session.user.email || 'Assinante Executivo');
        setLoading(false);
      }
    };
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const documentos = [
    // ARQUIVOS WORD (.dotx)
    { nome: "ACE - Termo de Aceite.dotx", tipo: "word", link: "https://drive.google.com/file/d/1JIPE1cdyb9Um5wJ0JO28-kvPewwfFP90/view?usp=sharing" },
    { nome: "ACEFP - Aceite Final de Projeto.dotx", tipo: "word", link: "https://drive.google.com/file/d/1iiBDb9Rs2mFZD1ph5sbFUnxHVS1VXDiY/view?usp=sharing" },
    { nome: "ATA - Ata de Reunião.dotx", tipo: "word", link: "https://drive.google.com/file/d/17wWT6YxSdCXMtfAX5H7lAb9UOfdIgir9/view?usp=sharing" },
    { nome: "CRIACE - Critérios de Aceite.dotx", tipo: "word", link: "https://drive.google.com/file/d/1StWiNvw32PY0YXGN8ZakAOoi8ozTLWh_/view?usp=sharing" },
    { nome: "DOC - Documento.dotx", tipo: "word", link: "https://drive.google.com/file/d/1gaOXiUECJn7GefqNquKSAC3voCiU08g4/view?usp=sharing" },
    { nome: "EMT - Ementa.dotx", tipo: "word", link: "https://drive.google.com/file/d/12YLqYhloP1DrOOVgVh84ZGlrXgnK5BMe/view?usp=sharing" },
    { nome: "ESPETPFLX - Especificação de Etapa do Fluxo.dotx", tipo: "word", link: "https://drive.google.com/file/d/1HAS12UN4Oc-oeDJsvqIYj5SCKvbqPHxI/view?usp=sharing" },
    { nome: "ESPFLX - Especificação de Fluxo.dotx", tipo: "word", link: "https://drive.google.com/file/d/1dWZjjBz4RCWV59da1DJ8yoyCYS5hV3nZ/view?usp=sharing" },
    { nome: "ESPFUN - Especificação Funcional de Requisito.dotx", tipo: "word", link: "https://drive.google.com/file/d/1YzIAkJQv2mqzlBxPdzM3PX1i47Gnl2zd/view?usp=sharing" },
    { nome: "ESPINT - Documento de Especificação de Integração.dotx", tipo: "word", link: "https://drive.google.com/file/d/1dKQGh4dDebRubGOGMTUYYVnhYXkMoVrS/view?usp=sharing" },
    { nome: "ESPPAR - Especificação de Parametrização.dotx", tipo: "word", link: "https://drive.google.com/file/d/1NNDebh8MCI1LbOTonTGH5ZINuBAwg2fL/view?usp=sharing" },
    { nome: "ESPWS - Especificação de Web Service.dotx", tipo: "word", link: "https://drive.google.com/file/d/1LmMd-ggZrkZ4HFhUKystnR2OFa1C2fIB/view?usp=sharing" },
    { nome: "GMUD - Gestão de Mudança.dotx", tipo: "word", link: "https://drive.google.com/file/d/1CIKed2mSsVh9XdoqNSqHFzq7MZmh2ccf/view?usp=sharing" },
    { nome: "GTM - Go To Marketing.dotx", tipo: "word", link: "https://drive.google.com/file/d/1aDXU7NS55lhlHFpLGfpzwPFTKPbWntkw/view?usp=sharing" },
    { nome: "LISTDEF - Lista de Defeitos.dotx", tipo: "word", link: "https://drive.google.com/file/d/1BEXCldvwEKlLDax7s4JsPBZxs_DTh916/view?usp=sharing" },
    { nome: "LISTOCRR - Lista de Ocorrências.dotx", tipo: "word", link: "https://drive.google.com/file/d/1vRunWUW3VqkikTGVCccxq5Nj9VjOU2Tp/view?usp=sharing" },
    { nome: "LSTPRS - Lista de Presença.dotx", tipo: "word", link: "https://drive.google.com/file/d/1pd4RdfqM8HnF-p4Ntwg0g_svvx0mQEMG/view?usp=sharing" },
    { nome: "PGP - Plano de Gerenciamento do Projeto.dotx", tipo: "word", link: "https://drive.google.com/file/d/1GszcO1NMJh_KAFLAt-brTbl8TBWbkged/view?usp=sharing" },
    { nome: "PPS - Proposta de Prestação de Serviço.dotx", tipo: "word", link: "https://drive.google.com/file/d/1FTkqrABiqdNRnTTh1ubuCP3DaOJlFcOT/view?usp=sharing" },
    { nome: "PT - Plano de Transição.dotx", tipo: "word", link: "https://drive.google.com/file/d/1G6EnNPcjFeimNh4S0v-cIL53ez8VBQB-/view?usp=sharing" },
    { nome: "RAT - Relatório de Atividades Técnicas.dotx", tipo: "word", link: "https://drive.google.com/file/d/132oAGzG8kBpbuAWflNGX0D0rPruGJ-01/view?usp=sharing" },
    { nome: "REQ - Documento de Requisitos.dotx", tipo: "word", link: "https://drive.google.com/file/d/1LJGdMwdC2A5doqCnIG9eD16IB7Rs4cox/view?usp=sharing" },
    { nome: "REQMUD - Requisição de Mudança.dotx", tipo: "word", link: "https://drive.google.com/file/d/1R4DaRshfT1MGARHl1XCiTW1USFR9ooCu/view?usp=sharing" },
    { nome: "RES - Resumo Executivo do Serviço.dotx", tipo: "word", link: "https://drive.google.com/file/d/1IBldt-NGnIProw0HIFIx9M6z-rYkh2Ld/view?usp=sharing" },
    { nome: "RISCO - Controle de Riscos.dotx", tipo: "word", link: "https://drive.google.com/file/d/16INdpzB0UmdZ3DBAMaUhBc3FJMHn5bH8/view?usp=sharing" },
    { nome: "SRE - Status Report Executivo.dotx", tipo: "word", link: "https://drive.google.com/file/d/1nyfcJtA4PU0t5ntU3GPvlM0VZJIdRVRn/view?usp=sharing" },
    { nome: "SRP - Status Report de Projeto.dotx", tipo: "word", link: "https://drive.google.com/file/d/1FOBThXFjhdzZ0ZjVFe6xqpSd8RJkpRdJ/view?usp=sharing" },
    { nome: "TAP - Termo de Abertura de Projeto.dotx", tipo: "word", link: "https://drive.google.com/file/d/1EnqvYH1camhQnkrZBddw5X16Lqarzk4K/view?usp=sharing" },
    { nome: "TEE - Termo de Entrega.dotx", tipo: "word", link: "https://drive.google.com/file/d/1Qk33VAfwtxfNC4hBLB-Tr2o4vxPy8MNw/view?usp=sharing" },

    // ARQUIVOS EXCEL (.xltx / .xlsx)
    { nome: "ANACSTDRT - Análise de Custo Direto.xltx", tipo: "excel", link: "https://drive.google.com/file/d/1GwwXujoAdIEkGEHAHhG8yJxn3CU4A6M5/view?usp=sharing" },
    { nome: "ANAFIN - Análise Financeira de Projeto.xltx", tipo: "excel", link: "https://drive.google.com/file/d/1PWt-VzIUw_Er9w_mTGO5szvS3aXOqCEs/view?usp=sharing" },
    { nome: "ANAMC - Análise de Margem de Contribuição.xltx", tipo: "excel", link: "https://drive.google.com/file/d/1xb7hTdJ2EmrOPjfPg1_xQl91-uk8ijPP/view?usp=sharing" },
    { nome: "ANAPRC - Análise de Preço.xltx", tipo: "excel", link: "https://drive.google.com/file/d/1lGPF_YE33UmfFiQLM307Eoze0eE2UEa-/view?usp=sharing" },
    { nome: "APREQ - Análise Preliminar de Requisitos.xltx", tipo: "excel", link: "https://drive.google.com/file/d/1Gbf_7m-_RWf8w3Do3Iyw055WAcCdqWbo/view?usp=sharing" },
    { nome: "BCOHRS - Controle de Banco de Horas.xlsx", tipo: "excel", link: "https://docs.google.com/spreadsheets/d/1grRndrBJ8UuvDYWpGHHAeDD20hAAwNS1/edit?usp=sharing&ouid=117059538332552053296&rtpof=true&sd=true" },
    { nome: "CEN - Cenário de Teste.xltx", tipo: "excel", link: "https://drive.google.com/file/d/1CqoOxLoJlqN6Uue3x60Em1K7-gnba33T/view?usp=sharing" },
    { nome: "CTRLPEND - Controle de Pendências.xltx", tipo: "excel", link: "https://drive.google.com/file/d/1T7cGdpH80rFQHIeEobD9EXC3FSTms7Dq/view?usp=sharing" },
    { nome: "CTS - Controle de Teste de Software.xltx", tipo: "excel", link: "https://drive.google.com/file/d/14tECf_iXg04r_EZq7EKNAXGcnZYRnat-/view?usp=sharing" },
    { nome: "ESTESF - Estimativa de Esforço.xltx", tipo: "excel", link: "https://drive.google.com/file/d/1Ih6ksWcLL7vDu6aMCVbVgNfJXJQi_844/view?usp=sharing" },
    { nome: "ESTSFW - Estimativa de Software.xltx", tipo: "excel", link: "https://drive.google.com/file/d/1eQ-z1q8U0nDGQ7PGA7EU16Nghg-OJr0Q/view?usp=sharing" },
    { nome: "GESCST - Gestão de Custo e Alocação.xltx", tipo: "excel", link: "https://drive.google.com/file/d/11Dyojly8H2ie9KZKa25Gkexy9j72vJAY/view?usp=sharing" },
    { nome: "GESTREQ - Gestão de Requisito (2018).xlsx", tipo: "excel", link: "https://docs.google.com/spreadsheets/d/1FyxSUBJTdmiuMROMze8zYfmlg5WrBium/edit?usp=sharing&ouid=117059538332552053296&rtpof=true&sd=true" },
    { nome: "GESTREQ - Gestão de Requisitos.xltx", tipo: "excel", link: "https://drive.google.com/file/d/119P6C57-plDzBNaHMmxNJ-FoiGMDBIy5/view?usp=sharing" },
    { nome: "LICAPR - Registro de Lições Aprendidas.xltx", excel: "excel", link: "https://drive.google.com/file/d/1X1egiRIAe8wkuY6A2fG5KinWypJuW-NP/view?usp=sharing" },
    { nome: "PESQ - Pesquisa de Satisfação.xlsx", tipo: "excel", link: "https://docs.google.com/spreadsheets/d/1qcsWmlKV0XL0uXxS5U_QdWrSsV3c9-r3/edit?usp=sharing&ouid=117059538332552053296&rtpof=true&sd=true" },
    { nome: "PLANACAO - Plano de Ação.xltx", tipo: "excel", link: "https://drive.google.com/file/d/1mUNbMulRbtweCiH0nlaCejajxU2g3SQC/view?usp=sharing" },
    { nome: "SPRINT - Planejamento da Sprint.xlsx", tipo: "excel", link: "https://docs.google.com/spreadsheets/d/1GCA14Q9qd6-CzDg14OR0_PG4oIpTK9KM/edit?usp=sharing&ouid=117059538332552053296&rtpof=true&sd=true" }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-[#fbbf24] font-bold animate-pulse text-xl">Autenticando Cofre...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20">
      
      {/* HEADER LOGADO */}
      <header className="border-b border-slate-800 bg-slate-900/50 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-xl font-black text-white tracking-wide">
            Sync <span className="text-[#fbbf24]">Projetos</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm text-slate-400 hidden sm:block">{userEmail}</span>
            <button 
              onClick={handleLogout}
              className="text-sm font-bold text-slate-500 hover:text-red-400 transition"
            >
              Sair do Sistema
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 mt-12 space-y-12">
        
        {/* HERO: MENTORIA (ADVISORY) */}
        <section className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-8 md:p-12 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="text-xs font-bold uppercase tracking-widest text-[#fbbf24] mb-2">Advisory Executivo</div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-4">
              Sua Mentoria Quinzenal
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed">
              Não tome decisões críticas no escuro. Agende agora a sua sessão estratégica 1-on-1 com a liderança sênior para destravar os gargalos dos seus projetos.
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

        {/* TÍTULO DO ACERVO */}
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-2xl font-bold text-white">Acervo de Governança</h2>
          <p className="text-slate-400 mt-1">Biblioteca proprietária de matrizes. Clique em "Baixar" para obter as versões editáveis.</p>
        </div>

        {/* GRID DE ARQUIVOS (MANTENDO SEUS LINKS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documentos.map((item, index) => (
            <div key={index} className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-md hover:border-[#fbbf24] hover:shadow-[0_0_15px_rgba(251,191,36,0.15)] transition duration-300 flex justify-between items-center group">
              <div className="flex items-center gap-3 overflow-hidden pr-2">
                {item.tipo === 'word' ? (
                  <span className="bg-blue-900/30 text-blue-400 border border-blue-700 text-[10px] font-bold px-2 py-1 rounded tracking-wider">WORD</span>
                ) : (
                  <span className="bg-green-900/30 text-green-400 border border-green-700 text-[10px] font-bold px-2 py-1 rounded tracking-wider">EXCEL</span>
                )}
                <span className="text-sm text-slate-200 font-semibold truncate group-hover:text-white transition" title={item.nome}>
                  {item.nome}
                </span>
              </div>
              <a 
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 bg-transparent text-[#fbbf24] border border-[#fbbf24] hover:bg-[#fbbf24] hover:text-slate-950 text-xs font-bold px-3 py-1.5 rounded transition uppercase"
              >
                Baixar
              </a>
            </div>
          ))}
        </div>

        {/* OFFBOARDING (CANCELAMENTO) */}
        <section className="mt-16 border-t border-slate-800 pt-8 flex justify-center">
          <p className="text-xs text-slate-600">
            Deseja gerenciar sua assinatura ou interromper a renovação mensal?{' '}
            <a href="mailto:contato@syncprojetos.com?subject=Solicitação%20de%20Cancelamento" className="text-slate-500 hover:text-slate-300 underline transition">
              Solicitar cancelamento via Suporte
            </a>
          </p>
        </section>

      </div>
    </main>
  );
}