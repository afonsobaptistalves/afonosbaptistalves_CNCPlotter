// ============================================================
//  Página Plotter Controller
//  - Desenha as ilustrações dos ecrãs do programa (SVG animado)
//  - Faz o texto e as imagens aparecerem ao fazer scroll
//
//  Para usar uma captura de ecrã real em vez da ilustração, mete uma <img>
//  dentro do elemento .janela-corpo correspondente no index.html, por exemplo:
//    <div class="janela-corpo" data-cena="liga"><img src="imagens/controller/ligacao.png" alt="Ecrã de ligação"></div>
//  Quando há uma <img>, a ilustração não é desenhada.
// ============================================================
(function () {
  "use strict";

  const reduzir = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // cores da interface ilustrada (fixas, não mudam com o tema do site)
  const BG = "#20242B", PAN = "#2A2F37", BOR = "#3A414B", TX = "#E9ECEF", SOFT = "#9AA3AF";
  const ACC = "#E2231A", GRN = "#3DDC84", BLU = "#2479DA";

  // ---------- ajudas ----------
  const R = (x, y, w, h, o) => {
    o = o || {};
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (o.r || 0) + '" fill="' + (o.f || "none") + '"' +
      (o.s ? ' stroke="' + o.s + '"' : "") + (o.cl ? ' class="' + o.cl + '"' : "") + (o.st ? ' style="' + o.st + '"' : "") + (o.op ? ' opacity="' + o.op + '"' : "") + "/>";
  };
  const T = (x, y, texto, o) => {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" fill="' + (o.c || TX) + '" font-size="' + (o.s || 13) + '" font-weight="' + (o.w || 400) + '"' +
      (o.a ? ' text-anchor="' + o.a + '"' : "") + (o.cl ? ' class="' + o.cl + '"' : "") + (o.st ? ' style="' + o.st + '"' : "") + ">" + texto + "</text>";
  };
  const S = (rotulo, corpo) =>
    '<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + rotulo + '">' + R(0, 0, 480, 300, { f: BG }) + corpo + "</svg>";
  const estrela = (cx, cy, ro, ri) => {
    let d = "";
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? ri : ro;
      d += (i ? "L" : "M") + (cx + r * Math.cos(a)).toFixed(1) + " " + (cy + r * Math.sin(a)).toFixed(1);
    }
    return d + "Z";
  };

  const CENAS = {};

  // ---------- O que é: programa → Arduino → plotter ----------
  CENAS.fluxo = S("Programa a enviar instruções ao Arduino, que as executa na plotter",
    // programa
    R(24, 70, 110, 100, { r: 10, f: PAN, s: BOR }) + R(36, 82, 86, 54, { r: 4, f: "#12151a" }) +
    '<path d="M44 124L62 100L78 116L96 92L112 108" stroke="' + TX + '" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    R(48, 146, 38, 12, { r: 3, f: BLU }) + T(79, 200, "Programa", { a: "middle", w: 600 }) +
    // Arduino
    R(185, 80, 110, 80, { r: 8, f: "#00979C" }) + R(197, 90, 86, 60, { r: 4, f: "#C62828" }) + R(207, 100, 22, 30, { f: "#5F3FA3" }) + R(237, 100, 22, 30, { f: "#5F3FA3" }) +
    T(240, 200, "Arduino", { a: "middle", w: 600 }) +
    // plotter
    R(346, 70, 110, 100, { r: 10, f: "#D9CDB6", s: BOR }) + R(366, 90, 70, 60, { f: "#fff" }) +
    '<path class="c-tracar" pathLength="100" d="M376 140L376 105L401 118L426 105L426 140" stroke="#14161A" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    T(401, 200, "Plotter", { a: "middle", w: 600 }) +
    // setas com dados a andar
    '<path class="c-fluxo" d="M140 120H180" stroke="' + BLU + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path class="c-fluxo" d="M300 120H340" stroke="' + GRN + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    T(160, 108, "G-code", { a: "middle", s: 10, c: SOFT }) + T(320, 108, "X · Y", { a: "middle", s: 10, c: SOFT }) +
    T(240, 262, "Instruções para o Arduino. O ecrã mostra o que está a acontecer.", { a: "middle", s: 12, c: SOFT }));

  // ---------- 1. Ligação ao Arduino ----------
  CENAS.liga = S("Ecrã de ligação ao Arduino por porta série, com modo simulação",
    T(24, 38, "Ligação", { s: 16, w: 700 }) +
    T(24, 70, "Porta série", { s: 11, c: SOFT }) + R(24, 78, 180, 30, { r: 6, f: PAN, s: BOR }) + T(38, 98, "COM3", { s: 13 }) +
    '<path d="M182 90l6 6 6-6" stroke="' + SOFT + '" stroke-width="2" fill="none"/>' +
    T(24, 132, "Velocidade", { s: 11, c: SOFT }) + R(24, 140, 180, 30, { r: 6, f: PAN, s: BOR }) + T(38, 160, "115200", { s: 13 }) +
    R(24, 190, 180, 38, { r: 8, f: BLU }) + T(114, 214, "Ligar", { a: "middle", s: 14, w: 600, c: "#fff" }) +
    T(24, 262, "Modo simulação", { s: 13 }) +
    R(160, 247, 44, 22, { r: 11, f: "#4A515C", cl: "c-interr" }) + '<circle class="c-botao" cx="171" cy="258" r="8" fill="#fff"/>' +
    R(236, 24, 220, 252, { r: 12, f: PAN, s: BOR }) +
    '<circle class="c-led" cx="262" cy="58" r="7" fill="' + GRN + '"/>' + T(278, 63, "Ligado", { s: 15, w: 600 }) +
    T(254, 100, "Porta", { s: 11, c: SOFT }) + T(254, 118, "COM3", { s: 14 }) +
    T(254, 150, "Velocidade", { s: 11, c: SOFT }) + T(254, 168, "115200 baud", { s: 14 }) +
    T(254, 200, "Modo", { s: 11, c: SOFT }) + T(254, 218, "Máquina ou simulação", { s: 14 }));

  // ---------- 2. Painel de controlo ----------
  const seta = (x, y, d, i) =>
    R(x, y, 48, 48, { r: 10, f: PAN, s: BOR }) + '<path d="' + d + '" fill="' + TX + '"/>' +
    R(x, y, 48, 48, { r: 10, f: ACC, cl: "c-seta", st: "--i:" + i });
  CENAS.controlo = S("Painel de controlo com setas, passos de 1 a 50 milímetros e botões da caneta",
    T(24, 38, "Painel de controlo", { s: 16, w: 700 }) +
    seta(106, 70, "M130 82L116 106H144Z", 0) + seta(106, 174, "M130 218L116 194H144Z", 1) +
    seta(54, 122, "M66 146L90 132V160Z", 2) + seta(158, 122, "M194 146L170 132V160Z", 3) +
    R(106, 122, 48, 48, { r: 24, f: PAN, s: BOR }) + '<circle cx="130" cy="146" r="10" fill="none" stroke="' + TX + '" stroke-width="2.5"/><circle cx="130" cy="146" r="3" fill="' + TX + '"/>' +
    R(106, 122, 48, 48, { r: 24, f: ACC, cl: "c-seta", st: "--i:4" }) +
    T(240, 70, "Passo (mm)", { s: 11, c: SOFT }) +
    [1, 5, 10, 20, 50].map((v, k) => R(240 + k * 46, 80, 38, 30, { r: 6, f: PAN, s: BOR }) + T(259 + k * 46, 100, String(v), { a: "middle", s: 13 })).join("") +
    R(240, 80, 38, 30, { r: 6, f: BLU, cl: "c-chip" }) +
    [1, 5, 10, 20, 50].map((v, k) => T(259 + k * 46, 100, String(v), { a: "middle", s: 13, c: "#fff", cl: "c-chip-txt", st: "--k:" + k })).join("") +
    R(240, 132, 216, 34, { r: 8, f: PAN, s: BOR }) + T(348, 154, "Baixar caneta", { a: "middle", s: 13 }) +
    R(240, 176, 216, 34, { r: 8, f: PAN, s: BOR }) + T(348, 198, "Levantar caneta", { a: "middle", s: 13 }) +
    R(240, 220, 216, 34, { r: 8, f: PAN, s: BOR }) + T(348, 242, "Definir origem", { a: "middle", s: 13 }));

  // ---------- 3. Visualizador 200 × 200 mm ----------
  const casa = "M70 230L70 130L156 70L242 130L242 230L190 230L190 172L122 172L122 230L70 230";
  let grelha = "";
  for (let i = 1; i < 8; i++) {
    const v = 30 + i * 31.5;
    grelha += '<path d="M' + v + " 24V276M30 " + (24 + i * 31.5) + 'H282" stroke="#D5D9DF" stroke-width="1"/>';
  }
  CENAS.visualizador = S("Visualizador da área útil de 200 por 200 milímetros com a posição da caneta em tempo real e o traço no papel",
    R(30, 24, 252, 252, { f: "#F4F5F7", s: BOR }) + grelha +
    '<path d="' + casa + '" pathLength="100" stroke="#14161A" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="100">' +
    '<animate attributeName="stroke-dashoffset" from="100" to="0" dur="7s" repeatCount="indefinite"/></path>' +
    '<circle r="6" fill="' + ACC + '" stroke="#fff" stroke-width="2"><animateMotion dur="7s" repeatCount="indefinite" path="' + casa + '"/></circle>' +
    T(30, 294, "0", { s: 11, c: SOFT }) + T(282, 294, "200 mm", { a: "end", s: 11, c: SOFT }) +
    R(300, 24, 156, 252, { r: 12, f: PAN, s: BOR }) +
    T(316, 54, "Posição", { s: 11, c: SOFT }) + T(316, 80, "X  120.0 mm", { s: 15, w: 600 }) + T(316, 104, "Y  85.0 mm", { s: 15, w: 600 }) +
    T(316, 142, "Caneta", { s: 11, c: SOFT }) + T(316, 164, "Baixada", { s: 14 }) +
    T(316, 202, "Área útil", { s: 11, c: SOFT }) + T(316, 224, "200 × 200 mm", { s: 14 }));

  // ---------- 4. Terminal ----------
  const linhasTerm = [["&gt; G21", TX], ["ok", GRN], ["&gt; G0 X50 Y50", TX], ["ok", GRN], ["&gt; M3 S255", TX], ["ok", GRN], ["&gt; G1 X100 Y50 F800", TX], ["ok", GRN]];
  CENAS.terminal = S("Terminal para escrever comandos G-code diretamente",
    R(24, 24, 432, 200, { r: 8, f: "#0F1114", s: BOR }) +
    linhasTerm.map((l, i) => T(40, 52 + i * 22, l[0], { s: 13, c: l[1], cl: "mono c-lin", st: "--i:" + i })).join("") +
    R(24, 240, 340, 36, { r: 8, f: PAN, s: BOR }) + T(38, 263, "Escreve um comando G-code…", { s: 13, c: SOFT }) +
    R(376, 240, 80, 36, { r: 8, f: BLU }) + T(416, 263, "Enviar", { a: "middle", s: 13, w: 600, c: "#fff" }));

  // ---------- 5. Página G-code ----------
  const codigo = ["G21", "G90", "G0 X10 Y10", "M3 S255", "G1 X60 Y10 F800", "G1 X60 Y60", "G1 X10 Y60", "G1 X10 Y10", "M5"];
  CENAS.gcode = S("Página G-code para carregar e enviar programas completos",
    R(24, 24, 290, 252, { r: 8, f: "#0F1114", s: BOR }) +
    R(30, 28, 278, 22, { r: 4, f: BLU, op: ".45", cl: "c-hl" }) +
    codigo.map((l, i) => T(40, 44 + i * 24, String(i + 1), { s: 12, c: SOFT, cl: "mono" }) + T(72, 44 + i * 24, l, { s: 13, cl: "mono" })).join("") +
    R(334, 24, 122, 40, { r: 8, f: PAN, s: BOR }) + T(395, 49, "Carregar", { a: "middle", s: 13 }) +
    R(334, 76, 122, 40, { r: 8, f: BLU }) + T(395, 101, "Enviar", { a: "middle", s: 13, w: 600, c: "#fff" }) +
    T(334, 156, "Progresso", { s: 11, c: SOFT }) + R(334, 166, 122, 10, { r: 5, f: BOR }) + R(334, 166, 122, 10, { r: 5, f: GRN, cl: "c-prog" }));

  // ---------- 6. Página Imagens ----------
  CENAS.imagens = S("Página Imagens: converte uma imagem em desenho",
    T(24, 34, "Imagem", { s: 12, c: SOFT }) + R(24, 44, 180, 190, { r: 10, f: PAN, s: BOR }) +
    '<defs><linearGradient id="c-gr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C9CFD8"/><stop offset="1" stop-color="#6E7785"/></linearGradient></defs>' +
    '<path d="' + estrela(114, 142, 62, 26) + '" fill="url(#c-gr)"/>' +
    '<path d="M222 140H258M248 130L258 140L248 150" stroke="' + TX + '" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    T(276, 34, "Desenho", { s: 12, c: SOFT }) + R(276, 44, 180, 190, { r: 10, f: "#F4F5F7", s: BOR }) +
    '<path class="c-tracar" pathLength="100" d="' + estrela(366, 142, 62, 26) + '" stroke="#14161A" stroke-width="3" fill="none" stroke-linejoin="round" stroke-linecap="round"/>' +
    R(150, 252, 180, 34, { r: 8, f: BLU }) + T(240, 274, "Converter em desenho", { a: "middle", s: 13, w: 600, c: "#fff" }));

  // ---------- 7. Relatório ----------
  const hist = [["14:02", "Ligação", "COM3"], ["14:03", "Comando", "G0 X50 Y50"], ["14:03", "Movimento", "70.7 mm"], ["14:05", "Comando", "M3 S255"], ["14:06", "Movimento", "100 mm"]];
  CENAS.relatorio = S("Relatório com o histórico de movimentos, comandos e ligações e o total de distância percorrida",
    T(24, 38, "Relatório", { s: 16, w: 700 }) +
    T(32, 66, "Hora", { s: 11, c: SOFT }) + T(110, 66, "Tipo", { s: 11, c: SOFT }) + T(220, 66, "Detalhe", { s: 11, c: SOFT }) +
    hist.map((l, i) =>
      R(24, 76 + i * 30, 432, 28, { r: 4, f: i % 2 ? "none" : PAN, cl: "c-lin", st: "--i:" + i }) +
      T(32, 95 + i * 30, l[0], { s: 12, cl: "mono c-lin", st: "--i:" + i }) + T(110, 95 + i * 30, l[1], { s: 12, cl: "c-lin", st: "--i:" + i }) + T(220, 95 + i * 30, l[2], { s: 12, cl: "mono c-lin", st: "--i:" + i })
    ).join("") +
    R(24, 240, 432, 44, { r: 8, f: PAN, s: BOR }) + T(40, 267, "Distância percorrida", { s: 12, c: SOFT }) +
    R(190, 256, 170, 12, { r: 6, f: BOR }) + R(190, 256, 170, 12, { r: 6, f: BLU, cl: "c-barra" }) + T(440, 267, "170.7 mm", { a: "end", s: 14, w: 600 }));

  // ---------- 8. Botões de emergência ----------
  CENAS.emergencia = S("Botões de emergência para parar a máquina de imediato",
    '<circle class="c-anel" cx="240" cy="124" r="66" fill="none" stroke="' + ACC + '" stroke-width="4"/>' +
    '<circle class="c-anel c-anel2" cx="240" cy="124" r="66" fill="none" stroke="' + ACC + '" stroke-width="4"/>' +
    '<circle cx="240" cy="124" r="66" fill="' + ACC + '" stroke="#8A1510" stroke-width="4"/>' +
    T(240, 136, "PARAR", { a: "middle", s: 30, w: 800, c: "#fff" }) +
    T(240, 224, "Para a máquina de imediato", { a: "middle", s: 14, c: TX }) +
    R(150, 244, 180, 38, { r: 8, f: "none", s: ACC }) + T(240, 268, "EMERGÊNCIA", { a: "middle", s: 14, w: 700, c: ACC }));

  // ---------- desenhar as ilustrações ----------
  document.querySelectorAll("[data-cena]").forEach((el) => {
    if (el.querySelector("img")) return;              // captura real: não desenha a ilustração
    const cena = CENAS[el.dataset.cena];
    if (cena) el.innerHTML = cena;
  });

  // ---------- aparecer ao fazer scroll ----------
  const alvos = document.querySelectorAll("#view-controller .recurso, #view-controller .revelar");
  if (reduzir) document.querySelectorAll("#view-controller svg").forEach((s) => s.pauseAnimations && s.pauseAnimations());

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("revelado");      // aparece (uma vez)
        e.target.classList.toggle("visivel", e.isIntersecting);        // as animações só correm à vista
        if (!reduzir) {
          e.target.querySelectorAll("svg").forEach((s) => {
            if (e.isIntersecting) s.unpauseAnimations && s.unpauseAnimations();
            else s.pauseAnimations && s.pauseAnimations();
          });
        }
      });
    }, { threshold: 0.2, rootMargin: "0px 0px -8% 0px" });
    alvos.forEach((a) => io.observe(a));
  } else {
    alvos.forEach((a) => a.classList.add("revelado", "visivel"));
  }
})();
