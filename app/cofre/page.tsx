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
      link: "https://docs.google.com/spreadsheets/d/1jUmxKMx3pB22IJS3iikNQC0Z46Xly8Bzt9zbfl1zVhU/edit?usp=drive_web" 
    },
    { 
      titulo: "Gestão de Stakeholders", 
      desc: "Radar tático para mapeamento de poder, interesse e engajamento.", 
      link: "#" // Insira o link do seu Google Sheets aqui
    },
    { 
      titulo: "Inventário SIPOC (Processos)", 
      desc: "Matriz executiva de fornecedores, insumos, processos e entregáveis.", 
      link: "#" // Insira o link do seu Google Sheets aqui
    },
    { 
      titulo: "Matriz de Riscos (Heatmap)", 
      desc: "Gerenciamento visual 5x5 de Probabilidade vs. Impacto.", 
      link: "#" // Insira o link do seu Google Sheets aqui
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
            onClick={() => router.push('/login')} 
            className="text-sm font-bold text-slate-500 hover:text-red-400 transition"
          >
            Sair do Cofre
          </button>
        </div>

      </div>
    </main>
  );
}