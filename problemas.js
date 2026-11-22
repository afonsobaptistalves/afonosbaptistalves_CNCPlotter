// ============================================================
//  Problemas de montagem e diagnóstico
//  Cada problema tem: texto, verificação, miniatura da plotter
//  com a zona afetada destacada e uma animação do problema.
// ============================================================
(function () {
  "use strict";

  const raiz = document.getElementById("problemas");
  if (!raiz) return;

  // onda para o traço torto (cena 2)
  function onda(x0, n, y, amp, meio) {
    let d = "M" + x0 + " " + y + " Q" + (x0 + meio / 2) + " " + (y - amp) + " " + (x0 + meio) + " " + y;
    for (let k = 2; k <= n; k++) d += " T" + (x0 + meio * k) + " " + y;
    return d;
  }

  const ABRE = '<svg viewBox="0 0 360 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="';

  // ---------- 1. Eixo Z desalinhado ----------
  const cena1 = ABRE + 'Placa Z a subir e a ficar presa a meio do carril por causa dos furos desalinhados">' +
    '<rect x="168" y="14" width="24" height="206" rx="2" fill="#C3C8CF" stroke="#8d949e"/>' +
    '<path d="M180 26V208" stroke="#8d949e" stroke-width="3" stroke-dasharray="0 16" stroke-linecap="round"/>' +
    '<rect x="148" y="8" width="64" height="8" rx="2" fill="#A97E4C"/>' +
    '<rect x="148" y="218" width="64" height="8" rx="2" fill="#A97E4C"/>' +
    '<rect x="70" y="232" width="220" height="4" fill="#fff" stroke="#bbb" stroke-width=".5"/>' +
    '<g class="p1-z">' +
      '<rect x="118" y="116" width="124" height="74" rx="3" fill="#F2A24C" stroke="#B96A1C"/>' +
      '<rect x="164" y="124" width="32" height="58" rx="2" fill="#8F96A1" stroke="#555"/>' +
      '<g fill="#dfe3e8" stroke="#3a3f48"><circle cx="171" cy="131" r="4.5"/><circle cx="189" cy="131" r="4.5"/><circle cx="171" cy="175" r="4.5"/><circle cx="189" cy="175" r="4.5"/></g>' +
      '<g class="p1-furos" fill="none" stroke="#E2231A" stroke-width="1.6" stroke-dasharray="2 2"><circle cx="174" cy="133" r="4.5"/><circle cx="192" cy="133" r="4.5"/><circle cx="174" cy="177" r="4.5"/><circle cx="192" cy="177" r="4.5"/></g>' +
      '<rect x="203" y="168" width="20" height="16" fill="#2479DA" stroke="#1B5CA9"/>' +
      '<rect x="206" y="150" width="14" height="82" fill="#2C3037"/>' +
    '</g>' +
    '<g class="p1-aviso"><polygon points="62,84 88,130 36,130" fill="#E2231A"/><text x="62" y="122" text-anchor="middle" font-size="26" font-weight="700" fill="#fff">!</text>' +
    '<text x="62" y="150" text-anchor="middle" class="t" font-size="13" font-weight="600" fill="#E2231A">Preso!</text></g>' +
    '<text x="14" y="201" class="t" font-size="11">Furos desviados 1 mm</text>' +
    '<text x="14" y="214" class="t" font-size="11" opacity=".7">a tracejado: onde deviam estar</text></svg>';

  // ---------- 2. Folga no encaixe da caneta ----------
  const cena2 = ABRE + 'Caneta a abanar lateralmente no furo de 13 milímetros e traço torto no papel">' +
    '<defs><clipPath id="p2-clip"><rect x="240" y="128" width="108" height="86"/></clipPath></defs>' +
    '<rect x="14" y="84" width="90" height="26" fill="#F2A24C" stroke="#B96A1C"/>' +
    '<rect x="160" y="84" width="66" height="26" fill="#F2A24C" stroke="#B96A1C"/>' +
    '<g class="p2-caneta">' +
      '<rect x="110" y="60" width="44" height="78" fill="#2479DA" stroke="#1B5CA9"/>' +
      '<rect x="116" y="44" width="32" height="152" fill="#2C3037"/>' +
      '<rect x="116" y="150" width="32" height="12" fill="#E2231A"/>' +
      '<rect x="118" y="186" width="28" height="14" fill="#AAB1BB"/>' +
      '<polygon points="122,200 142,200 132,214" fill="#14161A"/>' +
    '</g>' +
    '<g class="p2-folga" stroke="#E2231A" stroke-width="2" fill="none"><path d="M104 78v-10M110 78v-10"/><path d="M154 78v-10M160 78v-10"/></g>' +
    '<text x="70" y="62" text-anchor="middle" font-size="11" fill="#E2231A" font-weight="600">folga</text><text x="196" y="62" text-anchor="middle" font-size="11" fill="#E2231A" font-weight="600">folga</text>' +
    '<rect x="14" y="216" width="212" height="3" fill="#fff" stroke="#bbb" stroke-width=".5"/>' +
    '<text x="14" y="30" class="t" font-size="12">Furo de 13 mm, adaptador de 12.5 mm</text>' +
    '<text x="294" y="120" text-anchor="middle" class="t" font-size="11">Traço no papel</text>' +
    '<rect x="240" y="128" width="108" height="86" rx="4" fill="#fff" stroke="#bbb"/>' +
    '<line x1="248" y1="171" x2="340" y2="171" stroke="#9aa1ab" stroke-dasharray="4 4"/>' +
    '<path class="p2-tinta" clip-path="url(#p2-clip)" d="' + onda(248, 8, 171, 7, 11.5) + '" fill="none" stroke="#101216" stroke-width="2.4" stroke-linecap="round"/></svg>';

  // ---------- 3. Alavanca do servo ----------
  const cena3 = ABRE + 'Braço do servo SG90 a rodar demais e a dobrar contra a caneta">' +
    '<g class="p3-servo"><rect x="30" y="34" width="76" height="40" rx="4" fill="#2479DA" stroke="#1B5CA9"/>' +
    '<rect x="18" y="48" width="100" height="8" rx="2" fill="#2479DA" stroke="#1B5CA9"/>' +
    '<circle cx="94" cy="54" r="8" fill="#DDE1E6" stroke="#878F9A"/></g>' +
    '<g class="p3-braco"><rect x="94" y="50" width="78" height="8" rx="3" fill="#fff" stroke="#9aa1ab"/>' +
      '<g class="p3-ponta"><rect x="172" y="50" width="38" height="8" rx="3" fill="#fff" stroke="#9aa1ab"/></g></g>' +
    '<circle cx="94" cy="54" r="4" fill="#878F9A"/>' +
    '<g class="p3-caneta"><rect x="190" y="100" width="22" height="96" fill="#2C3037"/><rect x="190" y="150" width="22" height="10" fill="#E2231A"/>' +
      '<rect x="193" y="188" width="16" height="10" fill="#AAB1BB"/><polygon points="196,198 206,198 201,206" fill="#14161A"/></g>' +
    '<g class="p3-papel"><rect x="130" y="210" width="190" height="4" fill="#fff" stroke="#bbb" stroke-width=".5"/></g>' +
    '<g class="p3-forca" fill="none" stroke="#E2231A" stroke-width="2.5" stroke-linecap="round"><path d="M44 24c6-8 12 8 18 0s12 8 18 0"/><path d="M180 218c6 8 12-8 18 0s12-8 18 0"/></g>' +
    '<text x="14" y="232" class="t" font-size="12">Braço do servo SG90</text>' +
    '<text class="p3-forca" x="290" y="130" text-anchor="middle" font-size="13" font-weight="600" fill="#E2231A">Força a mais!</text></svg>';

  // ---------- 4. Polaridade invertida ----------
  const cena4 = ABRE + 'Fios da fonte de 12 volts ligados ao contrário no borne azul, com alerta vermelho a piscar">' +
    '<rect x="14" y="62" width="84" height="116" rx="6" fill="#9AA2AD" stroke="#6b727c"/>' +
    '<text x="56" y="126" text-anchor="middle" font-size="18" font-weight="700" fill="#20242B">12 V</text>' +
    '<circle cx="98" cy="92" r="7" fill="#D32F2F"/><text x="84" y="96" text-anchor="end" font-size="14" font-weight="700" fill="#20242B">+</text>' +
    '<circle cx="98" cy="148" r="7" fill="#20242B"/><text x="84" y="152" text-anchor="end" font-size="14" font-weight="700" fill="#20242B">−</text>' +
    '<path d="M104 92C170 92 190 127 270 127" fill="none" stroke="#D32F2F" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M104 148C190 195 300 195 316 140" fill="none" stroke="#20242B" stroke-width="5" stroke-linecap="round"/>' +
    '<path class="p4-fluxo" d="M104 92C170 92 190 127 270 127" fill="none" stroke="#ffd0cc" stroke-width="2" stroke-linecap="round"/>' +
    '<rect x="244" y="96" width="106" height="62" rx="4" fill="#1E5EB7" stroke="#14407f"/>' +
    '<g fill="#DDE1E6" stroke="#878F9A"><circle cx="278" cy="127" r="13"/><circle cx="318" cy="127" r="13"/></g>' +
    '<path d="M270 127h16M310 127h16" stroke="#6D7480" stroke-width="3"/>' +
    '<text x="278" y="88" text-anchor="middle" class="t" font-size="12" font-weight="600">GND</text>' +
    '<text x="318" y="88" text-anchor="middle" class="t" font-size="12" font-weight="600">+12V</text>' +
    '<rect class="p4-alerta" x="238" y="68" width="116" height="98" rx="8" fill="none" stroke="#E2231A" stroke-width="3.5"/>' +
    '<polygon class="p4-faisca" points="296,100 288,124 300,124 292,152 312,120 300,120 308,100" fill="#ffd93b" stroke="#E2231A" stroke-width="1"/>' +
    '<g fill="#8d949e"><circle class="p4-fumo" cx="268" cy="62" r="6"/><circle class="p4-fumo f2" cx="284" cy="62" r="5"/><circle class="p4-fumo f3" cx="276" cy="62" r="7"/></g>' +
    '<rect x="258" y="26" width="40" height="30" rx="3" fill="#5F3FA3" stroke="#47307e"/>' +
    '<text class="p4-txt" x="180" y="212" text-anchor="middle" font-size="14" font-weight="700" fill="#E2231A">Polaridade invertida!</text>' +
    '<text x="180" y="230" text-anchor="middle" class="t" font-size="11" opacity=".75">Correto: vermelho no +12V, preto no GND</text></svg>';

  // ---------- 5. Driver com a fonte ligada ----------
  const cena5 = ABRE + 'Driver DRV8825 a ser retirado da CNC Shield com a fonte ligada e um pico de corrente a saltar">' +
    '<rect x="50" y="64" width="260" height="134" rx="8" fill="#C62828" stroke="#8A2222"/>' +
    '<g fill="#20242B"><rect x="78" y="76" width="58" height="6"/><rect x="78" y="180" width="58" height="6"/><rect x="151" y="76" width="58" height="6"/><rect x="151" y="180" width="58" height="6"/><rect x="224" y="76" width="58" height="6"/><rect x="224" y="180" width="58" height="6"/></g>' +
    '<g fill="#5F3FA3" stroke="#47307e"><rect x="80" y="90" width="54" height="86" rx="3"/><rect x="226" y="90" width="54" height="86" rx="3"/></g>' +
    '<g fill="#C3C8CF"><rect x="92" y="98" width="30" height="22"/><rect x="238" y="98" width="30" height="22"/></g>' +
    '<g class="p5-driver"><rect x="153" y="90" width="54" height="86" rx="3" fill="#7B54C4" stroke="#47307e"/><rect x="165" y="98" width="30" height="22" fill="#C3C8CF"/>' +
      '<circle cx="180" cy="152" r="7" fill="#C3C8CF" stroke="#47307e"/></g>' +
    '<polyline class="p5-raio" points="168,112 182,132 170,136 188,164 176,168 196,196" fill="none" stroke="#ffd93b" stroke-width="4" stroke-linejoin="round"/>' +
    '<circle class="p5-flash" cx="180" cy="150" r="30" fill="#ffd93b"/>' +
    '<circle class="p5-led" cx="66" cy="216" r="6" fill="#3ddc84"/>' +
    '<text x="80" y="220" class="t" font-size="12" font-weight="600">Fonte de 12 V ligada</text>' +
    '<text class="p5-txt" x="180" y="48" text-anchor="middle" font-size="14" font-weight="700" fill="#E2231A">Pico de indução!</text>' +
    '<text x="14" y="24" class="t" font-size="12" opacity=".75">Nunca mexer nos drivers com a fonte ligada</text></svg>';

  // ---------- 6. Driver invertido ----------
  const pinos = (x) => { let s = ""; for (let i = 0; i < 8; i++) s += '<rect x="' + x + '" y="' + (124 + i * 9) + '" width="5" height="6" fill="#C3C8CF"/>'; return s; };
  const cena6 = ABRE + 'Driver DRV8825 a encaixar na CNC Shield virado ao contrário, com os pinos EN e GND trocados">' +
    '<rect x="90" y="108" width="180" height="96" rx="6" fill="#C62828" stroke="#8A2222"/>' +
    '<rect x="150" y="116" width="60" height="82" fill="none" stroke="#20242B" stroke-width="2" stroke-dasharray="3 3"/>' +
    '<text x="100" y="124" font-size="12" font-weight="700" fill="#fff">EN</text>' +
    '<text x="260" y="124" text-anchor="end" font-size="12" font-weight="700" fill="#fff">VMOT</text>' +
    '<g class="p6-driver"><rect x="156" y="120" width="48" height="76" rx="3" fill="#7B54C4" stroke="#47307e"/>' + pinos(151) + pinos(204) +
      '<rect x="166" y="146" width="28" height="18" fill="#C3C8CF"/>' +
      '<text x="160" y="134" font-size="9" font-weight="700" fill="#fff">EN</text>' +
      '<text x="200" y="190" text-anchor="end" font-size="9" font-weight="700" fill="#fff">GND</text></g>' +
    '<g class="p6-erro"><circle cx="152" cy="127" r="7" fill="none" stroke="#ffd93b" stroke-width="3"/>' +
      '<text x="180" y="220" text-anchor="middle" font-size="14" font-weight="700" fill="#E2231A">EN ≠ GND: orientação errada</text></g>' +
    '<g fill="#8d949e"><circle class="p6-fumo" cx="150" cy="98" r="6"/><circle class="p6-fumo f2" cx="168" cy="98" r="5"/><circle class="p6-fumo f3" cx="159" cy="98" r="7"/></g>' +
    '<text x="180" y="236" text-anchor="middle" class="t" font-size="12" opacity=".75">O pino EN fica no canto indicado na shield</text></svg>';

  // ---------- 7. Motor NEMA 17 a vibrar ----------
  const cena7 = ABRE + 'Motor NEMA 17 a vibrar no próprio eixo sem rodar, com os fios das fases A e B trocados">' +
    '<g class="p7-ondas" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M88 80c-8 14-8 30 0 44"/><path d="M72 68c-14 22-14 48 0 70"/><path d="M272 80c8 14 8 30 0 44"/><path d="M288 68c14 22 14 48 0 70"/></g>' +
    '<g class="p7-motor"><rect x="110" y="30" width="140" height="140" rx="10" fill="#AAB1BB" stroke="#6D7480" stroke-width="2"/>' +
      '<circle cx="180" cy="100" r="46" fill="#8F97A3" stroke="#6D7480"/>' +
      '<g fill="#14161A"><circle cx="128" cy="48" r="5"/><circle cx="232" cy="48" r="5"/><circle cx="128" cy="152" r="5"/><circle cx="232" cy="152" r="5"/></g>' +
      '<circle cx="180" cy="100" r="15" fill="#DDE1E6" stroke="#6D7480" stroke-width="2"/>' +
      '<g class="p7-eixo"><line x1="180" y1="100" x2="180" y2="88" stroke="#14161A" stroke-width="3.5" stroke-linecap="round"/></g></g>' +
    '<g fill="none" stroke-width="4" stroke-linecap="round"><path d="M150 172V200" stroke="#D32F2F"/><path d="M170 172V200" stroke="#2479DA"/><path d="M190 172V200" stroke="#3ddc84"/><path d="M210 172V200" stroke="#14161A"/></g>' +
    '<path d="M170 200C170 214 190 208 190 222M190 200C190 214 170 208 170 222" fill="none" stroke="#E2231A" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 5"/>' +
    '<text x="180" y="238" text-anchor="middle" font-size="12" fill="#E2231A" font-weight="600">fases A/B trocadas</text>' +
    '<text class="p7-txt" x="180" y="18" text-anchor="middle" font-size="13" font-weight="700" fill="#E2231A">Vibra sem andar</text></svg>';

  // ---------- Dados ----------
  const PROBLEMAS = [
    {
      secao: "mec", titulo: "Desalinhamento e empeno do eixo Z (peça impressa em PLA)", destaque: ["placaZ", "patimZ"],
      problema: "Se os 4 furos do patim MGN15H (20×25 mm) ficarem com 1 mm de desvio na peça impressa em PLA, a placa fica torta. A caneta não desce na vertical e prende ao subir.",
      rotulo: "Verificação", verificacao: "Coloca o patim de aço na placa sem apertar os parafusos M3 até ao fim. O patim deve deslizar livremente ao longo do carril, sem “trancar”. Só depois aperta tudo.",
      cena: cena1,
    },
    {
      secao: "mec", titulo: "Folga no encaixe da caneta", destaque: ["adaptador", "placaZ"],
      problema: "O furo de 13 mm na peça impressa em PLA para o adaptador azul (12.5 mm) pode ficar com folga (se a impressão sair com desvio) ou justo demais (impressão imperfeita).",
      rotulo: "Verificação", verificacao: "Insere o adaptador no furo. Se abanar, coloca uma volta de fita-cola de papel. Se não entrar, usa uma lixa fina.",
      cena: cena2,
    },
    {
      secao: "mec", titulo: "Alavanca do servo SG90 torta ou curta", destaque: ["servo", "braco"],
      problema: "Se o ângulo inicial do servo estiver mal calibrado no software, o braço empurra a caneta demais (forçando o motor) ou não empurra o suficiente para a caneta tocar no papel.",
      rotulo: "Verificação", verificacao: "Monta o braço do servo a meio do curso (90°) antes de o aparafusar no eixo Z.",
      cena: cena3,
    },
    {
      secao: "ele", titulo: "Inversão da polaridade da fonte de 12 V", destaque: ["fonte", "borne"],
      problema: "Ligar o fio positivo (+) ao terminal negativo (GND) da CNC Shield V3 queima instantaneamente os drivers DRV8825 e a placa.",
      rotulo: "Verificação", verificacao: "Confirma a cor dos fios e testa a saída da fonte de 12 V com o multímetro (escala DC Volt) antes de ligar à shield.",
      cena: cena4,
    },
    {
      secao: "ele", titulo: "Manuseamento com alimentação ligada (aviso crítico)", destaque: ["drivers"], critico: true,
      problema: "Encaixar ou desencaixar os drivers DRV8825 ou os cabos dos NEMA 17 com a fonte de 12 V ligada cria picos de indução que queimam o driver imediatamente.",
      rotulo: "Regra", verificacao: "Desliga a fonte de 12 V da tomada e espera alguns segundos antes de mexer nos drivers ou nas fichas dos motores.",
      cena: cena5,
    },
    {
      secao: "ele", titulo: "Inversão da orientação dos drivers DRV8825", destaque: ["drivers"],
      problema: "Colocar o driver no sentido oposto ao indicado na CNC Shield queima a shield e o Arduino.",
      rotulo: "Verificação", verificacao: "Confirma que o pino EN (Enable) ou o potenciómetro fica virado para a orientação correta na shield.",
      cena: cena6,
    },
    {
      secao: "ele", titulo: "Motores NEMA 17 a vibrar ou a rodar ao contrário", destaque: ["motorA", "motorB"],
      problema: "Se os motores fizerem barulho de vibração (buzzing) sem sair do sítio, a corrente Vref está muito baixa ou a ordem dos fios (fases A e B) está trocada.",
      rotulo: "Verificação", verificacao: "Se o motor andar no sentido oposto, desliga a fonte de 12 V e vira a ficha do motor 180° na CNC Shield, ou inverte o parâmetro $3 no firmware GRBL.",
      cena: cena7,
    },
  ];

  const SECOES = {
    mec: "Problemas na montagem mecânica",
    ele: "Problemas nas ligações elétricas e eletrónicas",
  };

  // ---------- Construção dos cartões ----------
  let seccaoAtual = "";
  PROBLEMAS.forEach((p, i) => {
    if (p.secao !== seccaoAtual) {
      seccaoAtual = p.secao;
      const h = document.createElement("h3");
      h.className = "prob-secao";
      h.textContent = SECOES[p.secao];
      raiz.appendChild(h);
    }
    const art = document.createElement("article");
    art.className = "problema" + (p.critico ? " critico" : "");
    art.id = "problema-" + (i + 1);
    art.innerHTML =
      '<header class="problema-topo"><span class="problema-num" aria-hidden="true">' + (i + 1) + "</span><h4></h4></header>" +
      '<div class="problema-painel">' +
        '<figure class="problema-mini"><div class="mini"></div><figcaption>Onde acontece (a vermelho)</figcaption></figure>' +
        '<figure class="problema-cena">' + p.cena + "<figcaption>O que se passa</figcaption></figure>" +
      "</div>" +
      '<div class="problema-texto">' +
        '<div class="diag-card diag-problema"><h5>Problema</h5><p class="t-prob"></p></div>' +
        '<div class="diag-card diag-verif"><h5 class="t-rot"></h5><p class="t-verif"></p></div>' +
      "</div>";
    art.querySelector("h4").textContent = p.titulo;
    art.querySelector(".t-prob").textContent = p.problema;
    art.querySelector(".t-rot").textContent = p.rotulo;
    art.querySelector(".t-verif").textContent = p.verificacao;
    raiz.appendChild(art);

    if (window.Plotter3D) {
      window.Plotter3D.criar(art.querySelector(".mini"), {
        K: 6, margem: 14, destaque: p.destaque,
        rotulo: "Plotter montada com a zona do problema destacada",
      });
    }
  });

  // As animações só correm enquanto o cartão está visível
  if ("IntersectionObserver" in window) {
    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => e.target.classList.toggle("visivel", e.isIntersecting));
    }, { threshold: 0.15 });
    raiz.querySelectorAll(".problema").forEach((c) => obs.observe(c));
  } else {
    raiz.querySelectorAll(".problema").forEach((c) => c.classList.add("visivel"));
  }
})();
