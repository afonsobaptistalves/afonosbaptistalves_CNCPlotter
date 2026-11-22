// ============================================================
//  Área útil de trabalho (aproximada), em mm
//  Carril MGN15H de 300 mm menos o comprimento do patim (58.8 mm) ≈ 241 mm de curso.
//  Troca pelos valores medidos na tua máquina quando a montares.
// ============================================================
const AREA_DE_TRABALHO = { x: 240, y: 240 };

(function medidas() {
  const valor = document.getElementById("valor-area");
  if (valor) {
    const { x, y } = AREA_DE_TRABALHO;
    valor.textContent =
      typeof x === "number" && typeof y === "number" ? `Área útil aproximada: ${x} × ${y} mm` : "Medidas a definir";
  }
})();
