/* =====================================================
   PROGRAMA PRINCIPAL DO PAINEL
   Este arquivo está dividido em 7 partes numeradas.
   ===================================================== */

/* ---------- 1. ESTADO: o que o usuário escolheu na tela ---------- */
const estado = {
  meta: META_PADRAO / 100,  // meta como fração (51% = 0.51)
  escola: "",               // "" = todas as escolas
  situacao: "",             // "" = todas; 0,1,2,3 = faixas
  base: "geral",            // "geral" ou número do componente
  ordem: "rk",              // coluna usada para ordenar a tabela
  sentido: 1,               // 1 = crescente, -1 = decrescente
  aba: "painel"             // aba aberta no momento
};

/* ---------- 2. FERRAMENTAS PEQUENAS ---------- */
const $ = seletor => document.querySelector(seletor);   // atalho para achar elementos
const NOMES_SITUACAO = ["Acima da Meta", "Próxima da Meta", "Atenção", "Alta Prioridade"];
const CLASSES = ["g", "y", "o", "r"];                    // classes de cor no CSS
const CORES = ["#7cc65c", "#f0c63c", "#ee9250", "#e0605a"]; // cores dos gráficos

// Formata 0.5123 como "51,23%"
const pct = v => v == null ? "" :
  (v * 100).toLocaleString("pt-BR", {minimumFractionDigits: 2, maximumFractionDigits: 2}) + "%";
// Formata diferença em pontos percentuais
const pp = v => (Math.abs(v) * 100).toLocaleString("pt-BR", {minimumFractionDigits: 2, maximumFractionDigits: 2}) + " p.p.";
// Evita que textos virem código HTML
const esc = t => String(t).replace(/[&<>]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;"}[c]));

// Descobre a situação (0 a 3) de um resultado em relação à meta
function situacaoDe(valor, meta) {
  if (valor >= meta) return 0;                           // acima da meta
  const falta = Math.round((meta - valor) * 1e10) / 1e10; // evita erros de arredondamento
  return falta <= 0.02 ? 1 : falta <= 0.05 ? 2 : 3;
}

/* ---------- 3. CÁLCULOS ---------- */
const TOTAL_ALUNOS = D.rows.reduce((soma, r) => soma + r[1], 0);

// Monta a lista de escolas com todos os números calculados
function calcular() {
  const ci = estado.base === "geral" ? -1 : +estado.base;
  // r = [nome, alunos, participação, geral, [componentes]]
  const lista = D.rows
    .map(r => ({nome: r[0], alunos: r[1], part: r[2], geral: r[3], comps: r[4], v: ci < 0 ? r[3] : r[4][ci]}))
    .filter(e => e.v != null);                 // tira escolas sem resultado nessa base
  const total = lista.reduce((s, e) => s + e.alunos, 0);
  lista.forEach(e => {
    e.peso = e.alunos / total;                 // peso da escola na URE
    e.dist = Math.max(0, estado.meta - e.v);   // distância até a meta
    e.imp  = e.peso * e.dist;                  // impacto do déficit = peso × distância
    e.sit  = situacaoDe(e.v, estado.meta);     // faixa de situação
  });
  const ranking = lista.filter(e => e.imp > 0).sort((a, b) => b.imp - a.imp);
  ranking.forEach((e, i) => e.rk = i + 1);     // posição de prioridade
  const ure = lista.reduce((s, e) => s + e.alunos * e.v, 0) / total; // média ponderada
  return {lista, total, ure, ranking};
}

// Resultado da URE em cada componente (ordenado do menor para o maior)
function porComponente() {
  return D.comps.map((nome, j) => {
    const com = D.rows.filter(r => r[4][j] != null);
    const alunos = com.reduce((s, r) => s + r[1], 0);
    const v = com.reduce((s, r) => s + r[1] * r[4][j], 0) / alunos;
    return {j, nome, v, cobertura: alunos / TOTAL_ALUNOS, sit: situacaoDe(v, estado.meta)};
  }).sort((a, b) => a.v - b.v);
}

/* ---------- 4. FILTROS (inclui a correção do filtro de Situação) ---------- */

// Escolas que passam no filtro de Situação
const filtrarPorSituacao = lista =>
  lista.filter(e => estado.situacao === "" || String(e.sit) === estado.situacao);

// Preenche a lista de escolas MOSTRANDO SÓ as da situação escolhida
function atualizarListaDeEscolas(lista) {
  const visiveis = filtrarPorSituacao(lista).sort((a, b) => a.nome.localeCompare(b.nome));
  // se a escola escolhida saiu do filtro, volta para "todas"
  if (estado.escola && !visiveis.some(e => e.nome === estado.escola)) estado.escola = "";
  $("#escola").innerHTML = `<option value="">Todas as escolas (${visiveis.length})</option>` +
    visiveis.map(e => `<option value="${esc(e.nome)}">${esc(e.nome)}</option>`).join("");
  $("#escola").value = estado.escola;
}

/* ---------- 5. GRÁFICOS ---------- */
const graficos = {};   // guarda os gráficos criados para poder refazê-los

// Escreve o valor em cima de cada barra
const plugRotulos = {id: "rotulos", afterDatasetsDraw(c) {
  if (c.config.type !== "bar") return;
  const x = c.ctx, horiz = c.options.indexAxis === "y";
  c.data.datasets.forEach((d, i) => {
    if (d.type === "line") return;
    c.getDatasetMeta(i).data.forEach((b, k) => {
      const v = d.data[k]; if (v == null) return;
      const t = v.toFixed(2).replace(".", ",") + (d.sufixo || "%");
      x.save(); x.font = "700 13px system-ui";
      const w = x.measureText(t).width + 10;
      const px = horiz ? (v < 0 ? b.x - 6 - w : b.x + 6) : b.x - w / 2;
      const py = horiz ? b.y - 10 : b.y - 27;
      x.fillStyle = "rgba(255,255,255,.93)"; x.fillRect(px, py, w, 20);
      x.fillStyle = "#14212e"; x.textAlign = "center"; x.textBaseline = "middle";
      x.fillText(t, px + w / 2, py + 10); x.restore();
    });
  });
}};

// Cria (ou refaz) um gráfico dentro do <canvas id="...">
function criarGrafico(id, config) {
  const el = $("#" + id); if (!el) return;
  if (typeof Chart === "undefined") { el.parentNode.innerHTML = "<p class='sub'>Gráficos indisponíveis: verifique a internet.</p>"; return; }
  if (graficos[id]) graficos[id].destroy();
  config.plugins = [plugRotulos];
  config.options = Object.assign({responsive: true, maintainAspectRatio: false}, config.options);
  graficos[id] = new Chart(el, config);
}
const eixoY = {beginAtZero: true, ticks: {callback: v => v + "%"}, title: {display: true, text: "% de acertos"}, grace: "8%"};
const linhaMeta = dados => ({type: "line", label: "Meta URE", data: dados, borderColor: "#1f3864", borderDash: [6, 4], pointRadius: 0, borderWidth: 2});
const legenda = {legend: {position: "bottom"}};

function graficosDaURE(d, visiveis) {
  const m = estado.meta, cs = porComponente();
  const top = d.ranking.filter(e => visiveis.includes(e)).slice(0, 10);   // Top 10 já respeita o filtro
  criarGrafico("c1", {type: "bar", data: {labels: top.map(e => e.nome), datasets: [{label: "Impacto do déficit", data: top.map(e => e.imp * 100), backgroundColor: top.map(e => e.rk <= 5 ? "#c00000" : "#ed7d31")}]},
    options: {indexAxis: "y", layout: {padding: {right: 80}}, onClick: (ev, a) => a.length && escolher(top[a[0].index].nome), plugins: legenda}});
  criarGrafico("c3", {type: "bar", data: {labels: cs.map(o => o.nome), datasets: [{label: "Resultado da URE", data: cs.map(o => o.v * 100), backgroundColor: cs.map(o => CORES[o.sit])}, linhaMeta(cs.map(() => m * 100))]},
    options: {scales: {y: eixoY}, plugins: legenda}});
  criarGrafico("c2", {type: "doughnut", data: {labels: NOMES_SITUACAO, datasets: [{data: [0, 1, 2, 3].map(k => d.lista.filter(e => e.sit === k).length), backgroundColor: CORES}]},
    options: {plugins: {...legenda, title: {display: true, text: "Total: " + d.lista.length + " escolas"}}}});
  const maxAl = Math.max(...d.lista.map(e => e.alunos));
  criarGrafico("c4", {type: "bubble", data: {datasets: [
    {label: "Escolas", data: visiveis.map(e => ({x: e.v * 100, y: e.alunos, r: 5 + Math.sqrt(e.imp * 1e4) * 3.2, n: e.nome})), backgroundColor: visiveis.map(e => CORES[e.sit] + "cc")},
    {type: "line", label: "Meta URE", data: [{x: m * 100, y: 0}, {x: m * 100, y: maxAl * 1.1}], borderColor: "#1f3864", borderDash: [6, 4], pointRadius: 0}]},
    options: {scales: {x: {title: {display: true, text: "Resultado (%)"}}, y: {beginAtZero: true, title: {display: true, text: "Alunos"}}}, plugins: legenda}});
}

function graficosDaEscola(d, bruto, eu) {
  const m = estado.meta, ure = {};
  porComponente().forEach(o => ure[o.nome] = o.v);
  const it = D.comps.map((nome, j) => ({nome, v: bruto[4][j]})).filter(o => o.v != null);
  criarGrafico("c6", {type: "bar", data: {labels: it.map(o => o.nome), datasets: [
    {label: "Escola", data: it.map(o => o.v * 100), backgroundColor: it.map(o => CORES[situacaoDe(o.v, m)])},
    {type: "line", label: "URE", data: it.map(o => ure[o.nome] * 100), showLine: false, pointStyle: "rectRot", pointRadius: 8, pointBackgroundColor: "#7a4fd0"},
    linhaMeta(it.map(() => m * 100))]}, options: {scales: {y: eixoY}, plugins: legenda}});
  const dif = it.map(o => ({nome: o.nome, g: (o.v - m) * 100})).sort((a, b) => a.g - b.g);
  criarGrafico("c7", {type: "bar", data: {labels: dif.map(o => o.nome), datasets: [{label: "Diferença para a meta (p.p.)", sufixo: " p.p.", data: dif.map(o => o.g), backgroundColor: dif.map(o => o.g < 0 ? "#e0605a" : "#7cc65c")}]},
    options: {indexAxis: "y", layout: {padding: {right: 85}}, plugins: {legend: {display: false}}}});
  const maxAl = Math.max(...d.lista.map(e => e.alunos));
  criarGrafico("c8", {type: "bubble", data: {datasets: [
    {label: "Demais escolas", data: d.lista.filter(e => e !== eu).map(e => ({x: e.v * 100, y: e.alunos, r: 6})), backgroundColor: "#9aa7b866"},
    {label: "Escola selecionada", data: eu ? [{x: eu.v * 100, y: eu.alunos, r: 13}] : [], backgroundColor: "#7a4fd0"},
    {type: "line", label: "Meta URE", data: [{x: m * 100, y: 0}, {x: m * 100, y: maxAl * 1.1}], borderColor: "#1f3864", borderDash: [6, 4], pointRadius: 0}]},
    options: {scales: {x: {title: {display: true, text: "Resultado (%)"}}, y: {beginAtZero: true, title: {display: true, text: "Alunos"}}}, plugins: legenda}});
}

/* ---------- 6. DESENHO DA TELA (render) ---------- */
const cartao = (titulo, valor) => `<div class="kpi"><small>${titulo}</small><b>${valor}</b></div>`;

function escolher(nome) {            // abre os dados de uma escola
  estado.escola = nome; estado.aba = "painel"; render(); scrollTo(0, 0);
}

function render() {
  const d = calcular(), m = estado.meta;
  atualizarListaDeEscolas(d.lista);                         // lista de escolas segue a Situação
  const visiveis = filtrarPorSituacao(d.lista);
  const base = estado.base === "geral" ? "Geral" : D.comps[+estado.base];
  const bruto = estado.escola ? D.rows.find(r => r[0] === estado.escola) : null;
  const eu = bruto ? d.lista.find(e => e.nome === estado.escola) : null;

  // Faixa de contexto + cartões de indicadores
  if (bruto) {
    const dif = eu ? eu.v - d.ure : 0;
    $("#ctx").className = "ctx sch";
    $("#ctx").innerHTML = `<div><small>ESCOLA SELECIONADA</small><h2>🏫 ${esc(bruto[0])}</h2><p>${eu ? `<span class="pill ${CLASSES[eu.sit]}">${NOMES_SITUACAO[eu.sit]}</span> · em <b>${base}</b> tem <b>${pct(eu.v)}</b>, ${pp(dif)} ${dif >= 0 ? "acima" : "abaixo"} da URE (${pct(d.ure)}).` : `Sem resultado em <b>${base}</b>.`}</p></div><button id="voltar">← Voltar à URE</button>`;
    $("#voltar").onclick = () => { estado.escola = ""; render(); };
    $("#kpis").innerHTML = cartao("Resultado da escola", eu ? pct(eu.v) : "—") + cartao("Meta URE", pct(m)) +
      cartao("Distância da meta", eu ? pct(eu.dist) : "—") +
      cartao("Prioridade", eu ? (eu.rk ? eu.rk + "º de " + d.ranking.length : "Meta atingida") : "—") +
      cartao("Alunos", bruto[1].toLocaleString("pt-BR")) + cartao("Participação", pct(bruto[2]));
  } else {
    $("#ctx").className = "ctx";
    $("#ctx").innerHTML = `<div><small>VISÃO GERAL</small><h2>🌎 Unidade Regional de Ensino</h2><p>Escolha uma escola na lista acima para ver só os dados dela.</p></div>`;
    $("#kpis").innerHTML = cartao("Resultado URE — " + base, pct(d.ure)) + cartao("Meta URE", pct(m)) +
      cartao("Gap para a meta", pct(Math.max(0, m - d.ure))) + cartao("Alunos", d.total.toLocaleString("pt-BR")) +
      cartao("Abaixo da meta", d.ranking.length + " de " + d.lista.length) +
      cartao("Mostrando", visiveis.length + " escolas");
  }

  // Mostra só a aba atual
  document.querySelectorAll("[data-p]").forEach(e => e.hidden = e.dataset.p !== estado.aba);
  document.querySelectorAll(".tabs [data-v]").forEach(e => e.classList.toggle("on", e.dataset.v === estado.aba));
  $("#pU").hidden = !!bruto; $("#pE").hidden = !bruto;

  // Envio do plano só libera com escola escolhida
  const envioOk = bruto && ENVIO.url.startsWith("http");
  $("#upS").textContent = bruto ? "Escola: " + bruto[0] + " · PDF, Word ou ODT, até 5 MB." : "Escolha uma escola para liberar o envio.";
  $("#upF").disabled = !envioOk; $("#upB").disabled = !envioOk;

  if (estado.aba === "painel") bruto ? graficosDaEscola(d, bruto, eu) : graficosDaURE(d, visiveis);
  if (estado.aba === "escolas") desenharTabela(visiveis, base);
  if (estado.aba === "comps") desenharComponentes(bruto);
  if (estado.aba === "mapa") desenharMapa(visiveis);
}

function desenharTabela(lista, base) {
  const k = estado.ordem, val = e => k === "rk" ? (e.rk ?? 1e9) : e[k];
  lista.sort((a, b) => (typeof val(a) === "string" ? val(a).localeCompare(val(b)) : val(a) - val(b)) * estado.sentido);
  $("#tsub").textContent = lista.length + " escola(s) · base: " + base + " · clique no título para ordenar e na linha para abrir a escola";
  const cols = [["rk", "Prioridade"], ["nome", "Escola"], ["alunos", "Alunos"], ["v", "Resultado"], ["peso", "Peso"], ["dist", "Distância"], ["imp", "Impacto"], ["sit", "Situação"]];
  $("#tb").innerHTML = "<thead><tr>" + cols.map(c => `<th data-k="${c[0]}">${c[1]}${k === c[0] ? (estado.sentido > 0 ? " ▲" : " ▼") : ""}</th>`).join("") + "</tr></thead><tbody>" +
    lista.map((e, i) => `<tr data-i="${i}"><td>${e.rk ? `<span class="rk ${e.rk <= 5 ? "c" : e.rk <= 10 ? "e" : "d"}">${e.rk}</span>` : ""}</td><td>${esc(e.nome)}</td><td>${e.alunos.toLocaleString("pt-BR")}</td><td>${pct(e.v)}</td><td>${pct(e.peso)}</td><td>${pct(e.dist)}</td><td>${pct(e.imp)}</td><td><span class="pill ${CLASSES[e.sit]}">${NOMES_SITUACAO[e.sit]}</span></td></tr>`).join("") + "</tbody>";
  document.querySelectorAll("#tb th").forEach(th => th.onclick = () => { estado.sentido = estado.ordem === th.dataset.k ? -estado.sentido : 1; estado.ordem = th.dataset.k; render(); });
  document.querySelectorAll("#tb tbody tr").forEach(tr => tr.onclick = () => escolher(lista[+tr.dataset.i].nome));
}

function desenharComponentes(bruto) {
  const cs = porComponente(), ure = {};
  cs.forEach(o => ure[o.nome] = o);
  const linhas = bruto ? D.comps.map((nome, j) => ({j, nome, v: bruto[4][j]})).filter(o => o.v != null).map(o => ({...o, sit: situacaoDe(o.v, estado.meta)})).sort((a, b) => a.v - b.v) : cs;
  $("#cmp-s").textContent = bruto ? "Barra = escola; linha azul = meta." : "Linha azul = meta. Clique num componente para analisar as escolas só nele.";
  $("#cmp").innerHTML = linhas.map(o => `<div class="row cmp" data-j="${o.j}"><b>${o.nome}</b><div class="trk"><div class="fill ${CLASSES[o.sit]}" style="width:${o.v / .7 * 100}%"></div><i class="mk" style="left:${estado.meta / .7 * 100}%"></i></div><span><b>${pct(o.v)}</b> <small>${bruto ? "URE " + pct(ure[o.nome].v) : "cobertura " + pct(o.cobertura)}</small></span></div>`).join("");
  if (!bruto) document.querySelectorAll(".row.cmp").forEach(r => r.onclick = () => { estado.base = estado.base === r.dataset.j ? "geral" : r.dataset.j; $("#base").value = estado.base; estado.aba = "escolas"; render(); });
}

function desenharMapa(lista) {
  const cor = v => v == null ? "" : ` class="${CLASSES[situacaoDe(v, estado.meta)]}"`;
  $("#hm").innerHTML = "<thead><tr><th>Escola</th><th>Geral</th>" + D.comps.map(c => `<th>${c}</th>`).join("") + "</tr></thead><tbody>" +
    lista.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map(e => `<tr><td style="text-align:left">${esc(e.nome)}</td><td${cor(e.geral)}>${pct(e.geral)}</td>` + e.comps.map(v => `<td${cor(v)}>${pct(v)}</td>`).join("") + "</tr>").join("") + "</tbody>";
}

/* ---------- 7. BOTÕES, CAMPOS E ENVIO DE ARQUIVO ---------- */
document.querySelectorAll(".tabs [data-v]").forEach(b => b.onclick = () => { estado.aba = b.dataset.v; render(); });
$("#meta").value = META_PADRAO;
$("#meta").oninput = e => { const v = parseFloat(e.target.value); if (!isNaN(v)) { estado.meta = v / 100; render(); } };
$("#situacao").onchange = e => { estado.situacao = e.target.value; render(); };
$("#escola").onchange = e => { estado.escola = e.target.value; render(); };
$("#base").innerHTML = "<option value='geral'>Geral (% de acertos)</option>" + D.comps.map((c, j) => `<option value="${j}">${c}</option>`).join("");
$("#base").onchange = e => { estado.base = e.target.value; render(); };
$("#reset").onclick = () => {
  Object.assign(estado, {meta: META_PADRAO / 100, escola: "", situacao: "", base: "geral", ordem: "rk", sentido: 1});
  $("#meta").value = META_PADRAO; $("#situacao").value = ""; $("#base").value = "geral"; render();
};

// Janelas "Como funciona" e "Sobre"
const abrirJanela = html => { $("#mb").innerHTML = html; $("#md").classList.add("on"); };
$("#help").onclick = () => abrirJanela(`<h3>❓ Como funciona</h3>
  <p><b>Resultado URE</b> = média ponderada: Σ(alunos × resultado) ÷ total de alunos.</p>
  <p><b>Peso</b> = alunos da escola ÷ alunos da URE · <b>Distância</b> = máx(0; meta − resultado) · <b>Impacto</b> = peso × distância.</p>
  <p><b>Situação:</b> verde ≥ meta · amarelo até 2 p.p. abaixo · laranja 2 a 5 p.p. · vermelho mais de 5 p.p.</p>
  <p>O filtro <b>Situação</b> também reduz a lista de escolas, os gráficos e as tabelas.</p>`);
$("#sobre").onclick = () => abrirJanela(`<h3>ℹ️ Sobre</h3><p>Desenvolvido por Luciano Julio da Silva — PEC Desenvolvimento Curricular de Tecnologia, URE São José do Rio Preto / SEDUC-SP.</p><p>Organiza dados públicos do Escola Total / SEDUC-SP; não substitui os sistemas oficiais.</p>`);
$("#md").onclick = e => { if (e.target.id === "md" || e.target.classList.contains("x")) $("#md").classList.remove("on"); };

// Envio do plano de ação
$("#upB").onclick = async () => {
  const arq = $("#upF").files[0], msg = $("#upM"); msg.style.color = "#334155";
  if (!arq) { msg.textContent = "Selecione o arquivo primeiro."; return; }
  if (arq.size > 5 * 1024 * 1024) { msg.textContent = "Arquivo maior que 5 MB."; return; }
  const tipos = {pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", odt: "application/vnd.oasis.opendocument.text"};
  const tipo = tipos[arq.name.split(".").pop().toLowerCase()];
  if (!tipo) { msg.textContent = "Formato não aceito (use PDF, Word ou ODT)."; return; }
  $("#upB").disabled = true; msg.textContent = "Enviando… não feche a página.";
  try {
    const dados = await new Promise((ok, erro) => { const r = new FileReader(); r.onload = () => ok(r.result.split(",")[1]); r.onerror = erro; r.readAsDataURL(arq); });
    const resp = await fetch(ENVIO.url, {method: "POST", headers: {"Content-Type": "text/plain;charset=utf-8"}, body: JSON.stringify({token: ENVIO.token, escola: estado.escola, nome: arq.name, tipo, dados})});
    const j = await resp.json();
    msg.style.color = j.ok ? "#245c1a" : "#9b1c22";
    msg.textContent = j.ok ? "✅ Plano enviado: " + arq.name : "Não foi possível enviar: " + (j.erro || "erro desconhecido");
    if (j.ok) $("#upF").value = "";
  } catch (e) { msg.style.color = "#9b1c22"; msg.textContent = "Falha no envio. Verifique a internet e tente de novo."; }
  $("#upB").disabled = false;
};

render();   // desenha a tela pela primeira vez
