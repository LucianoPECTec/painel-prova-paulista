/* =====================================================
   CALCULADORAS — SARESP (Ouro/Diamante), SAEB e IFA
   Dividido em 6 partes numeradas. As fórmulas são as
   mesmas da planilha Calculadora SARESP.
   ===================================================== */

/* ---------- 1. FERRAMENTAS PEQUENAS ---------- */
const $ = s => document.querySelector(s);
// Lê um campo aceitando vírgula ("4,5") e devolve número (ou null se vazio)
const num = id => { const v = parseFloat(String($("#" + id).value).replace(",", ".")); return isNaN(v) ? null : v; };
const fmt = (v, c = 1) => v == null || !isFinite(v) ? "—" : v.toLocaleString("pt-BR", {minimumFractionDigits: c, maximumFractionDigits: c});
const cartao = (t, v) => `<div class="kpi"><small>${t}</small><b>${v}</b></div>`;

/* ---------- 2. DADOS: questões de cada prova do SARESP ---------- */
// [disciplina, quantidade de questões]
const EF = pm => [["Português", pm], ["Matemática", pm], ["Inglês", 4], ["Geografia", 10], ["História", 10], ["Ciências", 16]];
// Ensino Médio: geo = questões de Geo/Hist; filo e soc = 0 quando a série não tem a disciplina
const EM = (geo, filo, soc) => [["Português", 18], ["Matemática", 18], ["Inglês", 6], ["Geografia", geo], ["História", geo],
  ["Biologia", 8], ["Física", 8], ["Química", 8], ["Filosofia", filo], ["Sociologia", soc]].filter(d => d[1] > 0);
const ETAPAS = {"6º ano": EF(20), "7º ano": EF(20), "8º ano": EF(20), "9º ano": EF(24),
                "1ª série EM": EM(8, 8, 0), "2ª série EM": EM(8, 0, 8), "3ª série EM": EM(7, 5, 5)};

/* ---------- 3. CALCULADORA SARESP ---------- */
// Monta a tabela da etapa escolhida (só quando a etapa muda, para não perder o cursor)
function montarTabelaSaresp() {
  const d = ETAPAS[$("#s-etapa").value];
  $("#s-tab").innerHTML = "<thead><tr><th>Disciplina</th><th>Nota 2025</th><th>Questões</th><th>Acertos 2025</th><th>Nota 2026 (meta)</th><th>Acertos para a meta</th><th>Arredondado</th></tr></thead><tbody>" +
    d.map((x, i) => `<tr><td>${x[0]}</td><td><input id="n${i}" inputmode="decimal"></td><td>${x[1]}</td><td id="a${i}">—</td><td id="m${i}">—</td><td id="g${i}">—</td><td id="r${i}">—</td></tr>`).join("") + "</tbody>";
  calcularSaresp();
}

function calcularSaresp() {
  const d = ETAPAS[$("#s-etapa").value];
  const nota = num("s-nota"), meta = num("s-meta");
  const cresc = nota && meta ? meta / nota - 1 : null;          // % de crescimento = meta ÷ nota − 1
  let t25 = 0, t26 = 0, tr = 0;
  d.forEach((x, i) => {
    const n = num("n" + i), q = x[1];
    const a25 = n == null ? null : n * q / 10;                  // acertos 2025 = nota × questões ÷ 10
    const n26 = n == null || cresc == null ? null : n * (1 + cresc);   // nota 2026 = nota + nota × crescimento
    const a26 = n26 == null ? null : n26 * q / 10;              // acertos necessários em 2026
    $("#a" + i).textContent = fmt(a25); $("#m" + i).textContent = fmt(n26, 2);
    $("#g" + i).innerHTML = a26 == null ? "—" : `<b>${fmt(a26)}</b>`;
    $("#r" + i).textContent = a26 == null ? "—" : Math.min(q, Math.ceil(a26 - 1e-9)) + " de " + q;   // arredonda para cima
    if (a26 != null) { t25 += a25; t26 += a26; tr += Math.min(q, Math.ceil(a26 - 1e-9)); }
  });
  $("#s-kpis").innerHTML = cartao("Crescimento necessário", cresc == null ? "—" : fmt(cresc * 100, 2) + "%") + cartao("Meta 2026", fmt(meta, 2)) +
    cartao("Acertos 2025 (soma)", fmt(t25)) + cartao("Acertos para a meta (soma)", fmt(t26)) + cartao("Total arredondado", tr || "—");
}

// Ao escolher escola ou tipo de meta, preenche a meta automaticamente
function preencherMeta() {
  const tipo = $("#s-tipo").value, m = METAS[$("#s-escola").value];
  if (tipo !== "x" && m) $("#s-meta").value = String(m[+tipo]).replace(".", ",");
  calcularSaresp();
}

/* ---------- 4. CALCULADORA SAEB (9º ano, Português + Matemática) ---------- */
function calcularSaeb() {
  const n = num("b-nota"), m = num("b-meta"), q = 26 + 26;      // 26 questões de cada disciplina
  const a23 = n == null ? null : q * n / 10, a25 = m == null ? null : q * m / 10;
  $("#b-kpis").innerHTML = cartao("Crescimento necessário", n && m ? fmt((m / n - 1) * 100, 2) + "%" : "—") +
    cartao("Acertos 2023", fmt(a23)) + cartao("Acertos para a meta 2025", `<span style="color:#245c1a">${fmt(a25)}</span>`) +
    cartao("Acertos a mais", a23 == null || a25 == null ? "—" : fmt(a25 - a23));
}

/* ---------- 5. CALCULADORA IFA ---------- */
const TURNOS = [["t", "Escola toda"], ["m", "Manhã"], ["a", "Tarde"], ["n", "Noite"]];
$("#i-tab").innerHTML = "<thead><tr><th>Turno</th><th>Matrículas ativas</th><th>Presença na semana (%)</th><th>Alunos presentes</th><th>Alunos para atingir o IFA</th><th>Mínimo para busca ativa</th></tr></thead><tbody>" +
  TURNOS.map(t => `<tr><td>${t[1]}</td><td><input id="${t[0]}-mat" inputmode="decimal"></td><td><input id="${t[0]}-pres" inputmode="decimal"></td><td id="${t[0]}-p">—</td><td id="${t[0]}-n">—</td><td id="${t[0]}-b">—</td></tr>`).join("") + "</tbody>";

function calcularIfa() {
  const meta = num("i-meta"), atual = num("i-atual"), total = num("i-total"), acum = num("i-acum");
  const ok = [meta, atual, total, acum].every(v => v != null) && total > atual;
  const rest = ok ? total - atual : null;                        // semanas restantes
  // frequência necessária = (meta × total − acumulada × semana atual) ÷ semanas restantes
  const nec = ok ? (meta * total - acum * atual) / rest : null;
  const usar = nec == null ? null : Math.min(100, Math.max(0, nec));   // limita entre 0% e 100%
  let aviso = "";
  if (nec != null && nec > 100) aviso = "⚠️ Meta inviável: mesmo com 100% de frequência nas semanas restantes não dá para atingir esse IFA.";
  if (nec != null && nec <= 0) aviso = "✅ Meta garantida: a frequência acumulada já cobre o IFA desejado.";
  $("#i-kpis").innerHTML = cartao("Semanas restantes", ok ? rest : "—") + cartao("Frequência necessária", nec == null ? "—" : fmt(nec, 2) + "%") +
    (aviso ? `<div class="aviso" style="grid-column:1/-1">${aviso}</div>` : "");
  TURNOS.forEach(t => {
    const mat = num(t[0] + "-mat"), pres = num(t[0] + "-pres");
    const pr = mat == null || pres == null ? null : Math.round(mat * pres / 100);       // alunos presentes
    const ne = mat == null || usar == null ? null : Math.round(mat * usar / 100);        // alunos para atingir o IFA
    $(`#${t[0]}-p`).textContent = pr ?? "—"; $(`#${t[0]}-n`).textContent = ne ?? "—";
    $(`#${t[0]}-b`).innerHTML = pr == null || ne == null ? "—" : `<b>${Math.max(0, ne - pr)}</b>`;   // busca ativa = necessários − presentes
  });
}

/* ---------- 6. BOTÕES, CAMPOS E ABAS ---------- */
$("#s-escola").innerHTML = "<option value=''>Escolha a escola…</option>" + Object.keys(METAS).sort((a, b) => a.localeCompare(b)).map(n => `<option>${n}</option>`).join("");
$("#s-etapa").innerHTML = Object.keys(ETAPAS).map(e => `<option>${e}</option>`).join("");
$("#s-escola").onchange = preencherMeta;
$("#s-tipo").onchange = preencherMeta;
$("#s-etapa").onchange = montarTabelaSaresp;
// qualquer digitação recalcula a calculadora correspondente
document.addEventListener("input", e => { calcularSaresp(); calcularSaeb(); calcularIfa(); });
document.querySelectorAll("#abas [data-v]").forEach(b => b.onclick = () => {
  document.querySelectorAll("[data-p]").forEach(s => s.hidden = s.dataset.p !== b.dataset.v);
  document.querySelectorAll("#abas [data-v]").forEach(x => x.classList.toggle("on", x === b));
});
montarTabelaSaresp(); calcularSaeb(); calcularIfa();
