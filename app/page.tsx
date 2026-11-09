"use client";

import { useState } from "react";

const servicos = [
  { nome: "Drenagem linfática", preco: "R$ 119,99", categoria: "Corporal" },
  { nome: "Massagem modeladora", preco: "R$ 139,99", categoria: "Corporal" },
  { nome: "Secagem de vasinhos", preco: "R$ 89,99", categoria: "Corporal" },
  { nome: "Corrente russa", preco: "R$ 39,99", categoria: "Corporal" },
  { nome: "Carboxiterapia", preco: "R$ 399,99 / pacote", categoria: "Corporal" },
  { nome: "Limpeza de pele", preco: "R$ 149,99", categoria: "Facial" },
  { nome: "Preenchimento labial", preco: "R$ 899,99 / ml", categoria: "Injetáveis" },
  { nome: "Botox", preco: "R$ 899,99", categoria: "Injetáveis" },
  { nome: "Bigode chinês", preco: "R$ 899,99 / ml", categoria: "Injetáveis" },
  { nome: "Rinomodelação", preco: "R$ 899,99 / ml", categoria: "Injetáveis" },
  { nome: "Preenchimento de olheiras", preco: "R$ 899,99 / ml", categoria: "Injetáveis" },
  { nome: "Preenchimento mandíbula", preco: "R$ 899,99 / ml", categoria: "Injetáveis" },
  { nome: "Preenchimento mento", preco: "R$ 899,99 / ml", categoria: "Injetáveis" },
  { nome: "Bioestimulador de colágeno", preco: "R$ 1.200,00", categoria: "Facial" },
  { nome: "Peeling químico", preco: "R$ 180,00", categoria: "Facial" },
  { nome: "Peeling de diamante", preco: "R$ 49,99", categoria: "Facial" },
  { nome: "Skinbooster", preco: "R$ 350,00 / pacote", categoria: "Facial" },
  { nome: "Depilação a laser", preco: "Consulte", categoria: "Corporal" },
  { nome: "Enzimas", preco: "Consulte", categoria: "Corporal" },
];

const horarios = [
  "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00",
  "16:00", "17:00", "18:00", "19:00",
];

export default function Home() {
  const [servico, setServico] = useState("");
  const [profissional, setProfissional] = useState("");
  const [data, setData] = useState("");
  const [horario, setHorario] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");

  const escolhido = servicos.find((s) => s.nome === servico);
  const injetavel = escolhido?.categoria === "Injetáveis";

  function enviarAgendamento(e: React.FormEvent) {
    e.preventDefault();
    alert(
      "Esta é uma prévia do site. A integração com Google Agenda e pagamentos será ativada nas próximas etapas."
    );
  }

  return (
    <main className="min-h-screen bg-[#faf7f2] text-[#44352d]">
      <header className="bg-[#30251f] px-6 py-8 text-center text-white">
        <p className="mb-2 text-xs tracking-[0.4em] text-[#d8b77b]">
          BELEZA • CUIDADO • BEM-ESTAR
        </p>
        <h1 className="text-4xl font-light tracking-widest">
          LA BELLE
        </h1>
        <p className="mt-2 text-sm tracking-[0.25em] text-[#d8b77b]">
          ESPAÇO
        </p>
        <p className="mt-5 text-sm text-[#eee2d5]">
          Sua beleza merece esse cuidado.
        </p>
      </header>

      <section className="mx-auto max-w-4xl px-5 py-12 text-center">
        <p className="text-xs tracking-[0.3em] text-[#a17c48]">
          SEJA BEM-VINDA
        </p>
        <h2 className="mt-3 text-3xl font-light">
          Agende seu momento especial
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#806f63]">
          Escolha seu procedimento, profissional e horário.
          Nosso espaço está preparado para cuidar de você.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-5 pb-16">
        <form
          onSubmit={enviarAgendamento}
          className="rounded-2xl border border-[#e9dfd2] bg-white p-6 shadow-sm md:p-10"
        >
          <h3 className="mb-6 text-center text-2xl font-light">
            Faça seu agendamento
          </h3>

          <label className="mb-2 block text-sm">1. Escolha o procedimento</label>
          <select
            required
            value={servico}
            onChange={(e) => setServico(e.target.value)}
            className="mb-6 w-full rounded-lg border border-[#dfd4c8] bg-white p-3"
          >
            <option value="">Selecione um procedimento</option>
            {servicos.map((s) => (
              <option key={s.nome} value={s.nome}>
                {s.nome} — {s.preco}
              </option>
            ))}
          </select>

          {escolhido && (
            <div className="mb-6 rounded-lg bg-[#f8f3eb] p-4 text-sm">
              <p>Procedimento: {escolhido.nome}</p>
              <p className="mt-1 font-semibold text-[#987343]">
                Valor: {escolhido.preco}
              </p>
              <p className="mt-1 text-[#806f63]">
                Duração prevista: {servico === "Limpeza de pele" ? "1h50" : "1 hora"}
              </p>
              {injetavel && (
                <p className="mt-2 text-[#806f63]">
                  Sinal de 20% para confirmação. O valor será abatido
                  do total no dia do atendimento.
                </p>
              )}
            </div>
          )}

          <label className="mb-2 block text-sm">2. Escolha a profissional</label>
          <select
            required
            value={profissional}
            onChange={(e) => setProfissional(e.target.value)}
            className="mb-6 w-full rounded-lg border border-[#dfd4c8] bg-white p-3"
          >
            <option value="">Selecione a profissional</option>
            {(!servico || servico === "Drenagem linfática" || servico === "Massagem modeladora") && (
              <option value="Beatriz">Beatriz</option>
            )}
            <option value="Dra. Monique Gomes">Dra. Monique Gomes</option>
          </select>

          <label className="mb-2 block text-sm">3. Escolha a data</label>
          <input
            required
            type="date"
            min={new Date().toLocaleDateString("en-CA")}
            value={data}
            onChange={(e) => {
              setData(e.target.value);
              setHorario("");
            }}
            className="mb-6 w-full rounded-lg border border-[#dfd4c8] bg-white p-3"
          />

          <label className="mb-3 block text-sm">4. Escolha o horário</label>
          <div className="mb-6 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {horarios.map((h) => (
              <button
                type="button"
                key={h}
                onClick={() => setHorario(h)}
                className={`rounded-lg border p-3 text-sm ${
                  horario === h
                    ? "border-[#987343] bg-[#987343] text-white"
                    : "border-[#dfd4c8] bg-white hover:bg-[#f8f3eb]"
                }`}
              >
                {h}
              </button>
            ))}
          </div>

          <label className="mb-2 block text-sm">5. Seu nome</label>
          <input
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Digite seu nome completo"
            className="mb-5 w-full rounded-lg border border-[#dfd4c8] p-3"
          />

          <label className="mb-2 block text-sm">Seu WhatsApp</label>
          <input
            required
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(00) 00000-0000"
            className="mb-7 w-full rounded-lg border border-[#dfd4c8] p-3"
          />

          <button
            type="submit"
            disabled={!servico || !profissional || !data || !horario}
            className="w-full rounded-lg bg-[#987343] p-4 text-sm tracking-widest text-white transition hover:bg-[#795a35] disabled:opacity-40"
          >
            CONTINUAR AGENDAMENTO
          </button>

          <p className="mt-5 text-center text-xs leading-5 text-[#98877a]">
            Atendimento de terça a sábado, das 08h às 20h.
            <br />
            Agendamentos sujeitos à confirmação.
          </p>
        </form>
      </section>

      <footer className="bg-[#30251f] px-5 py-8 text-center text-sm text-[#eee2d5]">
        <p className="tracking-widest">LA BELLE ESPAÇO</p>
        <p className="mt-2 text-xs text-[#c9b9a8]">
          Um momento de cuidado pensado para você.
        </p>
      </footer>
    </main>
  );
}
