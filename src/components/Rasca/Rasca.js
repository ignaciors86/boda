import React, { useRef, useEffect, useState } from 'react';
import './Rasca.scss';
const Rasca = ({ url }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const [revealPercentage, setRevealPercentage] = useState(0);

  // Controla el grosor del pincel (en dvh)
  const brushSizeInDvh = 4;
  const brushSize = () => canvasDimensions.height * (brushSizeInDvh / 100);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Ajustar las dimensiones del canvas al tamaño del contenedor
    const updateCanvasDimensions = () => {
      const container = canvas.parentElement;
      const width = container.offsetWidth;
      const height = container.offsetHeight;
      setCanvasDimensions({ width, height });
      canvas.width = width;
      canvas.height = height;

      // Dibujar la capa gris inicial
      ctx.fillStyle = '#b0b0b0'; // Color gris
      ctx.fillRect(0, 0, width, height);
    };

    updateCanvasDimensions();
    window.addEventListener('resize', updateCanvasDimensions);

    return () => {
      window.removeEventListener('resize', updateCanvasDimensions);
    };
  }, []);

  const handleMouseDown = (e) => {
    setIsDrawing(true);
    draw(e); // Empezar a rascar al hacer clic
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    calculateRevealPercentage(); // Recalcular el porcentaje al finalizar el trazo
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    draw(e);
    calculateRevealPercentage(); // Actualizar el porcentaje mientras se rasca
  };

  const draw = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Estilo del "pincel"
    ctx.globalCompositeOperation = 'destination-out'; // Eliminar la capa gris al rascar
    ctx.beginPath();
    ctx.arc(x, y, brushSize(), 0, 2 * Math.PI); // Grosor definido por brushSize()
    ctx.fill();
  };

  const calculateRevealPercentage = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const totalPixels = imageData.data.length / 4; // Cada píxel tiene 4 valores (RGBA)
    let clearedPixels = 0;

    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] === 0) clearedPixels++; // Pixel completamente transparente
    }

    const percentage = (clearedPixels / totalPixels) * 100;
    setRevealPercentage(percentage);

    if (percentage >= 20) {
      autoReveal(); // Simula el borrado completo si llega al 70%
    }
  };

  const autoReveal = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let interval;
    let remaining = 100 - revealPercentage;

    const revealStep = () => {
      remaining -= 1; // Revela en pasos del 5%
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000';
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, brushSize() * 2, brushSize() * 2);

      if (remaining <= 0) {
        clearInterval(interval);
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpiar todo
      }
    };
    interval = setInterval(revealStep, 250); // Rápidos trazos cada 50ms
  };

  return (
    <div className="rasca" >
      {/* Imagen de fondo */}
      <img
        src={url}
        alt="Premio oculto"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      {/* Capa gris interactiva */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} // Para detener el dibujo si el puntero sale del canvas
      ></canvas>
    </div>
  );
};

export default Rasca;
