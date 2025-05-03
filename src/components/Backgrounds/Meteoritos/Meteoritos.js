import React, { useRef, useEffect } from 'react';
import './Meteoritos.scss';

const Meteoritos = ({ analyser }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const meteoritosRef = useRef([]);
  const ultimoMeteoritoRef = useRef(0);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const resizeCanvas = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    const crearMeteorito = (intensidad) => {
      const ahora = Date.now();
      if (ahora - ultimoMeteoritoRef.current < 50) return;

      const x = Math.random() * canvas.width;
      const velocidad = 1 + Math.random() * 2;
      const tamaño = 3 + Math.random() * 7;
      const r = Math.floor(Math.random() * 255);
      const g = Math.floor(Math.random() * 255);
      const b = Math.floor(Math.random() * 255);
      const color = `rgb(${r}, ${g}, ${b})`;
      const brillo = 0.3 + Math.random() * 0.4;

      meteoritosRef.current.push({
        x,
        y: -tamaño,
        velocidad,
        tamaño,
        color,
        brillo,
        intensidad,
        creado: ahora,
        vida: 10000
      });

      ultimoMeteoritoRef.current = ahora;
    };

    const actualizarMeteoritos = () => {
      const ahora = Date.now();
      meteoritosRef.current = meteoritosRef.current.filter(meteorito => {
        return ahora - meteorito.creado < meteorito.vida;
      });

      meteoritosRef.current.forEach(meteorito => {
        meteorito.y += meteorito.velocidad;
        meteorito.brillo = Math.max(0, meteorito.brillo - 0.002);
      });
    };

    const dibujarMeteoritos = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      meteoritosRef.current.forEach(meteorito => {
        const { x, y, tamaño, color, brillo } = meteorito;
        
        const longitudEstela = tamaño * 4;
        const gradiente = ctx.createLinearGradient(x, y - longitudEstela, x, y);
        const [r, g, b] = color.match(/\d+/g);
        gradiente.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
        gradiente.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${brillo * 0.7})`);
        gradiente.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${brillo})`);
        
        ctx.beginPath();
        ctx.moveTo(x, y - longitudEstela);
        ctx.lineTo(x, y);
        ctx.strokeStyle = gradiente;
        ctx.lineWidth = tamaño;
        ctx.stroke();
      });
    };

    const animar = () => {
      analyser.getByteFrequencyData(dataArray);
      const intensidad = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      
      if (intensidad > 30) {
        crearMeteorito(intensidad);
      }

      actualizarMeteoritos();
      dibujarMeteoritos();
      animationRef.current = requestAnimationFrame(animar);
    };

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
      className="meteoritos-canvas"
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

export default Meteoritos; 