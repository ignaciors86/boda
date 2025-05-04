import React, { useRef, useEffect } from 'react';
import './PoligonosFlotantes.scss';

const PoligonosFlotantes = ({ analyser }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const poligonosRef = useRef([]);
  const ultimoCambioRef = useRef(0);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const resizeCanvas = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect) return;
      
      const { width, height } = rect;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    const crearPoligono = (intensidad) => {
      const ahora = Date.now();
      if (ahora - ultimoCambioRef.current < 100) return;

      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const lados = Math.floor(Math.random() * 5) + 3;
      const radio = 30 + Math.random() * 50;
      const r = Math.floor(Math.random() * 255);
      const g = Math.floor(Math.random() * 255);
      const b = Math.floor(Math.random() * 255);
      const opacidad = 0.2 + Math.random() * 0.3;
      const rotacion = Math.random() * Math.PI * 2;
      const velocidadRotacion = (Math.random() - 0.5) * 0.02;
      const velocidadEscala = 0.01 + Math.random() * 0.02;
      const direccionEscala = Math.random() > 0.5 ? 1 : -1;
      const velocidadX = (Math.random() - 0.5) * 2;
      const velocidadY = (Math.random() - 0.5) * 2;

      poligonosRef.current.push({
        x,
        y,
        lados,
        radio,
        color: `rgba(${r}, ${g}, ${b}, ${opacidad})`,
        rotacion,
        velocidadRotacion,
        escala: 1,
        velocidadEscala,
        direccionEscala,
        velocidadX,
        velocidadY,
        creado: ahora,
        vida: 10000 + Math.random() * 5000
      });

      ultimoCambioRef.current = ahora;
    };

    const actualizarPoligonos = () => {
      const ahora = Date.now();
      poligonosRef.current = poligonosRef.current.filter(poligono => {
        const tiempoVida = ahora - poligono.creado;
        const tiempoFadeOut = 1000; // 1 segundo para el desvanecimiento
        const tiempoVidaTotal = poligono.vida + tiempoFadeOut;
        
        if (tiempoVida > tiempoVidaTotal) {
          return false;
        }
        
        // Calcular opacidad basada en el tiempo restante
        if (tiempoVida > poligono.vida) {
          const tiempoFade = tiempoVida - poligono.vida;
          poligono.opacidad = 0.9 - (tiempoFade / tiempoFadeOut) * 0.9; // Mantener mínimo 0.1 de opacidad
        } else {
          poligono.opacidad = 0.9; // Opacidad máxima durante la vida normal
        }
        
        return true;
      });

      poligonosRef.current.forEach(poligono => {
        poligono.rotacion += poligono.velocidadRotacion;
        poligono.escala += poligono.velocidadEscala * poligono.direccionEscala;
        
        if (poligono.escala > 1.5 || poligono.escala < 0.5) {
          poligono.direccionEscala *= -1;
        }

        poligono.x += poligono.velocidadX;
        poligono.y += poligono.velocidadY;

        // Rebotar en los bordes
        if (poligono.x < 0 || poligono.x > canvas.width) {
          poligono.velocidadX *= -1;
        }
        if (poligono.y < 0 || poligono.y > canvas.height) {
          poligono.velocidadY *= -1;
        }
      });
    };

    const dibujarPoligono = (poligono) => {
      const { x, y, lados, radio, color, rotacion, escala, opacidad } = poligono;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(escala, escala);
      ctx.rotate(rotacion);
      
      ctx.beginPath();
      ctx.moveTo(radio, 0);
      
      for (let i = 1; i <= lados; i++) {
        const angulo = (i * 2 * Math.PI) / lados;
        ctx.lineTo(radio * Math.cos(angulo), radio * Math.sin(angulo));
      }
      
      ctx.closePath();
      ctx.fillStyle = color.replace(/[\d.]+\)$/, `${opacidad})`);
      ctx.fill();
      
      ctx.restore();
    };

    const animar = () => {
      analyser.getByteFrequencyData(dataArray);
      const intensidad = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (intensidad > 30) {
        crearPoligono(intensidad);
      }

      actualizarPoligonos();
      poligonosRef.current.forEach(dibujarPoligono);
      
      animationRef.current = requestAnimationFrame(animar);
    };

    // Inicializar el canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    animar();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      className="poligonos-flotantes-canvas"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1
      }}
    />
  );
};

export default PoligonosFlotantes; 