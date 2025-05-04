import React, { useRef, useEffect } from 'react';
import './Poligonos.scss';

const Poligonos = ({ analyser }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const energyHistoryRef = useRef([]);
  const beatThresholdRef = useRef(0.8);
  const lastBeatTimeRef = useRef(0);
  const lastChangeTimeRef = useRef(0);

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

    const dibujarPoligono = (x, y, lados, radio, color, rotacion) => {
      ctx.beginPath();
      ctx.moveTo(x + radio * Math.cos(rotacion), y + radio * Math.sin(rotacion));
      
      for (let i = 1; i <= lados; i++) {
        const angulo = rotacion + (i * 2 * Math.PI) / lados;
        ctx.lineTo(x + radio * Math.cos(angulo), y + radio * Math.sin(angulo));
      }
      
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };

    const animar = () => {
      analyser.getByteFrequencyData(dataArray);
      const intensidad = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      const intensidadBass = dataArray.slice(0, 10).reduce((sum, value) => sum + value, 0) / 10;
      
      // Actualizar historial de energía
      energyHistoryRef.current.push(intensidad);
      if (energyHistoryRef.current.length > 5) {
        energyHistoryRef.current.shift();
      }

      const averageEnergy = energyHistoryRef.current.reduce((a, b) => a + b, 0) / energyHistoryRef.current.length;
      const isBeat = intensidad > beatThresholdRef.current * averageEnergy;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const now = Date.now();
      const timeSinceLastChange = now - lastChangeTimeRef.current;
      
      if (isBeat && timeSinceLastChange >= 100) {
        const dpr = window.devicePixelRatio || 1;
        const centerX = (canvas.width / dpr) / 2;
        const centerY = (canvas.height / dpr) / 2;
        const lados = Math.floor(Math.random() * 5) + 3;
        const radio = 50 + (intensidadBass * 2) + Math.random() * 50;
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        const color = `rgba(${r}, ${g}, ${b}, ${0.3 + (intensidad / 255) * 0.4})`;
        const rotacion = Math.random() * Math.PI * 2;
        
        dibujarPoligono(centerX, centerY, lados, radio, color, rotacion);
        lastChangeTimeRef.current = now;
      }

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
      className="poligonos-canvas"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1
      }}
    />
  );
};

export default Poligonos; 