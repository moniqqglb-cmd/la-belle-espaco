"use client";

import { useEffect, useState } from "react";

const servicos = [
  { nome: "Drenagem linfática", preco: "R$ 119,99", valor: 119.99, categoria: "Corporal", sinal: true },
  { nome: "Massagem modeladora", preco: "R$ 139,99", valor: 139.99, categoria: "Corporal", sinal: true },
  { nome: "Secagem de vasinhos", preco: "R$ 89,99", valor: 89.99, categoria: "Corporal", sinal: true },
  { nome: "Corrente russa", preco: "R$ 39,99", valor: 39.99, categoria: "Corporal", sinal: true },
  { nome: "Carboxiterapia", preco: "R$ 399,99 / pacote", valor: 399.99, categoria: "Corporal", sinal: true },
  { nome: "Limpeza de pele", preco: "R$ 149,99", valor: 149.99, categoria: "Facial", sinal: true },
  { nome: "Preenchimento labial", preco: "R$ 899,99 / ml", valor: 899.99, categoria: "Injetáveis", sinal: true },
  { nome: "Botox", preco: "R$ 899,99", valor: 899.99, categoria: "Injetáveis", sinal: true },
  { nome: "Bigode chinês", preco: "R$ 899,99 / ml", valor: 899.99, categoria: "Injetáveis", sinal: true },
  { nome: "Rinomodelação", preco: "R$ 899,99 / ml", valor: 899.99, categoria: "Injetáveis", sinal: true },
  { nome: "Preenchimento de olheiras", preco: "R$ 899,99 / ml", valor: 899.99, categoria: "Injetáveis", sinal: true },
  { nome: "Preenchimento mandíbula", preco: "R$ 899,99 / ml", valor: 899.99, categoria: "Injetáveis", sinal: true },
  { nome: "Preenchimento mento", preco: "R$ 899,99 / ml", valor: 899.99, categoria: "Injetáveis", sinal: true },
  { nome: "Bioestimulador de colágeno", preco: "R$ 1.500,00", valor: 1500, categoria: "Facial", sinal: true },
  { nome: "Peeling químico", preco: "R$ 180,00", valor: 180, categoria: "Facial", sinal: true },
  { nome: "Peeling de diamante", preco: "R$ 49,99", valor: 49.99, categoria: "Facial", sinal: true },
  { nome: "Skinbooster", preco: "R$ 350,00 / pacote", valor: 350, categoria: "Facial", sinal: true },
  { nome: "Depilação a laser", preco: "Consulte", valor: null, categoria: "Corporal", sinal: true },
  { nome: "Enzimas", preco: "Consulte", valor: null, categoria: "Corporal", sinal: true },
];
function converterPreco(preco: string) {
  const valor = preco.match(/R\$\s*([\d.]+,\d{2})/);
  if (!valor) return 0;
  return Number(valor[1].replace(/\./g, "").replace(",", "."));
}

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function Home() {
  const [servico, setServico] = useState("");
  const [profissional, setProfissional] = useState("Dra. Monique Gomes");
  const [data, setData] = useState("");
  const [horario, setHorario] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");

  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erroAgenda, setErroAgenda] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const escolhido = servicos.find((s) => s.nome === servico);
  const injetavel = escolhido?.categoria === "Injetáveis";

  const precoNumerico = escolhido ? converterPreco(escolhido.preco) : 0;
  const permiteParcelamento = precoNumerico > 200;

  const valorParcela = permiteParcelamento
    ? Math.round((precoNumerico / 10) * 100) / 100
    : 0;

  const duracao = servico === "Limpeza de pele" ? 110 : 60;

  useEffect(() => {
    if (!data || !servico || !profissional) {
      setHorariosDisponiveis([]);
      setHorario("");
      return;
    }

    const controller = new AbortController();

    async function consultarAgenda() {
      setCarregando(true);
      setErroAgenda("");
      setHorariosDisponiveis([]);
      setHorario("");

      try {
        const resposta = await fetch(
          `/api/agenda/disponibilidade?date=${data}&duration=${duracao}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const resultado = await resposta.json();

        if (!resposta.ok) {
          throw new Error(resultado.erro || "Erro ao consultar agenda.");
        }

        setHorariosDisponiveis(resultado.available || []);
      } catch (erro) {
        if (erro instanceof Error && erro.name === "AbortError") return;

        setErroAgenda(
          "Não foi possível consultar a agenda. Tente novamente."
        );
      } finally {
        if (!controller.signal.aborted) {
          setCarregando(false);
        }
      }
    }

    consultarAgenda();

    return () => controller.abort();
  }, [data, servico, profissional, duracao]);

  async function enviarAgendamento(e: React.FormEvent) {
    e.preventDefault();
    setMensagem("");
    setSucesso(false);

    if (injetavel) {
      setMensagem(
        "Os procedimentos injetáveis estarão disponíveis assim que o pagamento do sinal de 20% estiver integrado."
      );
      return;
    }

    setEnviando(true);

    try {
      const resposta = await fetch("/api/agenda/agendar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service: servico,
          date: data,
          time: horario,
          name: nome,
          phone: telefone,
          duration: duracao,
        }),
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado.erro || "Não foi possível realizar o agendamento."
        );
      }

      setSucesso(true);
      setMensagem(
        "Agendamento realizado! Seu horário foi registrado no Google Agenda da Dra. Monique."
      );

      setHorario("");
      setNome("");
      setTelefone("");
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível concluir o agendamento."
      );

      setSucesso(false);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf7f2] text-[#44352d]">
      <header className="bg-[#30251f] px-6 py-8 text-center text-white">
        <p className="mb-2 text-xs tracking-[0.4em] text-[#d8b77b]">
          BELEZA • CUIDADO • BEM-ESTAR
        </p>
        <h1 className="text-4xl font-light tracking-widest">LA BELLE</h1>
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

          <label className="mb-2 block text-sm">
            1. Escolha o procedimento
          </label>

          <select
            required
            value={servico}
            onChange={(e) => {
              setServico(e.target.value);
              setHorario("");
              setMensagem("");
            }}
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

              {permiteParcelamento ? (
                <div className="mt-3">
                  <p className="text-xs tracking-widest text-[#806f63]">
                    PARCELAMENTO NO CARTÃO
                  </p>
                  <p className="mt-1 text-2xl font-bold text-[#987343]">
                    10x de aproximadamente {moeda(valorParcela)}
                  </p>
                  <p className="mt-1 font-semibold text-[#987343]">
                    SEM JUROS
                  </p>
                  <p className="mt-2 text-xs text-[#806f63]">
                    Valor total: {escolhido.preco}
                  </p>
                  <p className="mt-1 text-xs text-[#806f63]">
                    A última parcela poderá ter ajuste de centavos.
                  </p>
                </div>
              ) : (
                <p className="mt-2 font-semibold text-[#987343]">
                  Valor: {escolhido.preco}
                </p>
              )}

              <p className="mt-3 text-[#806f63]">
                Duração prevista: {duracao === 110 ? "1h50" : "1 hora"}
              </p>

              {injetavel && (
                <p className="mt-2 text-[#806f63]">
                  Sinal de 20% para confirmação. O valor será abatido
                  do total no dia do atendimento.
                </p>
              )}
            </div>
          )}

          <label className="mb-2 block text-sm">
            2. Escolha a profissional
          </label>

          <select
            required
            value={profissional}
            onChange={(e) => {
              setProfissional(e.target.value);
              setHorario("");
            }}
            className="mb-6 w-full rounded-lg border border-[#dfd4c8] bg-white p-3"
          >
            <option value="Dra. Monique Gomes">
              Dra. Monique Gomes
            </option>
          </select>

          <label className="mb-2 block text-sm">
            3. Escolha a data
          </label>

          <input
            required
            type="date"
            min={new Date().toLocaleDateString("en-CA")}
            value={data}
            onChange={(e) => {
              setData(e.target.value);
              setHorario("");
              setMensagem("");
            }}
            className="mb-6 w-full rounded-lg border border-[#dfd4c8] bg-white p-3"
          />

          <label className="mb-3 block text-sm">
            4. Horários disponíveis
          </label>

          {!data || !servico ? (
            <p className="mb-6 rounded-lg bg-[#f8f3eb] p-4 text-sm text-[#806f63]">
              Escolha primeiro o procedimento e a data para consultar
              os horários.
            </p>
          ) : carregando ? (
            <p className="mb-6 rounded-lg bg-[#f8f3eb] p-4 text-sm text-[#806f63]">
              Consultando a agenda da Monique...
            </p>
          ) : erroAgenda ? (
            <p className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {erroAgenda}
            </p>
          ) : horariosDisponiveis.length === 0 ? (
            <p className="mb-6 rounded-lg bg-[#f8f3eb] p-4 text-sm text-[#806f63]">
              Não há horários disponíveis nesta data. Escolha outro dia.
            </p>
          ) : (
            <div className="mb-6 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {horariosDisponiveis.map((h) => (
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
          )}

          <label className="mb-2 block text-sm">
            5. Seu nome
          </label>

          <input
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Digite seu nome completo"
            className="mb-5 w-full rounded-lg border border-[#dfd4c8] p-3"
          />

          <label className="mb-2 block text-sm">
            Seu WhatsApp
          </label>

          <input
            required
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(00) 00000-0000"
            className="mb-7 w-full rounded-lg border border-[#dfd4c8] p-3"
          />

          {mensagem && (
            <div
              role="status"
              className={`mb-5 rounded-lg p-4 text-sm ${
                sucesso
                  ? "bg-green-50 text-green-800"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {mensagem}
            </div>
          )}

          <button
            type="submit"
            disabled={
              !servico ||
              !profissional ||
              !data ||
              !horario ||
              carregando ||
              enviando ||
              !!erroAgenda
            }
            className="w-full rounded-lg bg-[#987343] p-4 text-sm tracking-widest text-white transition hover:bg-[#795a35] disabled:opacity-40"
          >
            {enviando ? "REGISTRANDO..." : "CONTINUAR AGENDAMENTO"}
          </button>

          <p className="mt-5 text-center text-xs leading-5 text-[#98877a]">
            Atendimento de terça a sábado, das 08h às 20h.
            <br />
            Procedimentos injetáveis dependem da integração do pagamento.
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
