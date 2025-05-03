import React, { useRef, useEffect } from 'react';
import './Pulse.scss';

const Pulse = ({ analyser }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

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

    const dibujarCirculo = (x, y, radio, color) => {
      ctx.beginPath();
      ctx.arc(x, y, radio, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    };

    const animar = () => {
      analyser.getByteFrequencyData(dataArray);
      const intensidad = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (intensidad > 30) {
        const x = canvas.width / 2;
        const y = canvas.height / 2;
        const radio = 50 + intensidad * 2;
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        const color = `rgba(${r}, ${g}, ${b}, ${0.2 + Math.random() * 0.2})`;
        
        dibujarCirculo(x, y, radio, color);
      }

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
      className="pulse-canvas"
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

export default Pulse; 