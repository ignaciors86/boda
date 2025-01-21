import React, { useRef, useEffect, useState } from 'react';

const Rasca = ({ url }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });

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
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    draw(e);
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
    ctx.arc(x, y, canvasDimensions.height * 0.1, 0, 2 * Math.PI); // Grosor 4dvh
    ctx.fill();
  };

  return (
    <div className="rasca" style={{ position: 'relative', width: '100%', height: '100%' }}>
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
