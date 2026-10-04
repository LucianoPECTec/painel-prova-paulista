/* =====================================================
   PÁGINA DE EVOLUÇÃO — dividida em 6 partes numeradas.
   Os números vêm do arquivo dados-evolucao.js (variável EV).
   ===================================================== */

/* ---------- 1. ESTADO: o que o usuário escolheu ---------- */
const estado = {
  escola: "",       // "" = mostra o Total URE
  comp: "geral",    // "geral" ou número do componente
  busca: "",        // texto digitado na busca da tabela
  ordem: "v3",      // coluna que ordena a tabela
  sentido: -1       // 1 = crescente, -1 = decrescente
};

/* ---------- 2. FERRAMENTAS PEQUENAS ---------- */
const $ = seletor => document.querySelector(seletor);   // atalho para achar elementos
const PROVAS = ["1ª Prova", "2ª Prova", "3ª Prova"];
const NOMES = {PORT: "Língua Portuguesa", MAT: "Matemática", HIST: "História", GEO: "Geografia", BIO: "Biologia", QUI: "Química",
               ING: "Inglês", CIE: "Ciências", FIS: "Física", FILO: "Filosofia", SOC: "Sociologia", TEC: "Tecnologia"};

// Formata 0.5123 como "51,2%"
const pct = v => v == null ? "—" : (v * 100).toLocaleString("pt-BR", {minimumFractionDigits: 1, maximumFractionDigits: 1}) + "%";
// Diferença em pontos percentuais (p.p.) entre duas provas
const dif = (a, b) => (a == null || b == null) ? null : (b - a) * 100;
const textoDif = d => d == null ? "—" : (d > 0 ? "+" : "") + d.toFixed(1).replace(".", ",") + " p.p.";
const classeDif = d => d == null ? "" : d > 0 ? "pos" : d < 0 ? "neg" : "";
const esc = t => String(t).replace(/[&<>]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;"}[c]));
const cartao = (titulo, valor) => `<div class="kpi"><small>${titulo}</small><b>${valor}</b></div>`;

/* ---------- 3. DADOS ---------- */
// Transforma cada linha do arquivo de dados num objeto com nomes fáceis de ler
const montar = r => ({nome: r[0], part: r[1], ac: r[2], c: r[3]});
const REDE = montar(EV.rede);
const ESCOLAS = EV.escolas.map(montar);

// Devolve [1ª, 2ª, 3ª] da escola, no componente escolhido
const valores = e => estado.comp === "geral" ? e.ac : e.c[+estado.comp];
const nomeBase = () => estado.comp === "geral" ? "Geral" : NOMES[EV.comps[+estado.comp]];

// Classifica a trajetória de uma escola
function tendencia(v) {
  const [p1, p2, p3] = v;
  if (p1 == null || p2 == null || p3 == null) return null;
  if (p3 < p2) return {texto: "Queda na 3ª", cor: "r"};
  if (p2 < p1) return {texto: "Recuperação", cor: "y"};
  if (p2 > p1) return {texto: "Crescimento contínuo", cor: "g"};
  return {texto: "Estável", cor: "o"};
}

/* ---------- 4. GRÁFICOS ---------- */
const graficos = {};   // guarda os gráficos para poder refazê-los

// Escreve o valor ao lado de cada ponto das linhas
const plugRotulos = {id: "rotulos", afterDatasetsDraw(c) {
  if (c.config.type !== "line") return;
  const x = c.ctx;
  c.data.datasets.forEach((d, i) => c.getDatasetMeta(i).data.forEach((p, k) => {
    const v = d.data[k]; if (v == null) return;
    x.save(); x.font = "700 12px system-ui"; x.fillStyle = d.borderColor; x.textAlign = "center";
    x.fillText(v.toFixed(1).replace(".", ",") + "%", p.x, p.y + (i === 0 ? -10 : 18)); x.restore();
  }));
}};

function criarGrafico(id, config) {
  if (typeof Chart === "undefined") { $("#" + id).parentNode.innerHTML = "<p class='sub'>Gráficos indisponíveis: verifique a internet.</p>"; return; }
  if (graficos[id]) graficos[id].destroy();
  config.plugins = [plugRotulos];
  config.options = Object.assign({responsive: true, maintainAspectRatio: false, plugins: {legend: {position: "bottom"}}}, config.options);
  graficos[id] = new Chart($("#" + id), config);
}

// Gráfico de linhas: a escola (azul) e o Total URE (cinza tracejado)
function graficoLinha(id, nome, dados, rede, ehRede) {
  const pontos = v => v.map(x => x == null ? null : x * 100);
  const series = [{label: nome, data: pontos(dados), borderColor: "#2e75b6", backgroundColor: "#2e75b6", borderWidth: 3, pointRadius: 5, spanGaps: true}];
  if (!ehRede) series.push({label: "Total URE", data: pontos(rede), borderColor: "#7a8797", backgroundColor: "#7a8797", borderDash: [6, 4], borderWidth: 2, pointRadius: 4, spanGaps: true});
  criarGrafico(id, {type: "line", data: {labels: PROVAS, datasets: series},
    options: {scales: {y: {ticks: {callback: v => v + "%"}, grace: "12%"}}}});
}

/* ---------- 5. DESENHO DA TELA ---------- */
function render() {
  const alvo = estado.escola ? ESCOLAS.find(e => e.nome === estado.escola) : REDE;
  const v = valores(alvo), vr = valores(REDE);
  const d12 = dif(v[0], v[1]), d23 = dif(v[1], v[2]), d13 = dif(v[0], v[2]), t = tendencia(v);

  // Faixa de contexto e cartões de indicadores
  $("#ctx").className = estado.escola ? "ctx sch" : "ctx";
  $("#ctx").innerHTML = `<div><small>${estado.escola ? "ESCOLA SELECIONADA" : "VISÃO GERAL"}</small><h2>${estado.escola ? "🏫 " : "🌎 "}${esc(alvo.nome)}</h2>
    <p>Base: <b>${nomeBase()}</b>${t ? ` · <span class="pill ${t.cor}">${t.texto}</span>` : ""}</p></div>`;
  $("#kpis").innerHTML = cartao("1ª Prova", pct(v[0])) + cartao("2ª Prova", pct(v[1])) + cartao("3ª Prova", pct(v[2])) +
    cartao("Variação 1ª → 2ª", `<span class="${classeDif(d12)}">${textoDif(d12)}</span>`) +
    cartao("Variação 2ª → 3ª", `<span class="${classeDif(d23)}">${textoDif(d23)}</span>`) +
    cartao("Total 1ª → 3ª", `<span class="${classeDif(d13)}">${textoDif(d13)}</span>`) +
    cartao("Participação 3ª", pct(alvo.part[2]));

  // Gráficos
  $("#s1").textContent = "Base: " + nomeBase() + " · linha tracejada = Total URE.";
  graficoLinha("c1", alvo.nome, v, vr, alvo === REDE);
  graficoLinha("c2", alvo.nome, alvo.part, REDE.part, alvo === REDE);
  $("#s3").textContent = "Cada grupo de barras é um componente: 1ª, 2ª e 3ª prova de " + alvo.nome + ".";
  const cores = ["#a9c6e8", "#5b9bd5", "#1f3864"];
  criarGrafico("c3", {type: "bar", data: {labels: EV.comps.map(c => NOMES[c]),
    datasets: PROVAS.map((p, i) => ({label: p, data: alvo.c.map(x => x[i] == null ? null : x[i] * 100), backgroundColor: cores[i]}))},
    options: {scales: {y: {beginAtZero: true, ticks: {callback: x => x + "%"}}}}});

  desenharTabela();
}

// Tabela dinâmica: ordenável, com busca, no componente escolhido
function desenharTabela() {
  const linhas = ESCOLAS.map(e => {
    const v = valores(e);
    return {nome: e.nome, v1: v[0], v2: v[1], v3: v[2], d12: dif(v[0], v[1]), d23: dif(v[1], v[2]), d13: dif(v[0], v[2]), t: tendencia(v)};
  }).filter(r => r.nome.toLowerCase().includes(estado.busca.toLowerCase()));

  // Ordena (valores vazios ficam sempre no fim)
  const k = estado.ordem;
  const chave = r => k === "t" ? (r.t ? r.t.texto : null) : r[k];
  linhas.sort((a, b) => {
    const x = chave(a), y = chave(b);
    if (x == null) return 1; if (y == null) return -1;
    return (typeof x === "string" ? x.localeCompare(y) : x - y) * estado.sentido;
  });

  $("#tsub").textContent = linhas.length + " escola(s) · base: " + nomeBase() + " · clique no título para ordenar e na linha para ver a escola nos gráficos";
  const colunas = [["nome", "Escola"], ["v1", "1ª Prova"], ["v2", "2ª Prova"], ["v3", "3ª Prova"], ["d12", "1ª → 2ª"], ["d23", "2ª → 3ª"], ["d13", "Total 1ª → 3ª"], ["t", "Trajetória"]];
  $("#tabela").innerHTML = "<thead><tr>" + colunas.map(c => `<th data-k="${c[0]}">${c[1]}${k === c[0] ? (estado.sentido > 0 ? " ▲" : " ▼") : ""}</th>`).join("") + "</tr></thead><tbody>" +
    linhas.map(r => `<tr data-n="${esc(r.nome)}"${r.nome === estado.escola ? ' class="sel"' : ""}><td>${esc(r.nome)}</td><td>${pct(r.v1)}</td><td>${pct(r.v2)}</td><td>${pct(r.v3)}</td>
      <td class="${classeDif(r.d12)}">${textoDif(r.d12)}</td><td class="${classeDif(r.d23)}">${textoDif(r.d23)}</td><td class="${classeDif(r.d13)}">${textoDif(r.d13)}</td>
      <td>${r.t ? `<span class="pill ${r.t.cor}">${r.t.texto}</span>` : "—"}</td></tr>`).join("") + "</tbody>";

  document.querySelectorAll("#tabela th").forEach(th => th.onclick = () => {
    estado.sentido = estado.ordem === th.dataset.k ? -estado.sentido : (th.dataset.k === "nome" ? 1 : -1);
    estado.ordem = th.dataset.k; desenharTabela();
  });
  document.querySelectorAll("#tabela tbody tr").forEach(tr => tr.onclick = () => {
    estado.escola = tr.dataset.n; $("#escola").value = estado.escola; render(); scrollTo(0, 0);
  });
}

/* ---------- 6. BOTÕES E CAMPOS ---------- */
$("#escola").innerHTML = "<option value=''>Total URE (todas as escolas)</option>" +
  ESCOLAS.map(e => e.nome).sort((a, b) => a.localeCompare(b)).map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join("");
$("#comp").innerHTML = "<option value='geral'>Geral (% de acertos)</option>" +
  EV.comps.map((c, j) => `<option value="${j}">${NOMES[c]}</option>`).join("");
$("#escola").onchange = e => { estado.escola = e.target.value; render(); };
$("#comp").onchange = e => { estado.comp = e.target.value; render(); };
$("#busca").oninput = e => { estado.busca = e.target.value; desenharTabela(); };
$("#reset").onclick = () => {
  Object.assign(estado, {escola: "", comp: "geral", busca: "", ordem: "v3", sentido: -1});
  $("#escola").value = ""; $("#comp").value = "geral"; $("#busca").value = ""; render();
};

render();   // desenha a página pela primeira vez
