// ============================================================
//  Plotter3D: desenha a CNC Plotter de caneta em vista isométrica (SVG)
//
//  Plotter3D.criar(elemento, opções) devolve a instância com:
//    .desenhar()      a caneta desenha pistas numa folha (hero)
//    .irPara(true)    monta as peças   |  .irPara(false) desmonta
//    .alternar()      troca entre montada e desmontada
//    .livre(cfg)      modo de desenho: rato move a caneta, scroll sobe/desce
//
//  Opções: K (escala), montagem, destaque ["id", ...], areaUtil
//  Unidades do modelo: 1 ≈ 1 cm
// ============================================================
(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const C = 0.866; // cos 30°
  const S = 0.5;   // sin 30°
  const reduzir = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Posição da caneta quando a plotter está montada (ponto de partida)
  const CASA = [16.9, 8.2];
  const ZP = 0.13;     // altura da tinta (topo da folha)
  const LIFT = 1.3;    // quanto a caneta sobe quando o servo a levanta

  // Área útil: curso do patim em cada carril (300 mm de carril menos 58.8 mm do patim ≈ 241 mm)
  const AREA = { x0: 8.95, x1: 33.05, y0: -2.55, y1: 21.55 };
  // Limites de desenho = área útil ∩ folha A4
  const LIMITES = { x0: 8.95, x1: 33.05, y0: -1, y1: 20 };

  const COR = {
    mdf:     { top: "#CFA770", front: "#A97E4C", right: "#87603A" },
    alu:     { top: "#E9ECF0", front: "#B9C0CA", right: "#8F97A3" },
    aco:     { top: "#D2D7DE", front: "#8F96A1", right: "#6D7480" },
    prata:   { top: "#DDE1E6", front: "#AAB1BB", right: "#878F9A" },
    preto:   { top: "#4A505B", front: "#2C3037", right: "#1C1F24" },
    correia: { top: "#40454E", front: "#23262C", right: "#15171A" },
    azul:    { top: "#62B4FF", front: "#2479DA", right: "#1B5CA9" },
    papel:   { top: "#FFFFFF", front: "#E6E6E0", right: "#D0D0C9" },
    verm:    { top: "#F2574C", front: "#D32F2F", right: "#A32020" },
    branco:  { top: "#FFFFFF", front: "#E8EAED", right: "#C9CDD3" },
    crem:    { top: "#F4F1E8", front: "#DAD5C4", right: "#B8B3A2" },
    tinta:   { top: "#2C2F36", front: "#14161A", right: "#0B0C0E" },
    teal:    { top: "#2AA9AE", front: "#00797E", right: "#005B5F" },
    shield:  { top: "#D84B4B", front: "#B02F2F", right: "#8A2222" },
    driver:  { top: "#8A63D2", front: "#5F3FA3", right: "#47307E" },
    fonte:   { top: "#C9CED6", front: "#9AA2AD", right: "#7C8591" },
    base:    { top: "#D9CDB6", front: "#B3A58B", right: "#978A72" },
    pla:     { top: "#F7AE5C", front: "#E0862A", right: "#B96A1C" },
    pcb:     { top: "#DB9B73", front: "#B8744B", right: "#98593A" },
  };

  // ------------------------------------------------------------
  //  Definição das peças
  //  grupo: fixo | carroY (anda no eixo Y) | cabeca (Y + X) | z (cabeça + sobe/desce) | braco
  // ------------------------------------------------------------
  function definirPartes(op) {
    const caixa = (p, s, c, x) => Object.assign({ t: "caixa", p, s, c }, x || {});
    const cil = (c, r, h, cor) => ({ t: "cil", c, r, h, cor });
    const linhaY = (x, y0, y1, passo) => { const a = []; for (let y = y0; y <= y1 + 1e-6; y += passo) a.push([x, y]); return a; };
    const linhaX = (y, x0, x1, passo) => { const a = []; for (let x = x0; x <= x1 + 1e-6; x += passo) a.push([x, y]); return a; };

    const motor = (x, y) => [
      caixa([x, y, 11.8], [4.2, 4.2, 0.7], COR.prata),
      caixa([x, y, 12.5], [4.2, 4.2, 2.8], COR.preto),
      caixa([x, y, 15.3], [4.2, 4.2, 0.7], COR.prata, {
        furos: [[x + 0.45, y + 0.45], [x + 3.75, y + 0.45], [x + 0.45, y + 3.75], [x + 3.75, y + 3.75]], rf: 0.16,
      }),
      caixa([x + 4.2, y + 1.3, 12.9], [0.6, 1.6, 0.9], COR.crem),
      cil([x + 2.1, y + 2.1, 16.0], 0.25, 1.4, COR.prata),
    ];

    const parafPlaca = [[1.2, 1.5], [3.8, 1.5], [1.2, 6.5], [3.8, 6.5]];
    const px = CASA[0], py = CASA[1];

    return [
      { id: "base", nome: "Base de apoio", grupo: "fixo", ordem: 0, prof: -1000, expl: [0, 0, -6],
        formas: [caixa([-1, -3, -0.8], [39, 36, 0.8], COR.base)] },

      (op && op.pcb)
        ? { id: "papel", nome: "Placa PCB virgem de cobre", grupo: "fixo", ordem: 0, prof: -900, expl: [10, 0, 0],
            formas: [caixa([11, 2.5, 0], [20, 14, 0.12], COR.pcb, { pcb: true })] }
        : { id: "papel", nome: "Folha A4", grupo: "fixo", ordem: 0, prof: -900, expl: [10, 0, 0],
            formas: [caixa([5.35, -1, 0], [29.7, 21, 0.12], COR.papel)] },

      { id: "eletronica", nome: "Arduino UNO + CNC Shield V3", grupo: "fixo", ordem: 0, prof: -500, expl: [-6, 0, 0],
        formas: [
          caixa([-12, 8, 0], [7, 5.4, 0.5], COR.teal),
          caixa([-12, 8, 0.5], [7, 5.4, 0.5], COR.shield),
        ] },
      { id: "drivers", nome: "Drivers DRV8825", grupo: "fixo", ordem: 0, prof: -499, expl: [-6, 0, 4],
        formas: [
          caixa([-11.2, 8.6, 1.0], [1.6, 2.1, 0.25], COR.driver),
          caixa([-9.5, 8.6, 1.0], [1.6, 2.1, 0.25], COR.driver),
          caixa([-7.8, 8.6, 1.0], [1.6, 2.1, 0.25], COR.driver),
        ] },
      { id: "borne", nome: "Borne azul de alimentação (CNC Shield)", grupo: "fixo", ordem: 0, prof: -499, expl: [-6, 0, 4],
        formas: [caixa([-11.6, 11.6, 1.0], [1.4, 1.3, 0.9], COR.azul)] },
      { id: "fonte", nome: "Fonte de alimentação 12 V 5 A (60 W)", grupo: "fixo", ordem: 0, prof: -498, expl: [-6, 0, 0],
        formas: [
          caixa([-12, 15, 0], [10, 5, 2.6], COR.fonte, { furos: linhaX(17.5, -10.5, -5.5, 1.2), rf: 0.22 }),
          caixa([-3.2, 16.4, 2.6], [1.2, 2.2, 0.4], COR.preto),
        ] },

      { id: "placaEsq", nome: "Placa lateral", grupo: "fixo", ordem: 1, expl: [0, -7, 0],
        formas: [caixa([0, 0, 0], [5, 1, 8], COR.mdf, { grao: true, parafusosF: parafPlaca })] },
      { id: "placaDir", nome: "Placa lateral", grupo: "fixo", ordem: 1, expl: [0, 7, 0],
        formas: [caixa([0, 31, 0], [5, 1, 8], COR.mdf, { grao: true, parafusosF: parafPlaca })] },

      { id: "guiaY", nome: "Carril linear MGN15H (300 mm)", grupo: "fixo", ordem: 2, expl: [0, 0, 9],
        formas: [caixa([2, 1, 8], [1.6, 30, 1.2], COR.alu, { furos: linhaY(2.8, 2, 30, 2.2), rf: 0.2 })] },
      { id: "endstopY", nome: "Fim de curso mecânico (RAMPS 1.4)", grupo: "fixo", ordem: 2, expl: [0, -4, 8],
        formas: [caixa([4.0, 0.1, 8.0], [0.9, 0.8, 0.9], COR.verm)] },
      { id: "correiaY", nome: "Correia GT2 6 mm", grupo: "fixo", ordem: 2, expl: [-5, 0, 8],
        formas: [caixa([0.8, 1, 8], [0.5, 30, 0.6], COR.correia, { dentes: true })] },

      { id: "patimY", nome: "Patim MGN15H (bloco deslizante)", grupo: "carroY", ordem: 3, expl: [0, 0, 11],
        formas: [caixa([1.2, 11.65, 9.2], [3.2, 5.9, 1.8], COR.aco, {
          furos: [[1.8, 12.35], [3.8, 12.35], [1.8, 16.85], [3.8, 16.85]], rf: 0.17,
        })] },

      { id: "placaCarro", nome: "Placa do carro", grupo: "carroY", ordem: 4, expl: [0, 0, 14],
        formas: [caixa([0.5, 9.6, 11], [8.5, 9.8, 0.8], COR.mdf, { grao: true, furos: [[1.0, 10.1], [8.5, 10.1], [1.0, 18.9], [8.5, 18.9]], rf: 0.18 })] },

      { id: "motorA", nome: "Motor de passo NEMA 17 (1 A, 13 N·cm)", grupo: "carroY", ordem: 5, expl: [-4, 0, 16], formas: motor(1, 10) },
      { id: "motorB", nome: "Motor de passo NEMA 17 (1 A, 13 N·cm)", grupo: "carroY", ordem: 5, expl: [-4, 0, 18], formas: motor(1, 15) },
      { id: "poliaA", nome: "Polia GT2 20 dentes, furo de 5 mm", grupo: "carroY", ordem: 6, expl: [-4, 0, 22],
        formas: [cil([3.1, 12.1, 16.2], 1.2, 1.0, COR.prata)] },
      { id: "poliaB", nome: "Polia GT2 20 dentes, furo de 5 mm", grupo: "carroY", ordem: 6, expl: [-4, 0, 24],
        formas: [cil([3.1, 17.1, 16.2], 1.2, 1.0, COR.prata)] },

      { id: "guiaX", nome: "Carril linear MGN15H (300 mm)", grupo: "carroY", ordem: 7, expl: [9, 0, 10],
        formas: [caixa([6, 13.9, 11.8], [30, 1.6, 1.2], COR.alu, { furos: linhaX(14.7, 7, 35, 2.2), rf: 0.2 })] },
      { id: "correiaX", nome: "Correia GT2 6 mm", grupo: "carroY", ordem: 7, expl: [8, -2, 14],
        formas: [caixa([6, 13.2, 11.8], [30, 0.5, 0.6], COR.correia, { dentes: true })] },
      { id: "endstop", nome: "Fim de curso mecânico (RAMPS 1.4)", grupo: "carroY", ordem: 7, expl: [0, -5, 9],
        formas: [caixa([32, 12.5, 11.8], [1.2, 0.8, 0.9], COR.verm)] },
      { id: "pernaX", nome: "Suporte de extremidade", grupo: "carroY", ordem: 8, expl: [8, 0, 0],
        formas: [caixa([35, 13, 0], [2, 3, 11.8], COR.mdf, { grao: true })] },
      { id: "poliaFim", nome: "Polia GT2 (retorno da correia)", grupo: "carroY", ordem: 8, expl: [8, 0, 6],
        formas: [cil([36.5, 14.5, 11.8], 0.9, 0.9, COR.prata)] },

      { id: "patimX", nome: "Patim MGN15H (bloco deslizante)", grupo: "cabeca", ordem: 9, expl: [0, 0, 12],
        formas: [caixa([13.95, 13.7, 13], [5.9, 3.0, 1.6], COR.aco, {
          furos: [[14.6, 14.3], [19.2, 14.3], [14.6, 16.1], [19.2, 16.1]], rf: 0.15,
        })] },
      { id: "suporteCab", nome: "Estrutura do cabeçote (impressa em 3D, PLA)", grupo: "cabeca", ordem: 10, expl: [0, -8, 5],
        formas: [caixa([14.8, 13, 10.4], [4.2, 0.7, 6.2], COR.pla, { camadas: true, parafusosF: [[15.5, 11.2], [18.1, 11.2], [15.5, 15.8], [18.1, 15.8]] })] },
      { id: "guiaZ", nome: "Guia linear MGN15H (eixo Z)", grupo: "cabeca", ordem: 11, expl: [0, -9, 5],
        formas: [caixa([16.1, 12.2, 10.9], [1.6, 0.8, 5.0], COR.alu)] },
      { id: "servo", nome: "Micro servo SG90", grupo: "cabeca", ordem: 16, expl: [0, 0, 14],
        formas: [
          caixa([15.7, 12.8, 16.6], [2.4, 1.2, 2.2], COR.azul),
          caixa([15.0, 13.0, 18.0], [3.8, 0.6, 0.25], COR.azul),
          cil([16.4, 13.4, 18.8], 0.4, 0.3, COR.prata),
        ] },
      { id: "braco", nome: "Braço do servo SG90", grupo: "braco", ordem: 17, expl: [0, 3, 16],
        formas: [caixa([16.15, 10.8, 19.1], [0.5, 2.8, 0.2], COR.branco), cil([16.4, 13.4, 19.1], 0.45, 0.25, COR.branco)] },

      { id: "patimZ", nome: "Patim MGN15H (eixo Z)", grupo: "z", ordem: 12, expl: [0, -10, 5],
        formas: [caixa([15.7, 11.2, 12], [2.4, 1, 1.8], COR.aco)] },
      { id: "placaZ", nome: "Suporte do eixo Z (impresso em 3D, PLA, furo de 13 mm)", grupo: "z", ordem: 13, expl: [0, -11, 5],
        formas: [
          caixa([14.7, 10.5, 10.8], [4.4, 0.7, 5.6], COR.pla, { camadas: true, parafusosF: [[15.4, 11.6], [18.4, 11.6], [15.4, 15.6], [18.4, 15.6]] }),
          caixa([14.7, 6.6, 10.8], [4.4, 3.9, 0.7], COR.pla, { camadas: true, furos: [[px, py]], rf: 0.68 }),
        ] },
      { id: "canetaBaixo", nome: "Caneta Markal LA-CO Dura-Ink 5 Preto Micro", grupo: "z", ordem: 15, expl: [0, 0, 18],
        formas: [
          cil([px, py, 0.12], 0.14, 0.6, COR.tinta),
          cil([px, py, 0.72], 0.32, 1.1, COR.prata),
          cil([px, py, 1.82], 0.45, 8.08, COR.preto),
        ] },
      { id: "adaptador", nome: "Adaptador azul de 12.5 mm", grupo: "z", ordem: 14, expl: [0, 0, 12],
        formas: [cil([px, py, 9.9], 0.66, 2.5, COR.azul)] },
      { id: "canetaTopo", nome: "Caneta Markal LA-CO Dura-Ink 5 Preto Micro", grupo: "z", ordem: 15, expl: [0, 0, 18],
        formas: [
          cil([px, py, 12.4], 0.45, 2.7, COR.preto),
          cil([px, py, 13.1], 0.47, 1.2, COR.verm),
          cil([px, py, 15.1], 0.4, 0.4, COR.preto),
        ] },
    ];
  }

  // ------------------------------------------------------------
  //  Letras em traço único: a caneta escreve "CNC Plotter" na folha
  //  Cada letra é uma lista de traços; entre traços a caneta levanta-se.
  // ------------------------------------------------------------
  const arco = (cx, cy, rx, ry, a0, a1, n) => {
    const p = [];
    for (let i = 0; i <= n; i++) {
      const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
      p.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
    }
    return p;
  };
  const FONTE = {
    C: { w: 0.75, tr: [arco(0.4, 0.5, 0.36, 0.5, 40, 320, 14)] },
    N: { w: 0.8, tr: [[[0, 0], [0, 1], [0.8, 0], [0.8, 1]]] },
    P: { w: 0.7, tr: [[[0, 0], [0, 1], [0.4, 1]].concat(arco(0.4, 0.75, 0.25, 0.25, 90, -90, 8), [[0, 0.5]])] },
    l: { w: 0.2, tr: [[[0.1, 0], [0.1, 1]]] },
    o: { w: 0.7, tr: [arco(0.35, 0.3, 0.32, 0.3, 90, 450, 16)] },
    t: { w: 0.55, tr: [[[0.25, 0.9], [0.25, 0.1], [0.33, 0.01], [0.5, 0.03]], [[0.04, 0.6], [0.5, 0.6]]] },
    e: { w: 0.65, tr: [[[0.05, 0.3], [0.61, 0.3]].concat(arco(0.33, 0.3, 0.28, 0.3, 0, 320, 14))] },
    r: { w: 0.45, tr: [[[0.1, 0], [0.1, 0.6], [0.1, 0.35], [0.2, 0.55], [0.42, 0.6]]] },
    " ": { w: 0.45, tr: [] },
  };
  function textoTracos(texto) {
    const SX = 2.5, SY = 4.4, GAP = 0.2, X0 = 10.2, Y0 = 7.2; // posição e tamanho na folha (cm)
    let x = X0;
    const saida = [];
    texto.split("").forEach((ch) => {
      const f = FONTE[ch];
      if (!f) return;
      f.tr.forEach((s) => saida.push(s.map((p) => [x + p[0] * SX, Y0 + p[1] * SY])));
      x += (f.w + GAP) * SX;
    });
    return saida;
  }

  // ------------------------------------------------------------
  //  Construção
  // ------------------------------------------------------------
  function criar(container, op) {
    op = op || {};
    const K = op.K || 10;
    const P = (x, y, z) => [(x + y) * C * K, ((x - y) * S - z) * K];

    let semente = 11;
    const rnd = () => (semente = (semente * 16807) % 2147483647) / 2147483647;

    const el = (tag, attrs, pai) => {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      if (pai) pai.appendChild(n);
      return n;
    };
    const pts = (arr) => arr.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    const contorno = { stroke: "rgba(0,0,0,.38)", "stroke-width": ".6", "stroke-linejoin": "round" };
    const tr = (v) => "translate(" + v[0].toFixed(2) + "px," + v[1].toFixed(2) + "px)";

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const acumular = (x, y, ox, oy) => {
      ox = ox || 0; oy = oy || 0;
      minX = Math.min(minX, x, x + ox); maxX = Math.max(maxX, x, x + ox);
      minY = Math.min(minY, y, y + oy); maxY = Math.max(maxY, y, y + oy);
    };

    const circ = (plano, a, b, c, r) => {
      const arr = [];
      for (let i = 0; i < 14; i++) {
        const t = (Math.PI * 2 * i) / 14, u = r * Math.cos(t), v = r * Math.sin(t);
        arr.push(plano === "xy" ? P(a + u, b + v, c) : plano === "xz" ? P(a + u, c, b + v) : P(c, a + u, b + v));
      }
      return arr;
    };

    function desenharCaixa(g, f, ox, oy) {
      const x0 = f.p[0], y0 = f.p[1], z0 = f.p[2];
      const w = f.s[0], d = f.s[1], h = f.s[2];
      const x1 = x0 + w, y1 = y0 + d, z1 = z0 + h;
      const front = [P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1)];
      const right = [P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)];
      const top = [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)];
      el("polygon", Object.assign({ points: pts(front), fill: f.c.front }, contorno), g);
      el("polygon", Object.assign({ points: pts(right), fill: f.c.right }, contorno), g);
      el("polygon", Object.assign({ points: pts(top), fill: f.c.top }, contorno), g);

      if (f.grao) {
        const gr = el("g", { stroke: "rgba(52,30,8,.24)", "stroke-width": ".5", fill: "none" }, g);
        const n = Math.max(2, Math.round(h * 3.5));
        for (let i = 1; i < n; i++) {
          const z = z0 + (h * (i + (rnd() - 0.5) * 0.6)) / n;
          const a = P(x0, y0, z), b = P(x1, y0, z);
          el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, gr);
        }
        const m = Math.max(2, Math.round(d * 3));
        for (let i = 1; i < m; i++) {
          const y = y0 + (d * (i + (rnd() - 0.5) * 0.6)) / m;
          const a = P(x0, y, z1), b = P(x1, y, z1);
          el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, gr);
        }
      }
      if (f.camadas) {                                   // camadas visíveis de uma peça impressa em 3D
        const ca = el("g", { stroke: "rgba(60,25,0,.2)", "stroke-width": ".4", fill: "none" }, g);
        for (let z = z0 + 0.2; z < z1 - 0.05; z += 0.2) {
          const a = P(x0, y0, z), b = P(x1, y0, z), c2 = P(x1, y1, z);
          el("polyline", { points: pts([a, b, c2]) }, ca);
        }
      }
      if (f.furos) f.furos.forEach((q) => el("polygon", { points: pts(circ("xy", q[0], q[1], z1, f.rf || 0.2)), fill: "#14161A" }, g));
      if (f.parafusosF) f.parafusosF.forEach((q) => {
        el("polygon", { points: pts(circ("xz", q[0], q[1], y0, 0.28)), fill: "#A5ACB6", stroke: "#4A505B", "stroke-width": ".4" }, g);
      });
      if (f.dentes) {
        const a = w > d ? P(x0, y0 + d / 2, z1) : P(x0 + w / 2, y0, z1);
        const b = w > d ? P(x1, y0 + d / 2, z1) : P(x0 + w / 2, y1, z1);
        el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: "#7A808B", "stroke-width": ".9", "stroke-dasharray": "1 1.4" }, g);
      }
      if (f.pcb) desenharPCB(g, z1);
      front.concat(right, top).forEach((q) => acumular(q[0], q[1], ox, oy));
    }

    function desenharCilindro(g, f, ox, oy) {
      const c = P(f.c[0], f.c[1], f.c[2]);
      const A = f.r * 1.2247 * K, B = f.r * 0.7071 * K, alt = f.h * K;
      el("path", Object.assign({
        d: "M" + (c[0] - A) + "," + (c[1] - alt) + " L" + (c[0] - A) + "," + c[1] +
           " A" + A + "," + B + " 0 0 0 " + (c[0] + A) + "," + c[1] + " L" + (c[0] + A) + "," + (c[1] - alt) + " Z",
        fill: f.cor.front,
      }, contorno), g);
      el("ellipse", Object.assign({ cx: c[0], cy: c[1] - alt, rx: A, ry: B, fill: f.cor.top }, contorno), g);
      acumular(c[0] - A, c[1] - alt - B, ox, oy);
      acumular(c[0] + A, c[1] + B, ox, oy);
    }

    // PCB virgem de cobre: superfície lisa, só com um brilho metálico suave (sem furos, pads nem marcações)
    let contadorPCB = 0;
    function desenharPCB(g, z1) {
      const idG = "pcbCobre" + (++contadorPCB);
      const gr = el("linearGradient", { id: idG, x1: "0", y1: "0", x2: "1", y2: "1" }, el("defs", {}, g));
      el("stop", { offset: "0", "stop-color": "#FFE3CC", "stop-opacity": ".38" }, gr);
      el("stop", { offset: ".5", "stop-color": "#FFFFFF", "stop-opacity": "0" }, gr);
      el("stop", { offset: "1", "stop-color": "#6B3315", "stop-opacity": ".25" }, gr);
      el("polygon", { points: pts([P(11, 2.5, z1), P(31, 2.5, z1), P(31, 16.5, z1), P(11, 16.5, z1)]), fill: "url(#" + idG + ")" }, g);
    }

    // Área útil desenhada sobre a folha (tracejado + medidas)
    function desenharAreaUtil(g) {
      const z = ZP + 0.01;
      const cantos = [P(AREA.x0, AREA.y0, z), P(AREA.x1, AREA.y0, z), P(AREA.x1, AREA.y1, z), P(AREA.x0, AREA.y1, z)];
      el("polygon", { points: pts(cantos), fill: "rgba(226,35,26,.06)", stroke: "#E2231A", "stroke-width": "1.5", "stroke-dasharray": "6 4", "stroke-linejoin": "round" }, g);
      cantos.forEach((q) => acumular(q[0], q[1]));

      const medida = (eixo) => {
        const v = (typeof AREA_DE_TRABALHO !== "undefined") ? AREA_DE_TRABALHO[eixo] : null;
        return typeof v === "number" ? "≈ " + v + " mm" : "área útil";
      };
      const etiqueta = (pos, ang, texto) => {
        const t = el("text", {
          x: 0, y: 0, "text-anchor": "middle", transform: "translate(" + pos[0].toFixed(1) + " " + pos[1].toFixed(1) + ") rotate(" + ang + ")",
          "font-size": (K * 1.7).toFixed(1), "font-weight": "700", fill: "#B8180F", stroke: "#fff", "stroke-width": "4", "paint-order": "stroke",
          "font-family": "IBM Plex Sans, system-ui, sans-serif",
        }, g);
        t.textContent = texto;
      };
      etiqueta(P((AREA.x0 + AREA.x1) / 2, AREA.y0 - 1.6, z), 30, "X: " + medida("x"));
      etiqueta(P(AREA.x0 - 1.8, (AREA.y0 + AREA.y1) / 2, z), -30, "Y: " + medida("y"));

      const a4 = el("text", {
        x: 0, y: 0, "text-anchor": "middle", transform: "translate(" + P(20.2, 19.0, z).map((v) => v.toFixed(1)).join(" ") + ") rotate(30)",
        "font-size": (K * 1.2).toFixed(1), fill: "#6D7480", "font-family": "IBM Plex Sans, system-ui, sans-serif",
      }, g);
      a4.textContent = "Folha A4 (210 × 297 mm)";
    }

    const profundidade = (parte) => {
      if (parte.prof != null) return parte.prof;
      const v = parte.formas.map((f) => f.t === "cil"
        ? f.c[0] - f.c[1] + f.c[2] + f.h / 2
        : f.p[0] + f.s[0] / 2 - (f.p[1] + f.s[1] / 2) + f.p[2] + f.s[2] / 2);
      return v.reduce((a, b) => a + b, 0) / v.length;
    };

    const partes = definirPartes(op).sort((a, b) => profundidade(a) - profundidade(b));

    const svg = el("svg", {
      class: "plotter3d",
      role: "img",
      "aria-label": op.rotulo || "Plotter de caneta CNC em vista isométrica",
    });

    // sombra no chão
    const sombra = [P(-14, -4, -0.8), P(39, -4, -0.8), P(39, 34, -0.8), P(-14, 34, -0.8)];
    el("polygon", { points: pts(sombra), fill: "rgba(0,0,0,.06)" }, svg);
    sombra.forEach((q) => acumular(q[0], q[1]));

    const fexp = op.montagem ? 1 : 0;
    const mapa = {};
    const grupos = { carroY: [], cabeca: [], z: [], braco: [] };
    let papelG = null;

    partes.forEach((parte) => {
      const fe = op.montagem ? 0.45 : 1; // distância das peças desmontadas
      const ex = P(parte.expl[0] * fe, parte.expl[1] * fe, parte.expl[2] * fe);
      const g = el("g", { class: "peca", "data-id": parte.id, "data-nome": parte.nome }, svg);
      parte.formas.forEach((f) => (f.t === "cil"
        ? desenharCilindro(g, f, ex[0] * fexp, ex[1] * fexp)
        : desenharCaixa(g, f, ex[0] * fexp, ex[1] * fexp)));
      mapa[parte.id] = { g, def: parte, ex };
      if (grupos[parte.grupo]) grupos[parte.grupo].push(g);
      if (parte.id === "papel") {
        papelG = g;
        if (op.areaUtil) desenharAreaUtil(g);
      }
    });

    // Destaque dos problemas: o material afetado pisca suavemente a vermelho
    if (op.destaque && op.destaque.length) {
      op.destaque.forEach((id) => {
        const p = mapa[id];
        if (!p) return;
        const filhos = Array.prototype.slice.call(p.g.children);
        const ov = el("g", { class: "pisca-vermelho" }, p.g);
        filhos.forEach((ch) => ov.appendChild(ch.cloneNode(true)));
      });
    }

    const m = op.margem != null ? op.margem : 2.4 * K;
    svg.setAttribute("viewBox", [minX - m, minY - m, maxX - minX + 2 * m, maxY - minY + 2 * m].map((v) => v.toFixed(0)).join(" "));
    container.appendChild(svg);

    const anguloBraco = (lift) => -(1 - lift / LIFT) * 12;
    const pivoBraco = P(16.4, 13.4, 19.1);
    grupos.braco.forEach((g) => { g.style.transformOrigin = pivoBraco[0].toFixed(1) + "px " + pivoBraco[1].toFixed(1) + "px"; });

    // --------------------------------------------------------
    //  Hero: a caneta desenha pistas na folha (traços separados, sem ligações)
    // --------------------------------------------------------
    function desenhar() {
      if (!papelG) return;
      const tracos = textoTracos("CNC Plotter");

      const quadros = [];
      let t = 0, x = CASA[0], y = CASA[1], lift = LIFT;
      const reg = () => quadros.push({ t, x, y, lift });
      const mover = (nx, ny, v) => { t += Math.hypot(nx - x, ny - y) / v; x = nx; y = ny; reg(); };
      const levantar = (l, dur) => { t += dur; lift = l; reg(); };

      reg();
      const faixas = [];
      tracos.forEach((trc) => {
        mover(trc[0][0], trc[0][1], 18);
        levantar(0, 0.2);
        const i0 = quadros.length - 1;
        for (let i = 1; i < trc.length; i++) mover(trc[i][0], trc[i][1], 11);
        faixas.push({ trc, i0 });
        levantar(LIFT, 0.2);
      });
      mover(CASA[0], CASA[1], 18);
      const fimTrabalho = t;
      t += 4;
      reg();
      const T = t;

      faixas.forEach((f) => {
        const p = f.trc.map((q) => P(q[0], q[1], ZP));
        const cum = [0];
        for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
        const L = cum[cum.length - 1];
        const caminho = el("path", {
          d: "M" + p.map((q) => q[0].toFixed(1) + " " + q[1].toFixed(1)).join(" L"),
          fill: "none", stroke: "#101216", "stroke-width": (K * 0.24).toFixed(2),
          "stroke-linecap": "round", "stroke-linejoin": "round",
          "stroke-dasharray": L.toFixed(1) + " " + L.toFixed(1),
        }, papelG);
        if (reduzir) { caminho.setAttribute("stroke-dashoffset", "0"); return; }
        const t0 = quadros[f.i0].t / T;
        const q = [
          { offset: 0, strokeDashoffset: L, opacity: 0 },                          // escondido até a caneta chegar
          { offset: Math.max(0, t0 - 0.0004), strokeDashoffset: L, opacity: 0 },
        ];
        cum.forEach((c, i) => q.push({ offset: quadros[f.i0 + i].t / T, strokeDashoffset: L - c, opacity: 1 }));
        q.push({ offset: (fimTrabalho + 2.8) / T, strokeDashoffset: 0, opacity: 1 });
        q.push({ offset: 1, strokeDashoffset: 0, opacity: 0 });
        caminho.animate(q, { duration: T * 1000, iterations: Infinity });
      });

      if (reduzir) return;

      const opts = { duration: T * 1000, iterations: Infinity };
      const quadrosDe = (fn) => quadros.map((q) => ({ offset: q.t / T, transform: fn(q) }));
      const kCarro = quadrosDe((q) => tr(P(0, q.y - CASA[1], 0)));
      const kCab = quadrosDe((q) => tr(P(q.x - CASA[0], q.y - CASA[1], 0)));
      const kZ = quadrosDe((q) => tr(P(q.x - CASA[0], q.y - CASA[1], q.lift)));
      const kBraco = quadrosDe((q) => tr(P(q.x - CASA[0], q.y - CASA[1], 0)) + " rotate(" + anguloBraco(q.lift).toFixed(2) + "deg)");

      grupos.carroY.forEach((g) => g.animate(kCarro, opts));
      grupos.cabeca.forEach((g) => g.animate(kCab, opts));
      grupos.z.forEach((g) => g.animate(kZ, opts));
      grupos.braco.forEach((g) => g.animate(kBraco, opts));
    }

    // --------------------------------------------------------
    //  Montagem / desmontagem
    // --------------------------------------------------------
    let montado = false;
    const todas = Object.keys(mapa).map((k) => mapa[k]);
    const maxOrdem = Math.max.apply(null, todas.map((p) => p.def.ordem));
    const transf = (v) => "translate(" + v[0].toFixed(1) + "px," + v[1].toFixed(1) + "px)";

    if (op.montagem) todas.forEach((p) => { p.g.style.transform = transf(p.ex); });

    function irPara(alvo, instante) {
      montado = alvo;
      todas.forEach((p) => {
        if (p.anim) p.anim.cancel();
        const de = alvo ? transf(p.ex) : "translate(0px,0px)";
        const ate = alvo ? "translate(0px,0px)" : transf(p.ex);
        const final = alvo ? "" : ate;
        if (instante || reduzir) { p.g.style.transform = final; return; }
        const atraso = alvo ? p.def.ordem * 130 : (maxOrdem - p.def.ordem) * 60;
        p.anim = p.g.animate(
          [{ transform: de }, { transform: ate }],
          { duration: alvo ? 1150 : 800, delay: atraso, easing: "cubic-bezier(.22,.8,.25,1)", fill: "both" }
        );
        p.anim.onfinish = () => { p.g.style.transform = final; p.anim.cancel(); p.anim = null; };
      });
    }

    // --------------------------------------------------------
    //  Ajudas partilhadas pelos modos interativos
    // --------------------------------------------------------
    const limitar = (v, a, b) => Math.max(a, Math.min(b, v));

    // Põe a cabeça da plotter na posição (x, y) com a caneta à altura "lift"
    function aplicarPose(pos, lift) {
      const dx = pos[0] - CASA[0], dy = pos[1] - CASA[1];
      const vCarro = tr(P(0, dy, 0)), vCab = tr(P(dx, dy, 0)), vZ = tr(P(dx, dy, lift));
      grupos.carroY.forEach((g) => { g.style.transform = vCarro; });
      grupos.cabeca.forEach((g) => { g.style.transform = vCab; });
      grupos.z.forEach((g) => { g.style.transform = vZ; });
      grupos.braco.forEach((g) => { g.style.transform = vCab + " rotate(" + anguloBraco(lift).toFixed(2) + "deg)"; });
    }

    // Posição do rato no plano da folha / placa (coordenadas do modelo)
    function mundoDe(e) {
      const mat = svg.getScreenCTM();
      if (!mat) return null;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(mat.inverse());
      const a = p.x / (C * K), b = (p.y / K + ZP) / S;
      return [(a + b) / 2, (a - b) / 2];
    }

    // Tinta: só existe onde a caneta esteve baixada. Cada descida começa um caminho novo,
    // por isso nunca há linhas de ligação entre traços.
    function criarTinta(grupo, cor, contorno, fator) {
      let atual = null, ultimo = null;
      const larg = K * 0.17 * (fator || 1);
      const caminho = (d, c, w) => el("path", {
        d, fill: "none", stroke: c, "stroke-width": w.toFixed(2), "stroke-linecap": "round", "stroke-linejoin": "round",
      }, grupo);
      const criarCaminhos = (d) => {
        const arr = [];
        if (contorno) arr.push(caminho(d, contorno.cor, larg + contorno.extra)); // contorno por baixo
        arr.push(caminho(d, cor || "#101216", larg));
        return arr;
      };
      const anexar = (arr, s) => arr.forEach((p) => p.setAttribute("d", p.getAttribute("d") + s));
      return {
        atualizar(pos, lift) {
          if (lift < 0.22) {
            const p = P(pos[0], pos[1], ZP);
            if (!atual) {
              atual = criarCaminhos("M" + p[0].toFixed(1) + " " + p[1].toFixed(1) + " l0 0");
              ultimo = p;
            } else if (Math.hypot(p[0] - ultimo[0], p[1] - ultimo[1]) > 0.6) {
              anexar(atual, " L" + p[0].toFixed(1) + " " + p[1].toFixed(1));
              ultimo = p;
            }
          } else {
            atual = null;
          }
        },
        terminar() { atual = null; },
        estatico(pontos) {
          const p = pontos.map((q) => P(q[0], q[1], ZP));
          criarCaminhos("M" + p.map((q) => q[0].toFixed(1) + " " + q[1].toFixed(1)).join(" L"));
        },
        limpar() { while (grupo.firstChild) grupo.removeChild(grupo.firstChild); atual = null; },
      };
    }

    // --------------------------------------------------------
    //  Modo livre (área de trabalho): o rato move a caneta nos eixos X/Y.
    //  Scroll para cima levanta a caneta, scroll para baixo baixa-a.
    // --------------------------------------------------------
    function livre(cfg) {
      cfg = cfg || {};
      const aviso = cfg.onEstado || function () {};
      const tinta = criarTinta(el("g", { class: "tinta-livre" }, papelG));

      let ativo = false, rodando = false, ant = 0;
      let pos = CASA.slice(), alvo = CASA.slice();
      let lift = LIFT, liftAlvo = LIFT;

      function passo(agora) {
        if (!ativo) { rodando = false; return; }
        const dt = Math.min(0.05, (agora - ant) / 1000);
        ant = agora;

        let sx = (alvo[0] - pos[0]) * (1 - Math.pow(0.0008, dt));
        let sy = (alvo[1] - pos[1]) * (1 - Math.pow(0.0008, dt));
        const sl = Math.hypot(sx, sy), vmax = 70 * dt;
        if (sl > vmax) { sx *= vmax / sl; sy *= vmax / sl; }
        pos[0] += sx; pos[1] += sy;

        lift += (liftAlvo - lift) * (1 - Math.pow(0.0001, dt));
        if (Math.abs(liftAlvo - lift) < 0.01) lift = liftAlvo;
        aplicarPose(pos, lift);
        tinta.atualizar(pos, lift);
        requestAnimationFrame(passo);
      }

      function arrancar() {
        if (rodando) return;
        rodando = true; ant = performance.now();
        requestAnimationFrame(passo);
      }

      function definirCaneta(baixada) {
        liftAlvo = baixada ? 0 : LIFT;
        aviso({ ativo, baixada });
        if (reduzir && ativo) { lift = liftAlvo; aplicarPose(pos, lift); }
      }

      const mover = (e) => {
        const w = mundoDe(e);
        if (w) alvo = [limitar(w[0], LIMITES.x0, LIMITES.x1), limitar(w[1], LIMITES.y0, LIMITES.y1)];
      };

      svg.addEventListener("pointermove", (e) => {
        if (!ativo) return;
        mover(e);
        if (reduzir) { pos = alvo.slice(); aplicarPose(pos, lift); }
      });
      svg.addEventListener("pointerdown", (e) => {
        if (!ativo || e.pointerType === "mouse") return;      // toque: o dedo baixa a caneta
        mover(e); pos = alvo.slice();
        definirCaneta(true);
      });
      const soltar = (e) => { if (ativo && e.pointerType !== "mouse") definirCaneta(false); };
      svg.addEventListener("pointerup", soltar);
      svg.addEventListener("pointercancel", soltar);
      svg.addEventListener("wheel", (e) => {
        if (!ativo) return;
        e.preventDefault();
        if (e.deltaY < 0) definirCaneta(false);     // scroll para cima: servo sobe (caneta levantada)
        else if (e.deltaY > 0) definirCaneta(true); // scroll para baixo: servo desce (caneta baixada)
      }, { passive: false });

      return {
        ativar(v) {
          ativo = !!v;
          svg.classList.toggle("modo-livre", ativo);
          svg.style.touchAction = ativo ? "none" : "";
          if (ativo) arrancar(); else tinta.terminar();
          aviso({ ativo, baixada: liftAlvo === 0 });
        },
        estaAtivo: () => ativo,
        subir: () => definirCaneta(false),
        descer: () => definirCaneta(true),
        limpar: () => tinta.limpar(),
      };
    }

    // --------------------------------------------------------
    //  Cabeçote e caneta: a plotter desenha pistas numa PCB.
    //  Demonstração automática; ao carregar na placa passa a modo livre
    //  (clica e arrasta: a caneta baixa e as pistas encaixam a 45°).
    // --------------------------------------------------------
    function pcb(cfg) {
      cfg = cfg || {};
      const aviso = cfg.onEstado || function () {};
      const LIM = { x0: 11.4, x1: 30.6, y0: 2.9, y1: 16.1 };
      const PASSO = 0.8;
      const demo = [
        [[13, 5], [16, 5], [18, 7], [24, 7], [26, 5], [29, 5]],
        [[13, 9.5], [16, 9.5], [18, 11.5], [26, 11.5], [28, 9.5], [29, 9.5]],
        [[13, 14], [20, 14], [21.5, 12.5], [26, 12.5], [27.5, 14], [29, 14]],
      ];
// Tinta preta da caneta Markal LA-CO Dura-Ink 5 Preto Micro
      const tinta = criarTinta(el("g", { class: "tinta-pcb" }, papelG), "#0B0C0E", null, 1.3);

      let modo = "demo", fase = "ir", i = 0, seg = 1, espera = 0;
      let pos = CASA.slice(), alvo = CASA.slice();
      let lift = LIFT, liftAlvo = LIFT;
      let ancora = null, premido = false, visivel = true, rodando = false, ant = 0;

      svg.classList.add("modo-pcb");
      svg.style.touchAction = "none";

      function andar(para, vel, dt) {
        const dx = para[0] - pos[0], dy = para[1] - pos[1], d = Math.hypot(dx, dy), maxPasso = vel * dt;
        if (d <= maxPasso) { pos[0] = para[0]; pos[1] = para[1]; return true; }
        pos[0] += (dx / d) * maxPasso; pos[1] += (dy / d) * maxPasso;
        return false;
      }

      function iniciar() {
        tinta.limpar();
        premido = false;
        pos = CASA.slice(); alvo = CASA.slice();
        lift = LIFT; liftAlvo = LIFT;
        if (reduzir) {                       // sem animação: mostra as pistas já desenhadas
          demo.forEach((tr) => tinta.estatico(tr));
          modo = "manual";
          aplicarPose(pos, lift);
          aviso({ modo });
          return;
        }
        modo = "demo"; fase = "ir"; i = 0; seg = 1;
        aviso({ modo });
        arrancar();
      }

      function demoPasso(dt) {
        const tr = demo[i];
        if (fase === "ir") {
          liftAlvo = LIFT;
          if (andar(tr[0], 20, dt)) { fase = "baixar"; liftAlvo = 0; }
        } else if (fase === "baixar") {
          if (lift === 0) { fase = "desenhar"; seg = 1; }
        } else if (fase === "desenhar") {
          if (andar(tr[seg], 8, dt)) {
            seg++;
            if (seg >= tr.length) { fase = "subir"; liftAlvo = LIFT; }
          }
        } else if (fase === "subir") {
          if (lift === LIFT) {
            i++;
            if (i >= demo.length) { fase = "fim"; espera = 3.5; } else fase = "ir";
          }
        } else if (fase === "fim") {
          if (andar(CASA, 20, dt)) { espera -= dt; if (espera <= 0) iniciar(); }
        }
      }

      function manualPasso(dt) {
        if (reduzir) { pos = alvo.slice(); return; }
        const k = 1 - Math.pow(0.0008, dt);
        let sx = (alvo[0] - pos[0]) * k, sy = (alvo[1] - pos[1]) * k;
        const sl = Math.hypot(sx, sy), vmax = 60 * dt;
        if (sl > vmax) { sx *= vmax / sl; sy *= vmax / sl; }
        pos[0] += sx; pos[1] += sy;
      }

      function passo(agora) {
        if (!visivel) { rodando = false; return; }
        const dt = Math.min(0.05, (agora - ant) / 1000);
        ant = agora;
        if (modo === "demo") demoPasso(dt); else manualPasso(dt);

        const v = 7 * dt;                                    // velocidade do servo
        if (reduzir || Math.abs(liftAlvo - lift) <= v) lift = liftAlvo;
        else lift += Math.sign(liftAlvo - lift) * v;

        aplicarPose(pos, lift);
        tinta.atualizar(pos, lift);
        requestAnimationFrame(passo);
      }

      function arrancar() {
        if (rodando) return;
        rodando = true; ant = performance.now();
        requestAnimationFrame(passo);
      }

      function entrarManual() {
        if (modo === "manual") return;
        modo = "manual";
        liftAlvo = LIFT;
        aviso({ modo });
        arrancar();
      }

      const pontoNaPlaca = (e) => {
        const w = mundoDe(e);
        return w ? [limitar(w[0], LIM.x0, LIM.x1), limitar(w[1], LIM.y0, LIM.y1)] : null;
      };

      svg.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        const w = pontoNaPlaca(e);
        if (!w) return;
        entrarManual();
        premido = true;
        try { svg.setPointerCapture(e.pointerId); } catch (err) {}
        ancora = [Math.round(w[0] / PASSO) * PASSO, Math.round(w[1] / PASSO) * PASSO];
        alvo = ancora.slice();
        liftAlvo = 0;                                         // a caneta baixa enquanto carregas
      });
      svg.addEventListener("pointermove", (e) => {
        if (modo !== "manual") return;
        const w = pontoNaPlaca(e);
        if (!w) return;
        if (!premido) { alvo = w; return; }                   // sem carregar: a cabeça só acompanha o rato
        // a desenhar: avança em passos, sempre na direção mais próxima de um múltiplo de 45°
        let guarda = 0;
        while (guarda++ < 40) {
          const vx = w[0] - ancora[0], vy = w[1] - ancora[1];
          if (Math.hypot(vx, vy) < PASSO * 0.9) break;
          const ang = Math.round(Math.atan2(vy, vx) / (Math.PI / 4)) * (Math.PI / 4);
          ancora = [
            limitar(ancora[0] + Math.round(Math.cos(ang)) * PASSO, LIM.x0, LIM.x1),
            limitar(ancora[1] + Math.round(Math.sin(ang)) * PASSO, LIM.y0, LIM.y1),
          ];
        }
        alvo = ancora.slice();                                // a caneta segue o último ponto encaixado
      });
      const soltar = () => {
        if (!premido) return;
        premido = false;
        liftAlvo = LIFT;                                      // levanta: o próximo traço é um caminho novo
      };
      svg.addEventListener("pointerup", soltar);
      svg.addEventListener("pointercancel", soltar);

      if ("IntersectionObserver" in window) {
        new IntersectionObserver((es) => {
          visivel = es[0].isIntersecting;
          if (visivel) arrancar();
        }).observe(container);
      }

      iniciar();

      return {
        repetir: iniciar,
        limpar() {
          tinta.limpar();
          if (modo === "demo") { modo = "manual"; liftAlvo = LIFT; aviso({ modo, limpa: true }); }
        },
      };
    }

    return {
      svg, partes: mapa, desenhar, irPara, livre, pcb,
      alternar: () => irPara(!montado),
      estaMontado: () => montado,
    };
  }

  window.Plotter3D = { criar };

  // ------------------------------------------------------------
  //  Arranque automático
  // ------------------------------------------------------------

  // Hero (tela inicial)
  const hero = document.getElementById("hero-plotter");
  if (hero) criar(hero, { K: 9, margem: 18, rotulo: "Plotter de caneta CNC a desenhar pistas de circuito numa folha A4" }).desenhar();

  // Informações > Área de trabalho: modelo com área útil e modo de desenho
  const livreEl = document.getElementById("livre-plotter");
  if (livreEl) {
    const inst = criar(livreEl, { K: 9, margem: 18, areaUtil: true, rotulo: "Plotter de caneta CNC com a área útil assinalada na folha A4" });
    const estado = document.getElementById("livre-estado");
    const btnAtivar = document.getElementById("livre-ativar");
    const btnSubir = document.getElementById("livre-subir");
    const btnDescer = document.getElementById("livre-descer");
    const btnLimpar = document.getElementById("livre-limpar");

    const inativo = "Carrega em “Desenhar com a plotter” para controlares a caneta nos eixos X e Y.";

    // Indicador a piscar até o visitante experimentar pela primeira vez
    const CHAVE_TESTE = "plotter-testar-visto";
    const aviso = document.getElementById("livre-testar");
    const marcarVisto = () => {
      if (aviso) aviso.hidden = true;
      try { localStorage.setItem(CHAVE_TESTE, "1"); } catch (e) {}
    };
    let jaViu = false;
    try { jaViu = localStorage.getItem(CHAVE_TESTE) === "1"; } catch (e) {}
    if (aviso && jaViu) aviso.hidden = true;

    const api = inst.livre({
      onEstado: (s) => {
        if (s.ativo) marcarVisto();
        btnAtivar.textContent = s.ativo ? "Parar de desenhar" : "Desenhar com a plotter";
        btnAtivar.setAttribute("aria-pressed", String(s.ativo));
        livreEl.classList.toggle("ativo", s.ativo);
        btnSubir.disabled = btnDescer.disabled = !s.ativo;
        estado.textContent = s.ativo
          ? "Caneta " + (s.baixada ? "baixada" : "levantada") + ". Move o rato sobre a folha. Scroll para cima levanta a caneta, scroll para baixo baixa-a."
          : inativo;
      },
    });
    estado.textContent = inativo;
    btnSubir.disabled = btnDescer.disabled = true;

    btnAtivar.addEventListener("click", () => api.ativar(!api.estaAtivo()));
    if (aviso) aviso.addEventListener("click", () => { api.ativar(true); livreEl.focus({ preventScroll: true }); });
    btnSubir.addEventListener("click", api.subir);
    btnDescer.addEventListener("click", api.descer);
    btnLimpar.addEventListener("click", api.limpar);
    livreEl.addEventListener("keydown", (e) => {
      if (!api.estaAtivo()) return;
      if (e.key === "ArrowUp") { e.preventDefault(); api.subir(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); api.descer(); }
      else if (e.key === "Escape") api.ativar(false);
    });
  }

  // Informações > Cabeçote e caneta: PCB verde na mesma perspetiva isométrica
  const pcbEl = document.getElementById("pcb-plotter");
  if (pcbEl) {
    const inst = criar(pcbEl, { K: 9, margem: 18, pcb: true, rotulo: "Plotter de caneta a desenhar pistas numa placa de circuito impresso verde. Clica e arrasta sobre a placa para desenhares as tuas pistas." });
    const estado = document.getElementById("pcb-estado");
    const api = inst.pcb({
      onEstado: (s) => {
        estado.textContent = s.limpa
          ? "Placa limpa. Clica e arrasta sobre a placa para desenhares as tuas pistas."
          : s.modo === "demo"
            ? "Demonstração: a plotter desenha três pistas. Clica na placa para desenhares tu."
            : "Modo livre: clica e arrasta sobre a placa. As pistas encaixam a 45°.";
      },
    });
    document.getElementById("pcb-repetir").addEventListener("click", api.repetir);
    document.getElementById("pcb-limpar").addEventListener("click", api.limpar);
  }

  // Vista de montagem (Informações > Materiais)
  const palco = document.getElementById("montagem-plotter");
  if (palco) {
    const legenda = document.getElementById("legenda-peca");
    const botao = document.getElementById("btn-montar");
    const padrao = legenda.textContent;
    const inst = criar(palco, { K: 8, montagem: true, margem: 14, rotulo: "Plotter de caneta CNC a montar-se peça a peça" });

    const atualizarBotao = () => { botao.textContent = inst.estaMontado() ? "Desmontar" : "Montar"; };
    botao.addEventListener("click", () => { inst.alternar(); atualizarBotao(); });

    // Monta ao fazer scroll até à animação (só da primeira vez)
    let jaMontou = false;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entradas, obs) => {
        entradas.forEach((e) => {
          if (e.isIntersecting && !jaMontou) {
            jaMontou = true;
            setTimeout(() => { inst.irPara(true); atualizarBotao(); }, 350);
            obs.disconnect();
          }
        });
      }, { threshold: 0.55 }).observe(palco);
    }
    botao.addEventListener("click", () => { jaMontou = true; });

    const nomeDe = (e) => { const p = e.target.closest(".peca"); return p ? p.dataset.nome : padrao; };
    palco.addEventListener("mouseover", (e) => { legenda.textContent = nomeDe(e); });
    palco.addEventListener("mouseleave", () => { legenda.textContent = padrao; });
    palco.addEventListener("click", (e) => {
      const p = e.target.closest(".peca");
      if (p) legenda.textContent = p.dataset.nome;
    });
  }
})();
