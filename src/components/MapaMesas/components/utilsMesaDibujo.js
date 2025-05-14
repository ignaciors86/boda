// Utilidad para calcular posiciones de bolitas en mesas simples (cuadradas)
// Devuelve un objeto: { posiciones, areaW, areaH, mesaX, mesaY }

export function getPosicionesBolitasMesaSimple({
  numInvitados,
  girada = false
}) {
  // Obtener el valor real de --tamano-bolita en dvh
  const root = document.documentElement;
  const cssBolita = getComputedStyle(root).getPropertyValue('--tamano-bolita').trim();
  const bolitaNum = parseFloat(cssBolita); // asume que es 'Xdvh'
  const invitadoSize = bolitaNum;
  const FACTOR_MESA = 5.0;
  // Calcular el ancho basado en el número de invitados
  const mitadInvitados = Math.ceil(numInvitados / 2);
  const totalBolitas = Math.max(mitadInvitados, numInvitados - mitadInvitados);
  // Margen lateral opcional
  const margenLateral = invitadoSize * 0;
  // El ancho real de la fila más larga de bolitas
  const anchoBolitas = totalBolitas > 0 ? (totalBolitas * invitadoSize) : invitadoSize;
  // El ancho de la mesa será igual al ancho de las bolitas más márgenes
  const mesaW = anchoBolitas + margenLateral * 2;
  const mesaH = invitadoSize * FACTOR_MESA;

  // El área será igual a la mesa (más margen vertical para bolitas)
  const areaW = mesaW;
  const areaH = mesaH + invitadoSize * 2;
  // El centro del área para centrar bolitas y título
  const centroAreaX = areaW * 0;
  // El rectángulo de la mesa debe estar centrado respecto al área
  const mesaX = (areaW - mesaW) / 2;
  const mesaY = invitadoSize;
  const centroMesaX = centroAreaX;

  const posiciones = [];

  if (!girada) {
    // Invitados arriba
    const yArriba = mesaY - invitadoSize * 4;
    for (let i = 0; i < mitadInvitados; i++) {
      const totalEnLado = mitadInvitados;
      const totalWidth = totalEnLado * invitadoSize;
      let x;
      if (totalEnLado === 1) {
        x = centroAreaX;
      } else {
        x = centroAreaX - totalWidth / 2 + i * (totalWidth - invitadoSize) / (totalEnLado - 1);
      }
      posiciones.push({ x, y: yArriba, lado: 'arriba', idx: i });
    }
    // Invitados abajo
    const yAbajo = mesaY + mesaH - invitadoSize * 2;
    for (let i = mitadInvitados; i < numInvitados; i++) {
      const posInLado = i - mitadInvitados;
      const totalEnLado = numInvitados - mitadInvitados;
      const totalWidth = totalEnLado * invitadoSize;
      let x;
      if (totalEnLado === 1) {
        x = centroAreaX;
      } else {
        x = centroAreaX - totalWidth / 2 + posInLado * (totalWidth - invitadoSize) / (totalEnLado - 1);
      }
      posiciones.push({ x, y: yAbajo, lado: 'abajo', idx: i });
    }
  } else {
    // Izquierda y derecha (cuando está girada)
    const nIzq = mitadInvitados;
    const nDer = numInvitados - mitadInvitados;
    const xIzq = mesaX - invitadoSize * 2.5;
    const xDer = mesaX + mesaW + invitadoSize * 2.5;
    const totalHeight = mesaW; // Usar el ancho como alto visual para la mesa girada
    const yOffset = -invitadoSize * 3;
    // Lado izquierdo
    for (let i = 0; i < nIzq; i++) {
      let y;
      if (nIzq === 1) {
        y = mesaY + totalHeight / 2 + yOffset;
      } else {
        y = mesaY + ((i + 0.5) * (totalHeight / nIzq)) + yOffset;
      }
      posiciones.push({ x: xIzq, y, lado: 'izquierda', idx: i });
    }
    // Lado derecho
    for (let i = 0; i < nDer; i++) {
      let y;
      if (nDer === 1) {
        y = mesaY + totalHeight / 2 + yOffset;
      } else {
        y = mesaY + ((i + 0.5) * (totalHeight / nDer)) + yOffset;
      }
      posiciones.push({ x: xDer, y, lado: 'derecha', idx: i });
    }
  }
  return { posiciones, areaW, areaH, mesaX, mesaY, mesaW, mesaH, invitadoSize };
} 