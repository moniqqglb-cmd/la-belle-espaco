"use client";
import { useEffect, useState, type FormEvent } from "react";
const servicos = [
  { nome: "Drenagem linfática", preco: "R$ 119,99", valor: 119.99 },
  { nome: "Massagem modeladora", preco: "R$ 139,99", valor: 139.99 },
  { nome: "Secagem de vasinhos", preco: "R$ 89,99", valor: 89.99 },
  { nome: "Corrente russa", preco: "R$ 39,99", valor: 39.99 },
  { nome: "Carboxiterapia", preco: "R$ 399,99 / pacote", valor: 399.99 },
  { nome: "Limpeza de pele", preco: "R$ 149,99", valor: 149.99 },
  { nome: "Preenchimento labial", preco: "R$ 899,99 / ml", valor: 899.99 },
  { nome: "Botox", preco: "R$ 899,99", valor: 899.99 },
  { nome: "Bigode chinês", preco: "R$ 899,99 / ml", valor: 899.99 },
  { nome: "Rinomodelação", preco: "R$ 899,99 / ml", valor: 899.99 },
  { nome: "Preenchimento de olheiras", preco: "R$ 899,99 / ml", valor: 899.99 },
  { nome: "Preenchimento mandíbula", preco: "R$ 899,99 / ml", valor: 899.99 },
  { nome: "Preenchimento mento", preco: "R$ 899,99 / ml", valor: 899.99 },
  { nome: "Bioestimulador de colágeno", preco: "R$ 1.500,00", valor: 1500 },
  { nome: "Peeling químico", preco: "R$ 180,00", valor: 180 },
  { nome: "Peeling de diamante", preco: "R$ 49,99", valor: 49.99 },
  { nome: "Skinbooster", preco: "R$ 350,00 / pacote", valor: 350 },
  { nome: "Depilação a laser", preco: "Consulte", valor: null },
  { nome: "Enzimas", preco: "Consulte", valor: null },
];
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
  const [pagando, setPagando] = useState(false);
  const [erroAgenda, setErroAgenda] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [sucesso, setSucesso] = useState(false);
  useEffect(() => {
    async function confirmarRetornoPagamento() {
      const params = new URLSearchParams(window.location.search);
      const orderNsu = params.get("order_nsu");
      const transactionNsu = params.get("transaction_nsu");
      const slug = params.get("slug");
      if (!orderNsu || !transactionNsu || !slug) return;
      setPagando(true);
      setMensagem("Pagamento recebido! Confirmando seu agendamento...");
      try {
        const resposta = await fetch("/api/pagamento/webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_nsu: orderNsu,
            transaction_nsu: transactionNsu,
            invoice_slug: slug,
          }),
        });
        const resultado = await resposta.json();
        if (!resposta.ok) {
          throw new Error(
            resultado.erro || "Não foi possível confirmar o agendamento."
          );
        }
        if (resultado.agendamento_confirmado === true) {
          setSucesso(true);
          setMensagem(
            "Pagamento confirmado! Seu agendamento foi realizado com sucesso."
          );
        } else {
          setSucesso(false);
          setMensagem(
            "Pagamento recebido e confirmado. Seu agendamento ainda precisa ser verificado pela clínica."
          );
        }
      } catch (erro) {
        setSucesso(false);
        setMensagem(
          erro instanceof Error
            ? erro.message
            : "Não foi possível confirmar seu agendamento."
        );
      } finally {
        setPagando(false);
      }
    }
    confirmarRetornoPagamento();
  }, []);
  const escolhido = servicos.find((s) => s.nome === servico);
  const duracao = servico === "Limpeza de pele" ? 110 : 60;
  const valorTotal = escolhido?.valor ?? null;
  const sinal =
    valorTotal !== null
      ? Math.round(valorTotal * 100 * 0.2) / 100
      : null;
  const restante =
    valorTotal !== null && sinal !== null
      ? Math.round((valorTotal - sinal) * 100) / 100
      : null;
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
  async function enviarAgendamento(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pagando) return;
    setSucesso(false);
    setMensagem("");
    if (!escolhido) {
      setMensagem("Escolha um procedimento.");
      return;
    }
    if (valorTotal === null || sinal === null) {
      setMensagem(
        "Entre em contato com a clínica para consultar o valor e o sinal deste procedimento."
      );
      return;
    }
    if (!horario || !data || !nome.trim() || !telefone.trim()) {
      setMensagem("Preencha todos os dados e escolha um horário.");
      return;
    }
    setPagando(true);
    setMensagem("Preparando sua cobrança na InfinitePay...");
    try {
      const resposta = await fetch("/api/pagamento/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          telefone: telefone.trim(),
          servico,
          profissional,
          data,
          horario,
        }),
      });
      const resultado = await resposta.json();
      if (!resposta.ok) {
        throw new Error(
          `${resultado.erro || "Não foi possível criar a cobrança."} ${
            resultado.detalhe || ""
          }`
        );
      }
      if (
        !resultado.link_pagamento ||
        typeof resultado.link_pagamento !== "string"
      ) {
        throw new Error("A InfinitePay não retornou um link válido.");
      }
      setSucesso(true);
      setMensagem("Cobrança criada! Redirecionando para o pagamento...");
      window.location.assign(resultado.link_pagamento);
    } catch (erro) {
      setSucesso(false);
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Ocorreu um erro ao preparar o pagamento. Tente novamente."
      );
      setPagando(false);
    }
  }
  return (
    <main className="min-h-screen overflow-hidden bg-[#fff8ed] text-[#492d1c]">
      {/* BANNER PRINCIPAL COM LOGO */}
      <header className="relative flex w-full items-center justify-center overflow-hidden border-b border-[#d9b777] bg-gradient-to-r from-[#d8b77d] via-[#fff0d3] to-[#d8b77d] px-3 py-2 sm:py-3">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.8),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.7),transparent_30%)]" />
        <div className="absolute inset-0 opacity-40 bg-[linear-gradient(120deg,transparent_25%,rgba(255,255,255,0.5)_45%,transparent_60%)]" />
        <img
          src="/logo-la-belle.jpg"
          alt="La Belle Espaço"
          className="relative z-10 h-auto w-[180px] max-w-full object-contain sm:w-[230px] md:w-[260px]"
        />
      </header>
      {/* APRESENTAÇÃO */}
      <section className="mx-auto max-w-5xl px-5 pb-3 pt-4 text-center sm:pt-5">
        <div className="mb-2 flex items-center justify-center gap-4">
          <span className="h-px w-12 bg-[#bd8b43] sm:w-20" />
          <p className="text-xs font-medium tracking-[0.35em] text-[#79502b] sm:text-sm">
            SEJA BEM-VINDA
          </p>
          <span className="h-px w-12 bg-[#bd8b43] sm:w-20" />
        </div>
        <h2 className="font-serif text-3xl font-normal leading-tight text-[#492d1c] sm:text-5xl">
          Seu momento de cuidado começa aqui
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-[#765a43] sm:text-xl">
          Escolha seu procedimento, profissional e horário.
          <br className="hidden sm:block" />
          Preparamos cada detalhe para cuidar de você.
        </p>
        <div className="mt-3 flex items-center justify-center gap-3 text-[#bd8b43]">
          <span className="h-px w-16 bg-[#d9b777]" />
          <span className="text-2xl">✧</span>
          <span className="h-px w-16 bg-[#d9b777]" />
        </div>
      </section>
      {/* FORMULÁRIO DE AGENDAMENTO */}
      <section className="mx-auto max-w-4xl px-4 pb-12 sm:px-6">
        <form
          onSubmit={enviarAgendamento}
          className="rounded-[24px] border border-[#e5c99d] bg-white/90 p-5 shadow-[0_12px_45px_rgba(119,78,37,0.12)] sm:p-8 md:p-10"
        >
          <div className="mb-8 text-center">
            <p className="text-xs font-medium tracking-[0.35em] text-[#b17b30]">
              LA BELLE ESPAÇO
            </p>
            <h3 className="mt-2 font-serif text-3xl text-[#492d1c] sm:text-4xl">
              Faça seu agendamento
            </h3>
            <div className="mx-auto mt-4 h-px w-32 bg-gradient-to-r from-transparent via-[#bd8b43] to-transparent" />
          </div>
          <label className="mb-2 block text-base font-semibold text-[#593a25]">
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
            className="mb-5 w-full rounded-xl border border-[#d9b99b] bg-[#fffdfa] p-4 text-base text-[#49382c] outline-none transition focus:border-[#bd8b43] focus:ring-2 focus:ring-[#e9d2a9]"
          >
            <option value="">Selecione um procedimento</option>
            {servicos.map((s) => (
              <option key={s.nome} value={s.nome}>
                {s.nome} — {s.preco}
              </option>
            ))}
          </select>
          {escolhido && (
            <div className="mb-6 rounded-2xl border border-[#ead9bb] bg-[#fff8ed] p-5 text-sm">
              <p className="text-[#65472f]">
                Procedimento: <strong>{escolhido.nome}</strong>
              </p>
              <p className="mt-2 text-lg font-semibold text-[#a8752d]">
                Valor total: {escolhido.preco}
              </p>
              {valorTotal !== null && (
                <div className="mt-4 rounded-xl border border-[#e2c28d] bg-[#fffaf1] p-4 text-center">
                  <p className="text-xs font-semibold tracking-[0.2em] text-[#806f63]">
                    FACILIDADE PARA VOCÊ
                  </p>
                  <p className="mt-2 text-xl font-bold text-[#a8752d] sm:text-2xl">
                    PARCELAMENTO EM ATÉ 10X
                  </p>
                  <p className="mt-1 text-xs text-[#806f63]">
                    Consulte as condições disponíveis no checkout.
                  </p>
                </div>
              )}
              {valorTotal !== null && sinal !== null && restante !== null ? (
                <div className="mt-5 border-t border-[#e5d8c7] pt-4">
                  <p className="text-xs font-semibold tracking-widest text-[#806f63]">
                    SINAL OBRIGATÓRIO DE 20%
                  </p>
                  <p className="mt-2 text-3xl font-bold text-[#a8752d]">
                    {moeda(sinal)}
                  </p>
                  <p className="mt-2 text-[#806f63]">
                    Restante a pagar no atendimento: {moeda(restante)}
                  </p>
                  <p className="mt-3 text-xs leading-5 text-[#806f63]">
                    O horário será confirmado após a aprovação do pagamento do sinal.
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-[#806f63]">
                  O valor e o sinal de 20% precisam ser confirmados pela clínica.
                </p>
              )}
              <p className="mt-3 text-[#806f63]">
                Duração prevista: {duracao === 110 ? "1h50" : "1 hora"}
              </p>
            </div>
          )}
          <label className="mb-2 block text-base font-semibold text-[#593a25]">
            2. Escolha a profissional
          </label>
          <select
            required
            value={profissional}
            onChange={(e) => {
              setProfissional(e.target.value);
              setHorario("");
            }}
            className="mb-5 w-full rounded-xl border border-[#d9b99b] bg-[#fffdfa] p-4 text-base outline-none transition focus:border-[#bd8b43] focus:ring-2 focus:ring-[#e9d2a9]"
          >
            <option value="Dra. Monique Gomes">
              Dra. Monique Gomes
            </option>
          </select>
          <label className="mb-2 block text-base font-semibold text-[#593a25]">
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
            className="mb-5 w-full rounded-xl border border-[#d9b99b] bg-[#fffdfa] p-4 text-base outline-none transition focus:border-[#bd8b43] focus:ring-2 focus:ring-[#e9d2a9]"
          />
          <label className="mb-3 block text-base font-semibold text-[#593a25]">
            4. Horários disponíveis
          </label>
          {!data || !servico ? (
            <p className="mb-6 rounded-xl bg-[#f8e9d0] p-5 text-sm leading-6 text-[#65472f]">
              Escolha primeiro o procedimento e a data para consultar os horários.
            </p>
          ) : carregando ? (
            <p className="mb-6 rounded-xl bg-[#f8e9d0] p-5 text-sm text-[#65472f]">
              Consultando a agenda da Monique...
            </p>
          ) : erroAgenda ? (
            <p className="mb-6 rounded-xl bg-red-50 p-5 text-sm text-red-700">
              {erroAgenda}
            </p>
          ) : horariosDisponiveis.length === 0 ? (
            <p className="mb-6 rounded-xl bg-[#f8e9d0] p-5 text-sm text-[#65472f]">
              Não há horários disponíveis nesta data. Escolha outro dia.
            </p>
          ) : (
            <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {horariosDisponiveis.map((h) => (
                <button
                  type="button"
                  key={h}
                  onClick={() => setHorario(h)}
                  className={`rounded-xl border p-3 text-sm font-medium transition ${
                    horario === h
                      ? "border-[#a8752d] bg-[#a8752d] text-white shadow-md"
                      : "border-[#d9b99b] bg-[#fffdfa] text-[#593a25] hover:bg-[#f8eddd]"
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          )}
          <label className="mb-2 block text-base font-semibold text-[#593a25]">
            5. Seu nome
          </label>
          <input
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Digite seu nome completo"
            className="mb-5 w-full rounded-xl border border-[#d9b99b] bg-[#fffdfa] p-4 text-base outline-none transition focus:border-[#bd8b43] focus:ring-2 focus:ring-[#e9d2a9]"
          />
          <label className="mb-2 block text-base font-semibold text-[#593a25]">
            Seu WhatsApp
          </label>
          <input
            required
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(00) 00000-0000"
            className="mb-6 w-full rounded-xl border border-[#d9b99b] bg-[#fffdfa] p-4 text-base outline-none transition focus:border-[#bd8b43] focus:ring-2 focus:ring-[#e9d2a9]"
          />
          {mensagem && (
            <div
              role="status"
              className={`mb-5 rounded-xl p-4 text-sm ${
                sucesso
                  ? "bg-green-50 text-green-800"
                  : "bg-[#fff3df] text-[#765a43]"
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
              !!erroAgenda ||
              pagando
            }
            className="w-full rounded-xl border border-[#d4a24f] bg-gradient-to-r from-[#d9aa5c] via-[#b98231] to-[#e8c17d] p-5 text-sm font-bold tracking-[0.18em] text-white shadow-md transition hover:brightness-105 disabled:opacity-40"
          >
            {pagando
              ? "PREPARANDO PAGAMENTO..."
              : "CONTINUAR PARA PAGAMENTO  →"}
          </button>
          <div className="mt-6 flex flex-col items-center justify-center gap-2 border-t border-[#ead9bb] pt-5 text-center text-xs leading-5 text-[#80634b] sm:flex-row sm:gap-3">
            <span className="text-xl text-[#a8752d]">◷</span>
            <p>
              Atendimento de terça a sábado, das 08h às 20h.
              <br />
              O agendamento será confirmado após a aprovação do sinal.
            </p>
          </div>
        </form>
      </section>
      {/* RODAPÉ */}
      <footer className="border-t border-[#dfc69e] bg-gradient-to-r from-[#f2dfc1] via-[#fff3df] to-[#f2dfc1] px-5 py-7 text-center text-[#6b4c35]">
        <div className="mx-auto mb-3 h-px max-w-48 bg-[#c9a36c]" />
        <p className="text-sm font-medium tracking-[0.35em]">
          LA BELLE ESPAÇO
        </p>
        <p className="mt-2 font-serif text-base italic text-[#80634b]">
          Um momento de cuidado pensado para você.
        </p>
      </footer>
      {/* WHATSAPP FLUTUANTE */}
      <a
        href="https://wa.me/5511923667255?text=Ol%C3%A1!%20Gostaria%20de%20mais%20informa%C3%A7%C3%B5es%20sobre%20os%20procedimentos."
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Fale conosco pelo WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-[#20c768] text-white shadow-[0_5px_20px_rgba(0,0,0,0.22)] transition hover:scale-110"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-9 w-9"
          aria-hidden="true"
        >
          <path d="M20.52 3.48A11.87 11.87 0 0 0 12.07 0C5.5 0 .15 5.35.15 11.92c0 2.1.55 4.15 1.6 5.96L0 24l6.28-1.65a11.9 11.9 0 0 0 5.78 1.48h.01C18.64 23.83 24 18.48 24 11.91c0-3.18-1.24-6.17-3.48-8.43ZM12.07 21.8a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.73.98.99-3.64-.24-.38a9.85 9.85 0 0 1-1.52-5.25c0-5.46 4.45-9.9 9.91-9.9a9.83 9.83 0 0 1 7 2.9 9.83 9.83 0 0 1 2.9 7c0 5.46-4.45 9.9-9.91 9.9Zm5.44-7.42c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.5 1.69.64.71.23 1.35.2 1.86.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z" />
        </svg>
      </a>
    </main>
  );
}
