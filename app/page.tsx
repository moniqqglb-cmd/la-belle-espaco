"use client";
import { useEffect, useState, type FormEvent } from "react";
const servicos = [
  { nome: "Drenagem linfática", preco: "R$ 119,99", valor: 119.99, categoria: "Corporal" },
  { nome: "Massagem modeladora", preco: "R$ 139,99", valor: 139.99, categoria: "Corporal" },
  { nome: "Secagem de vasinhos", preco: "R$ 89,99", valor: 89.99, categoria: "Corporal" },
  { nome: "Corrente russa", preco: "R$ 39,99", valor: 39.99, categoria: "Corporal" },
  { nome: "Carboxiterapia", preco: "R$ 399,99 / pacote", valor: 399.99, categoria: "Corporal" },
  { nome: "Limpeza de pele", preco: "R$ 149,99", valor: 149.99, categoria: "Facial" },
  { nome: "Preenchimento labial", preco: "R$ 899,99 / ml", valor: 899.99, categoria: "Injetáveis" },
  { nome: "Botox", preco: "R$ 899,99", valor: 899.99, categoria: "Injetáveis" },
  { nome: "Bigode chinês", preco: "R$ 899,99 / ml", valor: 899.99, categoria: "Injetáveis" },
  { nome: "Rinomodelação", preco: "R$ 899,99 / ml", valor: 899.99, categoria: "Injetáveis" },
  { nome: "Preenchimento de olheiras", preco: "R$ 899,99 / ml", valor: 899.99, categoria: "Injetáveis" },
  { nome: "Preenchimento mandíbula", preco: "R$ 899,99 / ml", valor: 899.99, categoria: "Injetáveis" },
  { nome: "Preenchimento mento", preco: "R$ 899,99 / ml", valor: 899.99, categoria: "Injetáveis" },
  { nome: "Bioestimulador de colágeno", preco: "R$ 1.500,00", valor: 1500, categoria: "Facial" },
  { nome: "Peeling químico", preco: "R$ 180,00", valor: 180, categoria: "Facial" },
  { nome: "Peeling de diamante", preco: "R$ 49,99", valor: 49.99, categoria: "Facial" },
  { nome: "Skinbooster", preco: "R$ 350,00 / pacote", valor: 350, categoria: "Facial" },
  { nome: "Depilação a laser", preco: "Consulte", valor: null, categoria: "Corporal" },
  { nome: "Enzimas", preco: "Consulte", valor: null, categoria: "Corporal" },
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
    <main className="min-h-screen bg-[#faf7f1] text-[#49382c]">
      {/* CABEÇALHO COM LOGO */}
      <header className="w-full overflow-hidden border-b border-[#e5d5bd] bg-[#f3eadc]">
        <div className="flex min-h-[170px] w-full items-center justify-center px-3 py-3 sm:min-h-[200px]">
          <img
            src="/logo-la-belle.jpg"
            alt="La Belle Espaço"
            className="h-[160px] w-full object-contain sm:h-[190px]"
          />
        </div>
      </header>
      <section className="mx-auto max-w-4xl px-5 pb-5 pt-7 text-center sm:pb-7 sm:pt-9">
        <p className="text-[10px] font-medium tracking-[0.32em] text-[#a17c48]">
          SEJA BEM-VINDA
        </p>
        <h2 className="mt-2 text-2xl font-light tracking-wide text-[#49382c] sm:text-3xl">
          Seu momento de cuidado começa aqui
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#806f63]">
          Escolha seu procedimento, profissional e horário.
          Preparamos cada detalhe para cuidar de você.
        </p>
      </section>
      <section className="mx-auto max-w-3xl px-4 pb-10 sm:px-5 sm:pb-14">
        <form
          onSubmit={enviarAgendamento}
          className="rounded-2xl border border-[#e8dccb] bg-white p-5 shadow-[0_8px_30px_rgba(91,67,42,0.07)] sm:p-9"
        >
          <div className="mb-6 text-center">
            <p className="text-[10px] font-medium tracking-[0.3em] text-[#a17c48]">
              LA BELLE ESPAÇO
            </p>
            <h3 className="mt-2 text-xl font-light text-[#49382c] sm:text-2xl">
              Faça seu agendamento
            </h3>
            <div className="mx-auto mt-3 h-px w-14 bg-[#c5a36b]" />
          </div>
          <label className="mb-2 block text-sm font-medium text-[#594638]">
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
            className="mb-5 w-full rounded-lg border border-[#dfd4c8] bg-[#fffdfa] p-3 text-sm outline-none focus:border-[#b89562]"
          >
            <option value="">Selecione um procedimento</option>
            {servicos.map((s) => (
              <option key={s.nome} value={s.nome}>
                {s.nome} — {s.preco}
              </option>
            ))}
          </select>
          {escolhido && (
            <div className="mb-5 rounded-xl border border-[#eadfce] bg-[#faf6ef] p-4 text-sm">
              <p>Procedimento: {escolhido.nome}</p>
              <p className="mt-2 font-semibold text-[#987343]">
                Valor total: {escolhido.preco}
              </p>
              {valorTotal !== null && (
                <div className="mt-4 rounded-xl border border-[#d8c39e] bg-[#fffaf1] p-4 text-center">
                  <p className="text-[10px] font-semibold tracking-[0.2em] text-[#806f63]">
                    FACILIDADE PARA VOCÊ
                  </p>
                  <p className="mt-2 text-xl font-semibold text-[#987343] sm:text-2xl">
                    PARCELAMENTO EM ATÉ 10X
                  </p>
                  <p className="mt-1 text-xs text-[#806f63]">
                    Consulte as condições disponíveis no checkout.
                  </p>
                </div>
              )}
              {valorTotal !== null && sinal !== null && restante !== null ? (
                <div className="mt-4 border-t border-[#e5d8c7] pt-4">
                  <p className="text-xs tracking-widest text-[#806f63]">
                    SINAL OBRIGATÓRIO DE 20%
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-[#987343]">
                    {moeda(sinal)}
                  </p>
                  <p className="mt-2 text-[#806f63]">
                    Restante a pagar no atendimento: {moeda(restante)}
                  </p>
                  <p className="mt-3 text-xs text-[#806f63]">
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
          <label className="mb-2 block text-sm font-medium text-[#594638]">
            2. Escolha a profissional
          </label>
          <select
            required
            value={profissional}
            onChange={(e) => {
              setProfissional(e.target.value);
              setHorario("");
            }}
            className="mb-5 w-full rounded-lg border border-[#dfd4c8] bg-[#fffdfa] p-3 text-sm outline-none focus:border-[#b89562]"
          >
            <option value="Dra. Monique Gomes">
              Dra. Monique Gomes
            </option>
          </select>
          <label className="mb-2 block text-sm font-medium text-[#594638]">
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
            className="mb-5 w-full rounded-lg border border-[#dfd4c8] bg-[#fffdfa] p-3 text-sm outline-none focus:border-[#b89562]"
          />
          <label className="mb-3 block text-sm font-medium text-[#594638]">
            4. Horários disponíveis
          </label>
          {!data || !servico ? (
            <p className="mb-5 rounded-lg bg-[#faf6ef] p-4 text-sm text-[#806f63]">
              Escolha primeiro o procedimento e a data para consultar os horários.
            </p>
          ) : carregando ? (
            <p className="mb-5 rounded-lg bg-[#faf6ef] p-4 text-sm text-[#806f63]">
              Consultando a agenda da Monique...
            </p>
          ) : erroAgenda ? (
            <p className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {erroAgenda}
            </p>
          ) : horariosDisponiveis.length === 0 ? (
            <p className="mb-5 rounded-lg bg-[#faf6ef] p-4 text-sm text-[#806f63]">
              Não há horários disponíveis nesta data. Escolha outro dia.
            </p>
          ) : (
            <div className="mb-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {horariosDisponiveis.map((h) => (
                <button
                  type="button"
                  key={h}
                  onClick={() => setHorario(h)}
                  className={`rounded-lg border p-3 text-sm transition ${
                    horario === h
                      ? "border-[#987343] bg-[#987343] text-white"
                      : "border-[#dfd4c8] bg-[#fffdfa] text-[#594638] hover:bg-[#f8f3eb]"
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          )}
          <label className="mb-2 block text-sm font-medium text-[#594638]">
            5. Seu nome
          </label>
          <input
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Digite seu nome completo"
            className="mb-5 w-full rounded-lg border border-[#dfd4c8] bg-[#fffdfa] p-3 text-sm outline-none focus:border-[#b89562]"
          />
          <label className="mb-2 block text-sm font-medium text-[#594638]">
            Seu WhatsApp
          </label>
          <input
            required
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(00) 00000-0000"
            className="mb-6 w-full rounded-lg border border-[#dfd4c8] bg-[#fffdfa] p-3 text-sm outline-none focus:border-[#b89562]"
          />
          {mensagem && (
            <div
              role="status"
              className={`mb-5 rounded-lg p-4 text-sm ${
                sucesso
                  ? "bg-green-50 text-green-800"
                  : "bg-[#faf6ef] text-[#806f63]"
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
            className="w-full rounded-lg bg-[#987343] p-4 text-xs font-medium tracking-[0.16em] text-white transition hover:bg-[#795a35] disabled:opacity-40"
          >
            {pagando
              ? "PREPARANDO PAGAMENTO..."
              : "CONTINUAR PARA PAGAMENTO"}
          </button>
          <p className="mt-5 text-center text-xs leading-5 text-[#98877a]">
            Atendimento de terça a sábado, das 08h às 20h.
            <br />
            O agendamento será confirmado após a aprovação do sinal.
          </p>
        </form>
      </section>
      <footer className="border-t border-[#e9ddca] bg-[#f3eadc] px-5 py-6 text-center text-sm text-[#6b4c35]">
        <p className="text-xs font-medium tracking-[0.25em]">
          LA BELLE ESPAÇO
        </p>
        <p className="mt-2 text-xs text-[#80634b]">
          Um momento de cuidado pensado para você.
        </p>
      </footer>
      {/* BOTÃO FLUTUANTE DO WHATSAPP */}
      <a
        href="https://wa.me/5511923667255?text=Ol%C3%A1!%20Gostaria%20de%20mais%20informa%C3%A7%C3%B5es%20sobre%20os%20procedimentos."
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Fale conosco pelo WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-110"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-8 w-8"
          aria-hidden="true"
        >
          <path d="M20.52 3.48A11.87 11.87 0 0 0 12.07 0C5.5 0 .15 5.35.15 11.92c0 2.1.55 4.15 1.6 5.96L0 24l6.28-1.65a11.9 11.9 0 0 0 5.78 1.48h.01C18.64 23.83 24 18.48 24 11.91c0-3.18-1.24-6.17-3.48-8.43ZM12.07 21.8a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.73.98.99-3.64-.24-.38a9.85 9.85 0 0 1-1.52-5.25c0-5.46 4.45-9.9 9.91-9.9a9.83 9.83 0 0 1 7 2.9 9.83 9.83 0 0 1 2.9 7c0 5.46-4.45 9.9-9.91 9.9Zm5.44-7.42c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.5 1.69.64.71.23 1.35.2 1.86.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z" />
        </svg>
      </a>
    </main>
  );
}
