// app/cofre/page.tsx
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

export default function CofrePage() {
  const router = useRouter();

  const ferramentas = [
    { 
      titulo: "Matriz OKR & SMART", 
      desc: "Planilha automatizada para rastreamento de objetivos estratégicos e KPIs.", 
      link: "https://docs.google.com/spreadsheets/d/14FQMK5GNv2OX1AD1QQ4zkOvGtwg8yp3SZw5SvaN22UA/edit?usp=sharing"
    },
    { 
      titulo: "Gestão de Stakeholders", 
      desc: "Radar tático para mapeamento de poder, interesse e engajamento.", 
      link: "https://docs.google.com/spreadsheets/d/12iy_3Hde_Aro6PkiF4ljiD1oS-h3PT3U__IKqotmCQU/edit?usp=sharing" 
    },
    { 
      titulo: "Inventário SIPOC (Processos)", 
      desc: "Matriz executiva de fornecedores, insumos, processos e entregáveis.", 
      link: "https://docs.google.com/spreadsheets/d/1xKB66m09Ky97-M_PJ4RPsQb5GQvIs6mEfq5a7zpTu2U/edit?usp=sharing" 
    },
    { 
      titulo: "Matriz de Riscos (Heatmap)", 
      desc: "Gerenciamento visual 5x5 de Probabilidade vs. Impacto.", 
      link: "https://docs.google.com/spreadsheets/d/1wxPq-TKidJOFpYW4FKfAlL8LOP_B1Wv_iGfvP46TEGQ/edit?usp=sharing" 
    },
    { 
      titulo: "Risco - Instruções de uso", 
      desc: "Manual de operação executivo para preenchimento e reporte de ameaças.", 
      link: "/Instrucoes_Matriz_de_Riscos_Sync.pdf" // Aponta para o PDF gerado 
    },
    { 
      titulo: "Cronograma Macro Nível 1", 
      desc: "Visão executiva do projeto com os principais marcos, fases e datas de entrega.", 
      link: "https://docs.google.com/spreadsheets/d/1nWYOCEs1bMAheh3SeybhfuuBDo-JeqjCseXHeK0WPd8/edit?usp=sharing" 
    },
    { 
      titulo: "Project Charter", 
      desc: "Documento de iniciação que autoriza o projeto, definindo premissas, restrições e escopo de alto nível.", 
      link: "https://docs.google.com/document/d/1KD1C60JV5z19tAhoXqEYSoWXB-38TCpNR84tCjn154Y/edit?usp=sharing" 
    },
    { 
      titulo: "Matriz RACI", 
      desc: "Framework para definição clara de papéis e responsabilidades na governança do projeto.", 
      link: "https://docs.google.com/presentation/d/1pKobS8IgxSqSoRSSYoEx_hYIXALUJ49HIXNixnQ12Ls/edit?usp=sharing" 
    },
    { 
      titulo: "Termo de Alocação e Compromisso", 
      desc: "Formalização do engajamento de recursos e dedicação da equipe técnica e de negócios.", 
      link: "https://docs.google.com/document/d/1lDP-pg5mdjnD0McV47epr76qpWi_SagbjcEy_0slYKo/edit?usp=sharing" 
    },
    { 
      titulo: "Kick-off Executivo", 
      desc: "Template de apresentação oficial para alinhamento estratégico de início de projeto.", 
      link: "https://docs.google.com/presentation/d/1SBYLDXIq5qN4Ro6O4TjyhCnY9C2lKYStM2RrWg16w_U/edit?usp=sharing" 
    },
    { 
      titulo: "OKR - Modelo de Check-in Semanal", 
      desc: "Estrutura ágil para acompanhamento contínuo da evolução dos resultados-chave.", 
      link: "https://docs.google.com/document/d/1OzqvMpN1bymmwURuyZr8S9s6pjxLBL6eI7G5sdFsVOg/edit?usp=sharing" 
    },
    { 
      titulo: "Matriz de Provisionamento de Ambiente", 
      desc: "Mapeamento e planejamento detalhado da infraestrutura tecnológica necessária.", 
      link: "https://docs.google.com/document/d/1NR8ZaFkr2EST_JkQ00T-LUBbXXP9NDESOS8M247QkLI/edit?usp=sharing" 
    },
    { 
      titulo: "Calculadora de ROI e Baseline", 
      desc: "Ferramenta para mensuração do retorno sobre investimento e estabelecimento da linha de base de custos.", 
      link: "https://docs.google.com/presentation/d/1gPn_CdPfui8zVAQj9yrgeKorCnviHlrSbjft_0VlHM4/edit?usp=sharing" 
    },
    { 
      titulo: "Business Blueprint", 
      desc: "Documento de arquitetura detalhando processos de negócio (As-Is / To-Be) e requisitos do sistema.", 
      link: "https://docs.google.com/document/d/1o59V5cu1t3APsCOucEKrJbng50WG4g1fk7ndUHgQ_UA/edit?usp=sharing" 
    },
    { 
      titulo: "Matriz de Gaps e Customizações", 
      desc: "Inventário para identificação, justificativa e tratamento de desvios do processo padrão (Fit/Gap).", 
      link: "https://docs.google.com/spreadsheets/d/1A6Uu2SipjWY7cPL-Rqj0FXgD4j5H-dtcEinWYuJIz5U/edit?usp=sharing" 
    },
    { 
      titulo: "Estratégia de Migração e Saneamento", 
      desc: "Plano executivo de extração, transformação e carga (ETL) para transição segura de dados.", 
      link: "https://docs.google.com/document/d/1Lg95ewipESoVA4XW2A9EnD4MHbYtl79vlcDFO-J2v0M/edit?usp=sharing" 
    },
    { 
      titulo: "Guia de Estruturação de Backlog", 
      desc: "Diretrizes metodológicas para criação, priorização e refinamento contínuo de histórias de usuário.", 
      link: "https://docs.google.com/presentation/d/1Rsmzlikg0JxkMkUoz2M3kptaJyNacAVBlkKD4SHcfRM/edit?usp=sharing" 
    },
    { 
      titulo: "Mapeamento de Macroprocessos", 
      desc: "Visão estruturada da cadeia de valor e processos interdepartamentais da organização.", 
      link: "https://docs.google.com/presentation/d/1vvLxWtDf47ukIUBHNITO9c1Q76FtypILigSiHbTKO68/edit?usp=sharing" 
    },
    { 
      titulo: "Plano de Cutover", 
      desc: "Orquestração minuto a minuto das atividades críticas de virada de sistema e Go-Live.", 
      link: "https://docs.google.com/document/d/1llceiEnIBp7A102J4yHL7SmEptActyAqWS9Dw4GI1Ss/edit?usp=sharing" 
    },
    { 
      titulo: "Termo de Aceite e Handover", 
      desc: "Formalização executiva da entrega do projeto e transferência de responsabilidade para a operação sustentada.", 
      link: "https://docs.google.com/document/d/1mS45KF2upc_tWgwsNtQTrV2sx3evX-XYuHuqEAgbN-c/edit?usp=sharing" 
    }
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Cabeçalho do Cofre */}
        <div className="border-b border-slate-800 pb-8">
          <div className="text-xs font-bold uppercase tracking-widest text-[#fbbf24] mb-2">Área Exclusiva para Membros</div>
          <h1 className="text-4xl font-black text-white">Cofre da Sync Projetos</h1>
          <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
            Bem-vindo à sua infraestrutura de governança. Abaixo você encontra as ferramentas, frameworks e matrizes oficiais utilizadas em operações de alta complexidade. Faça uma cópia para o seu drive ou baixe os arquivos.
          </p>
        </div>

        {/* Grid de Ferramentas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ferramentas.map((item, index) => (
            <div key={index} className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl shadow-xl hover:border-[#fbbf24] transition duration-300 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{item.titulo}</h3>
                <p className="text-sm text-slate-400 mb-6">{item.desc}</p>
              </div>
              <button 
                onClick={() => window.open(item.link, '_blank')}
                className="w-full bg-slate-800 hover:bg-[#fbbf24] text-slate-300 hover:text-slate-950 font-bold py-3 rounded-lg transition duration-200 text-sm uppercase tracking-wider"
              >
                Acessar Ferramenta
              </button>
            </div>
          ))}
        </div>

        {/* Botão de Saída */}
        <div className="pt-8 flex justify-end">
          <button 
            onClick={() => router.push('/')} 
            className="text-sm font-bold text-slate-500 hover:text-red-400 transition"
          >
            Sair do Cofre
          </button>
        </div>

      </div>
    </main>
  );
}